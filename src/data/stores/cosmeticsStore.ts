// stores/cosmeticsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themeDisplayNames } from "../../styles/themeVariations";
import type { CosmeticPalette } from "../cosmetics/palette";
import type { Rarity, ShopStockConfig } from "../shop/shopTypes";

export type { CosmeticPalette, PaletteTier, PaletteEffect } from "../cosmetics/palette";

// Assets for list thumbnails (RN <Image /> supports module ids or URIs)
const leafPng = require("../../assets/GliderMonLeafHat.png");
const greaterPng = require("../../assets/GliderMonGreaterHat.png");
const hatPackPng = require("../../assets/hats/hat_pack_1.png");

type Socket = "headTop" | "theme" | "skin" | "hair" | "jacket" | "shoes";

export type CosmeticItem = {
  id: string;
  name: string;
  cost: number;           // price in your soft currency
  socket: Socket;
  tex?: any;              // module id or URI (screens already handle both) - optional for themes
  themeId?: string;       // for theme cosmetics, the ThemeVariation id
  spineSkin?: string;     // Spine skin name for new Spine-based cosmetics
  shoeAttachment?: string; // for socket:"shoes" items: bare design name (e.g. "Cowboy Boots"),
                           // prefixed with L_/R_ to find the L_Shoe/R_Shoe attachments. Omitted
                           // means "use the shared L_ShoeShader/R_ShoeShader mesh" (the default look).
  hairSlots?: Partial<Record<"HairFront" | "HairBack", string>>; // for socket:"hair" items: which
                           // Spine attachment name to activate per hair slot (most styles are
                           // HairFront-only; a couple of long styles also key HairBack). The
                           // attachment doesn't need to be named "*Shader" -- HAIR_SLOTS is
                           // recolor-bypassed the same way hand-pose attachments are, see
                           // createSpineCharacterController.ts.
  maskRecolor?: {         // Mask recoloring configuration
    r?: string;           // Color for red channel
    g?: string;           // Color for green channel
    b?: string;           // Color for blue channel
    a?: string;           // Color for alpha channel
  };
  recolorable?: boolean;  // Does this item offer alternate premade palettes?
  palettes?: CosmeticPalette[]; // Designer-made colorway options (no free-form color picker)

  // Shop stock metadata (see data/shop/shopTypes.ts) -- independent of the
  // ownership/purchase fields above. Absence of shopStock just means this
  // item isn't sold through the Luma/Sable restock system (e.g. starter items).
  rarity?: Rarity;
  tags?: string[];
  shopStock?: ShopStockConfig[];
  repeatable?: boolean;   // defaults false (one-time permanent purchase)
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

  // Which premade colorway the user picked for each recolorable cosmetic,
  // kept separate from the catalog definition itself so selecting a palette
  // never mutates shared catalog data. Missing entry = "original".
  selectedPaletteByCosmeticId: Record<string, string>;

  // Whether the user has the Plus tier (gates palettes with tier:"plus").
  // No real entitlement/IAP layer exists yet -- see
  // docs/superpowers/specs/2026-08-19-cosmetic-palette-tiers.md. This is a
  // placeholder flag until that's built, flipped only via devSetPlus.
  hasPlus: boolean;

  // actions the screens call:
  loadCatalog: () => void;
  buy: (id: string) => boolean;   // mark as owned (you already deduct acorns in progression store)
  equip: (id: string) => void;
  equipTheme: (id: string) => void;
  equipHair: (id: string) => void;
  unequipHead: () => void;
  unequipHair: () => void;
  setCosmeticPalette: (cosmeticId: string, paletteId: string) => void;

  // dev-only: flips the Plus entitlement placeholder for testing.
  devSetPlus: (value: boolean) => void;

  // extras/dev
  grant: (id: string) => void;
  reset: () => void;
};

// Shared premade colorways for the two hair styles -- same designer palette
// either way, since both are the same hair "material", just different cuts.
// "Original" matches the recolor every hair item shipped with before this
// system existed, so existing equipped hair doesn't change look by default.
const HAIR_PALETTES: CosmeticPalette[] = [
  { id: "original", name: "Original", colors: ["#f5deb3", "#daa520", "#fff8dc"], channelColors: { r: "#f5deb3", g: "#fff8dc", b: "#daa520", a: "#ffff00" } },
  { id: "midnight", name: "Midnight", colors: ["#4A312C", "#2a202a", "#7C5A4A"], channelColors: { r: "#4A312C", g: "#7C5A4A", b: "#2a202a", a: "#9a919b" } },
  { id: "honey", name: "Honey", colors: ["#dc995d", "#dec575", "#865d56"], channelColors: { r: "#dc995d", g: "#dec575", b: "#865d56", a: "#d9d3d9" } },
  { id: "rose", name: "Rose", colors: ["#b6607c", "#d3a092", "#613661"], channelColors: { r: "#b6607c", g: "#d3a092", b: "#613661", a: "#d9d3d9" } },
  {
    id: "starlight", name: "Starlight", tier: "plus",
    colors: ["#6B7A99", "#2C3648", "#A8B8D1"],
    channelColors: { r: "#6B7A99", g: "#2C3648", b: "#A8B8D1", a: "#D8E4F0" },
    effect: { kind: "shimmer", speed: 0.45, intensity: 0.5, tint: "#BFE8FF" },
  },
];

const DEFAULT_CATALOG: CosmeticItem[] = [
  // Spine-based Hat Cosmetics - Baseball Caps (using mask recoloring)
  {
    id: "blue_baseball_cap",
    name: "Blue Baseball Cap",
    cost: 200,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap", // Use white cap as base
    maskRecolor: { r: "#5f80a6" }, // Blue color for R channel
    tex: hatPackPng, // Keep thumbnail for shop display
    rarity: "common",
    tags: ["casual", "colorful"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "green_baseball_cap",
    name: "Green Baseball Cap",
    cost: 200,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap", // Use white cap as base
    maskRecolor: { r: "#6f975e" }, // Green color for R channel
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual", "colorful"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "red_baseball_cap",
    name: "Red Baseball Cap",
    cost: 200,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap", // Use white cap as base
    maskRecolor: { r: "#a83f48" }, // Red color from palette
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual", "colorful"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "white_baseball_cap",
    name: "White Baseball Cap",
    cost: 150,
    socket: "headTop",
    spineSkin: "Hats/Baseball Caps/White Baseball Cap",
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },

  // Spine-based Hat Cosmetics - Special Hats
  {
    id: "flower_crown",
    name: "Flower Crown",
    cost: 400,
    socket: "headTop",
    spineSkin: "Hats/Flower Crown",
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["cute", "colorful", "nature", "cheerful"],
    // Never naturally appears in Sable's store -- a single row means exclusive.
    // Bright/cute/nature -- pure Luma personality fit.
    shopStock: [{ store: "luma", weight: 10 }],
  },
  {
    id: "top_hat",
    name: "Top Hat",
    cost: 500,
    socket: "headTop",
    spineSkin: "Hats/Top Hat",
    tex: hatPackPng,
    rarity: "rare",
    tags: ["formal", "fancy"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "wizard_hat",
    name: "Wizard Hat",
    cost: 600,
    socket: "headTop",
    spineSkin: "Hats/Wizard Hat",
    tex: hatPackPng,
    rarity: "special",
    tags: ["magic", "fantasy"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },

  // Spine-based Hat Cosmetics - Shader hats (hue-indexed recolor: r=primary, g=secondary, b=detail)
  {
    id: "hat_band_and_bow",
    name: "Band and Bow",
    cost: 300,
    socket: "headTop",
    spineSkin: "Hats/Shader/Band and Bow",
    maskRecolor: { r: "#b6607c", g: "#dec575", b: "#2a202a" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["cute", "formal", "cheerful"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
  },
  {
    id: "hat_beret",
    name: "Beret",
    cost: 250,
    socket: "headTop",
    spineSkin: "Hats/Shader/Beret",
    maskRecolor: { r: "#a83f48", g: "#2a202a", b: "#d9d3d9" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "common",
    tags: ["artsy", "casual"],
    shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
    palettes: [
      { id: "original", name: "Original", colors: ["#a83f48", "#2a202a", "#d9d3d9"], channelColors: { r: "#a83f48", g: "#2a202a", b: "#d9d3d9" } },
      { id: "forest", name: "Forest", colors: ["#6f975e", "#3b6b58", "#dec575"], channelColors: { r: "#6f975e", g: "#3b6b58", b: "#dec575" } },
      { id: "midnight", name: "Midnight", colors: ["#2a202a", "#5f80a6", "#9db8c5"], channelColors: { r: "#2a202a", g: "#5f80a6", b: "#9db8c5" } },
      { id: "sunset", name: "Sunset", colors: ["#dc995d", "#c55650", "#dec575"], channelColors: { r: "#dc995d", g: "#c55650", b: "#dec575" } },
      {
        id: "ember", name: "Ember", tier: "plus",
        colors: ["#8B2E2E", "#2A1010", "#D9D3D9"],
        channelColors: { r: "#8B2E2E", g: "#2A1010", b: "#D9D3D9" },
        effect: { kind: "shimmer", speed: 0.5, intensity: 0.55, tint: "#FFF3D6" },
      },
    ],
  },
  {
    id: "hat_bonnett",
    name: "Bonnett",
    cost: 250,
    socket: "headTop",
    spineSkin: "Hats/Shader/Bonnett",
    maskRecolor: { r: "#dec575", g: "#d9d3d9", b: "#b6607c" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["cute", "vintage", "cheerful"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
  },
  {
    id: "hat_brunch",
    name: "Brunch",
    cost: 300,
    socket: "headTop",
    spineSkin: "Hats/Shader/Brunch",
    maskRecolor: { r: "#dc995d", g: "#865d56", b: "#d9d3d9" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["cute", "casual", "cheerful"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
  },
  {
    id: "hat_cowboy_hat",
    name: "Cowboy Hat",
    cost: 350,
    socket: "headTop",
    spineSkin: "Hats/Shader/Cowboy Hat",
    maskRecolor: { r: "#865d56", g: "#2a202a", b: "#dec575" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["rugged", "casual"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "hat_crown",
    name: "Crown",
    cost: 600,
    socket: "headTop",
    spineSkin: "Hats/Shader/Crown",
    maskRecolor: { r: "#dec575", g: "#613661", b: "#a83f48" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "special",
    tags: ["formal", "fancy"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
    palettes: [
      { id: "original", name: "Original", colors: ["#dec575", "#613661", "#a83f48"], channelColors: { r: "#dec575", g: "#613661", b: "#a83f48" } },
      { id: "berry", name: "Berry", colors: ["#b6607c", "#613661", "#524f73"], channelColors: { r: "#b6607c", g: "#613661", b: "#524f73" } },
      { id: "ocean", name: "Ocean", colors: ["#5f80a6", "#2d494b", "#9db8c5"], channelColors: { r: "#5f80a6", g: "#2d494b", b: "#9db8c5" } },
      { id: "honey", name: "Honey", colors: ["#dec575", "#dc995d", "#865d56"], channelColors: { r: "#dec575", g: "#dc995d", b: "#865d56" } },
      {
        id: "aurora", name: "Aurora", tier: "plus",
        colors: ["#4B2E5E", "#F4D97A", "#8B5FBF"],
        channelColors: { r: "#4B2E5E", g: "#241830", b: "#8B5FBF" },
        effect: { kind: "gradient", channelColorsB: { r: "#F4D97A", g: "#DEC575" } },
      },
    ],
  },
  {
    id: "hat_durag",
    name: "Durag",
    cost: 300,
    socket: "headTop",
    spineSkin: "Hats/Shader/Durag",
    maskRecolor: { r: "#2a202a", g: "#a83f48", b: "#d9d3d9" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["street", "edgy"],
    shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
  },
  {
    id: "hat_ear_beanie",
    name: "Ear Beanie",
    cost: 250,
    socket: "headTop",
    spineSkin: "Hats/Shader/Ear Beanie",
    maskRecolor: { r: "#6f975e", g: "#865d56", b: "#d9d3d9" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["cute", "cozy", "cheerful"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
  },
  {
    id: "hat_fedora",
    name: "Fedora",
    cost: 400,
    socket: "headTop",
    spineSkin: "Hats/Shader/Fedora",
    maskRecolor: { r: "#2a202a", g: "#9a919b", b: "#dec575" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["goth", "mysterious"],
    // Moody/mysterious -- pure Sable personality fit.
    shopStock: [{ store: "sable", weight: 10 }],
  },
  {
    id: "hat_headwrap",
    name: "Headwrap",
    cost: 300,
    socket: "headTop",
    spineSkin: "Hats/Shader/Headwrap",
    maskRecolor: { r: "#dc995d", g: "#613661", b: "#dec575" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "hat_jester",
    name: "Jester",
    cost: 350,
    socket: "headTop",
    spineSkin: "Hats/Shader/Jester",
    maskRecolor: { r: "#613661", g: "#dec575", b: "#a83f48" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["weird", "theatrical"],
    shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
  },
  {
    id: "hat_moon_and_stars",
    name: "Moon and Stars",
    cost: 400,
    socket: "headTop",
    spineSkin: "Hats/Shader/Moon and Stars",
    maskRecolor: { r: "#2a202a", g: "#5f80a6", b: "#dec575" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["magic", "spooky", "night"],
    // Moody/nocturnal -- pure Sable personality fit.
    shopStock: [{ store: "sable", weight: 10 }],
  },
  {
    id: "hat_newsboy",
    name: "Newsboy",
    cost: 300,
    socket: "headTop",
    spineSkin: "Hats/Shader/Newsboy",
    maskRecolor: { r: "#865d56", g: "#2a202a", b: "#9a919b" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual", "vintage"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "hat_nurse",
    name: "Nurse",
    cost: 300,
    socket: "headTop",
    spineSkin: "Hats/Shader/Nurse",
    maskRecolor: { r: "#d9d3d9", g: "#a83f48", b: "#5f80a6" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["costume"],
    shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
  },
  {
    id: "hat_officer",
    name: "Officer",
    cost: 350,
    socket: "headTop",
    spineSkin: "Hats/Shader/Officer",
    maskRecolor: { r: "#5f80a6", g: "#2a202a", b: "#dec575" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["formal", "dark"],
    shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
  },
  {
    id: "hat_paper_hat",
    name: "Paper Hat",
    cost: 150,
    socket: "headTop",
    spineSkin: "Hats/Shader/Paper Hat",
    maskRecolor: { r: "#d9d3d9", g: "#9a919b", b: "#2a202a" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["silly", "casual", "cheerful"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
  },
  {
    id: "hat_party_hat",
    name: "Party Hat",
    cost: 200,
    socket: "headTop",
    spineSkin: "Hats/Shader/Party Hat",
    maskRecolor: { r: "#a83f48", g: "#dec575", b: "#5f80a6" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["cute", "colorful", "fun", "cheerful"],
    // Bright, festive, fun -- pure Luma personality fit.
    shopStock: [{ store: "luma", weight: 9 }, { store: "sable", weight: 1 }],
  },
  {
    id: "hat_pilgrim",
    name: "Pilgrim",
    cost: 300,
    socket: "headTop",
    spineSkin: "Hats/Shader/Pilgrim",
    maskRecolor: { r: "#2a202a", g: "#d9d3d9", b: "#dec575" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["costume", "vintage"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "hat_pom_beanie",
    name: "Pom Beanie",
    cost: 250,
    socket: "headTop",
    spineSkin: "Hats/Shader/Pom Beanie",
    maskRecolor: { r: "#6f975e", g: "#d9d3d9", b: "#865d56" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["cute", "cozy", "cheerful"],
    shopStock: [{ store: "luma", weight: 8 }, { store: "sable", weight: 2 }],
  },
  {
    id: "hat_propeller",
    name: "Propeller",
    cost: 350,
    socket: "headTop",
    spineSkin: "Hats/Shader/Propeller",
    maskRecolor: { r: "#a83f48", g: "#6f975e", b: "#5f80a6" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["silly", "weird", "cheerful"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
  },
  {
    id: "hat_sailor",
    name: "Sailor",
    cost: 300,
    socket: "headTop",
    spineSkin: "Hats/Shader/Sailor",
    maskRecolor: { r: "#5f80a6", g: "#d9d3d9", b: "#2a202a" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual", "nautical"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "hat_santa_hat",
    name: "Santa Hat",
    cost: 400,
    socket: "headTop",
    spineSkin: "Hats/Shader/Santa Hat",
    maskRecolor: { r: "#a83f48", g: "#d9d3d9", b: "#dec575" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["festive", "colorful", "cheerful"],
    shopStock: [{ store: "luma", weight: 8 }, { store: "sable", weight: 2 }],
  },
  {
    id: "hat_striped_pom_beanie",
    name: "Striped Pom Beanie",
    cost: 300,
    socket: "headTop",
    spineSkin: "Hats/Shader/Striped Pom Beanie",
    maskRecolor: { r: "#a83f48", g: "#d9d3d9", b: "#5f80a6" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["cute", "colorful", "cozy", "cheerful"],
    shopStock: [{ store: "luma", weight: 8 }, { store: "sable", weight: 2 }],
  },
  {
    id: "hat_sunhat",
    name: "Sunhat",
    cost: 250,
    socket: "headTop",
    spineSkin: "Hats/Shader/Sunhat",
    maskRecolor: { r: "#dec575", g: "#dc995d", b: "#d9d3d9" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["cute", "nature", "colorful", "cheerful"],
    // Bright/nature/sunny -- pure Luma personality fit.
    shopStock: [{ store: "luma", weight: 9 }, { store: "sable", weight: 1 }],
  },
  {
    id: "hat_wicked",
    name: "Wicked",
    cost: 400,
    socket: "headTop",
    spineSkin: "Hats/Shader/Wicked",
    maskRecolor: { r: "#2a202a", g: "#6f975e", b: "#613661" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["goth", "spooky", "dark"],
    // Dark/spooky -- pure Sable personality fit, never appears at Luma's.
    shopStock: [{ store: "sable", weight: 10 }],
  },
  {
    id: "hat_witch",
    name: "Witch",
    cost: 400,
    socket: "headTop",
    spineSkin: "Hats/Shader/Witch",
    maskRecolor: { r: "#613661", g: "#2a202a", b: "#dec575" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["goth", "magic", "spooky"],
    // Belongs strongly to Sable's identity, but can rarely show up at Luma's.
    shopStock: [{ store: "sable", weight: 9 }, { store: "luma", weight: 1 }],
  },

  // Shoe cosmetics - default look + purchasable designs (both feet always change together)
  {
    id: "shoe_classic",
    name: "Classic Shoes",
    cost: 0,
    socket: "shoes",
    // No maskRecolor: renders via the plain L_Shoe/R_Shoe attachment (no
    // shader material), same as it did before this feature existed, so the
    // default look doesn't pay for an always-on hue-indexed recolor draw.
    tex: hatPackPng,
    // Free starter item, always owned by default -- intentionally no
    // shopStock so it never enters the restock pool.
  },
  {
    id: "shoe_cowboy_boots",
    name: "Cowboy Boots",
    cost: 350,
    socket: "shoes",
    shoeAttachment: "Cowboy Boots",
    maskRecolor: { r: "#865d56", g: "#2a202a", b: "#dec575" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "uncommon",
    tags: ["rugged", "casual"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
    palettes: [
      { id: "original", name: "Original", colors: ["#865d56", "#2a202a", "#dec575"], channelColors: { r: "#865d56", g: "#2a202a", b: "#dec575" } },
      { id: "moss", name: "Moss", colors: ["#6f975e", "#3b6b58", "#a8b164"], channelColors: { r: "#6f975e", g: "#3b6b58", b: "#a8b164" } },
      { id: "frost", name: "Frost", colors: ["#9db8c5", "#6c9ba7", "#d9d3d9"], channelColors: { r: "#9db8c5", g: "#6c9ba7", b: "#d9d3d9" } },
      {
        id: "gilded", name: "Gilded", tier: "plus",
        colors: ["#4A3320", "#DEC575", "#8B6F3D"],
        channelColors: { r: "#4A3320", g: "#1A1210", b: "#DEC575" },
        effect: { kind: "gradient", channelColorsB: { r: "#DEC575", g: "#8B6F3D" } },
      },
    ],
  },
  {
    id: "shoe_curvies",
    name: "Curvies",
    cost: 250,
    socket: "shoes",
    shoeAttachment: "Curvies",
    maskRecolor: { r: "#b6607c", g: "#d9d3d9", b: "#2a202a" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "shoe_deep_soles",
    name: "Deep Soles",
    cost: 300,
    socket: "shoes",
    shoeAttachment: "Deep Soles",
    maskRecolor: { r: "#2a202a", g: "#a83f48", b: "#d9d3d9" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["street", "edgy"],
    shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
  },
  {
    id: "shoe_dress_up",
    name: "Dress Up",
    cost: 350,
    socket: "shoes",
    shoeAttachment: "Dress Up",
    maskRecolor: { r: "#2a202a", g: "#dec575", b: "#d9d3d9" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["formal", "fun"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
  },
  {
    id: "shoe_ice_skates",
    name: "Ice Skates",
    cost: 400,
    socket: "shoes",
    shoeAttachment: "Ice Skates",
    maskRecolor: { r: "#5f80a6", g: "#d9d3d9", b: "#9a919b" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["fun", "winter", "cheerful"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
  },
  {
    id: "shoe_lace_up",
    name: "Lace Up",
    cost: 300,
    socket: "shoes",
    shoeAttachment: "Lace Up",
    maskRecolor: { r: "#865d56", g: "#d9d3d9", b: "#2a202a" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "shoe_oxfords",
    name: "Oxfords",
    cost: 350,
    socket: "shoes",
    shoeAttachment: "Oxfords",
    maskRecolor: { r: "#2a202a", g: "#865d56", b: "#dec575" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["formal"],
    shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
  },
  {
    id: "shoe_roller_skates",
    name: "Roller Skates",
    cost: 400,
    socket: "shoes",
    shoeAttachment: "Roller Skates",
    maskRecolor: { r: "#a83f48", g: "#5f80a6", b: "#d9d3d9" },
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["fun", "colorful", "cheerful"],
    shopStock: [{ store: "luma", weight: 8 }, { store: "sable", weight: 2 }],
  },
  {
    id: "shoe_runners",
    name: "Runners",
    cost: 250,
    socket: "shoes",
    shoeAttachment: "Runners",
    maskRecolor: { r: "#6f975e", g: "#d9d3d9", b: "#2a202a" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual", "sporty"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
  },
  {
    id: "shoe_sneakers",
    name: "Sneakers",
    cost: 200,
    socket: "shoes",
    shoeAttachment: "Sneakers",
    maskRecolor: { r: "#d9d3d9", g: "#5f80a6", b: "#a83f48" },
    tex: hatPackPng,
    rarity: "common",
    tags: ["casual", "sporty"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
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
    tex: hatPackPng,
    rarity: "common",
    tags: ["cute", "colorful", "cheerful"],
    // Cheerful/bright -- pure Luma personality fit.
    shopStock: [{ store: "luma", weight: 10 }],
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
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["cyberpunk", "neon", "edgy"],
    shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
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
    tex: hatPackPng,
    rarity: "common",
    tags: ["nature", "forest", "cheerful"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
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
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["nature", "ocean"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
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
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["colorful", "sunset", "cheerful"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
  },

  // Hair cosmetics - Hair styles (color selected separately)
  {
    id: "windswept_short",
    name: "Windswept Short",
    cost: 400,
    socket: "hair",
    spineSkin: "default", // Uses default skin with shader for HairFront only
    hairSlots: { HairFront: "WindsweptShader" },
    tex: hatPackPng, // Placeholder thumbnail
    recolorable: true,
    rarity: "uncommon",
    tags: ["casual"],
    shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "windswept_long",
    name: "Windswept Long",
    cost: 600,
    socket: "hair",
    spineSkin: "default", // Uses default skin with shader for both HairFront and HairBack
    hairSlots: { HairFront: "WindsweptShader", HairBack: "WindsweptShader" },
    tex: hatPackPng, // Placeholder thumbnail
    recolorable: true,
    rarity: "special",
    tags: ["flowing"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
    palettes: HAIR_PALETTES,
  },

  // New named hairstyles -- all HairFront-only (see skeleton.json's default
  // skin, HairFront attachment list). Plain attachment names (not
  // "*Shader"-suffixed like Windswept) since they were added as their own
  // named meshes; recolorable via the same HAIR_PALETTES colorways through
  // the HAIR_SLOTS bypass in configureMaterialOverride. Cost/rarity/shop
  // weighting is a first-pass split by vibe: playful/cute cuts lean Luma,
  // edgier/moodier ones lean Sable, per this project's shop-personality
  // convention -- tune once you've seen them in the shop.
  {
    id: "hair_breezy_crop",
    name: "Breezy Crop",
    cost: 300,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Breezy Crop" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "common",
    tags: ["casual", "short"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_charming",
    name: "Charming",
    cost: 500,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Charming" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "rare",
    tags: ["elegant"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_choppy_crop",
    name: "Choppy Crop",
    cost: 300,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Choppy Crop" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "common",
    tags: ["edgy", "short"],
    shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_cloud_bob",
    name: "Cloud Bob",
    cost: 400,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Cloud Bob" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "uncommon",
    tags: ["casual"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_cozy_bun",
    name: "Cozy Bun",
    cost: 400,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Cozy Bun" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "uncommon",
    tags: ["cute", "bun"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_feathered_bob",
    name: "Feathered Bob",
    cost: 500,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Feathered Bob" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "rare",
    tags: ["elegant"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_loose_bun",
    name: "Loose Bun",
    cost: 350,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Loose Bun" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "common",
    tags: ["casual", "bun"],
    shopStock: [{ store: "luma", weight: 5 }, { store: "sable", weight: 5 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_mop_top",
    name: "Mop Top",
    cost: 300,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Mop Top" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "common",
    tags: ["casual", "playful"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_puff_buns",
    name: "Puff Buns",
    cost: 450,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Puff Buns" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "uncommon",
    tags: ["cute", "bun"],
    shopStock: [{ store: "luma", weight: 8 }, { store: "sable", weight: 2 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_scruffy",
    name: "Scruffy",
    cost: 300,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Scruffy" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "common",
    tags: ["edgy", "casual"],
    shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_secret_spray",
    name: "Secret Spray",
    cost: 500,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Secret Spray" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "rare",
    tags: ["edgy", "bold"],
    shopStock: [{ store: "sable", weight: 8 }, { store: "luma", weight: 2 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_spiky",
    name: "Spiky",
    cost: 350,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Spiky" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "common",
    tags: ["edgy", "bold"],
    shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_spirit",
    name: "Spirit",
    cost: 550,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Spirit" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "rare",
    tags: ["ethereal"],
    shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_spirited_sweep",
    name: "Spirited Sweep",
    cost: 450,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Spirited Sweep" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "uncommon",
    tags: ["flowing"],
    shopStock: [{ store: "luma", weight: 5 }, { store: "sable", weight: 5 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_star_buns",
    name: "Star Buns",
    cost: 450,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Star Buns" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "uncommon",
    tags: ["cute", "bun"],
    shopStock: [{ store: "luma", weight: 8 }, { store: "sable", weight: 2 }],
    palettes: HAIR_PALETTES,
  },
  {
    id: "hair_storybook_braids",
    name: "Storybook Braids",
    cost: 600,
    socket: "hair",
    spineSkin: "default",
    hairSlots: { HairFront: "Storybook Braids" },
    tex: hatPackPng,
    recolorable: true,
    rarity: "special",
    tags: ["cute", "flowing"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
    palettes: HAIR_PALETTES,
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
    tex: hatPackPng, // Placeholder thumbnail
    rarity: "rare",
    tags: ["bold", "colorful"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
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
    tex: hatPackPng,
    rarity: "rare",
    tags: ["bold", "colorful"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
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
    tex: hatPackPng,
    recolorable: true,
    rarity: "special",
    tags: ["goth", "edgy"],
    // Classic black/gold -- pure Sable personality fit.
    shopStock: [{ store: "sable", weight: 8 }, { store: "luma", weight: 2 }],
    palettes: [
      { id: "original", name: "Original", colors: ["#2a202a", "#dec575", "#36373d", "#9a919b"], channelColors: { r: "#2a202a", g: "#dec575", b: "#36373d", a: "#9a919b" } },
      { id: "rose", name: "Rose", colors: ["#b6607c", "#d3a092", "#524f73", "#d9d3d9"], channelColors: { r: "#b6607c", g: "#d3a092", b: "#524f73", a: "#d9d3d9" } },
      { id: "midnight", name: "Midnight", colors: ["#2d494b", "#5f80a6", "#2a202a", "#9db8c5"], channelColors: { r: "#2d494b", g: "#5f80a6", b: "#2a202a", a: "#9db8c5" } },
      {
        id: "chrome", name: "Chrome", tier: "plus",
        colors: ["#1A1A1D", "#D8DCE0", "#4A4A50", "#9AA0A6"],
        channelColors: { r: "#1A1A1D", g: "#4A4A50", b: "#0D0D0F", a: "#2E2E33" },
        effect: { kind: "gradient", channelColorsB: { r: "#D8DCE0", g: "#EDEFF2", a: "#9AA0A6" } },
      },
    ],
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
    tex: hatPackPng,
    rarity: "rare",
    tags: ["elegant"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
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
    tex: hatPackPng,
    rarity: "uncommon",
    tags: ["rugged", "earthy"],
    shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
  },

  // Theme cosmetics - unlockable color themes
  {
    id: "theme_cute", name: themeDisplayNames.cute, cost: 500, socket: "theme", themeId: "cute",
    rarity: "rare", tags: ["cute", "colorful", "cheerful"],
    // Cheerful/bright -- pure Luma personality fit.
    shopStock: [{ store: "luma", weight: 10 }],
  },
  {
    id: "theme_cyberpunk", name: themeDisplayNames.cyberpunk, cost: 750, socket: "theme", themeId: "cyberpunk",
    rarity: "special", tags: ["cyberpunk", "edgy"],
    shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
  },
  {
    id: "theme_forest", name: themeDisplayNames.forest, cost: 400, socket: "theme", themeId: "forest",
    rarity: "uncommon", tags: ["nature"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
  },
  {
    id: "theme_ocean", name: themeDisplayNames.ocean, cost: 450, socket: "theme", themeId: "ocean",
    rarity: "uncommon", tags: ["nature"],
    shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
  },
  {
    id: "theme_sunset", name: themeDisplayNames.sunset, cost: 550, socket: "theme", themeId: "sunset",
    rarity: "rare", tags: ["colorful", "cheerful"],
    shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
  },
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
        motorcycle_jacket_black_gold: true,   // for testing jacket cosmetics
        shoe_classic: true                    // starter shoes owned
      },
      points: 0,                            // display only (Shop UI shows "Acorns: {points}")

      // start with White Baseball Cap equipped (Spine-based)
      equipped: { headTop: "white_baseball_cap", hat: "white_baseball_cap" },

      selectedPaletteByCosmeticId: {},
      hasPlus: false,

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

      setCosmeticPalette: (cosmeticId, paletteId) => {
        const item = get().catalog.find((c) => c.id === cosmeticId);
        const palette = item?.palettes?.find((p) => p.id === paletteId);
        if (!item?.recolorable || !palette) return;
        // Belt-and-suspenders: the UI already blocks tapping a locked
        // palette, but the store shouldn't trust that -- a Plus palette
        // can never actually be selected without the entitlement.
        if (palette.tier === "plus" && !get().hasPlus) return;
        set((s) => ({
          selectedPaletteByCosmeticId: { ...s.selectedPaletteByCosmeticId, [cosmeticId]: paletteId },
        }));
      },

      devSetPlus: (value) => set({ hasPlus: value }),

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
            motorcycle_jacket_black_gold: true,
            shoe_classic: true
          },
          points: 0,
          equipped: { headTop: "white_baseball_cap", hat: "white_baseball_cap" },
          selectedPaletteByCosmeticId: {},
          hasPlus: false,
        }),
    }),
    {
      name: "cosmetics_store_v4",
      storage: createJSONStorage(() => AsyncStorage),
      version: 15, // bumped to pick up the 16 new named hairstyles in DEFAULT_CATALOG
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
          motorcycle_jacket_black_gold: true,
          shoe_classic: true,
          hat_beret: true,        // for testing premade colorways
          hat_crown: true,        // for testing premade colorways
          shoe_cowboy_boots: true // for testing premade colorways
        };

        s.selectedPaletteByCosmeticId ??= {};
        s.hasPlus ??= false;

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
