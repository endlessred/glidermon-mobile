// data/shop/shopEligibility.ts
//
// Single reusable eligibility check shared by every shop -- do NOT duplicate
// this logic per-shop. Given a shop and a restock type, returns every
// catalog item that's allowed to appear there right now, with the
// shop-specific weight already resolved.
import type { RestockType, ShopCatalogItem, ShopId, ShopStockConfig } from "./shopTypes";
import { getShopCatalog } from "./shopCatalog";
import { isShopItemOwned } from "./shopOwnership";

export interface EligibleShopItem {
  item: ShopCatalogItem;
  weight: number;
  config: ShopStockConfig;
}

export interface GetEligibleShopItemsOptions {
  /** Defaults to now -- pass a fixed Date for deterministic tests. */
  now?: Date;
  /** Defaults to false: already-owned one-time items are excluded so the
   * player never sees a repeat purchase prompt for something they own. */
  includeOwned?: boolean;
}

function isWithinAvailabilityWindow(config: ShopStockConfig, now: Date): boolean {
  if (config.availableFrom && now < new Date(config.availableFrom)) return false;
  if (config.availableUntil && now > new Date(config.availableUntil)) return false;
  return true;
}

export function getEligibleShopItems(
  shopId: ShopId,
  restockType: RestockType,
  options: GetEligibleShopItemsOptions = {}
): EligibleShopItem[] {
  const now = options.now ?? new Date();
  const includeOwned = options.includeOwned ?? false;

  const eligible: EligibleShopItem[] = [];
  for (const item of getShopCatalog()) {
    const config = item.shopStock.find((c) => c.store === shopId);
    if (!config) continue; // this item just doesn't belong to this store
    if (config.weight <= 0) continue;

    const naturalRestock = config.naturalRestock ?? true;
    const manualRestock = config.manualRestock ?? true;
    if (restockType === "natural" && !naturalRestock) continue;
    if (restockType === "manual" && !manualRestock) continue;

    if (!isWithinAvailabilityWindow(config, now)) continue;

    // Already-owned one-time items should no longer be offered; repeatable
    // items (none exist yet, but the field is respected) stay eligible.
    if (!includeOwned && !item.repeatable && isShopItemOwned(item)) continue;

    eligible.push({ item, weight: config.weight, config });
  }
  return eligible;
}
