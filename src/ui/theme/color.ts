// ui/theme/color.ts
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function hexToRgb(hex: string) {
  const m = hex.replace("#", "");
  const bigint = parseInt(m.length === 3 ? m.split("").map(c => c + c).join("") : m, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

export function rgbToHex(r: number, g: number, b: number) {
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function lighten(hex: string, amt = 0.1) {
  const { r, g, b } = hexToRgb(hex);
  const L = (v: number) => Math.round(v + (255 - v) * clamp01(amt));
  return rgbToHex(L(r), L(g), L(b));
}

export function darken(hex: string, amt = 0.1) {
  const { r, g, b } = hexToRgb(hex);
  const D = (v: number) => Math.round(v * (1 - clamp01(amt)));
  return rgbToHex(D(r), D(g), D(b));
}