import * as THREE from 'three';
import { MaskRecolorColors } from '../../../spine/MaskRecolor';

/**
 * Color schemes for wall furniture that uses mask recoloring
 * Red channel = main color, Green channel = shadow color (darker)
 */

export interface FurnitureColorScheme {
  id: string;
  name: string;
  colors: MaskRecolorColors;
}

/**
 * Generate a shadow color that's darker than the main color
 */
function generateShadowColor(mainColor: number): number {
  const color = new THREE.Color(mainColor);
  // Darken by reducing brightness by 40%
  color.multiplyScalar(0.6);
  return color.getHex();
}

/**
 * Available color schemes for bookshelves and hex shelves
 */
export const FURNITURE_COLOR_SCHEMES: FurnitureColorScheme[] = [
  {
    id: 'classic_brown',
    name: 'Classic Brown',
    colors: {
      r: 0x8B4513, // Saddle brown
      g: generateShadowColor(0x8B4513), // Darker brown shadow
    }
  },
  {
    id: 'warm_oak',
    name: 'Warm Oak',
    colors: {
      r: 0xD2691E, // Chocolate
      g: generateShadowColor(0xD2691E), // Darker chocolate shadow
    }
  },
  {
    id: 'dark_walnut',
    name: 'Dark Walnut',
    colors: {
      r: 0x654321, // Dark brown
      g: generateShadowColor(0x654321), // Very dark brown shadow
    }
  },
  {
    id: 'cherry_wood',
    name: 'Cherry Wood',
    colors: {
      r: 0xA0522D, // Sienna
      g: generateShadowColor(0xA0522D), // Darker sienna shadow
    }
  },
  {
    id: 'pine_natural',
    name: 'Natural Pine',
    colors: {
      r: 0xDEB887, // Burlywood
      g: generateShadowColor(0xDEB887), // Darker burlywood shadow
    }
  },
  {
    id: 'ebony_black',
    name: 'Ebony Black',
    colors: {
      r: 0x2F1B14, // Very dark brown
      g: generateShadowColor(0x2F1B14), // Near black shadow
    }
  },
  {
    id: 'white_painted',
    name: 'White Painted',
    colors: {
      r: 0xF5F5DC, // Beige
      g: generateShadowColor(0xF5F5DC), // Darker beige shadow
    }
  },
  {
    id: 'blue_painted',
    name: 'Blue Painted',
    colors: {
      r: 0x4682B4, // Steel blue
      g: generateShadowColor(0x4682B4), // Darker steel blue shadow
    }
  },
  {
    id: 'green_painted',
    name: 'Green Painted',
    colors: {
      r: 0x6B8E23, // Olive drab
      g: generateShadowColor(0x6B8E23), // Darker olive shadow
    }
  },
  {
    id: 'red_stained',
    name: 'Red Stained',
    colors: {
      r: 0xA0522D, // Sienna
      g: generateShadowColor(0xA0522D), // Darker sienna shadow
    }
  }
];

/**
 * Get color scheme by ID
 */
export function getFurnitureColorScheme(id: string): FurnitureColorScheme | null {
  return FURNITURE_COLOR_SCHEMES.find(scheme => scheme.id === id) || null;
}

/**
 * Get default color scheme
 */
export function getDefaultFurnitureColorScheme(): FurnitureColorScheme {
  return FURNITURE_COLOR_SCHEMES[0]; // Classic brown
}

/**
 * Create mask recolor colors with custom main and shadow colors
 */
export function createCustomFurnitureColors(mainColor: number, shadowColor?: number): MaskRecolorColors {
  return {
    r: mainColor,
    g: shadowColor || generateShadowColor(mainColor),
  };
}

/**
 * Premade colorways for the static-atlas furniture path (ShadedFurniture.atlas
 * -- see render/staticFurnitureBillboard3D.ts). Unlike FURNITURE_COLOR_SCHEMES
 * above (a flat main+shadow pair for the legacy Spine mask-recolor shader,
 * MaskRecolor.ts), this art is painted in three independent flat
 * classification colors (confirmed by sampling the source PNG directly --
 * see buildFurnitureAtlasMetadata.ts's channel-usage notes), recolored via
 * the hue-indexed shader (HueIndexedRecolor.ts) already used for GliderMon's
 * own skin/outfit recoloring and the legacy wall-furniture shader path
 * (WallFurnitureLoader.ts).
 *
 * Reuses the exact `CosmeticPalette` type Outfit's colorways use
 * (data/cosmetics/palette.ts) rather than a parallel furniture-only shape --
 * `resolveCosmeticRecolor`/`resolveSelectedPalette`/`isPaletteLocked`/
 * `ColorwaySheet`/`PaletteCard` all work against this structurally, with no
 * furniture-specific branching needed. `channelColors.r/g/b` map onto this
 * art's red/green/blue classification channels the same way they map onto a
 * cosmetic's guide-art channels; `a`/yellow is unused here (no furniture item
 * uses a 4th channel). "original" (matching palette.ts's DEFAULT_PALETTE_ID)
 * reproduces the as-authored literal red/green/blue look, so a freshly
 * placed item's default appearance doesn't change.
 *
 * One shared array reused across every recolorable furniture item the same
 * way HAIR_PALETTES (cosmeticsStore.ts) is shared across many hair-style
 * cosmetics, rather than curating a subset per item -- not every item uses
 * all three channels (e.g. carved_wood_chair only paints its red channel),
 * but recoloring an unused channel is harmless, it just has no pixels to
 * apply to for that item.
 *
 * Named/weighted by mood (see [[feedback-luma-sable-personality]] --
 * Luma = cheery/bright/nature, Sable = goth/moody/dark) for when this list
 * needs shop-facing weighting elsewhere; the picker itself shows all of them
 * to everyone.
 */
export const FURNITURE_RECOLOR_PALETTES: import("../../../data/cosmetics/palette").CosmeticPalette[] = [
  { id: 'original', name: 'Original', colors: ['#ff0000', '#00ff00', '#0000ff'], channelColors: { r: '#ff0000', g: '#00ff00', b: '#0000ff' } },
  { id: 'sunset_coral', name: 'Sunset Coral', colors: ['#e8734a', '#f2b705', '#7a4ca0'], channelColors: { r: '#e8734a', g: '#f2b705', b: '#7a4ca0' } },
  { id: 'midnight_violet', name: 'Midnight Violet', colors: ['#4a2e6b', '#2f1f45', '#1a1030'], channelColors: { r: '#4a2e6b', g: '#2f1f45', b: '#1a1030' } },
  { id: 'forest_moss', name: 'Forest Moss', colors: ['#6f8f4e', '#3f5c34', '#8a6b3f'], channelColors: { r: '#6f8f4e', g: '#3f5c34', b: '#8a6b3f' } },
  { id: 'ocean_teal', name: 'Ocean Teal', colors: ['#2f7f8a', '#1c5560', '#0d3138'], channelColors: { r: '#2f7f8a', g: '#1c5560', b: '#0d3138' } },
  { id: 'blush_pink', name: 'Blush', colors: ['#e79ab5', '#f6d3de', '#c96a94'], channelColors: { r: '#e79ab5', g: '#f6d3de', b: '#c96a94' } },
  { id: 'charcoal_slate', name: 'Charcoal Slate', colors: ['#4a4a52', '#33333a', '#1c1c22'], channelColors: { r: '#4a4a52', g: '#33333a', b: '#1c1c22' } },
  { id: 'golden_amber', name: 'Golden Amber', colors: ['#d99a2b', '#a8671e', '#4a2f14'], channelColors: { r: '#d99a2b', g: '#a8671e', b: '#4a2f14' } },
  { id: 'blood_crimson', name: 'Blood Crimson', colors: ['#8a1f2b', '#4a1017', '#1a0a0d'], channelColors: { r: '#8a1f2b', g: '#4a1017', b: '#1a0a0d' } },
  { id: 'mint_frost', name: 'Mint Frost', colors: ['#7fd9c4', '#a8ecd9', '#4fa694'], channelColors: { r: '#7fd9c4', g: '#a8ecd9', b: '#4fa694' } },
  { id: 'royal_cobalt', name: 'Royal Cobalt', colors: ['#2c4a8a', '#1a2f5c', '#0d1a33'], channelColors: { r: '#2c4a8a', g: '#1a2f5c', b: '#0d1a33' } },
  { id: 'toxic_slime', name: 'Toxic Slime', colors: ['#6fbf3f', '#4a8a26', '#274a14'], channelColors: { r: '#6fbf3f', g: '#4a8a26', b: '#274a14' } },
  { id: 'cotton_candy', name: 'Cotton Candy', colors: ['#f4a6d9', '#a6d9f4', '#d9a6f4'], channelColors: { r: '#f4a6d9', g: '#a6d9f4', b: '#d9a6f4' } },
];