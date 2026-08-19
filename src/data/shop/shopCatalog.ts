// data/shop/shopCatalog.ts
//
// Adapts the project's three real item catalogs (cosmetics, furniture,
// floor/wall patterns) into the normalized ShopCatalogItem shape the
// eligibility/generator functions operate on. This is the ONLY place that
// knows about all three source catalogs at once -- everything downstream
// (shopEligibility, shopStockGenerator) works purely in terms of
// ShopCatalogItem and never imports a source catalog directly.
import { useCosmeticsStore, CosmeticItem } from "../stores/cosmeticsStore";
import { FURNITURE_SHOP_CATALOG, FurnitureShopItem } from "../../game/housing/types/furnitureCatalog";
import {
  FLOOR_PATTERN_CATALOG,
  WALL_PATTERN_CATALOG,
  FloorPatternItem,
  WallPatternItem,
} from "../../game/housing/types/proceduralPatternCatalog";
import type { ItemCategory, ShopCatalogItem, ShopStockConfig } from "./shopTypes";

const SOCKET_TO_CATEGORY: Record<CosmeticItem["socket"], ItemCategory> = {
  headTop: "hat",
  hair: "hair",
  shoes: "shoes",
  skin: "skin",
  jacket: "outfit",
  theme: "accessory",
};

// Items with no explicit shopStock (most floor/wall patterns, some furniture)
// fall back to this rather than being excluded from the shop entirely --
// keeps the eligible pool non-empty for a large generated catalog without
// requiring hand curation of every id. Explicit metadata always wins.
//
// Weight is deliberately low (not equal to a curated item's typical 5-10):
// the floor/wall pattern catalog alone is a couple hundred generated ids,
// so giving every one of them the same weight as a hand-tagged cosmetic
// would let sheer volume dominate the weighted pool and crowd out
// hats/skins/furniture entirely (each of "floor" and "wall" is also its own
// category for maxPerCategory purposes, so patterns filling all 6 slots --
// e.g. 3 floor + 3 wall -- is otherwise easy to hit by weight alone).
const DEFAULT_SHOP_STOCK: ShopStockConfig[] = [
  { store: "luma", weight: 1 },
  { store: "sable", weight: 1 },
];

function normalizeCosmetic(item: CosmeticItem): ShopCatalogItem {
  return {
    id: item.id,
    name: item.name,
    category: SOCKET_TO_CATEGORY[item.socket] ?? "accessory",
    price: item.cost,
    rarity: item.rarity ?? "common",
    tags: item.tags ?? [],
    shopStock: item.shopStock ?? [],
    repeatable: item.repeatable ?? false,
    sourceKind: "cosmetic",
  };
}

function normalizeFurniture(item: FurnitureShopItem): ShopCatalogItem {
  return {
    id: item.id,
    name: item.name,
    category: "furniture",
    price: item.cost,
    rarity: item.rarity ?? "common",
    tags: item.tags ?? [],
    shopStock: item.shopStock ?? DEFAULT_SHOP_STOCK,
    repeatable: false,
    sourceKind: "furniture",
  };
}

function normalizeFloorPattern(item: FloorPatternItem): ShopCatalogItem {
  return {
    id: item.id,
    name: item.name,
    category: "floor",
    price: item.cost,
    rarity: item.rarity ?? "common",
    tags: [],
    shopStock: DEFAULT_SHOP_STOCK,
    repeatable: false,
    sourceKind: "floorPattern",
  };
}

function normalizeWallPattern(item: WallPatternItem): ShopCatalogItem {
  return {
    id: item.id,
    name: item.name,
    category: "wall",
    price: item.cost,
    rarity: item.rarity ?? "common",
    tags: [],
    shopStock: DEFAULT_SHOP_STOCK,
    repeatable: false,
    sourceKind: "wallPattern",
  };
}

/** Every item eligible for shop consideration, normalized. Cheap enough to
 * recompute on demand (only called at restock time, not per-render) --
 * mirrors cosmeticsStore's own "always rebuild from source" philosophy
 * rather than caching a snapshot that could go stale. Cosmetics with no
 * `shopStock` at all (e.g. the free starter shoe) are skipped entirely --
 * they were never meant to enter the restock pool. */
export function getShopCatalog(): ShopCatalogItem[] {
  const cosmetics = useCosmeticsStore.getState().catalog;
  return [
    ...cosmetics.filter((c) => !!c.shopStock && c.shopStock.length > 0).map(normalizeCosmetic),
    ...FURNITURE_SHOP_CATALOG.map(normalizeFurniture),
    ...FLOOR_PATTERN_CATALOG.map(normalizeFloorPattern),
    ...WALL_PATTERN_CATALOG.map(normalizeWallPattern),
  ];
}

export function getShopCatalogItem(id: string): ShopCatalogItem | undefined {
  return getShopCatalog().find((item) => item.id === id);
}
