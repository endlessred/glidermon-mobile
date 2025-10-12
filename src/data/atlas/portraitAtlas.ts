import { CharacterName, EmotionType } from "../types/conversation";

// Portrait utility functions for the Spine-based portrait system
// The old atlas-based system has been replaced with Spine JSON animations

// Simple emotion-based avatar system
export function getPortraitEmoji(character: CharacterName, emotion: EmotionType): string {
  const characterEmojis = {
    Luma: {
      Neutral: "😐",
      Happy: "😊",
      Sad: "😢",
      Angry: "😠",
      Fearful: "😨",
      Disgusted: "🤢"
    },
    Sable: {
      Neutral: "😑",
      Happy: "😏",
      Sad: "😞",
      Angry: "😤",
      Fearful: "😰",
      Disgusted: "🙄"
    }
  };

  return characterEmojis[character]?.[emotion] || "😐";
}

// Get character-specific styling colors
export function getCharacterColors(character: CharacterName) {
  switch (character) {
    case "Luma":
      return {
        primary: "#ffeaa7", // Warm yellow
        secondary: "#fdcb6e",
        accent: "#e17055"
      };
    case "Sable":
      return {
        primary: "#a29bfe", // Cool purple
        secondary: "#6c5ce7",
        accent: "#74b9ff"
      };
    default:
      return {
        primary: "#ddd",
        secondary: "#aaa",
        accent: "#999"
      };
  }
}

// Animation timing configuration for Spine-based portraits
export const PORTRAIT_ANIMATION_CONFIG = {
  totalFrames: 23,
  duration: 1500, // ms
  frameRate: 23 / (1500 / 1000), // ~15.3 FPS
  frameDuration: 1500 / 23 // ~65ms per frame
};