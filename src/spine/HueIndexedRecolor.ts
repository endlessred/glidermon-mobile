import * as THREE from "three";

export type HueIndexedRecolorColors = {
  red?: THREE.Color | string | number;
  green?: THREE.Color | string | number;
  blue?: THREE.Color | string | number;
  yellow?: THREE.Color | string | number;
};

export type HueIndexedRecolorOptions = {
  alphaTest?: number;          // default 0.0015
  strength?: number;           // 0..1, default 1
  shadeMode?: boolean;         // true keeps base shading (default true)
  satMin?: number;             // ignore pixels with saturation below (default 0.2)
  hueCosMin?: number;          // require closeness to ID hue, cos(theta) (default 0.90 ~= 25°)
  useYellow?: boolean;         // enable 4th ID (yellow), default false
  preserveDarkThreshold?: number; // default 0.15 (keep dark outlines)
};

function toColorOrDefault(c: any, defaultValue: number): THREE.Color {
  return c instanceof THREE.Color ? c : new THREE.Color(c ?? defaultValue);
}

/** Small helper so every atlas page is treated the same way. */
export function ensureSRGBTexture(tex: THREE.Texture) {
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  // Critical: tell Three this bitmap is authored in sRGB
  // (available on r152+ as Texture.colorSpace)
  // @ts-ignore
  tex.colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
  tex.needsUpdate = true;
}

export function makeHueIndexedRecolorMaterial(
  baseMap: THREE.Texture,
  opts: HueIndexedRecolorOptions & { colors?: HueIndexedRecolorColors } = {}
): THREE.ShaderMaterial {
  const o = {
    alphaTest: 0.0015,
    strength: 1,
    shadeMode: true,
    satMin: 0.2,
    hueCosMin: 0.90,
    useYellow: false,
    preserveDarkThreshold: 0.15,
    colors: {},
    ...(opts || {})
  };

  const colR = toColorOrDefault(o.colors!.red, 0xff0000);
  const colG = toColorOrDefault(o.colors!.green, 0x00ff00);
  const colB = toColorOrDefault(o.colors!.blue, 0x0000ff);
  const colY = toColorOrDefault(o.colors!.yellow, 0xffff00);

  ensureSRGBTexture(baseMap);

  const vert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;

  // NOTE: we now linearize the sampled texture and encode result to the renderer's output space.
  const frag = `
    #ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
    #endif

    // --- Color-space conversion helpers (portable fallback) ---
    vec3 SRGBToLinear(vec3 srgb) {
      return pow(srgb, vec3(2.2));
    }

    vec3 LinearToSRGB(vec3 linear) {
      return pow(linear, vec3(1.0 / 2.2));
    }

    uniform sampler2D uMap;
    uniform vec3 uColR, uColG, uColB, uColY;
    uniform float uAlphaTest, uStrength, uSatMin, uHueCosMin;
    uniform float uUseYellow, uShadeMode, uGlobalAlpha, uPreserveDark;

    varying vec2 vUv;

    float lumaLinear(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }

    // Convert linear RGB to a naive HSV (s is fine for gating, not for hue precision)
    vec3 rgb2hsv_linear(vec3 c) {
      float cmax = max(max(c.r, c.g), c.b);
      float cmin = min(min(c.r, c.g), c.b);
      float delta = cmax - cmin;

      float h = 0.0;
      if (delta > 1e-5) {
        if (cmax == c.r) h = mod((c.g - c.b) / delta, 6.0);
        else if (cmax == c.g) h = (c.b - c.r) / delta + 2.0;
        else h = (c.r - c.g) / delta + 4.0;
        h /= 6.0;
      }

      float s = (cmax > 1e-5) ? delta / cmax : 0.0;
      float v = cmax;
      return vec3(h, s, v);
    }

    void main(){
      vec4 tex = texture2D(uMap, vUv);
      // conservative cutout using original alpha in conjunction with global alpha
      if (tex.a <= uAlphaTest * uGlobalAlpha) discard;

      // IMPORTANT: convert sRGB map sample to LINEAR for all math
      vec3 texRGB = SRGBToLinear(tex.rgb);

      float Y = lumaLinear(texRGB);
      vec3 hsv = rgb2hsv_linear(texRGB);
      float sat = hsv.y;

      // --- outline guards (operate in linear) ---
      bool isBlueish = texRGB.b > texRGB.r && texRGB.b > texRGB.g && texRGB.b > 0.1;
      if (Y <= uPreserveDark && !isBlueish) {
        // encode back to output space
        gl_FragColor = vec4( LinearToSRGB(texRGB), 1.0 );
        return;
      }
      if (sat < uSatMin) {
        gl_FragColor = vec4( LinearToSRGB(texRGB), 1.0 );
        return;
      }

      // Simple dominance in linear space
      int id = -1;
      float maxComponent = max(max(texRGB.r, texRGB.g), texRGB.b);
      float threshold = 0.05; // lower in linear

      if (maxComponent <= threshold) {
        gl_FragColor = vec4( LinearToSRGB(texRGB), 1.0 );
        return;
      }

      float tol = 0.06;
      if (uUseYellow > 0.5 && texRGB.r > threshold && texRGB.g > threshold &&
          texRGB.r > texRGB.b + tol && texRGB.g > texRGB.b + tol) {
        id = 3; // Yellow
      } else if (texRGB.r > texRGB.g + tol && texRGB.r > texRGB.b + tol) {
        id = 0; // Red
      } else if (texRGB.g > texRGB.r + tol && texRGB.g > texRGB.b + tol) {
        id = 1; // Green
      } else if (texRGB.b > texRGB.r + tol && texRGB.b > texRGB.g + tol) {
        id = 2; // Blue
      }

      if (id == -1) {
        gl_FragColor = vec4( LinearToSRGB(texRGB), 1.0 );
        return;
      }

      vec3 target_srgb = (id==0) ? uColR :
                         (id==1) ? uColG :
                         (id==2) ? uColB : uColY;

      // Convert palette to linear before mixing
      vec3 target = SRGBToLinear(target_srgb);

      vec3 outLinear;
      if (id == 2) {
        // Blue: avoid double-darkening; bias toward target
        outLinear = mix(texRGB, target, uStrength);
      } else {
        vec3 shaded = mix(target, target * Y, uShadeMode);
        outLinear = mix(texRGB, shaded, uStrength);
      }

      // Encode to output color space
      gl_FragColor = vec4( LinearToSRGB(outLinear), 1.0 );
    }
  `;

  const safeColR = new THREE.Color(colR.getHex());
  const safeColG = new THREE.Color(colG.getHex());
  const safeColB = new THREE.Color(colB.getHex());
  const safeColY = new THREE.Color(colY.getHex());

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap:         { value: baseMap },
      uColR:        { value: safeColR },
      uColG:        { value: safeColG },
      uColB:        { value: safeColB },
      uColY:        { value: safeColY },
      uAlphaTest:   { value: o.alphaTest },
      uStrength:    { value: o.strength },
      uShadeMode:   { value: o.shadeMode ? 1.0 : 0.0 },
      uSatMin:      { value: o.satMin },
      uHueCosMin:   { value: o.hueCosMin },
      uUseYellow:   { value: o.useYellow ? 1.0 : 0.0 },
      uPreserveDark:{ value: o.preserveDarkThreshold },
      uGlobalAlpha: { value: 1.0 },
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: false,     // opaque cutout; alpha via discard
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,      // we’re only managing color spaces, not tone mapping
  });

  return material;
}

export function updateHueIndexedRecolorColors(
  mat: THREE.ShaderMaterial,
  colors: HueIndexedRecolorColors
) {
  if (!mat || !(mat as any).uniforms) return;
  const u = (mat as any).uniforms;
  if (colors.red !== undefined) (u.uColR.value as THREE.Color).set(colors.red as any);
  if (colors.green !== undefined) (u.uColG.value as THREE.Color).set(colors.green as any);
  if (colors.blue !== undefined) (u.uColB.value as THREE.Color).set(colors.blue as any);
  if (colors.yellow !== undefined) (u.uColY.value as THREE.Color).set(colors.yellow as any);
}

export function updateHueIndexedRecolorOptions(
  mat: THREE.ShaderMaterial,
  opts: Partial<HueIndexedRecolorOptions>
) {
  if (!mat || !(mat as any).uniforms) return;
  const u = (mat as any).uniforms;
  if (opts.alphaTest !== undefined)            u.uAlphaTest.value = opts.alphaTest;
  if (opts.strength !== undefined)             u.uStrength.value  = Math.max(0, Math.min(1, opts.strength));
  if (opts.shadeMode !== undefined)            u.uShadeMode.value = opts.shadeMode ? 1.0 : 0.0;
  if (opts.satMin !== undefined)               u.uSatMin.value = opts.satMin;
  if (opts.hueCosMin !== undefined)            u.uHueCosMin.value = opts.hueCosMin;
  if (opts.useYellow !== undefined)            u.uUseYellow.value = opts.useYellow ? 1.0 : 0.0;
  if (opts.preserveDarkThreshold !== undefined)u.uPreserveDark.value = opts.preserveDarkThreshold;
}

export function updateHueIndexedRecolorAlpha(mat: THREE.ShaderMaterial, a: number) {
  if (!mat || !(mat as any).uniforms) return;
  const uniforms = (mat as any).uniforms;
  if (uniforms.uGlobalAlpha) {
    uniforms.uGlobalAlpha.value = Math.max(0, Math.min(1, a));
  }
}
