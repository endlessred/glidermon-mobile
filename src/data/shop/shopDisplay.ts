// data/shop/shopDisplay.ts
//
// Resolves a ShopCatalogItem back to whichever real source-catalog object
// carries its actual artwork, so UI components can render a thumbnail
// without knowing which of the three catalogs an item came from. Pure
// lookups only -- no selection/eligibility logic lives here.
import { useCosmeticsStore } from "../stores/cosmeticsStore";
import { FURNITURE_SHOP_CATALOG } from "../../game/housing/types/furnitureCatalog";
import {
  getFloorPatternById,
  getWallPatternById,
  FloorPatternItem,
  WallPatternItem,
} from "../../game/housing/types/proceduralPatternCatalog";
import type { ShopCatalogItem } from "./shopTypes";

export type ShopItemVisualSource =
  | { kind: "cosmetic"; itemId: string; socket: string }
  | { kind: "furniture"; previewAsset: string }
  | { kind: "floorPattern"; pattern: FloorPatternItem }
  | { kind: "wallPattern"; pattern: WallPatternItem };

export function getShopItemVisualSource(item: ShopCatalogItem): ShopItemVisualSource | null {
  switch (item.sourceKind) {
    case "cosmetic": {
      const cosmetic = useCosmeticsStore.getState().catalog.find((c) => c.id === item.id);
      return cosmetic ? { kind: "cosmetic", itemId: item.id, socket: cosmetic.socket } : null;
    }
    case "furniture": {
      const furniture = FURNITURE_SHOP_CATALOG.find((f) => f.id === item.id);
      return furniture ? { kind: "furniture", previewAsset: furniture.previewAsset } : null;
    }
    case "floorPattern": {
      const pattern = getFloorPatternById(item.id);
      return pattern ? { kind: "floorPattern", pattern } : null;
    }
    case "wallPattern": {
      const pattern = getWallPatternById(item.id);
      return pattern ? { kind: "wallPattern", pattern } : null;
    }
  }
}
