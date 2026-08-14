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
export const LOCK_GRAY = "#B9AFA0";

// Physical depth, not digital gloss: low-opacity contact shadows, no glossy
// highlights/elevation. Selected/equipped elements get a slightly stronger
// shadow so they read as physically raised.
export const SHADOW_CARD = {
  shadowColor: "#2A1C16",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 3,
};

export const SHADOW_CARD_RAISED = {
  shadowColor: "#2A1C16",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.22,
  shadowRadius: 8,
  elevation: 5,
};

export const SHADOW_PANEL = {
  shadowColor: "#2A1C16",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 4,
};

// Deterministic per-card tilt so the grid feels handmade without looking
// disorganized. Cycled by item index, not randomized.
export const CARD_ROTATIONS = [-1.0, 0.4, -0.6, 0.8, -0.3, 0.5];

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
