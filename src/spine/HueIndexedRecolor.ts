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

  // Texture hygiene
  baseMap.wrapS = baseMap.wrapT = THREE.ClampToEdgeWrapping;
  baseMap.minFilter = THREE.LinearFilter;
  baseMap.magFilter = THREE.LinearFilter;
  baseMap.generateMipmaps = false;
  baseMap.needsUpdate = true;

  const vert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;

  // Use HSV-based hue detection for better color classification
  const frag = `
    uniform sampler2D uMap;
    uniform vec3 uColR, uColG, uColB, uColY;
    uniform float uAlphaTest, uStrength, uSatMin, uHueCosMin;
    uniform float uUseYellow, uShadeMode, uGlobalAlpha, uPreserveDark;

    varying vec2 vUv;

    float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }

    // Convert RGB to HSV for better hue detection
    vec3 rgb2hsv(vec3 c) {
      float cmax = max(max(c.r, c.g), c.b);
      float cmin = min(min(c.r, c.g), c.b);
      float delta = cmax - cmin;

      // Hue calculation
      float h = 0.0;
      if (delta > 0.0001) {
        if (cmax == c.r) {
          h = mod((c.g - c.b) / delta, 6.0);
        } else if (cmax == c.g) {
          h = (c.b - c.r) / delta + 2.0;
        } else {
          h = (c.r - c.g) / delta + 4.0;
        }
        h /= 6.0;
      }

      // Saturation
      float s = (cmax > 0.0001) ? delta / cmax : 0.0;

      // Value (brightness)
      float v = cmax;

      return vec3(h, s, v);
    }

    void main(){
      vec4 tex = texture2D(uMap, vUv);
      if (tex.a <= uAlphaTest * uGlobalAlpha) discard;

      float Y = luma(tex.rgb);
      vec3 hsv = rgb2hsv(tex.rgb);
      float hue = hsv.x;
      float sat = hsv.y;

      // --- outline guards ---
      // Allow blue pixels to pass through even if dark (blue has lower luma naturally)
      bool isBlueish = tex.b > tex.r && tex.b > tex.g && tex.b > 0.1;
      if (Y <= uPreserveDark && !isBlueish) {
        gl_FragColor = vec4(tex.rgb, 1.0);  // keep outlines (and other neutral areas)
        return;
      }
      if (sat < uSatMin) {
        gl_FragColor = vec4(tex.rgb, 1.0);  // keep low-saturation areas
        return;
      }

      // Use RGB-based detection instead of HSV hue (more reliable)
      int id = -1;
      float maxComponent = max(max(tex.r, tex.g), tex.b);
      float threshold = 0.2; // minimum color intensity

      if (maxComponent <= threshold) {
        gl_FragColor = vec4(tex.rgb, 1.0);
        return;
      }

      if (maxComponent > threshold) {
        // Determine dominant color channel with some tolerance
        float tolerance = 0.1;

        // Check for yellow first (needs both R and G high)
        if (uUseYellow > 0.5 && tex.r > threshold && tex.g > threshold &&
            tex.r > tex.b + tolerance && tex.g > tex.b + tolerance) {
          id = 3; // Yellow
        }
        // Check for red (R dominant)
        else if (tex.r > tex.g + tolerance && tex.r > tex.b + tolerance) {
          id = 0; // Red
        }
        // Check for green (G dominant)
        else if (tex.g > tex.r + tolerance && tex.g > tex.b + tolerance) {
          id = 1; // Green
        }
        // Check for blue (B dominant)
        else if (tex.b > tex.r + tolerance && tex.b > tex.g + tolerance) {
          id = 2; // Blue
        }
      }

      // If no clear color dominance found, keep original
      if (id == -1) {
        gl_FragColor = vec4(tex.rgb, 1.0);
        return;
      }


      vec3 target = (id==0) ? uColR :
                    (id==1) ? uColG :
                    (id==2) ? uColB : uColY;

      // Special handling for blue pixels - use target color directly without shading
      vec3 outRgb;
      if (id == 2) {
        // Blue: use target color directly to avoid black issues
        outRgb = mix(tex.rgb, target, uStrength);
      } else {
        // Other colors: normal shading
        vec3 shaded = mix(target, target * Y, uShadeMode);
        outRgb = mix(tex.rgb, shaded, uStrength);
      }

      gl_FragColor = vec4(outRgb, 1.0); // opaque cutout
    }
  `;

  console.log('Creating hue-indexed material with colors:', { colR, colG, colB, colY });

  // Ensure colors are properly constructed
  const safeColR = new THREE.Color(colR.getHex());
  const safeColG = new THREE.Color(colG.getHex());
  const safeColB = new THREE.Color(colB.getHex());
  const safeColY = new THREE.Color(colY.getHex());

  console.log('Safe colors hex values:', {
    red: safeColR.getHexString(),
    green: safeColG.getHexString(),
    blue: safeColB.getHexString(),
    yellow: safeColY.getHexString()
  });

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
    transparent: false,      // ← opaque cutout (preserves Spine order)
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  console.log('Created material with uniforms:', Object.keys(material.uniforms));

  // Sanity check: log final palette hex values in shader uniforms
  const u = (material as any).uniforms;
  console.log("Final palette hex values in shader uniforms:",
    (u.uColR.value as THREE.Color).getHexString(),
    (u.uColG.value as THREE.Color).getHexString(),
    (u.uColB.value as THREE.Color).getHexString(), // <- verify not "0000ff" unless intended
    (u.uColY.value as THREE.Color).getHexString()
  );

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