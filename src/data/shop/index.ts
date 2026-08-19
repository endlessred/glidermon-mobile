// data/shop/index.ts
//
// Barrel matching the suggested public API surface: eligibility + generation
// stay pure functions here, while restockShop/restockAllShops (which mutate
// persisted state) live on shopStockStore and are re-exported for
// convenience so callers don't need to know it's a Zustand store.
export type {
  ShopId,
  ItemCategory,
  Rarity,
  RestockType,
  ShopStockConfig,
  ShopCatalogItem,
  ShopStockRules,
  ShopStockEntry,
} from "./shopTypes";
export { SHOP_IDS } from "./shopTypes";

export { getShopCatalog, getShopCatalogItem } from "./shopCatalog";
export { isShopItemOwned, getOwnedShopItemIds } from "./shopOwnership";
export { SHOP_STOCK_RULES, STOCK_SIZE, AFFORDABLE_PRICE_MAX } from "./shopStockRules";
export { getEligibleShopItems } from "./shopEligibility";
export type { EligibleShopItem, GetEligibleShopItemsOptions } from "./shopEligibility";
export { generateShopStock } from "./shopStockGenerator";
export type { GenerateShopStockParams } from "./shopStockGenerator";
export { getShopItemVisualSource } from "./shopDisplay";
export type { ShopItemVisualSource } from "./shopDisplay";

export { useShopStockStore, restockShop, restockAllShops, NATURAL_RESTOCK_INTERVAL_MS } from "../stores/shopStockStore";
export type { ShopStockSlot } from "../stores/shopStockStore";
