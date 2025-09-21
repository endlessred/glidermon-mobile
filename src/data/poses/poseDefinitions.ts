// data/poses/poseDefinitions.ts
import { PoseCosmetic, DEFAULT_POSE } from "../types/outfitTypes";

export const POSE_DEFINITIONS: PoseCosmetic[] = [
  DEFAULT_POSE,

  // Action Poses
  {
    id: "hero_stance",
    name: "Hero Stance",
    description: "Confident superhero pose with hands on hips",
    animationFrames: [3], // Static frame
    duration: 0, // Static pose
    category: "action",
    rarity: "common",
    unlockLevel: 5,
    cost: 100,
    isDefault: false,
    assetKey: "idle8" // Would need separate pose sprite sheet
  },

  {
    id: "thinking",
    name: "Thinking",
    description: "Contemplative pose with hand on chin",
    animationFrames: [2],
    duration: 0,
    category: "action",
    rarity: "common",
    unlockLevel: 3,
    cost: 75,
    isDefault: false,
    assetKey: "idle8"
  },

  {
    id: "pointing",
    name: "Pointing",
    description: "Dramatic pointing gesture",
    animationFrames: [5],
    duration: 0,
    category: "action",
    rarity: "uncommon",
    unlockLevel: 8,
    cost: 150,
    isDefault: false,
    assetKey: "idle8"
  },

  // Expression Poses
  {
    id: "cheerful_wave",
    name: "Cheerful Wave",
    description: "Friendly greeting with a wave",
    animationFrames: [1, 2, 1, 0], // Slight animation
    duration: 2000,
    category: "expression",
    rarity: "common",
    unlockLevel: 2,
    cost: 50,
    isDefault: false,
    assetKey: "idle8"
  },

  {
    id: "confident",
    name: "Confident",
    description: "Arms crossed with confident stance",
    animationFrames: [4],
    duration: 0,
    category: "expression",
    rarity: "common",
    unlockLevel: 4,
    cost: 100,
    isDefault: false,
    assetKey: "idle8"
  },

  {
    id: "shy",
    name: "Shy",
    description: "Bashful pose with slight turn",
    animationFrames: [6],
    duration: 0,
    category: "expression",
    rarity: "uncommon",
    unlockLevel: 6,
    cost: 125,
    isDefault: false,
    assetKey: "idle8"
  },

  // Dance Poses
  {
    id: "moonwalk_ready",
    name: "Moonwalk Ready",
    description: "The iconic Michael Jackson lean",
    animationFrames: [7],
    duration: 0,
    category: "dance",
    rarity: "rare",
    unlockLevel: 15,
    cost: 500,
    isDefault: false,
    assetKey: "idle8"
  },

  {
    id: "disco_point",
    name: "Disco Point",
    description: "Classic Saturday Night Fever pose",
    animationFrames: [5],
    duration: 0,
    category: "dance",
    rarity: "rare",
    unlockLevel: 12,
    cost: 400,
    isDefault: false,
    assetKey: "idle8"
  },

  // Formal Poses
  {
    id: "gentleman_bow",
    name: "Gentleman's Bow",
    description: "Formal bow with hat tip",
    animationFrames: [6, 7, 6], // Bowing motion
    duration: 1500,
    category: "formal",
    rarity: "uncommon",
    unlockLevel: 10,
    cost: 250,
    isDefault: false,
    assetKey: "idle8"
  },

  {
    id: "royal",
    name: "Royal",
    description: "Regal pose with perfect posture",
    animationFrames: [0],
    duration: 0,
    category: "formal",
    rarity: "epic",
    unlockLevel: 20,
    cost: 800,
    isDefault: false,
    assetKey: "idle8"
  },

  // Silly Poses
  {
    id: "confused",
    name: "Confused",
    description: "Scratching head with puzzled expression",
    animationFrames: [3, 4, 3, 2],
    duration: 2500,
    category: "silly",
    rarity: "common",
    unlockLevel: 7,
    cost: 150,
    isDefault: false,
    assetKey: "idle8"
  },

  {
    id: "excited_jump",
    name: "Excited Jump",
    description: "Mid-air jump with joy",
    animationFrames: [1, 0, 1, 2, 1],
    duration: 1000,
    category: "silly",
    rarity: "uncommon",
    unlockLevel: 9,
    cost: 200,
    isDefault: false,
    assetKey: "idle8"
  }
];

// Helper function to get poses by category
export function getPosesByCategory(category: PoseCosmetic['category']): PoseCosmetic[] {
  return POSE_DEFINITIONS.filter(pose => pose.category === category);
}

// Helper function to get unlocked poses for a level
export function getUnlockedPoses(level: number): PoseCosmetic[] {
  return POSE_DEFINITIONS.filter(pose => pose.unlockLevel <= level);
}

// Helper function to get pose by ID
export function getPoseById(id: string): PoseCosmetic | undefined {
  return POSE_DEFINITIONS.find(pose => pose.id === id);
}