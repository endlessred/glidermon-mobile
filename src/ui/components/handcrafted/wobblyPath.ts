// components/handcrafted/wobblyPath.ts
// Deterministic "hand-cut" rounded-rect SVG path generator. Same seed always
// produces the same shape, so a card's silhouette doesn't jitter between
// re-renders, but different seeds (e.g. item index) read as individually
// hand-cut rather than machine-stamped.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type CornerRadii = { tl: number; tr: number; br: number; bl: number };

// Subtle per-corner jitter around a base radius -- NOT dramatic/torn, just
// enough to read as slightly irregular cardstock.
export function wobblyCorners(baseRadius: number, seed: number, jitter = 2.5): CornerRadii {
  const rand = mulberry32(seed);
  const j = () => Math.max(2, baseRadius + (rand() * 2 - 1) * jitter);
  return { tl: j(), tr: j(), br: j(), bl: j() };
}

// Rounded-rect path built from explicit per-corner radii, for a shape of
// size (width x height) with its top-left at the path's local (0,0) --
// wrap in an SVG <G transform="translate(x,y)"> to position/inset it.
export function roundedRectPath(width: number, height: number, r: CornerRadii): string {
  const tl = Math.max(0, Math.min(r.tl, width / 2, height / 2));
  const tr = Math.max(0, Math.min(r.tr, width / 2, height / 2));
  const br = Math.max(0, Math.min(r.br, width / 2, height / 2));
  const bl = Math.max(0, Math.min(r.bl, width / 2, height / 2));

  return [
    `M ${tl} 0`,
    `L ${width - tr} 0`,
    `A ${tr} ${tr} 0 0 1 ${width} ${tr}`,
    `L ${width} ${height - br}`,
    `A ${br} ${br} 0 0 1 ${width - br} ${height}`,
    `L ${bl} ${height}`,
    `A ${bl} ${bl} 0 0 1 0 ${height - bl}`,
    `L 0 ${tl}`,
    `A ${tl} ${tl} 0 0 1 ${tl} 0`,
    "Z",
  ].join(" ");
}

// One-call helper: wobbly rounded-rect path sized to (width x height),
// deterministic from `seed`.
export function wobblyRoundedRectPath(width: number, height: number, seed: number, baseRadius = 14, jitter = 2.5): string {
  return roundedRectPath(width, height, wobblyCorners(baseRadius, seed, jitter));
}
