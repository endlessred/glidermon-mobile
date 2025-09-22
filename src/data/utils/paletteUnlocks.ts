// Palette unlock logic based on player progression
import type { SkinVariation, ShoeVariation } from "../types/outfitTypes";

// Define unlock levels for different palette options
export const SKIN_UNLOCK_LEVELS: Record<SkinVariation, number> = {
  'default': 1,  // Always unlocked
  'fair': 5,     // Unlock at level 5
  'tan': 10,     // Unlock at level 10
  'dark': 15,    // Unlock at level 15
};

export const SHOE_UNLOCK_LEVELS: Record<ShoeVariation, number> = {
  'brown': 1,    // Always unlocked
  'black': 3,    // Unlock at level 3
  'red': 7,      // Unlock at level 7
  'blue': 12,    // Unlock at level 12
  'white': 20,   // Unlock at level 20
};

// Get all skins that should be unlocked at the given level
export function getUnlockedSkinsAtLevel(level: number): SkinVariation[] {
  return Object.entries(SKIN_UNLOCK_LEVELS)
    .filter(([_, unlockLevel]) => level >= unlockLevel)
    .map(([skin, _]) => skin as SkinVariation);
}

// Get all shoes that should be unlocked at the given level
export function getUnlockedShoesAtLevel(level: number): ShoeVariation[] {
  return Object.entries(SHOE_UNLOCK_LEVELS)
    .filter(([_, unlockLevel]) => level >= unlockLevel)
    .map(([shoe, _]) => shoe as ShoeVariation);
}

// Check if a skin should be unlocked at the given level
export function shouldSkinBeUnlocked(skin: SkinVariation, level: number): boolean {
  return level >= SKIN_UNLOCK_LEVELS[skin];
}

// Check if a shoe should be unlocked at the given level
export function shouldShoeBeUnlocked(shoe: ShoeVariation, level: number): boolean {
  return level >= SHOE_UNLOCK_LEVELS[shoe];
}

// Get newly unlocked items when leveling up
export function getNewlyUnlockedItems(fromLevel: number, toLevel: number): {
  skins: SkinVariation[];
  shoes: ShoeVariation[];
} {
  const skins = Object.entries(SKIN_UNLOCK_LEVELS)
    .filter(([_, unlockLevel]) => unlockLevel > fromLevel && unlockLevel <= toLevel)
    .map(([skin, _]) => skin as SkinVariation);

  const shoes = Object.entries(SHOE_UNLOCK_LEVELS)
    .filter(([_, unlockLevel]) => unlockLevel > fromLevel && unlockLevel <= toLevel)
    .map(([shoe, _]) => shoe as ShoeVariation);

  return { skins, shoes };
}