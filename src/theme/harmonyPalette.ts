import { CardType } from "../game/harmonyDrift/types";

export const HarmonyPalette = {
  Energy: ["#f97316", "#fed7aa"], // Warm orange gradient
  Calm: ["#38bdf8", "#bae6fd"], // Blue gradient
  Rest: ["#a855f7", "#e9d5ff"], // Purple gradient
  Nourish: ["#22c55e", "#bbf7d0"], // Green gradient
  Anchor: ["#facc15", "#fef08a"], // Yellow gradient
} as const;

export const HarmonyColors = {
  // Parchment backgrounds
  parchment: {
    primary: "#F5F1E9",
    secondary: "#FFFFFF",
    overlay: "rgba(245,241,233,0.95)",
  },

  // Text colors
  text: {
    primary: "#344B40", // Deep moss
    secondary: "#374151", // Gray
    tertiary: "#94a3b8", // Light gray
    special: "#1e40af", // Blue for special effects
  },

  // Border colors
  border: {
    primary: "rgba(52,75,64,0.15)",
    secondary: "rgba(52,75,64,0.3)",
    accent: "#344B40",
  },

  // Rarity colors for card borders
  rarity: {
    Common: ["#9BBE9C", "#C7C6E6"], // Sage green to lavender mist
    Uncommon: ["#F1C27D", "#9BBE9C"], // Amber gold to sage green
    Rare: ["#C7C6E6", "#F1C27D"], // Lavender mist to amber gold
    Epic: ["#344B40", "#9BBE9C"], // Deep moss to sage green
    Legendary: ["#F1C27D", "#344B40"], // Amber gold to deep moss
  },

  // Nature theme colors
  nature: {
    sage: "#9BBE9C",
    lavender: "#C7C6E6",
    amber: "#F1C27D",
    moss: "#344B40",
  },
} as const;

// Helper function to get type accent color
export const getTypeAccent = (type: CardType, fallback: string = "#38bdf8"): string => {
  return HarmonyPalette[type]?.[0] || fallback;
};

// Helper function to get type gradient
export const getTypeGradient = (type: CardType): [string, string] => {
  return HarmonyPalette[type] || HarmonyPalette.Calm;
};

// Helper function to get rarity gradient
export const getRarityGradient = (rarity: keyof typeof HarmonyColors.rarity): [string, string] => {
  return HarmonyColors.rarity[rarity] || HarmonyColors.rarity.Common;
};

// Opacity constants for visual hierarchy
export const OpacityLevels = {
  minimal: 0.06, // For very subtle decorations
  inactive: 0.08, // For non-interactive backgrounds
  subtle: 0.12, // For paper textures and subtle effects
  moderate: 0.15, // For borders and accents
  medium: 0.3, // For medium visibility elements
  active: 0.8, // For interactive elements
  full: 1.0, // For primary content
} as const;