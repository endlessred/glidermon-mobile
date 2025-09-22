// Palette swap system for character customization
// Based on the indexed color palette from glidermonpalette.png

// Palette indices from index.md
export const PALETTE_INDICES = {
  // Core character structure (not swappable)
  BLANK: 0,
  BLACK_OUTLINES: 1,
  DARK_INNER_LINES: 2,

  // Eye system (swappable)
  EYE_OUTLINE_PUPIL: 3,
  EYE_COLOR: 12,
  EYE_SHINE: 20, // white - shoelaces, eye shine

  // Skin system (swappable)
  DARK_OUTER_PARTS: 4,      // darker color of outer ears, wings, tail
  DARK_NOSE: 5,             // dark part of nose
  DARK_INNER_EAR: 6,        // dark inner ear
  NOSE_SHINE: 7,            // nose shine
  BRIGHT_OUTER_EAR: 8,      // bright outer ear
  MID_SKIN: 9,              // mid brightness skin color
  LIGHT_SKIN: 10,           // lightest brightness skin color
  MAIN_SKIN: 11,            // main face and arm skin
  BRIGHT_BELLY_FACE: 18,    // bright belly and lower face
  INNER_HEAD_STRIPE: 21,    // inner head stripe
  HEAD_STRIPE_OUTLINE: 32,  // head stripe outline

  // Shoe system (swappable)
  OUTER_SHOE: 14,           // outer shoe
  INNER_SHOE: 15,           // inner shoe
  OUTER_SHOE_SOLE: 17,      // outer shoe sole
  INNER_SHOE_SOLE: 19,      // inner shoe sole
  SHOELACES: 20,            // white - shoelaces, eye shine (shared with eye shine)
} as const;

// Default skin palette (original colors)
export const DEFAULT_SKIN_PALETTE: Record<number, string> = {
  [PALETTE_INDICES.DARK_OUTER_PARTS]: '#8B7355',
  [PALETTE_INDICES.DARK_NOSE]: '#6B5B47',
  [PALETTE_INDICES.DARK_INNER_EAR]: '#5A4A38',
  [PALETTE_INDICES.NOSE_SHINE]: '#F5E6D3',
  [PALETTE_INDICES.BRIGHT_OUTER_EAR]: '#D4C4A8',
  [PALETTE_INDICES.MID_SKIN]: '#B8A082',
  [PALETTE_INDICES.LIGHT_SKIN]: '#E8D8BC',
  [PALETTE_INDICES.MAIN_SKIN]: '#C8B496',
  [PALETTE_INDICES.BRIGHT_BELLY_FACE]: '#F0E0C4',
  [PALETTE_INDICES.INNER_HEAD_STRIPE]: '#A08870',
  [PALETTE_INDICES.HEAD_STRIPE_OUTLINE]: '#70604E',
};

// Default eye palette
export const DEFAULT_EYE_PALETTE: Record<number, string> = {
  [PALETTE_INDICES.EYE_COLOR]: '#4A90E2',
  [PALETTE_INDICES.EYE_SHINE]: '#FFFFFF',
};

// Default shoe palette
export const DEFAULT_SHOE_PALETTE: Record<number, string> = {
  [PALETTE_INDICES.OUTER_SHOE]: '#8B4513',
  [PALETTE_INDICES.INNER_SHOE]: '#A0522D',
  [PALETTE_INDICES.OUTER_SHOE_SOLE]: '#654321',
  [PALETTE_INDICES.INNER_SHOE_SOLE]: '#8B4513',
  [PALETTE_INDICES.SHOELACES]: '#FFFFFF',
};

// Predefined skin variations
export const SKIN_VARIATIONS: Record<string, Record<number, string>> = {
  default: DEFAULT_SKIN_PALETTE,

  fair: {
    [PALETTE_INDICES.DARK_OUTER_PARTS]: '#D4B896',
    [PALETTE_INDICES.DARK_NOSE]: '#C4A886',
    [PALETTE_INDICES.DARK_INNER_EAR]: '#B49876',
    [PALETTE_INDICES.NOSE_SHINE]: '#FFF8F0',
    [PALETTE_INDICES.BRIGHT_OUTER_EAR]: '#F0E4D8',
    [PALETTE_INDICES.MID_SKIN]: '#E4D0B4',
    [PALETTE_INDICES.LIGHT_SKIN]: '#F8F0E4',
    [PALETTE_INDICES.MAIN_SKIN]: '#ECD8BC',
    [PALETTE_INDICES.BRIGHT_BELLY_FACE]: '#FFFCF8',
    [PALETTE_INDICES.INNER_HEAD_STRIPE]: '#D8C4A8',
    [PALETTE_INDICES.HEAD_STRIPE_OUTLINE]: '#C4B098',
  },

  tan: {
    [PALETTE_INDICES.DARK_OUTER_PARTS]: '#A0805C',
    [PALETTE_INDICES.DARK_NOSE]: '#90704C',
    [PALETTE_INDICES.DARK_INNER_EAR]: '#80603C',
    [PALETTE_INDICES.NOSE_SHINE]: '#F0DCC8',
    [PALETTE_INDICES.BRIGHT_OUTER_EAR]: '#C8A884',
    [PALETTE_INDICES.MID_SKIN]: '#B89064',
    [PALETTE_INDICES.LIGHT_SKIN]: '#D8B894',
    [PALETTE_INDICES.MAIN_SKIN]: '#C0A074',
    [PALETTE_INDICES.BRIGHT_BELLY_FACE]: '#E8CCA8',
    [PALETTE_INDICES.INNER_HEAD_STRIPE]: '#A88860',
    [PALETTE_INDICES.HEAD_STRIPE_OUTLINE]: '#887050',
  },

  dark: {
    [PALETTE_INDICES.DARK_OUTER_PARTS]: '#6B4423',
    [PALETTE_INDICES.DARK_NOSE]: '#5B3813',
    [PALETTE_INDICES.DARK_INNER_EAR]: '#4B2803',
    [PALETTE_INDICES.NOSE_SHINE]: '#D8B896',
    [PALETTE_INDICES.BRIGHT_OUTER_EAR]: '#8B6443',
    [PALETTE_INDICES.MID_SKIN]: '#7B5433',
    [PALETTE_INDICES.LIGHT_SKIN]: '#9B7453',
    [PALETTE_INDICES.MAIN_SKIN]: '#8B6443',
    [PALETTE_INDICES.BRIGHT_BELLY_FACE]: '#AB8463',
    [PALETTE_INDICES.INNER_HEAD_STRIPE]: '#6B4423',
    [PALETTE_INDICES.HEAD_STRIPE_OUTLINE]: '#4B3013'
  },
};

// Predefined eye color variations
export const EYE_COLOR_VARIATIONS: Record<string, Record<number, string>> = {
  blue: { [PALETTE_INDICES.EYE_COLOR]: '#4A90E2' },
  brown: { [PALETTE_INDICES.EYE_COLOR]: '#8B4513' },
  green: { [PALETTE_INDICES.EYE_COLOR]: '#228B22' },
  hazel: { [PALETTE_INDICES.EYE_COLOR]: '#8E7618' },
  gray: { [PALETTE_INDICES.EYE_COLOR]: '#708090' },
  violet: { [PALETTE_INDICES.EYE_COLOR]: '#8A2BE2' },
};

// Predefined shoe variations
export const SHOE_VARIATIONS: Record<string, Record<number, string>> = {
  brown: DEFAULT_SHOE_PALETTE,

  black: {
    [PALETTE_INDICES.OUTER_SHOE]: '#2F2F2F',
    [PALETTE_INDICES.INNER_SHOE]: '#1F1F1F',
    [PALETTE_INDICES.OUTER_SHOE_SOLE]: '#0F0F0F',
    [PALETTE_INDICES.INNER_SHOE_SOLE]: '#2F2F2F',
    [PALETTE_INDICES.SHOELACES]: '#FFFFFF',
  },

  red: {
    [PALETTE_INDICES.OUTER_SHOE]: '#DC143C',
    [PALETTE_INDICES.INNER_SHOE]: '#B22222',
    [PALETTE_INDICES.OUTER_SHOE_SOLE]: '#8B0000',
    [PALETTE_INDICES.INNER_SHOE_SOLE]: '#A0252F',
    [PALETTE_INDICES.SHOELACES]: '#FFFFFF',
  },

  blue: {
    [PALETTE_INDICES.OUTER_SHOE]: '#4169E1',
    [PALETTE_INDICES.INNER_SHOE]: '#0000CD',
    [PALETTE_INDICES.OUTER_SHOE_SOLE]: '#000080',
    [PALETTE_INDICES.INNER_SHOE_SOLE]: '#1E90FF',
    [PALETTE_INDICES.SHOELACES]: '#FFFFFF',
  },

  white: {
    [PALETTE_INDICES.OUTER_SHOE]: '#F8F8FF',
    [PALETTE_INDICES.INNER_SHOE]: '#F0F0F0',
    [PALETTE_INDICES.OUTER_SHOE_SOLE]: '#D3D3D3',
    [PALETTE_INDICES.INNER_SHOE_SOLE]: '#E8E8E8',
    [PALETTE_INDICES.SHOELACES]: '#C0C0C0',
  },
};

// Utility function to create a complete palette for Skia
export function createCompletePalette(
  skinVariation: string = 'default',
  eyeColor: string = 'blue',
  shoeVariation: string = 'brown'
): Record<number, string> {
  const skinPalette = SKIN_VARIATIONS[skinVariation] || SKIN_VARIATIONS.default;
  const eyePalette = EYE_COLOR_VARIATIONS[eyeColor] || EYE_COLOR_VARIATIONS.blue;
  const shoePalette = SHOE_VARIATIONS[shoeVariation] || SHOE_VARIATIONS.brown;

  return {
    // Fixed colors (non-swappable)
    [PALETTE_INDICES.BLANK]: '#000000', // transparent in actual use
    [PALETTE_INDICES.BLACK_OUTLINES]: '#000000',
    [PALETTE_INDICES.DARK_INNER_LINES]: '#1A1A1A',
    [PALETTE_INDICES.EYE_OUTLINE_PUPIL]: '#000000',

    // Variable colors
    ...skinPalette,
    ...eyePalette,
    ...shoePalette,
  };
}

// Convert palette to format usable by Skia ColorFilter
export function paletteToSkiaColorMap(palette: Record<number, string>): number[] {
  // Create a 256-entry color map where each palette index maps to its color
  const colorMap = new Array(256).fill(0xFF000000); // Default to transparent black

  Object.entries(palette).forEach(([index, color]) => {
    const idx = parseInt(index);
    if (idx >= 0 && idx < 256) {
      // Convert hex color to ARGB number
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      colorMap[idx] = 0xFF000000 | (r << 16) | (g << 8) | b;
    }
  });

  return colorMap;
}