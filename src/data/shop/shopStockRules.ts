// data/shop/shopStockRules.ts
//
// Centralized "what does a healthy 6-item refresh look like" configuration,
// kept separate from item eligibility (shopEligibility.ts) and weighted
// selection (shopStockGenerator.ts) so shop personality/balance can be
// re-tuned in one place without touching selection logic.
import type { ShopId, ShopStockRules } from "./shopTypes";

export const STOCK_SIZE = 6;

/** Single configurable threshold for "is this item affordable" -- an MVP
 * stand-in for a proper economy helper. Re-tune this number as the acorn
 * economy changes rather than hardcoding a price check anywhere else. */
export const AFFORDABLE_PRICE_MAX = 250;

export const SHOP_STOCK_RULES: Record<ShopId, ShopStockRules> = {
  luma: {
    slots: STOCK_SIZE,
    maxPerCategory: 3,
    minAffordable: 2,
    maxRare: 1,
    categoryWeights: {
      hat: 1.2,
      outfit: 1.3,
      shoes: 1.0,
      skin: 1.3,
      hair: 1.1,
      furniture: 0.9,
      floor: 0.8,
      wall: 0.8,
      accessory: 1.1,
    },
  },
  sable: {
    slots: STOCK_SIZE,
    maxPerCategory: 3,
    minAffordable: 2,
    maxRare: 1,
    categoryWeights: {
      hat: 1.3,
      outfit: 1.0,
      shoes: 1.0,
      skin: 0.8,
      hair: 0.9,
      furniture: 1.1,
      floor: 1.0,
      wall: 1.0,
      accessory: 1.0,
    },
  },
};
