// stores/cosmeticsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themeDisplayNames } from "../../styles/themeVariations";

// Assets for list thumbnails (RN <Image /> supports module ids or URIs)
const leafPng = require("../../assets/GliderMonLeafHat.png");
const greaterPng = require("../../assets/GliderMonGreaterHat.png");
const hatPackPng = require("../../assets/hats/hat_pack_1.png");

type Socket = "headTop" | "theme";

export type CosmeticItem = {
  id: string;
  name: string;
  cost: number;           // price in your soft currency
  socket: Socket;
  tex?: any;              // module id or URI (screens already handle both) - optional for themes
  themeId?: string;       // for theme cosmetics, the ThemeVariation id
  spineSkin?: string;     // Spine skin name for new Spine-based cosmetics
  maskRecolor?: {         // Mask recoloring configuration
    r?: string;           // Color for red channel
    g?: string;           // Color for green channel
    b?: string;           // Color for blue channel
    a?: string;           // Color for alpha channel
  };
};

type Equipped = {
  // Legacy key the screens use:
  headTop?: string;
  // Also keep a modern alias in case other views read it:
  hat?: string;
  // Theme selection:
  theme?: string;
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
  equipTheme: (id: string) => void;
  unequipHead: () => void;

  // extras/dev
  grant: (id: string) => void;
  reset: () => void;
};

const DEFAULT_CATALOG: CosmeticItem[] = [
  // Spine-based Hat Cosmetics - Baseball Caps (using mask recoloring)
  {
    id: "blue_baseball_cap",
    name: "Blue Baseball Cap",
    cost: 200,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap", // Use white cap as base
    maskRecolor: { r: "#2563eb" }, // Blue color for R channel
    tex: hatPackPng // Keep thumbnail for shop display
  },
  {
    id: "green_baseball_cap",
    name: "Green Baseball Cap",
    cost: 200,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap", // Use white cap as base
    maskRecolor: { r: "#16a34a" }, // Green color for R channel
    tex: hatPackPng
  },
  {
    id: "red_baseball_cap",
    name: "Red Baseball Cap",
    cost: 200,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap", // Use white cap as base
    maskRecolor: { r: "#ff0000" }, // Bright red color for maximum visibility
    tex: hatPackPng
  },
  {
    id: "white_baseball_cap",
    name: "White Baseball Cap",
    cost: 150,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap",
    tex: hatPackPng
  },

  // Spine-based Hat Cosmetics - Special Hats
  {
    id: "flower_crown",
    name: "Flower Crown",
    cost: 400,
    socket: "headTop",
    spineSkin: "Hats/Flower Crown",
    tex: hatPackPng
  },
  {
    id: "top_hat",
    name: "Top Hat",
    cost: 500,
    socket: "headTop",
    spineSkin: "Hats/Top Hat",
    tex: hatPackPng
  },
  {
    id: "wizard_hat",
    name: "Wizard Hat",
    cost: 600,
    socket: "headTop",
    spineSkin: "Hats/Wizard Hat",
    tex: hatPackPng
  },

  // Legacy pixel-based hats (keep for compatibility during transition)
  { id: "leaf_hat", name: "Leaf Cap", cost: 250, socket: "headTop", tex: leafPng },
  { id: "greater_hat", name: "Greater Leaf", cost: 600, socket: "headTop", tex: greaterPng },

  // Legacy Hat Pack 1 - Old pixel system (keep for compatibility)
  { id: "frog_hat", name: "Green Frog Hat", cost: 300, socket: "headTop", tex: hatPackPng },
  { id: "black_headphones", name: "Black Headphones", cost: 400, socket: "headTop", tex: hatPackPng },
  { id: "white_headphones", name: "White Headphones", cost: 400, socket: "headTop", tex: hatPackPng },
  { id: "pink_headphones", name: "Pink Headphones", cost: 400, socket: "headTop", tex: hatPackPng },
  { id: "pink_aniphones", name: "Pink AniPhones", cost: 500, socket: "headTop", tex: hatPackPng },
  { id: "feather_cap", name: "Feather Cap", cost: 450, socket: "headTop", tex: hatPackPng },
  { id: "viking_hat", name: "Viking Hat", cost: 700, socket: "headTop", tex: hatPackPng },
  { id: "adventurer_fedora", name: "Adventurer Fedora", cost: 550, socket: "headTop", tex: hatPackPng },

  // Theme cosmetics - unlockable color themes
  { id: "theme_cute", name: themeDisplayNames.cute, cost: 500, socket: "theme", themeId: "cute" },
  { id: "theme_cyberpunk", name: themeDisplayNames.cyberpunk, cost: 750, socket: "theme", themeId: "cyberpunk" },
  { id: "theme_forest", name: themeDisplayNames.forest, cost: 400, socket: "theme", themeId: "forest" },
  { id: "theme_ocean", name: themeDisplayNames.ocean, cost: 450, socket: "theme", themeId: "ocean" },
  { id: "theme_sunset", name: themeDisplayNames.sunset, cost: 550, socket: "theme", themeId: "sunset" },
];

export const useCosmeticsStore = create<CosmeticsState>()(
  persist(
    (set, get) => ({
      catalog: DEFAULT_CATALOG,
      owned: { white_baseball_cap: true },  // starter hat owned (white baseball cap)
      points: 0,                            // display only (Shop UI shows "Acorns: {points}")

      // start with White Baseball Cap equipped (Spine-based)
      equipped: { headTop: "white_baseball_cap", hat: "white_baseball_cap" },

      loadCatalog: () => {
        // Always load the latest catalog to ensure new items are available
        set({ catalog: DEFAULT_CATALOG });
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

      equipTheme: (id) => {
        // Require ownership
        if (!get().owned[id]) return;
        const item = get().catalog.find(c => c.id === id);
        if (!item || item.socket !== "theme" || !item.themeId) return;

        // Update equipped theme in cosmetics store
        set((s) => ({ equipped: { ...s.equipped, theme: id } }));

        // Update theme in settings store
        import("./settingsStore").then(({ useSettingsStore }) => {
          useSettingsStore.getState().setThemeVariation(item.themeId as any);
        });
      },

      unequipHead: () => set((s) => ({ equipped: { ...s.equipped, headTop: undefined, hat: undefined } })),

      grant: (id) => set((s) => ({ owned: { ...s.owned, [id]: true } })),

      reset: () =>
        set({
          catalog: DEFAULT_CATALOG,
          owned: { white_baseball_cap: true },
          points: 0,
          equipped: { headTop: "white_baseball_cap", hat: "white_baseball_cap" },
        }),
    }),
    {
      name: "cosmetics_store_v4",
      storage: createJSONStorage(() => AsyncStorage),
      version: 5,
      migrate: (state: any, from) => {
        const s = state ?? {};
        // Always update catalog to latest version to include new hats
        s.catalog = DEFAULT_CATALOG;
        s.owned ??= { white_baseball_cap: true };
        s.points = typeof s.points === "number" ? s.points : 0;
        s.equipped ??= {};
        // Keep headTop <-> hat in sync
        if (!s.equipped.headTop && s.equipped.hat) s.equipped.headTop = s.equipped.hat;
        if (!s.equipped.hat && s.equipped.headTop) s.equipped.hat = s.equipped.headTop;
        if (!s.equipped.headTop && !s.equipped.hat) {
          s.equipped.headTop = "white_baseball_cap";
          s.equipped.hat = "white_baseball_cap";
        }
        return s;
      },
    }
  )
);
