// stores/cosmeticsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Assets for list thumbnails (RN <Image /> supports module ids or URIs)
const leafPng = require("../assets/GliderMonLeafHat.png");
const greaterPng = require("../assets/GliderMonGreaterHat.png");

type Socket = "headTop";

export type CosmeticItem = {
  id: string;
  name: string;
  cost: number;           // price in your soft currency
  socket: Socket;
  tex: any;               // module id or URI (screens already handle both)
};

type Equipped = {
  // Legacy key the screens use:
  headTop?: string;
  // Also keep a modern alias in case other views read it:
  hat?: string;
};

type CosmeticsState = {
  // what Shop/Equip expect:
  catalog: CosmeticItem[];
  owned: Record<string, boolean>;
  points: number;                 // kept for UI display; you’re spending via useProgressionStore

  equipped: Equipped;

  // actions the screens call:
  loadCatalog: () => void;
  buy: (id: string) => boolean;   // mark as owned (you already deduct acorns in progression store)
  equip: (id: string) => void;
  unequipHead: () => void;

  // extras/dev
  grant: (id: string) => void;
  reset: () => void;
};

const DEFAULT_CATALOG: CosmeticItem[] = [
  { id: "leaf_hat",    name: "Leaf Cap",     cost: 250, socket: "headTop", tex: leafPng },
  { id: "greater_hat", name: "Greater Leaf", cost: 600, socket: "headTop", tex: greaterPng },
];

export const useCosmeticsStore = create<CosmeticsState>()(
  persist(
    (set, get) => ({
      catalog: DEFAULT_CATALOG,
      owned: { leaf_hat: true },          // starter hat owned
      points: 0,                          // display only (Shop UI shows “Acorns: {points}”)

      // start with Leaf equipped
      equipped: { headTop: "leaf_hat", hat: "leaf_hat" },

      loadCatalog: () => {
        // idempotent (kept for screens calling it on mount)
        if (!get().catalog || get().catalog.length === 0) {
          set({ catalog: DEFAULT_CATALOG });
        }
      },

      buy: (id) => {
        // Ownership only — your UI already calls spend() in useProgressionStore
        if (get().owned[id]) return true;
        set((s) => ({ owned: { ...s.owned, [id]: true } }));
        return true;
      },

      equip: (id) => {
        // Require ownership
        if (!get().owned[id]) return;
        set((s) => ({ equipped: { ...s.equipped, headTop: id, hat: id } }));
      },

      unequipHead: () => set((s) => ({ equipped: { ...s.equipped, headTop: undefined, hat: undefined } })),

      grant: (id) => set((s) => ({ owned: { ...s.owned, [id]: true } })),

      reset: () =>
        set({
          catalog: DEFAULT_CATALOG,
          owned: { leaf_hat: true },
          points: 0,
          equipped: { headTop: "leaf_hat", hat: "leaf_hat" },
        }),
    }),
    {
      name: "cosmetics_store_v3",
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (state: any, from) => {
        const s = state ?? {};
        // Ensure all keys exist
        s.catalog ??= DEFAULT_CATALOG;
        s.owned ??= { leaf_hat: true };
        s.points = typeof s.points === "number" ? s.points : 0;
        s.equipped ??= {};
        // Keep headTop <-> hat in sync
        if (!s.equipped.headTop && s.equipped.hat) s.equipped.headTop = s.equipped.hat;
        if (!s.equipped.hat && s.equipped.headTop) s.equipped.hat = s.equipped.headTop;
        if (!s.equipped.headTop && !s.equipped.hat) {
          s.equipped.headTop = "leaf_hat";
          s.equipped.hat = "leaf_hat";
        }
        return s;
      },
    }
  )
);
