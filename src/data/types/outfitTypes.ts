// data/types/outfitTypes.ts
import type { AssetKey } from "../../assets/assetMap";

// Core customization for individual cosmetics
export type UserCosmeticCustomization = {
  cosmeticId: string;
  adjustments: {
    offset: { x: number; y: number };     // Position tweaks (-20 to +20 pixels)
    rotation: number;                     // Angle adjustments (-45° to +45°)
    scale: number;                        // Size tweaks (0.8x to 1.2x)
    layer: number;                        // Custom z-depth ordering (-5 to +5)
  };
  name?: string;                          // User's custom name for this adjustment
  tags?: string[];                        // "retro", "formal", "silly"
};

// Adjustment boundaries for validation
export const ADJUSTMENT_LIMITS = {
  offset: { x: [-20, 20], y: [-20, 20] } as const,
  rotation: [-45, 45] as const,
  scale: [0.8, 1.2] as const,
  layer: [-5, 5] as const
};

// Socket types for cosmetics
export type CosmeticSocket =
  | "headTop" | "headFront" | "headBack" | "earL" | "earR"
  | "bodyFront" | "bodyBack" | "hand" | "waist"
  | "background" | "foreground" | "fullBody"
  | "pose"; // Special socket for poses

// Pose cosmetic definition
export type PoseCosmetic = {
  id: string;
  name: string;
  description: string;
  animationFrames: number[];             // Custom animation sequence
  duration: number;                      // How long pose holds (ms)
  category: "action" | "expression" | "dance" | "formal" | "silly";
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockLevel: number;
  cost: number;
  isDefault: boolean;                    // Standard idle pose
  assetKey: AssetKey;                    // Sprite sheet reference
};

// Individual outfit slot
export type OutfitSlot = {
  id: string;                            // Unique outfit identifier
  name: string;                          // User-defined outfit name
  cosmetics: {
    [K in CosmeticSocket]?: {
      itemId: string;
      customization?: UserCosmeticCustomization;
    }
  };
  isDefault: boolean;                    // Is this the default local outfit?
  isPublic: boolean;                     // Is this the public gallery outfit?
  createdAt: Date;
  lastModified: Date;
  thumbnail?: string;                    // Auto-generated preview image
};

// Community shareable outfit preset
export type OutfitPreset = {
  id: string;
  name: string;                          // "Smooth Criminal", "Wizard Vibes"
  description: string;                   // Short description
  cosmetics: string[];                   // Which items are equipped
  customizations: UserCosmeticCustomization[];
  poseId?: string;                       // Associated pose
  creator: string;                       // Who made it
  likes: number;                         // Community rating
  featured: boolean;                     // Staff picked
  tags: string[];                        // Categories for filtering
  createdAt: Date;
};

// Outfit system storage
export type OutfitStorage = {
  slots: OutfitSlot[];                   // User's saved outfits
  maxSlots: number;                      // Current slot limit
  activeLocalOutfit: string;             // Currently equipped for gameplay
  activePublicOutfit: string;            // Displayed in gallery/contests
  unlockedCustomizations: string[];     // Available advanced tools
  poses: PoseCosmetic[];                 // Available poses
};

// Outfit management actions
export type OutfitActions = {
  // Slot management
  createOutfit: (name: string) => string;
  deleteOutfit: (id: string) => void;
  duplicateOutfit: (id: string, newName: string) => string;
  renameOutfit: (id: string, newName: string) => void;

  // Outfit activation
  setLocalOutfit: (id: string) => void;
  setPublicOutfit: (id: string) => void;

  // Cosmetic management
  equipCosmetic: (outfitId: string, socket: CosmeticSocket, itemId: string) => void;
  unequipCosmetic: (outfitId: string, socket: CosmeticSocket) => void;
  customizeCosmetic: (outfitId: string, socket: CosmeticSocket, customization: UserCosmeticCustomization) => void;

  // Pose management
  setPose: (outfitId: string, poseId: string) => void;

  // Utility
  resetCosmeticToDefault: (outfitId: string, socket: CosmeticSocket) => void;
  generateThumbnail: (outfitId: string) => Promise<string>;
  exportOutfitCode: (outfitId: string) => string;
  importOutfitCode: (code: string) => OutfitSlot | null;
};

// UI state for outfit editor
export type OutfitEditorState = {
  currentOutfitId: string | null;
  selectedSocket: CosmeticSocket | null;
  previewMode: "idle" | "walk" | "pose";
  showingGuidelines: boolean;
  undoStack: OutfitSlot[];
  redoStack: OutfitSlot[];
};

// Validation helper
export function validateAdjustment(adjustment: UserCosmeticCustomization['adjustments']): boolean {
  const { offset, rotation, scale, layer } = adjustment;

  return (
    offset.x >= ADJUSTMENT_LIMITS.offset.x[0] && offset.x <= ADJUSTMENT_LIMITS.offset.x[1] &&
    offset.y >= ADJUSTMENT_LIMITS.offset.y[0] && offset.y <= ADJUSTMENT_LIMITS.offset.y[1] &&
    rotation >= ADJUSTMENT_LIMITS.rotation[0] && rotation <= ADJUSTMENT_LIMITS.rotation[1] &&
    scale >= ADJUSTMENT_LIMITS.scale[0] && scale <= ADJUSTMENT_LIMITS.scale[1] &&
    layer >= ADJUSTMENT_LIMITS.layer[0] && layer <= ADJUSTMENT_LIMITS.layer[1]
  );
}

// Default pose
export const DEFAULT_POSE: PoseCosmetic = {
  id: "default_idle",
  name: "Idle",
  description: "Standard idle animation",
  animationFrames: [0, 1, 2, 3, 4, 5, 6, 7],
  duration: 1000,
  category: "action",
  rarity: "common",
  unlockLevel: 1,
  cost: 0,
  isDefault: true,
  assetKey: "idle8"
};