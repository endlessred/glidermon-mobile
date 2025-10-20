import * as THREE from "three";
import {
  AnimationState,
  AnimationStateData,
  Physics,
  Skeleton,
  Slot,
  Bone,
} from "@esotericsoftware/spine-core";
import { SkeletonMesh, normalizeMaterialForSlot } from "./SpineThree";
import { loadSpineFromExpoAssets } from "./loaders";
import { makeHueIndexedRecolorMaterial } from "./HueIndexedRecolor";
import { LifelikeIdleNoMix } from "../game/view/lifelikeIdle_noMix";
import { OutfitSlot } from "../data/types/outfitTypes";
import { CosmeticItem } from "../data/stores/cosmeticsStore";
import { applySubtleWindGusts } from "../../utils/spinePhysics";

export type SpineCharacterControllerOptions = {
  animation?: string;
  outfit?: OutfitSlot;
  catalog: CosmeticItem[];
  characterBoneName?: string;
  shaderSlotRegex?: RegExp;
  recolorCache?: Map<string, THREE.ShaderMaterial>;
};

export type SpineCharacterController = {
  mesh: SkeletonMesh;
  skeleton: Skeleton;
  state: AnimationState;
  idleDriver: LifelikeIdleNoMix;
  characterBone?: Bone;
  update(deltaSeconds: number): void;
  setAnimation(name: string, loop?: boolean): void;
  applyOutfit(outfit?: OutfitSlot): void;
  getFeetLocalPosition(): { x: number; y: number };
};

const DEFAULT_CHARACTER_BONE = "Character";

// ---------------------------------------------------------------------------
// Spine 4.2.43 world transform helper
// - d.ts requires a Physics argument to updateWorldTransform(physics: Physics)
// - At runtime, passing the Physics namespace/object is acceptable
// - Optionally call Physics.update(skeleton, dt) when available
// ---------------------------------------------------------------------------
const PHYSICS: any = Physics as any;

function updateWorldXform(skeleton: Skeleton, dt = 0) {
  // Physics.update is a constant, not a function - pass it directly to updateWorldTransform
  skeleton.updateWorldTransform(PHYSICS.update);
}


// Use a simple string[] so .includes(slotName) accepts any string without TS errors
const SKIN_SLOTS: string[] = [
  "Tail",
  "R_Wing",
  "L_Wing",
  "L_Leg",
  "L_Arm",
  "L_Hand",
  "R_Leg",
  "R_Arm",
  "R_Hand",
  "L_Ear",
  "Head",
  "R_Ear",
  "Cheeks",
  "Nose",
  "Torso",
  "L_Lid",
  "R_Lid",
];

// Hair slots that use shader recoloring
const HAIR_SLOTS: string[] = [
  "HairFront",
  "HairBack",
];

const SLOT_TO_SHADER: Record<string, string> = {
  Tail: "NewTailShader",
  R_Wing: "R_WingShader",
  L_Wing: "L_WingShader",
  L_Leg: "L_LegShader",
  L_Arm: "L_ArmShader",
  L_Hand: "L_HandShader",
  R_Leg: "R_LegShader",
  R_Arm: "R_ArmShader",
  R_Hand: "R_HandShader",
  L_Ear: "L_EarShader",
  Head: "HeadShader",
  R_Ear: "R_EarShader",
  Cheeks: "CheeksShader",
  Nose: "NoseShader",
  Torso: "TorsoShader",
  L_Lid: "L_LidShader",
  R_Lid: "R_LidShader",
  HairFront: "WindsweptShader",
  HairBack: "WindsweptShader",
};

const DEFAULT_SHADER_SLOT_REGEX = /Shader$/i;

function getAttachmentFromAnySkin(
  skeletonData: Skeleton["data"],
  slotName: string,
  attachmentName: string
) {
  const slotIndex = typeof (skeletonData as any).findSlotIndex === "function"
    ? (skeletonData as any).findSlotIndex(slotName)
    : (() => {
        const slots = (skeletonData as any).slots ?? [];
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i];
          const name = slot?.name ?? slot?.data?.name;
          if (name === slotName) return i;
        }
        return -1;
      })();
  if (slotIndex < 0) return null;

  const defSkin = skeletonData.defaultSkin;
  if (defSkin) {
    const a = defSkin.getAttachment(slotIndex, attachmentName);
    if (a) return a;
  }

  const skins = skeletonData.skins || [];
  for (const skin of skins) {
    const a = skin.getAttachment(slotIndex, attachmentName);
    if (a) return a;
  }

  return null;
}

type RecolorData = CosmeticItem["maskRecolor"];

export async function createSpineCharacterController(
  options: SpineCharacterControllerOptions
): Promise<SpineCharacterController> {
  const {
    animation = "idle",
    outfit,
    catalog,
    characterBoneName = DEFAULT_CHARACTER_BONE,
    shaderSlotRegex = DEFAULT_SHADER_SLOT_REGEX,
    recolorCache = new Map<string, THREE.ShaderMaterial>(),
  } = options;

  if (__DEV__) {
    console.log("Spine controller opts", { hasOutfit: !!outfit, catalogSize: catalog?.length ?? 0, animation });
  }

  const atlasModule = require("../assets/GliderMonSpine/skeleton.atlas");
  const jsonModule = require("../assets/GliderMonSpine/skeleton.json");
  const textureModule = require("../assets/GliderMonSpine/skeleton.png");
  const textureModule2 = require("../assets/GliderMonSpine/skeleton_2.png");

  if (__DEV__) console.log("Spine controller: loading assets");
  const { skeleton, resolveTexture } = await loadSpineFromExpoAssets({
    atlasModule,
    jsonModule,
    textureModules: [textureModule, textureModule2],
  });

  skeleton.x = 0;
  skeleton.y = 0;
  skeleton.scaleX = 1;
  skeleton.scaleY = 1;
  if (__DEV__) console.log("Spine controller: skeleton ready");

  const skeletonData = skeleton.data;
  const stateData = new AnimationStateData(skeletonData);
  const idleDriver = new LifelikeIdleNoMix(stateData);
  const state = idleDriver.animationState;

  skeleton.setToSetupPose();
  updateWorldXform(skeleton, 0);

  const availableAnimations = new Map<string, string>();
  const spineAnimations = skeleton.data?.animations ?? [];
  for (const anim of spineAnimations) {
    if (anim?.name) {
      availableAnimations.set(anim.name, anim.name);
      availableAnimations.set(anim.name.toLowerCase(), anim.name);
    }
  }

  const defaultIdle = "Idle/Idle";
  let animationName = animation ?? defaultIdle;
  const normalized =
    availableAnimations.get(animationName) ||
    availableAnimations.get(animationName.toLowerCase());
  if (!normalized) {
    const fallback =
      availableAnimations.get(defaultIdle) ||
      availableAnimations.get(defaultIdle.toLowerCase());
    if (fallback) {
      if (__DEV__) {
        console.warn(`Spine controller: fallback animation ${fallback} (requested ${animation})`);
      }
      animationName = fallback;
    } else if (spineAnimations.length > 0) {
      animationName = spineAnimations[0].name;
      if (__DEV__) {
        console.warn(`Spine controller: fallback to first animation ${animationName}`);
      }
    } else {
      animationName = undefined as any;
    }
  } else {
    animationName = normalized;
  }

  if (animationName) {
    state.setAnimation(0, animationName, true);
  } else if (__DEV__) {
    console.warn("Spine controller: no animations available to play");
  }

  updateWorldXform(skeleton, 0);

  const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
  let characterBone = skeleton.findBone(characterBoneName) || undefined;

  function findCosmetic(itemId?: string) {
    if (!itemId) return undefined;
    return catalog.find((item) => item.id === itemId);
  }

  function configureSkinSwitches(skinRecolor: RecolorData | undefined) {
    if (!skinRecolor) return;

    for (const slotName of SKIN_SLOTS) {
      const shaderName = SLOT_TO_SHADER[slotName];
      if (!shaderName) continue;
      const slot = skeleton.findSlot(slotName);
      if (!slot) continue;
      const shaderAttachment = getAttachmentFromAnySkin(skeletonData, slotName, shaderName);
      if (shaderAttachment) {
        slot.setAttachment(shaderAttachment);
      }
    }

    updateWorldXform(skeleton, 0);
  }

  function configureHairSwitches(hairRecolor: RecolorData | undefined, hairStyle?: string) {
    // First, clear both hair slots to prevent bugs
    for (const slotName of HAIR_SLOTS) {
      const slot = skeleton.findSlot(slotName);
      if (slot) {
        slot.setAttachment(null);
      }
    }

    if (!hairRecolor || !hairStyle) return;

    // Determine which slots to activate based on hair style
    let slotsToActivate: string[] = [];
    if (hairStyle === "windswept_short") {
      slotsToActivate = ["HairFront"]; // Short hair only uses front
    } else if (hairStyle === "windswept_long") {
      slotsToActivate = ["HairFront", "HairBack"]; // Long hair uses both
    }

    for (const slotName of slotsToActivate) {
      const shaderName = SLOT_TO_SHADER[slotName];
      if (!shaderName) continue;
      const slot = skeleton.findSlot(slotName);
      if (!slot) continue;
      const shaderAttachment = getAttachmentFromAnySkin(skeletonData, slotName, shaderName);
      if (shaderAttachment) {
        slot.setAttachment(shaderAttachment);
      }
    }

    updateWorldXform(skeleton, 0);
  }

  function configureMaterialOverride(hatRecolor?: RecolorData, skinRecolor?: RecolorData, hairRecolor?: RecolorData) {
    if (!hatRecolor && !skinRecolor && !hairRecolor) {
      mesh.materialOverride = undefined;
      return;
    }

    mesh.materialOverride = (slot: Slot, baseTex: THREE.Texture) => {
      const slotName = slot?.data?.name ?? "";
      const attachment = slot.getAttachment?.();
      const attachmentName = attachment && (attachment as any).name ? String((attachment as any).name) : "";

      const isShaderAttachment = shaderSlotRegex.test(attachmentName);

      let recolor: RecolorData | undefined;
      if (slotName === "Hat_Base" && hatRecolor) {
        recolor = hatRecolor;
      } else if (isShaderAttachment && hairRecolor && HAIR_SLOTS.includes(slotName)) {
        recolor = hairRecolor;
      } else if (isShaderAttachment && skinRecolor && SKIN_SLOTS.includes(slotName)) {
        recolor = skinRecolor;
      } else if (!isShaderAttachment && skinRecolor && SKIN_SLOTS.includes(slotName)) {
        return null;
      }

      if (!recolor) return null;

      const isPupil = /Pupil/i.test(slotName);
      const alphaTest = isPupil ? 0.0 : 0.0015;
      if (!isShaderAttachment) return null;

      const key = `hue|${(baseTex as any).uuid}|${recolor.r}|${recolor.g}|${recolor.b}|${recolor.a}|${slotName}|${attachmentName}|${alphaTest}`;
      let material = recolorCache.get(key);
      if (!material) {
        material = makeHueIndexedRecolorMaterial(baseTex, {
          alphaTest,
          strength: 1,
          shadeMode: true,
          satMin: 0.1,
          hueCosMin: 0.75,
          useYellow: true,
          preserveDarkThreshold: 0.15,
          colors: {
            red: recolor.r ?? "#ff0000",
            green: recolor.g ?? "#00ff00",
            blue: recolor.b ?? recolor.r ?? "#ff0000",
            yellow: recolor.a ?? "#ffff00",
          },
        });
        recolorCache.set(key, material);
      }

      normalizeMaterialForSlot(slot, material);
      return material;
    };
  }

  function applyOutfitInternal(outfitToApply?: OutfitSlot) {
    if (!outfitToApply) {
      configureMaterialOverride(undefined, undefined, undefined);
      return;
    }

    const hatCosmetic = findCosmetic(outfitToApply.cosmetics?.headTop?.itemId);
    const skinCosmetic = findCosmetic(outfitToApply.cosmetics?.skin?.itemId);
    const hairCosmetic = findCosmetic(outfitToApply.cosmetics?.hair?.itemId);

    const hatRecolor = hatCosmetic?.maskRecolor;
    const skinRecolor = skinCosmetic?.maskRecolor;

    // For hair, check if the outfit has spine data with custom recoloring
    let hairRecolor = hairCosmetic?.maskRecolor;
    if (outfitToApply.cosmetics?.hair?.spineData?.maskRecolor) {
      hairRecolor = outfitToApply.cosmetics.hair.spineData.maskRecolor;
    }

    if (hatCosmetic?.spineSkin) {
      const skin = skeletonData.findSkin(hatCosmetic.spineSkin);
      if (skin) {
        skeleton.setSkin(skin);
        skeleton.setToSetupPose();
        updateWorldXform(skeleton, 0);
      }
    }

    if (skinCosmetic?.spineSkin && skinCosmetic.spineSkin !== "default") {
      const skin = skeletonData.findSkin(skinCosmetic.spineSkin);
      if (skin) {
        skeleton.setSkin(skin);
        skeleton.setToSetupPose();
        updateWorldXform(skeleton, 0);
      }
    }

    configureSkinSwitches(skinRecolor);
    configureHairSwitches(hairRecolor, outfitToApply.cosmetics?.hair?.itemId);
    configureMaterialOverride(hatRecolor, skinRecolor, hairRecolor);
  }

  applyOutfitInternal(outfit);
  mesh.refreshMeshes();
  if (__DEV__)
    console.log("Spine controller: created with", {
      characterBone: characterBone?.data?.name,
      meshChildren: mesh.children.length,
    });

  return {
    mesh,
    skeleton,
    state,
    idleDriver,
    characterBone,
    update(deltaSeconds: number) {
      idleDriver.update(deltaSeconds);
      skeleton.update(deltaSeconds);
      state.apply(skeleton);

      // Apply wind gusts to make physics visible
      const currentTime = performance.now() / 1000; // Convert to seconds
      applySubtleWindGusts(skeleton, currentTime);

      updateWorldXform(skeleton, deltaSeconds);
      mesh.refreshMeshes();
      characterBone = skeleton.findBone(characterBoneName) || undefined;
    },
    setAnimation(name: string, loop = true) {
      state.setAnimation(0, name, loop);
    },
    applyOutfit(outfitToApply?: OutfitSlot) {
      applyOutfitInternal(outfitToApply);
      mesh.refreshMeshes();
    },
    getFeetLocalPosition() {
      if (!characterBone) {
        return { x: 0, y: 0 };
      }
      // Return the local position of the character bone relative to the skeleton origin
      // Use the bone's local setup position, not world coordinates
      return { x: characterBone.x, y: characterBone.y };
    },
  };
}
