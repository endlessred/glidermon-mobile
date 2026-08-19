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
  // Replaces the hard brightness/saturation/hue-margin cutoff that decides
  // "preserve as outline" vs. "fully recolor to the target hue" with a
  // smooth blend, so a thin detail line that anti-aliases across texel
  // boundaries along its length (a bilinear sample only ever reads a 2x2
  // neighborhood) renders as a continuous line instead of dashing in and
  // out as adjacent pixels flip abruptly between the two treatments. Also
  // enables trilinear mipmapping + anisotropic filtering, which similarly
  // helps thin lines survive minification once the character renders
  // smaller than its source texture.
  // Verified good for small decorative detail (e.g. an ear's inner-crease
  // pattern) but NOT a safe default: on art where a classification-guide
  // color runs close to outline edges more broadly (limb/wing/silhouette
  // boundaries), the smooth confidence ramp lets enough of that guide color
  // through to paint a visible colored rim along those edges -- worse than
  // the dashing it fixes. Confirmed by A/B on-device: disabling this
  // (keeping only the unconditional premultiply fix below) removed the rim
  // with the ear detail only slightly more muted. Off by default; opt in
  // only after checking full-body silhouette edges, not just the specific
  // detail that motivated turning it on.
  smoothOutlineEdges?: boolean;
  // --- Plus-tier effects (see docs/superpowers/specs/2026-08-19-cosmetic-palette-tiers.md) ---
  /** Gradient mode: per-channel "light end" colors (red/green/yellow only --
   * blue is excluded, same reason it's excluded from shading below). Mixed
   * against `colors.red/green/yellow` (the "dark end") using a repeating
   * diagonal band driven by UV position, not the per-pixel shading signal
   * -- verified on real assets that guide-art brightness for a given
   * channel is a fixed per-item baseline, not a range, so it can't drive a
   * visible gradient. */
  gradientColors?: {
    red?: THREE.Color | string | number;
    green?: THREE.Color | string | number;
    yellow?: THREE.Color | string | number;
    /** Repeats per unit of (vUv.x + vUv.y); higher = tighter/more frequent
     * banding. Default 25 -- tuned to show 2-4 bands across a typical hat/
     * jacket-sized attachment in this project's shared atlas. */
    scale?: number;
  };
  /** Shimmer mode: an animated diagonal highlight sweep over already-
   * recolored pixels. `timeUniform` should be one shared {value:number}
   * object reused across every shimmer material (see SpineCharacterPreview
   * / createSpineCharacterController) so a single per-frame write updates
   * them all, rather than iterating every live shimmer material. */
  shimmer?: {
    speed?: number;
    intensity?: number;
    tint?: THREE.Color | string | number;
    timeUniform?: { value: number };
  };
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
    smoothOutlineEdges: false,
    colors: {},
    ...(opts || {})
  };

  const colR = toColorOrDefault(o.colors!.red, 0xff0000);
  const colG = toColorOrDefault(o.colors!.green, 0x00ff00);
  const colB = toColorOrDefault(o.colors!.blue, 0x0000ff);
  const colY = toColorOrDefault(o.colors!.yellow, 0xffff00);

  const gradientEnabled = !!o.gradientColors;
  const colRB = toColorOrDefault(o.gradientColors?.red, colR.getHex());
  const colGB = toColorOrDefault(o.gradientColors?.green, colG.getHex());
  const colYB = toColorOrDefault(o.gradientColors?.yellow, colY.getHex());
  // Higher reads safely on both large and small atlas regions -- a region
  // that only spans a small UV footprint still gets several band cycles
  // at this frequency, whereas a low scale (e.g. 25) showed nothing at all
  // on smaller regions (confirmed on-device: worked on the crown's larger
  // region, invisible on the jacket torso's smaller one).
  const gradientScale = o.gradientColors?.scale ?? 120;

  const shimmerEnabled = !!o.shimmer;
  const shimmerSpeed = o.shimmer?.speed ?? 0.4;
  const shimmerIntensity = o.shimmer?.intensity ?? 0.5;
  const shimmerTint = toColorOrDefault(o.shimmer?.tint, 0xffffff);
  const timeUniform = o.shimmer?.timeUniform ?? { value: 0 };

  ensureSRGBTexture(baseMap);

  if (o.smoothOutlineEdges) {
    // Trilinear mipmapping meaningfully improves minification of thin
    // detail lines (rib lines, fine creases) that alias/dash under mip-less
    // bilinear filtering once the character renders smaller than its source
    // texture -- a bilinear sample only ever reads a 2x2 texel neighborhood,
    // which can't properly represent a near-1px-wide line as it crosses
    // texel boundaries along its length.
    //
    // Mipmaps were previously disabled project-wide (see ensureSRGBTexture
    // above and src/spine/CLAUDE.md) because mip generation box-filters in
    // neighboring atlas padding, and padding pixels that are fully
    // transparent but not black bled into the art as halos near region
    // edges -- worse at smaller mip levels, i.e. worse exactly when the
    // character renders smaller, same as the dashing this fixes. Relying on
    // the alphaTest cutout already in place to suppress that bleed instead.
    // Scoped to this same opt-in flag so other consumers of the shared
    // ensureSRGBTexture helper (e.g. wall furniture) are unaffected.
    baseMap.generateMipmaps = true;
    baseMap.minFilter = THREE.LinearMipmapLinearFilter;
    // Trilinear alone still leaves residual dashing on parts viewed at a
    // steep angle (e.g. the near ear in the 3/4 character view), since
    // minification there is anisotropic -- squashed harder along one axis
    // than the other -- and an isotropic mip chain picks a mip level sized
    // for the worse axis, over-blurring the better one. A high anisotropy
    // value is safe to request unconditionally; three.js clamps it to
    // whatever the GPU actually supports when the texture uploads.
    baseMap.anisotropy = 16;
    baseMap.needsUpdate = true;
  }

  const vert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;

  // NOTE: we now linearize the sampled texture and encode result to the renderer's output space.
  const frag = `
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

    // Plus-tier effects (gradient / shimmer) -- see
    // docs/superpowers/specs/2026-08-19-cosmetic-palette-tiers.md
    uniform vec3 uColRB, uColGB, uColYB;
    uniform float uGradientEnabled, uGradientScale;
    uniform float uTime, uShimmerEnabled, uShimmerSpeed, uShimmerIntensity;
    uniform vec3 uShimmerTint;

    varying vec2 vUv;

    // Gradient mode originally reused the per-pixel shading signal (Y/refY)
    // as the A/B mix factor -- verified on-device via a grayscale debug
    // dump that this doesn't work: guide art brightness for a given
    // channel is an artist-chosen *fixed baseline* per item (calibrated to
    // look right multiplied onto one target color), not a range that spans
    // dark-to-light within a single item's single channel, so shadeFactor
    // pinned at one extreme of its clamp for the *entire* mesh, every time.
    // Driven from vUv instead -- proven to carry real spatial variation
    // (it's literally the working UV mapping), unlike shadeFactor here or
    // uTime in the shimmer path below. A repeating diagonal triangle wave
    // rather than one clean sweep across true 0..1, since we don't have
    // this attachment's own UV bounding rect (it's a sub-rect of the
    // shared atlas) -- reads as a metallic/sheen banding, which suits
    // effects like "Chrome" thematically anyway.
    float gradientT() {
      float raw = fract((vUv.x + vUv.y) * uGradientScale);
      return 1.0 - abs(raw * 2.0 - 1.0);
    }

    // Diagonal sweep in atlas UV space -- an MVP simplification, not aware
    // of a given attachment's own local orientation within the atlas (see
    // spec doc). Applied identically in both shader variants below.
    vec3 applyShimmer(vec3 base) {
      if (uShimmerEnabled <= 0.5) return base;
      float phase = fract(vUv.x + vUv.y - uTime * uShimmerSpeed);
      float band = smoothstep(0.0, 0.08, phase) * (1.0 - smoothstep(0.08, 0.16, phase));
      return mix(base, uShimmerTint, band * uShimmerIntensity);
    }

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

    ${o.smoothOutlineEdges ? `
    void main(){
      vec4 tex = texture2D(uMap, vUv);
      if (tex.a <= uAlphaTest * uGlobalAlpha) discard;

      // This atlas is exported with premultiplied alpha (pma:true in the
      // .atlas file) -- confirmed by the legacy MeshBasicMaterial path
      // (SpineThree.ts) explicitly setting premultipliedAlpha:true to match.
      // This shader instead does its own manual opaque compositing (no GL
      // blending, alpha hardcoded to 1.0 below) and was sampling tex.rgb
      // directly as if it were straight alpha, so every partially-transparent
      // texel (anti-aliased edges) rendered at its alpha-darkened stored
      // value instead of its true color -- reading as washed-out/"slightly
      // transparent" outlines and detail lines. Un-premultiply in sRGB space
      // (matching how it was premultiplied at export) before doing anything
      // else with it.
      vec3 rawRGB = tex.rgb / max(tex.a, 0.0001);
      vec3 texRGB = SRGBToLinear(rawRGB);

      float Y = lumaLinear(texRGB);
      vec3 hsv = rgb2hsv_linear(texRGB);
      float sat = hsv.y;

      bool isBlueish = texRGB.b > texRGB.r && texRGB.b > texRGB.g && texRGB.b > 0.1;

      // Classify dominant channel. Rather than a hard tol-gated cutoff
      // (which flips abruptly between buckets, or between a bucket and
      // "preserve", for near-tied samples), always pick the closest bucket
      // and separately track how decisively it won (margin) -- verified via
      // a raw, unrecolored source-texture crop that the art itself has zero
      // speckling, so any dashing has to come from bilinear-sampled texels
      // straddling a black outline / color fill boundary (or two adjacent
      // color fills) landing near-tied between two channels and flipping
      // classification pixel-to-pixel along the curve. margin drives a
      // continuous confidence fade below instead of a binary decision.
      int id = -1;
      float margin = 0.0;
      float maxComponent = max(max(texRGB.r, texRGB.g), texRGB.b);
      float classifyThreshold = 0.05;
      if (maxComponent > classifyThreshold) {
        if (uUseYellow > 0.5 && texRGB.r > texRGB.b && texRGB.g > texRGB.b) {
          id = 3; // Yellow
          margin = min(texRGB.r, texRGB.g) - texRGB.b;
        } else if (texRGB.r >= texRGB.g && texRGB.r >= texRGB.b) {
          id = 0; // Red
          margin = texRGB.r - max(texRGB.g, texRGB.b);
        } else if (texRGB.g >= texRGB.r && texRGB.g >= texRGB.b) {
          id = 1; // Green
          margin = texRGB.g - max(texRGB.r, texRGB.b);
        } else {
          id = 2; // Blue
          margin = texRGB.b - max(texRGB.r, texRGB.g);
        }
      }

      vec3 outLinear = texRGB;
      if (id != -1) {
        vec3 target_srgb = (id==0) ? uColR : (id==1) ? uColG : (id==2) ? uColB : uColY;
        vec3 target = SRGBToLinear(target_srgb);

        vec3 recolored;
        if (id == 2) {
          recolored = mix(texRGB, target, uStrength);
        } else {
          // refY normalizes shading brightness against the mask art's flat
          // classification color -- see the non-smooth path below for why.
          float refY = (id == 0) ? 0.299 : (id == 1) ? 0.587 : 0.886;
          float shadeFactor = clamp(Y / max(refY, 1e-4), 0.4, 1.3);
          vec3 shaded;
          if (uGradientEnabled > 0.5) {
            // Gradient mode: driven from vUv, not shadeFactor -- see
            // gradientT() comment above for why the shading signal doesn't
            // work here (it's a fixed per-item baseline, not a range).
            vec3 target_srgb_B = (id==0) ? uColRB : (id==1) ? uColGB : uColYB;
            vec3 targetB = SRGBToLinear(target_srgb_B);
            vec3 blended = mix(target, targetB, gradientT());
            shaded = mix(blended, blended * shadeFactor, uShadeMode);
          } else {
            shaded = mix(target, target * shadeFactor, uShadeMode);
          }
          recolored = mix(texRGB, shaded, uStrength);
        }

        // Smoothly fade between "preserve as outline" and "fully recolored"
        // across the anti-aliased blend, instead of the hard Y/sat cutoff
        // below -- a hard cutoff makes adjacent AA'd edge pixels flip
        // abruptly between the two treatments depending on which side they
        // land on, which reads as colored speckling right along outlines.
        // Gated on maxComponent (raw channel magnitude), not perceptual
        // luma Y -- Y weights green ~2x heavier than red (~0.59 vs ~0.30),
        // so a near-black outline texel with a faint green bias reads as
        // meaningfully brighter than an equally-dim one with a red bias,
        // letting green outline noise slip past this gate far more easily
        // than red. maxComponent treats every hue's noise the same.
        float darkFade = isBlueish ? 1.0 : smoothstep(uPreserveDark, uPreserveDark + 0.15, maxComponent);
        float satFade = smoothstep(uSatMin, uSatMin + 0.15, sat);
        // Low-margin (near-tied) classifications are low confidence -- fade
        // those toward the raw sampled color instead of committing to a
        // bucket, which is what removes the boundary-speckling artifact.
        // The deadzone below 0.06 matters: near-black outline texels have
        // tiny, essentially noisy differences between their R/G/B channels,
        // so a confidence ramp starting at margin=0 let that noise pick a
        // "winning" channel and tint outlines green/red broadly (visible
        // once mipmapping/anisotropy widened the sampled neighborhood).
        // Requiring a real margin before confidence leaves zero reproduces
        // the original hard classifier's outline protection, while still
        // ramping smoothly instead of snapping once a pixel clears it.
        float classifyConfidence = smoothstep(0.06, 0.18, margin);
        // Anti-aliased silhouette edges (partial alpha, where the source
        // art blends toward transparent background or toward an abutting
        // region) shouldn't receive confident recoloring the way genuinely
        // opaque interior pixels do -- without this, once un-premultiplied
        // to their true brightness these edge-halo pixels can classify
        // decisively and paint a thin rim of the target color along every
        // silhouette edge (wings, limbs, shoes), not just the fur/skin
        // interior. Fully opaque pixels (the vast majority of the art) are
        // unaffected: alphaConfidence is 1 there, same as before this fade.
        float alphaConfidence = smoothstep(0.5, 0.97, tex.a);
        outLinear = mix(texRGB, recolored, classifyConfidence * darkFade * satFade * alphaConfidence);
      }

      if (id != -1) outLinear = applyShimmer(outLinear);

      gl_FragColor = vec4( LinearToSRGB(outLinear), 1.0 );
    }
    ` : `
    void main(){
      vec4 tex = texture2D(uMap, vUv);
      // conservative cutout using original alpha in conjunction with global alpha
      if (tex.a <= uAlphaTest * uGlobalAlpha) discard;

      // This atlas is exported with premultiplied alpha (pma:true in the
      // .atlas file) -- confirmed by the legacy MeshBasicMaterial path
      // (SpineThree.ts) explicitly setting premultipliedAlpha:true to match.
      // This shader instead does its own manual opaque compositing (no GL
      // blending, alpha hardcoded to 1.0 below) and was sampling tex.rgb
      // directly as if it were straight alpha, so every partially-transparent
      // texel (anti-aliased edges) rendered at its alpha-darkened stored
      // value instead of its true color -- reading as washed-out/"slightly
      // transparent" outlines and detail lines. Un-premultiply in sRGB space
      // (matching how it was premultiplied at export) before doing anything
      // else with it. Applied unconditionally (both this and the
      // smoothOutlineEdges path above) since it's a plain correctness fix,
      // not tied to the smooth-classification behavior that flag controls.
      vec3 rawRGB = tex.rgb / max(tex.a, 0.0001);
      vec3 texRGB = SRGBToLinear(rawRGB);

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
        // The mask art is a flat classification color (pure red/green/yellow), not a
        // painted shading pass, so its raw luma isn't meaningful brightness data -- pure
        // red has linear luma ~0.30 and pure green ~0.59, so multiplying by raw Y crushed
        // red-classified regions ~2x darker than green ones for no intentional reason.
        // Normalize against the reference primary's own luma first so a pixel painted at
        // the "pure" classification color reproduces the target color at full brightness,
        // and only genuine highlight/shadow brushwork (departure from the pure color)
        // still modulates it.
        float refY = (id == 0) ? 0.299 : (id == 1) ? 0.587 : 0.886; // red / green / yellow
        float shadeFactor = clamp(Y / max(refY, 1e-4), 0.4, 1.3);
        vec3 shaded;
        if (uGradientEnabled > 0.5) {
          // Gradient mode: reuse shadeFactor as a mix parameter between two
          // designer colors instead of a brightness multiplier on one --
          // works on already-painted shading with no new art.
          vec3 target_srgb_B = (id==0) ? uColRB : (id==1) ? uColGB : uColYB;
          vec3 targetB = SRGBToLinear(target_srgb_B);
          // Still apply the original brightness multiply on top of the
          // gradient-mixed base, so painted highlights/shadows still read
          // as depth rather than a perfectly flat two-tone fill.
          vec3 blended = mix(target, targetB, gradientT());
          shaded = mix(blended, blended * shadeFactor, uShadeMode);
        } else {
          shaded = mix(target, target * shadeFactor, uShadeMode);
        }
        outLinear = mix(texRGB, shaded, uStrength);
      }

      outLinear = applyShimmer(outLinear);

      // Encode to output color space
      gl_FragColor = vec4( LinearToSRGB(outLinear), 1.0 );
    }
    `}
  `;

  const safeColR = new THREE.Color(colR.getHex());
  const safeColG = new THREE.Color(colG.getHex());
  const safeColB = new THREE.Color(colB.getHex());
  const safeColY = new THREE.Color(colY.getHex());
  const safeColRB = new THREE.Color(colRB.getHex());
  const safeColGB = new THREE.Color(colGB.getHex());
  const safeColYB = new THREE.Color(colYB.getHex());
  const safeShimmerTint = new THREE.Color(shimmerTint.getHex());

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
      // Plus-tier effects
      uColRB:            { value: safeColRB },
      uColGB:             { value: safeColGB },
      uColYB:             { value: safeColYB },
      uGradientEnabled:   { value: gradientEnabled ? 1.0 : 0.0 },
      uGradientScale:     { value: gradientScale },
      uTime:              timeUniform,
      uShimmerEnabled:    { value: shimmerEnabled ? 1.0 : 0.0 },
      uShimmerSpeed:      { value: shimmerSpeed },
      uShimmerIntensity:  { value: shimmerIntensity },
      uShimmerTint:       { value: safeShimmerTint },
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
