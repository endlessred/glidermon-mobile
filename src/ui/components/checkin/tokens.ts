// components/checkin/tokens.ts
// The check-in ritual reuses the shared hand-crafted kit (INK/CREAM/felt/
// wobble/shadows) and adds only a small, restrained "morning" accent set on
// top -- it is deliberately NOT a second design system. Cream paper + dark
// brown ink stay the shared base; the accents below are used sparingly for
// the intro CTA, the selected/completion state, and the reward card.

export {
  INK,
  INK_MUTED,
  CREAM,
  CREAM_LIGHT,
  KRAFT_TAN,
  CORK_BROWN,
  GOLD,
  FELT_GREEN,
  FELT_GREEN_DARK,
  PALE_GREEN,
  LAVENDER_PAPER,
  WOBBLE_RADIUS,
  WOBBLE_RADIUS_SM,
  SHADOW_CARD,
  SHADOW_CARD_RAISED,
  SHADOW_PANEL,
} from "../handcrafted/tokens";

// Very light warm cream/paper ground for the full-screen ritual surface --
// a touch lighter and warmer than CREAM so the flow reads calmer than Shop
// or Outfit.
export const PAPER_SURFACE = "#FBF3E4";

// Morning accents -- soft, low-saturation, physical. Sunrise yellow for the
// opening CTA, warm peach as an occasional secondary wash.
export const SUNRISE_YELLOW = "#F1CE86";
export const WARM_PEACH = "#F1C6A2";

// Grain + decoration assets (grayscale noise maps that ride on a real base
// colour at low opacity, same convention as CraftPanel).
export const PAPER_GRAIN = require("../../../assets/UI Assets/Textures/ConstructionPaper.png");
export const FELT_TEXTURE = require("../../../assets/UI Assets/Textures/Felt.png");
export const FELT_ACORN = require("../../../assets/UI Assets/Decorations/FeltAcorn.png");
export const STAR_PATCH = require("../../../assets/UI Assets/Decorations/StarPatch.png");
