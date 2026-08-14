// components/handcrafted/tokens.ts
// Shared palette + shape constants for the hand-crafted UI kit. Native
// View borders/radii (rather than stretched SVG art) so shapes never warp
// when stretched to an arbitrary card's aspect ratio.

export const INK = "#4A312C";
export const INK_MUTED = "#7C5A4A";
export const CREAM = "#F8EEDC";
export const CREAM_LIGHT = "#FFF8ED";
export const FELT_GREEN = "#8FBF82";
export const FELT_GREEN_DARK = "#2E4B29";
export const KRAFT_TAN = "#C9A06B";
export const CORK_BROWN = "#B98F62";
export const GOLD = "#E3B54D";

// A slightly asymmetric corner radius reused everywhere so cards read as
// hand-cut rather than machine-perfect, without needing a wobbly SVG path
// (which distorts badly when non-uniformly stretched to fit real content).
export const WOBBLE_RADIUS = {
  borderTopLeftRadius: 20,
  borderTopRightRadius: 26,
  borderBottomRightRadius: 18,
  borderBottomLeftRadius: 24,
};

export const WOBBLE_RADIUS_SM = {
  borderTopLeftRadius: 10,
  borderTopRightRadius: 14,
  borderBottomRightRadius: 9,
  borderBottomLeftRadius: 13,
};
