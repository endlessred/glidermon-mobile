// data/shop/shopStockGenerator.ts
//
// Weighted selection + variety guardrails, built purely on top of
// getEligibleShopItems -- this is the ONE generator both shops share (do not
// write Luma-specific/Sable-specific copies of this logic).
import type { RestockType, ShopId, ShopStockEntry } from "./shopTypes";
import { getEligibleShopItems, EligibleShopItem } from "./shopEligibility";
import { AFFORDABLE_PRICE_MAX, SHOP_STOCK_RULES } from "./shopStockRules";

export interface GenerateShopStockParams {
  shopId: ShopId;
  restockType: RestockType;
  /** Item ids shown in the immediately previous stock -- the generator
   * avoids repeating these when the eligible pool is large enough to. */
  previousStockIds?: string[];
  /** Explicit ownership override, mainly for tests/tools. Omit to use the
   * live ownership read baked into getEligibleShopItems. */
  ownedItemIds?: string[];
  now?: Date;
}

function isRare(entry: EligibleShopItem): boolean {
  return entry.item.rarity === "rare" || entry.item.rarity === "special";
}

function weightedPickIndex(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return Math.floor(Math.random() * weights.length);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function toEntry(e: EligibleShopItem): ShopStockEntry {
  return { itemId: e.item.id, category: e.item.category, price: e.item.price, rarity: e.item.rarity };
}

/**
 * Weighted-random selection of STOCK_SIZE items for one shop, respecting
 * category variety, a rare-item cap, and a minimum-affordable floor. Degrades
 * gracefully rather than failing when the eligible pool is smaller than the
 * rules would like -- a small catalog just produces a smaller/less varied
 * stock instead of throwing.
 */
export function generateShopStock(params: GenerateShopStockParams): ShopStockEntry[] {
  const { shopId, restockType, previousStockIds = [], ownedItemIds, now } = params;
  const rules = SHOP_STOCK_RULES[shopId];

  let eligible = getEligibleShopItems(shopId, restockType, { now, includeOwned: ownedItemIds !== undefined });
  if (ownedItemIds) {
    const owned = new Set(ownedItemIds);
    eligible = eligible.filter((e) => e.item.repeatable || !owned.has(e.item.id));
  }
  if (eligible.length === 0) return [];

  const previousSet = new Set(previousStockIds);
  const freshPool = eligible.filter((e) => !previousSet.has(e.item.id));
  const repeatPool = eligible.filter((e) => previousSet.has(e.item.id));

  const selected: EligibleShopItem[] = [];
  const categoryCounts: Partial<Record<string, number>> = {};
  let rareCount = 0;

  const fillFrom = (pool: EligibleShopItem[]) => {
    let remaining = pool.filter((e) => !selected.some((s) => s.item.id === e.item.id));
    while (selected.length < rules.slots && remaining.length > 0) {
      const gated = remaining.filter((e) => {
        const catCount = categoryCounts[e.item.category] ?? 0;
        if (rules.maxPerCategory !== undefined && catCount >= rules.maxPerCategory) return false;
        if (rules.maxRare !== undefined && isRare(e) && rareCount >= rules.maxRare) return false;
        return true;
      });
      // If guardrails would eliminate every remaining candidate, relax them
      // for this pick rather than stall out with empty slots -- a small
      // catalog shouldn't produce a stock smaller than it has to.
      const candidates = gated.length > 0 ? gated : remaining;
      const weights = candidates.map((e) => e.weight * (rules.categoryWeights?.[e.item.category] ?? 1));
      const chosen = candidates[weightedPickIndex(weights)];

      selected.push(chosen);
      categoryCounts[chosen.item.category] = (categoryCounts[chosen.item.category] ?? 0) + 1;
      if (isRare(chosen)) rareCount += 1;
      remaining = remaining.filter((e) => e.item.id !== chosen.item.id);
    }
  };

  // Prefer items that weren't in the immediately previous stock; only dip
  // into repeats if the fresh pool can't fill every slot.
  fillFrom(freshPool);
  if (selected.length < rules.slots) fillFrom(repeatPool);

  // Top up affordability: swap the priciest selected item(s) for cheaper
  // eligible items until minAffordable is met or the affordable pool runs out.
  if (rules.minAffordable) {
    const selectedIds = () => new Set(selected.map((e) => e.item.id));
    let affordableCount = selected.filter((e) => e.item.price <= AFFORDABLE_PRICE_MAX).length;

    while (affordableCount < rules.minAffordable) {
      const ids = selectedIds();
      const replacement = eligible
        .filter((e) => e.item.price <= AFFORDABLE_PRICE_MAX && !ids.has(e.item.id))
        .sort((a, b) => b.weight - a.weight)[0];
      if (!replacement) break; // not enough affordable items in the whole pool -- degrade gracefully

      const swapOutIdx = selected
        .map((e, idx) => ({ e, idx }))
        .filter(({ e }) => e.item.price > AFFORDABLE_PRICE_MAX)
        .sort((a, b) => b.e.item.price - a.e.item.price)[0]?.idx;

      if (swapOutIdx !== undefined) {
        selected[swapOutIdx] = replacement;
      } else if (selected.length < rules.slots) {
        selected.push(replacement);
      } else {
        break; // every slot is already affordable-priced but minAffordable still unmet -- shouldn't happen, stop rather than loop
      }
      affordableCount = selected.filter((e) => e.item.price <= AFFORDABLE_PRICE_MAX).length;
    }
  }

  return selected.map(toEntry);
}
