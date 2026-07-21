// stores/cosmeticsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themeDisplayNames } from "../../styles/themeVariations";

// Assets for list thumbnails (RN <Image /> supports module ids or URIs)
const leafPng = require("../../assets/GliderMonLeafHat.png");
const greaterPng = require("../../assets/GliderMonGreaterHat.png");
const hatPackPng = require("../../assets/hats/hat_pack_1.png");

type Socket = "headTop" | "theme" | "skin" | "hair" | "jacket";

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
  // Hair selection:
  hair?: string;
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
  equipHair: (id: string) => void;
  unequipHead: () => void;
  unequipHair: () => void;

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
    maskRecolor: { r: "#5f80a6" }, // Blue color for R channel
    tex: hatPackPng // Keep thumbnail for shop display
  },
  {
    id: "green_baseball_cap",
    name: "Green Baseball Cap",
    cost: 200,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap", // Use white cap as base
    maskRecolor: { r: "#6f975e" }, // Green color for R channel
    tex: hatPackPng
  },
  {
    id: "red_baseball_cap",
    name: "Red Baseball Cap",
    cost: 200,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap", // Use white cap as base
    maskRecolor: { r: "#a83f48" }, // Red color from palette
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

  // Themed Skin Cosmetics - 4-channel recoloring for body parts
  {
    id: "skin_cute",
    name: "Cute Skin",
    cost: 300,
    socket: "skin",
    spineSkin: "default", // Uses default skin with recoloring
    maskRecolor: {
      r: "#b6607c", // Cute pink base from palette
      g: "#823e69", // Shadow version of pink
      b: "#d3a092", // Lightened version of pink
      a: "#613661"  // Purple accent from palette
    },
    tex: hatPackPng
  },
  {
    id: "skin_cyberpunk",
    name: "Cyberpunk Skin",
    cost: 400,
    socket: "skin",
    spineSkin: "default",
    maskRecolor: {
      r: "#6c9ba7", // Cyberpunk blue base from palette
      g: "#466f77", // Shadow version of blue
      b: "#9db8c5", // Lightened version of blue
      a: "#524f73"  // Purple accent from palette
    },
    tex: hatPackPng
  },
  {
    id: "skin_forest",
    name: "Forest Skin",
    cost: 250,
    socket: "skin",
    spineSkin: "default",
    maskRecolor: {
      r: "#6f975e", // Forest green base from palette
      g: "#3b6b58", // Shadow version of green
      b: "#a8b164", // Lightened version of green
      a: "#865d56"  // Brown accent from palette
    },
    tex: hatPackPng
  },
  {
    id: "skin_ocean",
    name: "Ocean Skin",
    cost: 350,
    socket: "skin",
    spineSkin: "default",
    maskRecolor: {
      r: "#5f80a6", // Ocean blue base from palette
      g: "#2d494b", // Shadow version of blue
      b: "#9db8c5", // Lightened version of blue
      a: "#466f77"  // Teal accent from palette
    },
    tex: hatPackPng
  },
  {
    id: "skin_sunset",
    name: "Sunset Skin",
    cost: 400,
    socket: "skin",
    spineSkin: "default",
    maskRecolor: {
      r: "#dc995d", // Sunset orange base from palette
      g: "#c55650", // Shadow version of orange/red
      b: "#dec575", // Lightened version of orange
      a: "#d37755"  // Orange accent from palette
    },
    tex: hatPackPng
  },

  // Hair cosmetics - Hair styles (color selected separately)
  {
    id: "windswept_short",
    name: "Windswept Short",
    cost: 400,
    socket: "hair",
    spineSkin: "default", // Uses default skin with shader for HairFront only
    tex: hatPackPng // Placeholder thumbnail
  },
  {
    id: "windswept_long",
    name: "Windswept Long",
    cost: 600,
    socket: "hair",
    spineSkin: "default", // Uses default skin with shader for both HairFront and HairBack
    tex: hatPackPng // Placeholder thumbnail
  },

  // Jacket cosmetics - Motorcycle jacket with multiple color variants
  {
    id: "motorcycle_jacket_red_green",
    name: "Motorcycle Jacket (Red/Green)",
    cost: 500,
    socket: "jacket",
    spineSkin: "default", // Uses default skin with shader recoloring
    maskRecolor: {
      r: "#a83f48", // Red primary color from palette
      g: "#6f975e", // Green secondary color from palette
      b: "#2a202a", // Dark accent from palette
      a: "#9a919b"  // Light accent from palette
    },
    tex: hatPackPng // Placeholder thumbnail
  },
  {
    id: "motorcycle_jacket_blue_orange",
    name: "Motorcycle Jacket (Blue/Orange)",
    cost: 500,
    socket: "jacket",
    spineSkin: "default",
    maskRecolor: {
      r: "#5f80a6", // Blue primary color from palette
      g: "#dc995d", // Orange secondary color from palette
      b: "#2a202a", // Dark accent from palette
      a: "#9a919b"  // Light accent from palette
    },
    tex: hatPackPng
  },
  {
    id: "motorcycle_jacket_black_gold",
    name: "Motorcycle Jacket (Black/Gold)",
    cost: 600,
    socket: "jacket",
    spineSkin: "default",
    maskRecolor: {
      r: "#2a202a", // Black primary color from palette
      g: "#dec575", // Gold secondary color from palette
      b: "#36373d", // Dark accent from palette
      a: "#9a919b"  // Light accent from palette
    },
    tex: hatPackPng
  },
  {
    id: "motorcycle_jacket_white_purple",
    name: "Motorcycle Jacket (White/Purple)",
    cost: 550,
    socket: "jacket",
    spineSkin: "default",
    maskRecolor: {
      r: "#d9d3d9", // White primary color from palette
      g: "#613661", // Purple secondary color from palette
      b: "#2a202a", // Dark accent from palette
      a: "#9a919b"  // Light accent from palette
    },
    tex: hatPackPng
  },
  {
    id: "motorcycle_jacket_forest_brown",
    name: "Motorcycle Jacket (Forest/Brown)",
    cost: 450,
    socket: "jacket",
    spineSkin: "default",
    maskRecolor: {
      r: "#6f975e", // Forest green primary color from palette
      g: "#865d56", // Brown secondary color from palette
      b: "#2a202a", // Dark accent from palette
      a: "#9a919b"  // Light accent from palette
    },
    tex: hatPackPng
  },

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
      owned: {
        white_baseball_cap: true,      // starter hat owned
        blue_baseball_cap: true,       // for testing mask recoloring
        red_baseball_cap: true,        // for testing mask recoloring
        green_baseball_cap: true,      // for testing mask recoloring
        flower_crown: true,            // for testing spine cosmetics
        top_hat: true,                 // for testing spine cosmetics
        wizard_hat: true,              // for testing spine cosmetics
        skin_cute: true,               // for testing skin recoloring
        skin_forest: true,             // for testing skin recoloring
        skin_ocean: true,              // for testing skin recoloring
        windswept_short: true,         // starter hair style owned
        windswept_long: true,          // for testing long hair style
        motorcycle_jacket_red_green: true,    // for testing jacket cosmetics
        motorcycle_jacket_blue_orange: true,  // for testing jacket cosmetics
        motorcycle_jacket_black_gold: true    // for testing jacket cosmetics
      },
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

      equipHair: (id) => {
        // Require ownership
        if (!get().owned[id]) return;
        const item = get().catalog.find(c => c.id === id);
        if (!item || item.socket !== "hair") return;
        set((s) => ({ equipped: { ...s.equipped, hair: id } }));
      },

      unequipHead: () => set((s) => ({ equipped: { ...s.equipped, headTop: undefined, hat: undefined } })),
      unequipHair: () => set((s) => ({ equipped: { ...s.equipped, hair: undefined } })),

      grant: (id) => set((s) => ({ owned: { ...s.owned, [id]: true } })),

      reset: () =>
        set({
          catalog: DEFAULT_CATALOG,
          owned: {
            white_baseball_cap: true,
            blue_baseball_cap: true,
            red_baseball_cap: true,
            green_baseball_cap: true,
            flower_crown: true,
            top_hat: true,
            wizard_hat: true,
            skin_cute: true,
            skin_forest: true,
            skin_ocean: true,
            windswept_short: true,
            windswept_long: true,
            motorcycle_jacket_red_green: true,
            motorcycle_jacket_blue_orange: true,
            motorcycle_jacket_black_gold: true
          },
          points: 0,
          equipped: { headTop: "white_baseball_cap", hat: "white_baseball_cap" },
        }),
    }),
    {
      name: "cosmetics_store_v4",
      storage: createJSONStorage(() => AsyncStorage),
      version: 11,
      migrate: (state: any, from) => {
        const s = state ?? {};
        // Always update catalog to latest version to include new hats
        s.catalog = DEFAULT_CATALOG;

        // Remove old hair items that no longer exist
        if (s.owned) {
          delete s.owned.windswept_blonde;
          delete s.owned.windswept_brunette;
          delete s.owned.windswept_redhead;
          delete s.owned.windswept_black;
          delete s.owned.windswept_hair; // Remove the old single hair item too
        }

        // Force update owned items to include all current hats, skins, hair, and jackets (for testing)
        s.owned = {
          ...s.owned,
          white_baseball_cap: true,
          blue_baseball_cap: true,
          red_baseball_cap: true,
          green_baseball_cap: true,
          flower_crown: true,
          top_hat: true,
          wizard_hat: true,
          skin_cute: true,
          skin_forest: true,
          skin_ocean: true,
          windswept_short: true,
          windswept_long: true,
          motorcycle_jacket_red_green: true,
          motorcycle_jacket_blue_orange: true,
          motorcycle_jacket_black_gold: true
        };

        s.points = typeof s.points === "number" ? s.points : 0;
        s.equipped ??= {};
        // Keep headTop <-> hat in sync
        if (!s.equipped.headTop && s.equipped.hat) s.equipped.headTop = s.equipped.hat;
        if (!s.equipped.hat && s.equipped.headTop) s.equipped.hat = s.equipped.headTop;
        if (!s.equipped.headTop && !s.equipped.hat) {
          s.equipped.headTop = "white_baseball_cap";
          s.equipped.hat = "white_baseball_cap";
        }
        // Hair is no longer equipped by default - remove any old hair
        if (s.equipped.hair) {
          delete s.equipped.hair;
        }
        return s;
      },
    }
  )
);
