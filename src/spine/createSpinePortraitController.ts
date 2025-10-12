import * as THREE from "three";
import {
  AnimationState,
  AnimationStateData,
  Physics,
  Skeleton,
  Bone,
} from "@esotericsoftware/spine-core";
import { SkeletonMesh } from "./SpineThree";
import { loadSpineFromExpoAssets } from "./loaders";
import { CharacterName, EmotionType } from "../data/types/conversation";

export type SpinePortraitControllerOptions = {
  character: CharacterName;
  emotion?: EmotionType;
  isTalking?: boolean;
  size?: number;
  shouldFlip?: boolean;
};

export type SpinePortraitController = {
  mesh: SkeletonMesh;
  skeleton: Skeleton;
  state: AnimationState;
  rootBone?: Bone;
  update(deltaSeconds: number): void;
  setEmotion(emotion: EmotionType, isTalking?: boolean, shouldFlip?: boolean): void;
  getSize(): { width: number; height: number };
};

// Spine 4.2.43 world transform helper
const PHYSICS: any = Physics as any;

function updateWorldXform(skeleton: Skeleton, dt = 0) {
  skeleton.updateWorldTransform(PHYSICS.update);
}

// Map emotions to animation names
const EMOTION_ANIMATIONS: Record<EmotionType, string> = {
  "Neutral": "Neutral",
  "Angry": "Angry",
  "Fearful": "Fearful",
  "Happy": "Happy",
  "Sad": "Sad",
  "Disgusted": "Disgusted", // Add missing emotion
};

// Map emotions to closed mouth animations
const MOUTH_ANIMATIONS: Record<EmotionType, string> = {
  "Neutral": "Mouth/NeutralMouth",
  "Angry": "Mouth/AngryMouth",
  "Fearful": "Mouth/FearfulMouth",
  "Happy": "Mouth/HappyMouth",
  "Sad": "Mouth/SadMouth",
  "Disgusted": "Mouth/DisgustedMouth", // Add missing emotion
};

export async function createSpinePortraitController(
  options: SpinePortraitControllerOptions
): Promise<SpinePortraitController> {
  const {
    character,
    emotion = "Neutral",
    isTalking = false,
    size = 120,
    shouldFlip = false,
  } = options;

  if (__DEV__) {
    console.log(`[SpinePortrait] Loading ${character} portrait controller`, { emotion, isTalking, size });
  }

  // Load character-specific assets - Metro requires static paths
  let atlasModule, jsonModule, textureModule;
  if (character === "Luma") {
    atlasModule = require("../assets/Portraits/Luma/LumaPortrait.atlas");
    jsonModule = require("../assets/Portraits/Luma/LumaPortrait.json");
    textureModule = require("../assets/Portraits/Luma/LumaPortrait.png");
  } else {
    atlasModule = require("../assets/Portraits/Sable/SablePortrait.atlas");
    jsonModule = require("../assets/Portraits/Sable/SablePortrait.json");
    textureModule = require("../assets/Portraits/Sable/SablePortrait.png");
  }

  if (__DEV__) console.log(`[SpinePortrait] Loading ${character} assets`);

  const { skeleton, resolveTexture } = await loadSpineFromExpoAssets({
    atlasModule,
    jsonModule,
    textureModules: [textureModule],
  });

  // Set up skeleton positioning - root bone at center bottom
  skeleton.x = 0;
  skeleton.y = 0;
  skeleton.scaleX = 1;
  skeleton.scaleY = 1;

  if (__DEV__) console.log(`[SpinePortrait] ${character} skeleton ready`);

  const skeletonData = skeleton.data;
  const stateData = new AnimationStateData(skeletonData);

  // Set up animation state data with proper mixing
  // Allow all animations to mix with each other for smooth transitions
  const allAnimations = skeleton.data?.animations ?? [];
  for (let i = 0; i < allAnimations.length; i++) {
    for (let j = 0; j < allAnimations.length; j++) {
      if (i !== j) {
        stateData.setMix(allAnimations[i].name, allAnimations[j].name, 0.2);
      }
    }
  }

  const state = new AnimationState(stateData);

  skeleton.setToSetupPose();
  updateWorldXform(skeleton, 0);

  // Get available animations
  const availableAnimations = new Map<string, string>();
  const spineAnimations = skeleton.data?.animations ?? [];
  for (const anim of spineAnimations) {
    if (anim?.name) {
      availableAnimations.set(anim.name, anim.name);
      availableAnimations.set(anim.name.toLowerCase(), anim.name);
      if (__DEV__) console.log(`[SpinePortrait] Available animation: ${anim.name}`);
    }
  }

  // Set initial animation based on emotion and talking state
  const setEmotionAnimation = (targetEmotion: EmotionType, talking: boolean, flip: boolean = false) => {
    const emotionAnimName = EMOTION_ANIMATIONS[targetEmotion];
    const mouthAnimName = MOUTH_ANIMATIONS[targetEmotion];

    if (__DEV__) {
      console.log(`[SpinePortrait] Setting ${character} emotion: ${targetEmotion}, talking: ${talking}`);
      console.log(`[SpinePortrait] Animation names - emotion: ${emotionAnimName}, mouth: ${mouthAnimName}`);
    }

    // Track 0: Emotion animation (always loops)
    if (emotionAnimName && availableAnimations.has(emotionAnimName)) {
      const track = state.setAnimation(0, emotionAnimName, true);
      if (track) {
        track.mixDuration = 0.2; // Smooth transitions
      }
      if (__DEV__) console.log(`[SpinePortrait] Set track 0 to: ${emotionAnimName}`);
    } else {
      // Fallback to first available animation if emotion not found
      const fallbackAnim = spineAnimations[0]?.name;
      if (fallbackAnim) {
        state.setAnimation(0, fallbackAnim, true);
        if (__DEV__) console.warn(`[SpinePortrait] Using fallback animation '${fallbackAnim}' for ${character} (requested: ${emotionAnimName})`);
      } else if (__DEV__) {
        console.error(`[SpinePortrait] No animations found for ${character}`);
      }
    }

    // Track 1: Mouth state
    if (!talking) {
      // When not talking, play the closed mouth animation on higher track
      if (mouthAnimName && availableAnimations.has(mouthAnimName)) {
        const track = state.setAnimation(1, mouthAnimName, true);
        if (track) {
          track.mixDuration = 0.2;
          track.alpha = 0.8; // Slightly reduce alpha to allow base emotion to show through
        }
        if (__DEV__) console.log(`[SpinePortrait] Set track 1 to closed mouth: ${mouthAnimName}`);
      } else if (__DEV__) {
        console.warn(`[SpinePortrait] Closed mouth animation '${mouthAnimName}' not found for ${character}`);
      }
    } else {
      // When talking, clear the mouth track so the emotion animation's mouth movement shows
      state.setEmptyAnimation(1, 0.2);
      if (__DEV__) console.log(`[SpinePortrait] Cleared track 1 for talking`);
    }

    // Track 2: FlipX position animation
    if (flip) {
      // Play the FlipX animation when the character should be flipped
      if (availableAnimations.has("Position/FlipX")) {
        const track = state.setAnimation(2, "Position/FlipX", false); // Don't loop flip
        if (track) {
          track.mixDuration = 0.1;
          track.alpha = 1.0; // Full strength for positioning
        }
        if (__DEV__) console.log(`[SpinePortrait] Set track 2 to flip: Position/FlipX`);
      } else if (__DEV__) {
        console.warn(`[SpinePortrait] FlipX animation 'Position/FlipX' not found for ${character}`);
      }
    } else {
      // Clear flip animation when not flipping
      state.setEmptyAnimation(2, 0.1);
      if (__DEV__) console.log(`[SpinePortrait] Cleared track 2 for no flip`);
    }
  };

  setEmotionAnimation(emotion, isTalking, shouldFlip);

  updateWorldXform(skeleton, 0);

  const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
  const rootBone = skeleton.findBone("root") || undefined;

  // Calculate portrait dimensions based on skeleton bounds
  const getPortraitSize = () => {
    // Use skeleton data dimensions with some padding
    const padding = 20;
    return {
      width: size + padding,
      height: Math.round(size * 1.25) + padding, // Portraits are typically taller than wide
    };
  };

  if (__DEV__) {
    console.log(`[SpinePortrait] ${character} controller created`, {
      rootBone: rootBone?.data?.name,
      meshChildren: mesh.children.length,
      size: getPortraitSize(),
    });
  }

  return {
    mesh,
    skeleton,
    state,
    rootBone,
    update(deltaSeconds: number) {
      // Update animation state
      state.update(deltaSeconds);
      state.apply(skeleton);

      // Update skeleton
      skeleton.update(deltaSeconds);
      updateWorldXform(skeleton, deltaSeconds);

      // Refresh mesh
      mesh.refreshMeshes();
    },
    setEmotion(targetEmotion: EmotionType, talking = false, flip = false) {
      setEmotionAnimation(targetEmotion, talking, flip);
    },
    getSize() {
      return getPortraitSize();
    },
  };
}