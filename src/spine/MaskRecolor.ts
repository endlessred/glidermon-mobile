// src/spine/MaskRecolor.ts
import * as THREE from "three";

export type MaskRecolorColors = {
  r?: THREE.Color | string | number; // color for mask R (default BLACK)
  g?: THREE.Color | string | number; // color for mask G (default BLACK)
  b?: THREE.Color | string | number; // color for mask B (default BLACK)
  a?: THREE.Color | string | number; // color for mask A (default BLACK)
};

export type MaskRecolorOptions = {
  alphaTest?: number;             // default 0.0015
  premultipliedAlpha?: boolean;   // default true
  /** "shade" keeps base luminance; "replace" uses flat color */
  mode?: "shade" | "replace";     // default "shade"
  strength?: number;              // default 1
  preserveDarkThreshold?: number; // default 0 (e.g. 0.14 to keep near-black outlines)
  debugMaskView?: boolean;        // default false (visualize mask.rgb)
  autoFallbackWhenMaskEmpty?: boolean; // default true: if mask sums to 0, paint fully
};

// IMPORTANT: default to BLACK (0x000000), not white
function toColorOrBlack(c?: THREE.Color | string | number): THREE.Color {
  return c instanceof THREE.Color ? c : new THREE.Color(c !== undefined ? c : 0x000000);
}

export function makeMaskRecolorMaterial(
  baseMap: THREE.Texture,
  maskMap: THREE.Texture,
  colors: MaskRecolorColors,
  opts: MaskRecolorOptions = {}
): THREE.ShaderMaterial {
  const alphaTest  = opts.alphaTest ?? 0.0015;
  const pma        = opts.premultipliedAlpha ?? true;
  const strength   = Math.max(0, Math.min(1, opts.strength ?? 1));
  const mode       = opts.mode ?? "shade";
  const preserve   = Math.max(0, Math.min(1, opts.preserveDarkThreshold ?? 0));
  const debugView  = !!opts.debugMaskView;
  const autoFB     = opts.autoFallbackWhenMaskEmpty ?? true;

  // Texture hygiene
  [baseMap, maskMap].forEach((t) => {
    if (!t) return;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
  });

  // DEFAULTS = BLACK for any unspecified channel
  const colR = toColorOrBlack(colors.r);
  const colG = toColorOrBlack(colors.g);
  const colB = toColorOrBlack(colors.b);
  const colA = toColorOrBlack(colors.a);

  const vert = `
    precision mediump float;
    precision mediump int;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const frag = `
    precision mediump float;
    precision mediump int;

    uniform sampler2D uMap;
    uniform sampler2D uMask;
    uniform vec3  uColR, uColG, uColB, uColA;
    uniform float uAlphaTest;
    uniform bool  uPMA;
    uniform float uStrength;
    uniform float uShadeMode;        // 1 = shade, 0 = replace
    uniform float uPreserveDark;     // 0..1
    uniform float uGlobalAlpha;      // set by adapter each frame
    uniform float uDebugMask;        // 0/1
    uniform float uAutoFallback;     // 0/1

    varying vec2 vUv;

    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    void main() {
      vec4 tex  = texture2D(uMap,  vUv);
      if (tex.a <= uAlphaTest) discard;

      vec4 m    = texture2D(uMask, vUv);  // RGBA weights in 0..1
      float w   = clamp(m.r + m.g + m.b + m.a, 0.0, 1.0);

      // Visualize mask to debug alignment
      if (uDebugMask > 0.5) {
        vec3 dbg = m.rgb;
        float a  = tex.a * uGlobalAlpha;
        if (uPMA) dbg *= a;
        gl_FragColor = vec4(dbg, a);
        return;
      }

      // Preserve outlines: keep original if very dark
      float yBase = luma(tex.rgb);
      if (uPreserveDark > 0.0 && yBase <= uPreserveDark) {
        vec3 keep = uPMA ? tex.rgb * tex.a : tex.rgb;
        float a   = tex.a * uGlobalAlpha;
        if (uPMA) keep *= uGlobalAlpha;
        gl_FragColor = vec4(keep, a);
        return;
      }

      // Weighted target from mask channels; unspecified channels are BLACK (0)
      vec3 target = uColR * m.r + uColG * m.g + uColB * m.b + uColA * m.a;

      // Shade mode: retain base luminance if desired
      float shade  = max(0.0, yBase);
      vec3  shaded = mix(target, target * shade, uShadeMode);

      // Auto-fallback: if mask is empty at this pixel, treat it as fully masked
      if (uAutoFallback > 0.5 && w <= 0.0001) {
        w = 1.0;
      }

      // Mix with original by (mask coverage * strength)
      vec3 outRgb = mix(tex.rgb, shaded, w * uStrength);
      float outA  = tex.a * uGlobalAlpha;

      if (uPMA) outRgb *= outA;

      gl_FragColor = vec4(outRgb, outA);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uMap:           { value: baseMap },
      uMask:          { value: maskMap },
      uColR:          { value: colR },
      uColG:          { value: colG },
      uColB:          { value: colB },
      uColA:          { value: colA },
      uAlphaTest:     { value: alphaTest },
      uPMA:           { value: pma },
      uStrength:      { value: strength },
      uShadeMode:     { value: mode === "shade" ? 1.0 : 0.0 },
      uPreserveDark:  { value: preserve },
      uGlobalAlpha:   { value: 1.0 },
      uDebugMask:     { value: 0.0 },
      uAutoFallback:  { value: 1.0 },
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });
}

export function updateMaskRecolorColors(
  mat: THREE.ShaderMaterial,
  colors: MaskRecolorColors
) {
  if (!mat || !(mat as any).uniforms) return;
  const u = (mat as any).uniforms;
  if (colors.r !== undefined) (u.uColR.value as THREE.Color).set(colors.r as any);
  if (colors.g !== undefined) (u.uColG.value as THREE.Color).set(colors.g as any);
  if (colors.b !== undefined) (u.uColB.value as THREE.Color).set(colors.b as any);
  if (colors.a !== undefined) (u.uColA.value as THREE.Color).set(colors.a as any);
}

export function updateMaskRecolorOptions(
  mat: THREE.ShaderMaterial,
  opts: Partial<MaskRecolorOptions>
) {
  if (!mat || !(mat as any).uniforms) return;
  const u = (mat as any).uniforms;
  if (opts.alphaTest !== undefined)            u.uAlphaTest.value = opts.alphaTest;
  if (opts.premultipliedAlpha !== undefined)   u.uPMA.value       = !!opts.premultipliedAlpha;
  if (opts.strength !== undefined)             u.uStrength.value  = Math.max(0, Math.min(1, opts.strength));
  if (opts.mode !== undefined)                 u.uShadeMode.value = opts.mode === "shade" ? 1.0 : 0.0;
  if (opts.preserveDarkThreshold !== undefined)u.uPreserveDark.value = Math.max(0, Math.min(1, opts.preserveDarkThreshold));
  if (opts.debugMaskView !== undefined)        u.uDebugMask.value = opts.debugMaskView ? 1.0 : 0.0;
  if (opts.autoFallbackWhenMaskEmpty !== undefined) u.uAutoFallback.value = opts.autoFallbackWhenMaskEmpty ? 1.0 : 0.0;
}

export function updateMaskRecolorAlpha(mat: THREE.ShaderMaterial, a: number) {
  if (!mat || !(mat as any).uniforms) return;
  (mat as any).uniforms.uGlobalAlpha.value = Math.max(0, Math.min(1, a));
}
