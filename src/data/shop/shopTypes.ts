// data/shop/shopTypes.ts
//
// Shared vocabulary for the shop stock/restock system. Kept separate from
// any single catalog (cosmetics/furniture/patterns) so item definitions in
// those catalogs can opt into shop eligibility without those catalogs
// depending on each other.

/** Extensible — add new NPC shops here as they're built. */
export type ShopId = "luma" | "sable";
export const SHOP_IDS: ShopId[] = ["luma", "sable"];

/** Adapted from the project's real socket/slot vocabulary (see cosmeticsStore's
 * `Socket` and furnitureCatalog's `SlotType`) rather than invented fresh —
 * `jacket` folds into `outfit`, `theme` folds into `accessory`, and `floor`/
 * `wall` are added since housing already treats those as distinct catalogs
 * with their own ownership arrays. */
export type ItemCategory =
  | "hat"
  | "hair"
  | "shoes"
  | "outfit"
  | "skin"
  | "furniture"
  | "floor"
  | "wall"
  | "accessory";

/** Independent of shop identity — see SHOP_STOCK_RULES for how it's used
 * (rare-item caps), not for deciding which shop an item belongs to. */
export type Rarity = "common" | "uncommon" | "rare" | "special";

export type RestockType = "natural" | "manual";

/** One row of this on an item = "this item can appear in this store, at this
 * relative weight." Multiple rows = shared across stores at different
 * strengths. Absence of a row for a store = never appears there naturally.
 * This is the single source of truth for shop eligibility — never inferred
 * from tags or rarity. */
export interface ShopStockConfig {
  store: ShopId;
  /** Relative weight within the eligible pool for this store — NOT a percentage. */
  weight: number;
  /** Defaults to true if omitted. */
  naturalRestock?: boolean;
  /** Defaults to true if omitted. */
  manualRestock?: boolean;
  /** ISO date strings. Optional future seasonal/event availability window. */
  availableFrom?: string;
  availableUntil?: string;
}

/** The normalized shape every source catalog (cosmetics/furniture/floor
 * patterns/wall patterns) gets adapted into for eligibility/generation
 * purposes. This is NOT a replacement for the source catalogs' own item
 * types — it's a read-only projection built by shopCatalog.ts. */
export interface ShopCatalogItem {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  rarity: Rarity;
  tags: string[];
  shopStock: ShopStockConfig[];
  /** Consumable/repeat-purchasable items stay in the eligible pool even when
   * owned. Every item in this project is currently a one-time permanent
   * purchase, so this defaults false; the field exists so a future
   * repeatable item type doesn't need a parallel system. */
  repeatable: boolean;
  /** Which real catalog + ownership store this item came from, so
   * shopOwnership.ts knows which store to check/mutate on purchase. */
  sourceKind: "cosmetic" | "furniture" | "floorPattern" | "wallPattern";
}

export interface ShopStockRules {
  slots: number;
  maxPerCategory?: number;
  minAffordable?: number;
  maxRare?: number;
  categoryWeights?: Partial<Record<ItemCategory, number>>;
}

/** One generated/persisted stock slot. */
export interface ShopStockEntry {
  itemId: string;
  category: ItemCategory;
  price: number;
  rarity: Rarity;
}
