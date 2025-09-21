// data/utils/outfitMigration.ts
import { useCosmeticsStore } from "../stores/cosmeticsStore";
import { useOutfitStore } from "../stores/outfitStore";
import { CosmeticSocket } from "../types/outfitTypes";

// Migrate equipped cosmetics from the old system to outfit system
export function migrateEquippedCosmeticsToOutfit(): void {
  const cosmeticsState = useCosmeticsStore.getState();
  const outfitState = useOutfitStore.getState();

  // Only migrate if we haven't done this before and there are equipped items
  if (!cosmeticsState.equipped || outfitState.slots.length === 0) {
    return;
  }

  const activeLocalOutfit = outfitState.slots.find(slot => slot.id === outfitState.activeLocalOutfit);

  if (!activeLocalOutfit) {
    return;
  }

  let hasChanges = false;

  // Map old equipped items to outfit cosmetics
  Object.entries(cosmeticsState.equipped).forEach(([socket, itemId]) => {
    if (itemId && socket in activeLocalOutfit.cosmetics === false) {
      // Only add if not already set
      outfitState.equipCosmetic(activeLocalOutfit.id, socket as CosmeticSocket, itemId);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    console.log("Migrated equipped cosmetics to outfit system");
  }
}

// Get currently equipped cosmetics for backward compatibility
export function getCurrentlyEquippedCosmetics(): Record<string, string> {
  const outfitState = useOutfitStore.getState();
  const activeLocalOutfit = outfitState.slots.find(slot => slot.id === outfitState.activeLocalOutfit);

  if (!activeLocalOutfit) {
    return {};
  }

  const equipped: Record<string, string> = {};

  Object.entries(activeLocalOutfit.cosmetics).forEach(([socket, cosmetic]) => {
    if (cosmetic?.itemId) {
      equipped[socket] = cosmetic.itemId;
    }
  });

  return equipped;
}

// Sync outfit changes back to the old cosmetics store for compatibility
export function syncOutfitToCosmeticsStore(): void {
  const equipped = getCurrentlyEquippedCosmetics();

  // Update the old store to maintain compatibility
  useCosmeticsStore.setState(state => ({
    equipped: {
      ...state.equipped,
      ...equipped
    }
  }));
}