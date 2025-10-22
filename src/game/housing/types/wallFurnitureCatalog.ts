import { FurnitureCatalog } from './RoomConfig';
import { FURNITURE_COLOR_SCHEMES, FurnitureColorScheme } from '../furniture/FurnitureColors';

/**
 * Wall furniture and art catalog
 * Based on WallFurnAndArt.json spine file structure
 */

export interface WallFurnitureDef {
  id: string;
  skeleton: string; // "WallFurnAndArt"
  category: 'furniture' | 'art';
  placementType: 'wall'; // Always wall-mounted
  supportedWalls: ('LeftBack' | 'RightBack')[];
  supportsLayers: ('background' | 'foreground')[];
  supportsFlipping: boolean;
  variants: WallFurnitureVariant[];
}

export interface WallFurnitureVariant {
  id: string;
  name: string;
  slots: {
    wall?: string; // Wall slot attachment
    wallFurn1?: string; // Background furniture slot
    wallFurnFront?: string; // Foreground furniture slot
    art?: string; // Art slot attachment
  };
  layer: 'background' | 'foreground';
  colorScheme?: string; // Optional color scheme ID for mask recoloring
}

export const WALL_FURNITURE_CATALOG: Record<string, WallFurnitureDef> = {
  bookshelf: {
    id: "bookshelf",
    skeleton: "WallFurnAndArt",
    category: "furniture",
    placementType: "wall",
    supportedWalls: ["LeftBack", "RightBack"],
    supportsLayers: ["background", "foreground"],
    supportsFlipping: true,
    variants: [
      // Classic Brown (default) - shader only
      {
        id: "bookshelf_brown_shader",
        name: "Bookshelf Shader (Classic Brown)",
        slots: {
          wallFurn1: "Bookshelf_Shader"
        },
        layer: "background",
        colorScheme: "classic_brown"
      },
      // Classic Brown - front layer (no shader)
      {
        id: "bookshelf_brown_front",
        name: "Bookshelf Front (Classic Brown)",
        slots: {
          wallFurnFront: "Bookshelf"
        },
        layer: "foreground"
      },
      // Warm Oak - shader only
      {
        id: "bookshelf_oak_shader",
        name: "Bookshelf Shader (Warm Oak)",
        slots: {
          wallFurn1: "Bookshelf_Shader"
        },
        layer: "background",
        colorScheme: "warm_oak"
      },
      // Warm Oak - front layer (no shader)
      {
        id: "bookshelf_oak_front",
        name: "Bookshelf Front (Warm Oak)",
        slots: {
          wallFurnFront: "Bookshelf"
        },
        layer: "foreground"
      },
      // Dark Walnut - shader only
      {
        id: "bookshelf_walnut_shader",
        name: "Bookshelf Shader (Dark Walnut)",
        slots: {
          wallFurn1: "Bookshelf_Shader"
        },
        layer: "background",
        colorScheme: "dark_walnut"
      },
      // Dark Walnut - front layer (no shader)
      {
        id: "bookshelf_walnut_front",
        name: "Bookshelf Front (Dark Walnut)",
        slots: {
          wallFurnFront: "Bookshelf"
        },
        layer: "foreground"
      }
    ]
  },

  hexShelf: {
    id: "hexShelf",
    skeleton: "WallFurnAndArt",
    category: "furniture",
    placementType: "wall",
    supportedWalls: ["LeftBack", "RightBack"],
    supportsLayers: ["background"],
    supportsFlipping: true,
    variants: [
      // Classic Brown
      {
        id: "hex_shelf_brown",
        name: "Hex Shelf (Classic Brown)",
        slots: {
          wallFurn1: "HexShelf_Shader"
        },
        layer: "background",
        colorScheme: "classic_brown"
      },
      // Pine Natural
      {
        id: "hex_shelf_pine",
        name: "Hex Shelf (Natural Pine)",
        slots: {
          wallFurn1: "HexShelf_Shader"
        },
        layer: "background",
        colorScheme: "pine_natural"
      },
      // Green Painted
      {
        id: "hex_shelf_green",
        name: "Hex Shelf (Green Painted)",
        slots: {
          wallFurn1: "HexShelf_Shader"
        },
        layer: "background",
        colorScheme: "green_painted"
      }
    ]
  },

  wallArt: {
    id: "wallArt",
    skeleton: "WallFurnAndArt",
    category: "art",
    placementType: "wall",
    supportedWalls: ["LeftBack", "RightBack"],
    supportsLayers: ["foreground"],
    supportsFlipping: true,
    variants: [
      {
        id: "poster_map",
        name: "Map Poster",
        slots: {
          wall: "Sides2",
          art: "PosterMap"
        },
        layer: "foreground"
      },
      {
        id: "poster_ufo",
        name: "UFO Poster",
        slots: {
          wall: "Sides2",
          art: "PosterUFO"
        },
        layer: "foreground"
      },
      {
        id: "landscape_dark",
        name: "Dark Landscape Painting",
        slots: {
          wall: "Sides2",
          art: "Landscape_Dark"
        },
        layer: "foreground"
      },
      {
        id: "pinboard_polaroids",
        name: "Pinboard with Polaroids",
        slots: {
          wall: "Sides2",
          art: "PinboardPolaroids_DarkWood"
        },
        layer: "foreground"
      },
      {
        id: "pinboard_string",
        name: "String Pinboard",
        slots: {
          wall: "Sides2",
          art: "PinboardString_FantasyWood"
        },
        layer: "foreground"
      },
      {
        id: "modern_clock_beige",
        name: "Modern Clock (Beige)",
        slots: {
          wall: "Sides2",
          art: "ModernClock_Beige"
        },
        layer: "foreground"
      },
      {
        id: "modern_clock_blue",
        name: "Modern Clock (Blue)",
        slots: {
          wall: "Sides2",
          art: "ModernClock_Blue"
        },
        layer: "foreground"
      },
      {
        id: "round_clock_beige",
        name: "Round Clock (Beige)",
        slots: {
          wall: "Sides2",
          art: "RoundClock_Beige"
        },
        layer: "foreground"
      }
    ]
  }
};

/**
 * Helper function to get wall furniture definition
 */
export function getWallFurnitureDef(id: string): WallFurnitureDef | null {
  return WALL_FURNITURE_CATALOG[id] || null;
}

/**
 * Helper function to get wall furniture variant
 */
export function getWallFurnitureVariant(furnitureId: string, variantId: string): WallFurnitureVariant | null {
  const def = getWallFurnitureDef(furnitureId);
  if (!def) return null;

  return def.variants.find(v => v.id === variantId) || null;
}

/**
 * Check if wall furniture should be flipped based on wall type
 */
export function shouldFlipWallFurniture(wallType: 'LeftBack' | 'RightBack'): boolean {
  // RightBack walls need to be flipped to face the correct direction
  return wallType === 'RightBack';
}