import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CosmeticDef } from "../lib/cosmetics";
import { loadCosmetics } from "../lib/cosmetics";

type Equipped = { headTop?: string }; // cosmetic id by socket

type CosmeticsState = {
  catalog: CosmeticDef[];
  owned: Record<string, true>;
  equipped: Equipped;
  points: number;
  loading: boolean;
  hydrated: boolean;                  // <-- NEW

  loadCatalog: () => Promise<void>;
  buy: (id: string) => void;
  equip: (id: string) => void;
};

export const useCosmeticsStore = create<CosmeticsState>()(
  persist(
    (set, get) => ({
      catalog: [],
      owned: {},
      equipped: {},
      points: 1000,
      loading: false,
      hydrated: false,                // <-- NEW

      loadCatalog: async () => {
        if (get().catalog.length || get().loading) return;
        set({ loading: true });
        const catalog = await loadCosmetics();
        set({ catalog, loading: false });
      },

      buy: (id) => {
        const { catalog, owned, points } = get();
        if (owned[id]) return;
        const item = catalog.find(c => c.id === id);
        if (!item || points < item.cost) return;
        set({ points: points - item.cost, owned: { ...owned, [id]: true } });
      },

      equip: (id) => {
        const { catalog, owned, equipped } = get();
        const item = catalog.find(c => c.id === id);
        if (!item || !owned[id]) return;
        set({ equipped: { ...equipped, [item.socket]: id } });
      },
    }),
    {
      name: "cosmetics-v1",
      onRehydrateStorage: () => {
        // before hydration
        return () => {
          // after hydration
          try { useCosmeticsStore.setState({ hydrated: true }); } catch {}
    };
},
    }
  )
);
