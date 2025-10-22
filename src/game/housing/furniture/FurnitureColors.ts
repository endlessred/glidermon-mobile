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