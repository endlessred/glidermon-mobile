// stores/shopStockStore.ts
//
// Persists the actual current stock shown in each NPC's shop -- generated
// once by shopStockGenerator, then held stable until a natural or manual
// restock action requests a new batch. Screens should read this store's
// `stock` field to render, never call generateShopStock directly on render.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RestockType, ShopId } from "../shop/shopTypes";
import { SHOP_IDS } from "../shop/shopTypes";
import { generateShopStock } from "../shop/shopStockGenerator";

export interface ShopStockSlot {
  itemId: string;
  /** True once the player buys this (one-time) item -- the slot stays
   * visible-but-sold rather than being silently refilled until the next
   * restock, preserving the limited-stock fantasy. */
  sold: boolean;
}

interface ShopStockRecord {
  slots: ShopStockSlot[];
  generatedAt: number;
  /** When this record naturally goes stale and should auto-refresh --
   * always `generatedAt + NATURAL_RESTOCK_INTERVAL_MS`, tracked explicitly
   * (rather than recomputed) so a manual restock can reset the clock too. */
  nextRestockAt: number;
  restockType: RestockType;
}

type ShopStockState = {
  stock: Record<ShopId, ShopStockRecord>;
  /** YYYY-MM-DD of the last date the daily free restock was used, or null. */
  freeRestockUsedOnDate: string | null;

  restockShop: (shopId: ShopId, restockType: RestockType) => void;
  restockAllShops: (restockType: RestockType) => void;
  markSlotSold: (shopId: ShopId, itemId: string) => void;
  /** Generates stock only for shops that don't have any yet (empty on first
   * app run, or after a fresh install). Safe to call on every mount -- it's
   * a no-op once stock exists, so it never regenerates on rerender/navigation. */
  ensureInitialStock: () => void;
  /** Regenerates any shop whose `nextRestockAt` has passed. Safe to call
   * frequently (e.g. from a UI polling interval) -- a no-op for shops not
   * yet due. This is the ONLY thing that should trigger a natural restock;
   * nothing regenerates purely from a component re-rendering. */
  checkNaturalRestocks: () => void;
  /** Consumes today's free manual restock if it hasn't been used yet.
   * Returns true if it fired (and restocked both shops), false if already
   * used today. */
  useFreeDailyRestock: () => boolean;
  /** Pure read: is the free daily restock still available today? */
  isFreeDailyRestockAvailable: () => boolean;
};

// Both shops refresh naturally on the same cadence -- twice a day keeps
// "what's new today" feeling frequent without trivializing the six-item
// scarcity. Re-tune here; nothing downstream hardcodes this number.
export const NATURAL_RESTOCK_INTERVAL_MS = 12 * 60 * 60 * 1000;

function ymd(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const emptyRecord = (): ShopStockRecord => ({ slots: [], generatedAt: 0, nextRestockAt: 0, restockType: "natural" });

function buildInitialStock(): Record<ShopId, ShopStockRecord> {
  const stock = {} as Record<ShopId, ShopStockRecord>;
  for (const shopId of SHOP_IDS) stock[shopId] = emptyRecord();
  return stock;
}

function generateRecord(shopId: ShopId, restockType: RestockType, previousStockIds: string[]): ShopStockRecord {
  const entries = generateShopStock({ shopId, restockType, previousStockIds });
  const generatedAt = Date.now();
  return {
    slots: entries.map((e) => ({ itemId: e.itemId, sold: false })),
    generatedAt,
    nextRestockAt: generatedAt + NATURAL_RESTOCK_INTERVAL_MS,
    restockType,
  };
}

export const useShopStockStore = create<ShopStockState>()(
  persist(
    (set, get) => ({
      stock: buildInitialStock(),
      freeRestockUsedOnDate: null,

      restockShop: (shopId, restockType) => {
        const previous = get().stock[shopId]?.slots.map((s) => s.itemId) ?? [];
        set((s) => ({ stock: { ...s.stock, [shopId]: generateRecord(shopId, restockType, previous) } }));
      },

      restockAllShops: (restockType) => {
        set((s) => {
          const next = { ...s.stock };
          for (const shopId of SHOP_IDS) {
            const previous = s.stock[shopId]?.slots.map((slot) => slot.itemId) ?? [];
            next[shopId] = generateRecord(shopId, restockType, previous);
          }
          return { stock: next };
        });
      },

      markSlotSold: (shopId, itemId) => {
        set((s) => {
          const record = s.stock[shopId];
          if (!record) return s;
          return {
            stock: {
              ...s.stock,
              [shopId]: {
                ...record,
                slots: record.slots.map((slot) => (slot.itemId === itemId ? { ...slot, sold: true } : slot)),
              },
            },
          };
        });
      },

      ensureInitialStock: () => {
        for (const shopId of SHOP_IDS) {
          if (!get().stock[shopId] || get().stock[shopId].slots.length === 0) {
            get().restockShop(shopId, "natural");
          }
        }
      },

      checkNaturalRestocks: () => {
        const now = Date.now();
        for (const shopId of SHOP_IDS) {
          const record = get().stock[shopId];
          if (record && record.nextRestockAt > 0 && now >= record.nextRestockAt) {
            get().restockShop(shopId, "natural");
          }
        }
      },

      useFreeDailyRestock: () => {
        const today = ymd();
        if (get().freeRestockUsedOnDate === today) return false;
        get().restockAllShops("manual");
        set({ freeRestockUsedOnDate: today });
        return true;
      },

      isFreeDailyRestockAvailable: () => get().freeRestockUsedOnDate !== ymd(),
    }),
    {
      name: "shop_stock_store_v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted: any, fromVersion: number) => {
        const s = persisted ?? {};
        s.stock = s.stock && typeof s.stock === "object" ? s.stock : buildInitialStock();
        for (const shopId of SHOP_IDS) {
          const record = s.stock[shopId];
          if (!record || !Array.isArray(record.slots)) {
            s.stock[shopId] = emptyRecord();
            continue;
          }
          record.generatedAt = typeof record.generatedAt === "number" ? record.generatedAt : 0;
          // v2: natural-restock timer. Missing on records from v1 -- treat
          // as already due so the next check picks up a fresh timer rather
          // than silently never refreshing.
          record.nextRestockAt =
            typeof record.nextRestockAt === "number"
              ? record.nextRestockAt
              : record.generatedAt > 0
                ? record.generatedAt + NATURAL_RESTOCK_INTERVAL_MS
                : 0;
          record.restockType = record.restockType === "manual" ? "manual" : "natural";
          record.slots = record.slots
            .filter((slot: any) => typeof slot?.itemId === "string")
            .map((slot: any) => ({ itemId: slot.itemId, sold: slot.sold === true }));
        }
        // v2: daily free restock tracking.
        s.freeRestockUsedOnDate = typeof s.freeRestockUsedOnDate === "string" ? s.freeRestockUsedOnDate : null;
        return s;
      },
    }
  )
);

// Plain-function convenience wrappers matching the suggested public API
// shape (restockShop(shopId, restockType) / restockAllShops(restockType))
// for callers that don't want to think about this being a Zustand store.
export function restockShop(shopId: ShopId, restockType: RestockType): void {
  useShopStockStore.getState().restockShop(shopId, restockType);
}

export function restockAllShops(restockType: RestockType): void {
  useShopStockStore.getState().restockAllShops(restockType);
}
