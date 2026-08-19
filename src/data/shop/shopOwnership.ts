// data/shop/shopOwnership.ts
//
// Reuses the project's existing per-catalog ownership stores rather than
// introducing a fourth parallel inventory model -- cosmetics track ownership
// as a boolean map, furniture/floor/wall patterns as string-id arrays (see
// cosmeticsStore.ts / housingStore.ts). This module is the single place that
// knows how to check "is this ShopCatalogItem owned" across all three.
import { useCosmeticsStore } from "../stores/cosmeticsStore";
import { useHousingStore } from "../stores/housingStore";
import type { ShopCatalogItem } from "./shopTypes";

export function isShopItemOwned(item: ShopCatalogItem): boolean {
  switch (item.sourceKind) {
    case "cosmetic":
      return useCosmeticsStore.getState().owned[item.id] === true;
    case "furniture":
      return useHousingStore.getState().unlockedFurnitureIds.includes(item.id);
    case "floorPattern":
      return useHousingStore.getState().unlockedFloorPatternIds.includes(item.id);
    case "wallPattern":
      return useHousingStore.getState().unlockedWallPatternIds.includes(item.id);
  }
}

/** All currently-owned item ids across every source catalog, for callers
 * that want to pass an explicit ownership snapshot into generateShopStock
 * instead of relying on its live-read default. */
export function getOwnedShopItemIds(): Set<string> {
  const cosmetics = useCosmeticsStore.getState();
  const housing = useHousingStore.getState();
  const owned = new Set<string>();
  for (const [id, isOwned] of Object.entries(cosmetics.owned)) {
    if (isOwned) owned.add(id);
  }
  housing.unlockedFurnitureIds.forEach((id) => owned.add(id));
  housing.unlockedFloorPatternIds.forEach((id) => owned.add(id));
  housing.unlockedWallPatternIds.forEach((id) => owned.add(id));
  return owned;
}
