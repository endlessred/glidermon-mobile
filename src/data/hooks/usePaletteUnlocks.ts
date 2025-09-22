// Hook for automatic palette unlocks based on player progression
import { useEffect } from 'react';
import { useProgressionStore } from '../stores/progressionStore';
import { useOutfitStore } from '../stores/outfitStore';
import { useToastStore } from '../stores/toastStore';
import { getUnlockedSkinsAtLevel, getUnlockedShoesAtLevel, getNewlyUnlockedItems } from '../utils/paletteUnlocks';

export function usePaletteUnlocks() {
  const level = useProgressionStore(s => s.level);
  const unlockedSkins = useOutfitStore(s => s.unlockedSkins);
  const unlockedShoes = useOutfitStore(s => s.unlockedShoes);
  const unlockSkin = useOutfitStore(s => s.unlockSkin);
  const unlockShoe = useOutfitStore(s => s.unlockShoe);
  const addToast = useToastStore(s => s.addToast);

  // Check for unlocks whenever level changes
  useEffect(() => {
    const shouldBeUnlockedSkins = getUnlockedSkinsAtLevel(level);
    const shouldBeUnlockedShoes = getUnlockedShoesAtLevel(level);

    // Check for newly unlocked skins
    shouldBeUnlockedSkins.forEach(skin => {
      if (!unlockedSkins.includes(skin)) {
        unlockSkin(skin);
        addToast(`🎨 Unlocked new skin: ${skin.charAt(0).toUpperCase() + skin.slice(1)}!`);
      }
    });

    // Check for newly unlocked shoes
    shouldBeUnlockedShoes.forEach(shoe => {
      if (!unlockedShoes.includes(shoe)) {
        unlockShoe(shoe);
        addToast(`👟 Unlocked new shoes: ${shoe.charAt(0).toUpperCase() + shoe.slice(1)}!`);
      }
    });
  }, [level, unlockedSkins, unlockedShoes, unlockSkin, unlockShoe, addToast]);

  // Return utility functions for manual checking
  return {
    checkForUnlocks: () => {
      const shouldBeUnlockedSkins = getUnlockedSkinsAtLevel(level);
      const shouldBeUnlockedShoes = getUnlockedShoesAtLevel(level);

      shouldBeUnlockedSkins.forEach(skin => {
        if (!unlockedSkins.includes(skin)) {
          unlockSkin(skin);
        }
      });

      shouldBeUnlockedShoes.forEach(shoe => {
        if (!unlockedShoes.includes(shoe)) {
          unlockShoe(shoe);
        }
      });
    }
  };
}

// Hook specifically for level-up events
export function useLevelUpUnlocks() {
  const addToast = useToastStore(s => s.addToast);
  const unlockSkin = useOutfitStore(s => s.unlockSkin);
  const unlockShoe = useOutfitStore(s => s.unlockShoe);

  // Function to call when player levels up
  const handleLevelUp = (fromLevel: number, toLevel: number) => {
    const newUnlocks = getNewlyUnlockedItems(fromLevel, toLevel);

    // Unlock new skins
    newUnlocks.skins.forEach(skin => {
      unlockSkin(skin);
      addToast(`🎨 New skin unlocked: ${skin.charAt(0).toUpperCase() + skin.slice(1)}!`);
    });

    // Unlock new shoes
    newUnlocks.shoes.forEach(shoe => {
      unlockShoe(shoe);
      addToast(`👟 New shoes unlocked: ${shoe.charAt(0).toUpperCase() + shoe.slice(1)}!`);
    });

    // Show summary if multiple items unlocked
    const totalUnlocks = newUnlocks.skins.length + newUnlocks.shoes.length;
    if (totalUnlocks > 1) {
      addToast(`🎉 ${totalUnlocks} new customization options unlocked!`);
    }
  };

  return { handleLevelUp };
}