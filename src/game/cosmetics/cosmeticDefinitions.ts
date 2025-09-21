// game/cosmetics/cosmeticDefinitions.ts
import { CosmeticDefinition, CharacterAnchorSet, cosmeticSystem } from "./cosmeticSystem";

// Character anchor definitions for glidermon
export const glidermonIdleAnchors: CharacterAnchorSet = {
  characterId: "glidermon",
  animationSet: "idle",

  anchors: {
    // Head region
    headTop: { x: 34, y: 12, rotation: 0 },
    headFront: { x: 32, y: 18, rotation: 0 },
    headBack: { x: 32, y: 16, rotation: 0 },
    earL: { x: 20, y: 10, rotation: -15 },
    earR: { x: 44, y: 10, rotation: 15 },

    // Body region
    bodyFront: { x: 32, y: 35, rotation: 0 },
    bodyBack: { x: 32, y: 33, rotation: 0 },
    hand: { x: 40, y: 44, rotation: 0 },
    waist: { x: 32, y: 48, rotation: 0 },

    // Special regions
    background: { x: 32, y: 32, rotation: 0 },
    foreground: { x: 32, y: 32, rotation: 0 },
    fullBody: { x: 32, y: 32, rotation: 0 },
  },

  // Frame-specific adjustments (extending your current system)
  frameOverrides: [
    {
      frames: [3, 6], // Animation frames 3-6
      anchorAdjustments: {
        headTop: { x: -1 }, // Shift hat left by 1px
        headFront: { x: -1 }, // Keep glasses aligned
        earL: { rotation: -5 }, // Slight ear movement
        earR: { rotation: 5 },
      }
    },
    {
      frames: 7, // Blink frame
      anchorAdjustments: {
        headFront: { y: 1 }, // Glasses move slightly down when blinking
      }
    }
  ]
};

// Example cosmetic definitions for the current hats
export const cosmeticDefinitions: CosmeticDefinition[] = [
  // Original hats
  {
    id: "leaf_hat",
    name: "Leaf Cap",
    socket: "headTop",
    renderLayer: "headFront",
    texKey: "leaf_hat",
    frameMode: "animated", // Follows character animation
    anchor: {
      socket: "headTop",
      offset: { x: -15, y: 5 },
      pivot: { x: 18, y: 20 },
    },
    cost: 250,
    rarity: "common",
    category: "hats"
  },

  {
    id: "greater_hat",
    name: "Greater Leaf",
    socket: "headTop",
    renderLayer: "headFront",
    texKey: "greater_hat",
    frameMode: "animated",
    anchor: {
      socket: "headTop",
      offset: { x: -15, y: 5 },
      pivot: { x: 18, y: 16 },
    },
    cost: 600,
    rarity: "uncommon",
    category: "hats"
  },

  // Hat pack cosmetics with frame mapping
  {
    id: "frog_hat",
    name: "Green Frog Hat",
    socket: "headTop",
    renderLayer: "headFront",
    texKey: "hat_pack_1",
    frameMode: "static", // Single frame repeated
    frameMapping: {
      idle: [0, 0, 0, 0, 0, 0, 0, 0] // Frame 0 for all character frames
    },
    anchor: {
      socket: "headTop",
      offset: { x: -15, y: 8 }, // Your adjusted offset
      pivot: { x: 18, y: 20 },
    },
    cost: 300,
    rarity: "common",
    category: "hats"
  },

  {
    id: "viking_hat",
    name: "Viking Hat",
    socket: "headTop",
    renderLayer: "headFront",
    texKey: "hat_pack_1",
    frameMode: "static",
    frameMapping: {
      idle: [6, 6, 6, 6, 6, 6, 6, 6] // Frame 6 for all character frames
    },
    anchor: {
      socket: "headTop",
      offset: { x: -15, y: 5 },
      pivot: { x: 18, y: 20 },
    },
    frameOverrides: [
      {
        characterFrames: [3, 6],
        adjustments: {
          offset: { x: -1 }, // Extra adjustment for viking hat during these frames
        }
      }
    ],
    cost: 700,
    rarity: "rare",
    category: "hats"
  },

  // More complex cosmetics can be added later when assets are available
  // {
  //   id: "magic_aura",
  //   name: "Magical Aura",
  //   socket: "background",
  //   renderLayer: "background",
  //   texKey: "magic_effects", // Would need this asset
  //   // ... rest of definition
  // }
];

// Register all definitions with the cosmetic system
export function initializeCosmeticSystem() {
  // Register character anchors
  cosmeticSystem.registerCharacterAnchors(glidermonIdleAnchors);

  // Register all cosmetic definitions
  cosmeticDefinitions.forEach(cosmetic => {
    cosmeticSystem.registerCosmetic(cosmetic);
  });

  console.log(`Registered ${cosmeticDefinitions.length} cosmetic definitions`);
}