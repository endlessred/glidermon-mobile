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
import { resolveCosmeticRecolor, resolvePaletteEffect, type PaletteEffect } from "../data/cosmetics/palette";
import { applySubtleWindGusts } from "../../utils/spinePhysics";

export type SpineCharacterControllerOptions = {
  animation?: string;
  outfit?: OutfitSlot;
  catalog: CosmeticItem[];
  /** Which premade colorway is selected per recolorable cosmetic id. */
  selectedPaletteByCosmeticId?: Record<string, string>;
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
  playReaction(name: string): void;
  applyOutfit(outfit?: OutfitSlot): void;
  /** Updates the active colorway selection and re-applies the last outfit
   * so an already-equipped recolorable cosmetic re-renders immediately. */
  setSelectedPalettes(selectedPaletteByCosmeticId: Record<string, string>): void;
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

// Jacket slots that use shader recoloring
const JACKET_SLOTS: string[] = [
  "JacketTorso",
  "JacketLArm",
  "JacketRArm",
];

// Shoe slots - a purchased design uses hue-indexed shader recoloring; the
// plain default (no design equipped) does not.
const SHOE_SLOTS: string[] = [
  "L_Shoe",
  "R_Shoe",
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
  JacketTorso: "Motorcycle_Shader",
  JacketLArm: "Motorcycle_Shader",
  JacketRArm: "Motorcycle_Shader",
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
    selectedPaletteByCosmeticId: initialSelectedPalettes,
    characterBoneName = DEFAULT_CHARACTER_BONE,
    shaderSlotRegex = DEFAULT_SHADER_SLOT_REGEX,
    recolorCache = new Map<string, THREE.ShaderMaterial>(),
  } = options;

  // Mutable so setSelectedPalettes() can update it after creation without
  // rebuilding the whole controller -- applyOutfitInternal always reads the
  // current value via closure.
  let selectedPalettes: Record<string, string> = initialSelectedPalettes ?? {};
  let lastAppliedOutfit: OutfitSlot | undefined = outfit;

  // Shared shimmer time uniform -- one object reference given to every
  // shimmer material so a single per-frame write in update() (below)
  // animates all of them, instead of iterating every live shimmer material.
  const shimmerTimeUniform = { value: 0 };

  if (__DEV__) {
    console.log("Spine controller opts", { hasOutfit: !!outfit, catalogSize: catalog?.length ?? 0, animation });
  }

  const atlasModule = require("../assets/GliderMonSpine/skeleton.atlas");
  const jsonModule = require("../assets/GliderMonSpine/skeleton.json");
  const textureModule = require("../assets/GliderMonSpine/skeleton.png");
  const textureModule2 = require("../assets/GliderMonSpine/skeleton_2.png");
  const textureModule3 = require("../assets/GliderMonSpine/skeleton_3.png");
  const textureModule4 = require("../assets/GliderMonSpine/skeleton_4.png");

  if (__DEV__) console.log("Spine controller: loading assets");
  const { skeleton, resolveTexture } = await loadSpineFromExpoAssets({
    atlasModule,
    jsonModule,
    textureModules: [textureModule, textureModule2, textureModule3, textureModule4],
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

  skeleton.setupPose();
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
        slot.pose.setAttachment(shaderAttachment);
      }
    }

    updateWorldXform(skeleton, 0);
  }

  function configureHairSwitches(hairRecolor: RecolorData | undefined, hairStyle?: string) {
    // First, clear both hair slots to prevent bugs
    for (const slotName of HAIR_SLOTS) {
      const slot = skeleton.findSlot(slotName);
      if (slot) {
        slot.pose.setAttachment(null);
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
        slot.pose.setAttachment(shaderAttachment);
      }
    }

    updateWorldXform(skeleton, 0);
  }

  function configureJacketSwitches(jacketRecolor: RecolorData | undefined) {
    // First, clear all jacket slots to prevent bugs
    for (const slotName of JACKET_SLOTS) {
      const slot = skeleton.findSlot(slotName);
      if (slot) {
        slot.pose.setAttachment(null);
      }
    }

    if (!jacketRecolor) return;

    // Activate all jacket slots when jacket is equipped
    for (const slotName of JACKET_SLOTS) {
      const shaderName = SLOT_TO_SHADER[slotName];
      if (!shaderName) continue;
      const slot = skeleton.findSlot(slotName);
      if (!slot) continue;
      const shaderAttachment = getAttachmentFromAnySkin(skeletonData, slotName, shaderName);
      if (shaderAttachment) {
        slot.pose.setAttachment(shaderAttachment);
      }
    }

    updateWorldXform(skeleton, 0);
  }

  // Shoes always render *something* - unlike jackets/hair there's no "off"
  // state. With no purchased design equipped, this falls back to the plain
  // L_Shoe/R_Shoe attachment (no shader, no recolor) rather than the shared
  // L_ShoeShader/R_ShoeShader mesh, so the default look doesn't pay for an
  // always-on hue-indexed recolor draw.
  function configureShoeSwitches(shoeAttachmentBaseName?: string) {
    const pairs: Array<[string, string]> = [
      ["L_Shoe", shoeAttachmentBaseName ? `L_${shoeAttachmentBaseName}` : "L_Shoe"],
      ["R_Shoe", shoeAttachmentBaseName ? `R_${shoeAttachmentBaseName}` : "R_Shoe"],
    ];

    for (const [slotName, attachmentName] of pairs) {
      const slot = skeleton.findSlot(slotName);
      if (!slot) continue;
      const attachment = getAttachmentFromAnySkin(skeletonData, slotName, attachmentName);
      if (attachment) {
        slot.pose.setAttachment(attachment);
      }
    }

    updateWorldXform(skeleton, 0);
  }

  function configureMaterialOverride(
    hatRecolor?: RecolorData, skinRecolor?: RecolorData, hairRecolor?: RecolorData, jacketRecolor?: RecolorData, shoeRecolor?: RecolorData,
    hatEffect?: PaletteEffect, skinEffect?: PaletteEffect, hairEffect?: PaletteEffect, jacketEffect?: PaletteEffect, shoeEffect?: PaletteEffect
  ) {
    if (!hatRecolor && !skinRecolor && !hairRecolor && !jacketRecolor && !shoeRecolor) {
      mesh.materialOverride = undefined;
      return;
    }

    mesh.materialOverride = (slot: Slot, baseTex: THREE.Texture) => {
      const slotName = slot?.data?.name ?? "";
      const attachment = slot.appliedPose?.getAttachment?.();
      const attachmentName = attachment && (attachment as any).name ? String((attachment as any).name) : "";

      const isShaderAttachment = shaderSlotRegex.test(attachmentName);

      let recolor: RecolorData | undefined;
      let effect: PaletteEffect | undefined;
      // Hats and shoes are disambiguated by which skin/attachment is active
      // (setSkin() for hats, configureShoeSwitches() for shoes), not by the
      // attachment's own name ending in "Shader" like jacket/hair/skin - each
      // hat/shoe design is its own uniquely-named mesh (e.g. "Cowboy Hat",
      // "Sneakers"), so the usual isShaderAttachment name check is bypassed here.
      let bypassShaderNameCheck = false;
      if (slotName === "Hat_Base" && hatRecolor) {
        recolor = hatRecolor;
        effect = hatEffect;
        bypassShaderNameCheck = true;
      } else if (SHOE_SLOTS.includes(slotName) && shoeRecolor) {
        recolor = shoeRecolor;
        effect = shoeEffect;
        bypassShaderNameCheck = true;
      } else if (isShaderAttachment && hairRecolor && HAIR_SLOTS.includes(slotName)) {
        recolor = hairRecolor;
        effect = hairEffect;
      } else if (isShaderAttachment && jacketRecolor && JACKET_SLOTS.includes(slotName)) {
        recolor = jacketRecolor;
        effect = jacketEffect;
      } else if (isShaderAttachment && skinRecolor && SKIN_SLOTS.includes(slotName)) {
        recolor = skinRecolor;
        effect = skinEffect;
      } else if (!isShaderAttachment && skinRecolor && SKIN_SLOTS.includes(slotName)) {
        return null;
      }

      if (!recolor) return null;

      const isPupil = /Pupil/i.test(slotName);
      const alphaTest = isPupil ? 0.0 : 0.0015;
      if (!isShaderAttachment && !bypassShaderNameCheck) return null;

      const effectKey = effect
        ? effect.kind === "gradient"
          ? `grad|${effect.channelColorsB.r}|${effect.channelColorsB.g}|${effect.channelColorsB.a}`
          : `shim|${effect.speed}|${effect.intensity}|${effect.tint}`
        : "flat";
      const key = `hue|${(baseTex as any).uuid}|${recolor.r}|${recolor.g}|${recolor.b}|${recolor.a}|${slotName}|${attachmentName}|${alphaTest}|${effectKey}`;
      let material = recolorCache.get(key);
      if (!material) {
        material = makeHueIndexedRecolorMaterial(baseTex, {
          alphaTest,
          strength: 1,
          shadeMode: true,
          satMin: 0.1,
          hueCosMin: 0.75,
          useYellow: true,
          // See matching comment in SpineCharacterPreview.tsx -- gradient
          // mode's dark end lands below the default outline-preserve floor,
          // so it needs a lower floor to actually become visible.
          preserveDarkThreshold: effect?.kind === "gradient" ? 0.08 : 0.15,
          smoothOutlineEdges: false,
          colors: {
            red: recolor.r ?? "#ff0000",
            green: recolor.g ?? "#00ff00",
            blue: recolor.b ?? recolor.r ?? "#ff0000",
            yellow: recolor.a ?? "#ffff00",
          },
          gradientColors: effect?.kind === "gradient" ? {
            red: effect.channelColorsB.r,
            green: effect.channelColorsB.g,
            yellow: effect.channelColorsB.a,
          } : undefined,
          shimmer: effect?.kind === "shimmer" ? {
            speed: effect.speed,
            intensity: effect.intensity,
            tint: effect.tint,
            timeUniform: shimmerTimeUniform,
          } : undefined,
        });
        recolorCache.set(key, material);
      }

      normalizeMaterialForSlot(slot, material);
      return material;
    };
  }

  function applyOutfitInternal(outfitToApply?: OutfitSlot) {
    if (!outfitToApply) {
      configureMaterialOverride(undefined, undefined, undefined, undefined, undefined);
      configureJacketSwitches(undefined);
      configureShoeSwitches(undefined);
      return;
    }

    const hatCosmetic = findCosmetic(outfitToApply.cosmetics?.headTop?.itemId);
    const skinCosmetic = findCosmetic(outfitToApply.cosmetics?.skin?.itemId);
    const hairCosmetic = findCosmetic(outfitToApply.cosmetics?.hair?.itemId);
    const jacketCosmetic = findCosmetic(outfitToApply.cosmetics?.jacket?.itemId);
    const shoeCosmetic = findCosmetic(outfitToApply.cosmetics?.shoes?.itemId);

    const hatRecolor = resolveCosmeticRecolor(hatCosmetic, hatCosmetic && selectedPalettes[hatCosmetic.id]);
    const skinRecolor = resolveCosmeticRecolor(skinCosmetic, skinCosmetic && selectedPalettes[skinCosmetic.id]);
    const jacketRecolor = resolveCosmeticRecolor(jacketCosmetic, jacketCosmetic && selectedPalettes[jacketCosmetic.id]);
    const shoeRecolor = resolveCosmeticRecolor(shoeCosmetic, shoeCosmetic && selectedPalettes[shoeCosmetic.id]);

    const hatEffect = resolvePaletteEffect(hatCosmetic, hatCosmetic && selectedPalettes[hatCosmetic.id]);
    const skinEffect = resolvePaletteEffect(skinCosmetic, skinCosmetic && selectedPalettes[skinCosmetic.id]);
    const jacketEffect = resolvePaletteEffect(jacketCosmetic, jacketCosmetic && selectedPalettes[jacketCosmetic.id]);
    const shoeEffect = resolvePaletteEffect(shoeCosmetic, shoeCosmetic && selectedPalettes[shoeCosmetic.id]);
    const hairEffect = resolvePaletteEffect(hairCosmetic, hairCosmetic && selectedPalettes[hairCosmetic.id]);

    // Recolorable hair always resolves live from the catalog + selected
    // palette (so changing colorway updates already-equipped hair
    // immediately); only fall back to a baked-in spineData recolor for
    // hair items that predate the palette system.
    let hairRecolor = hairCosmetic?.recolorable && hairCosmetic.palettes?.length
      ? resolveCosmeticRecolor(hairCosmetic, selectedPalettes[hairCosmetic.id])
      : hairCosmetic?.maskRecolor;
    if (!(hairCosmetic?.recolorable && hairCosmetic.palettes?.length) && outfitToApply.cosmetics?.hair?.spineData?.maskRecolor) {
      hairRecolor = outfitToApply.cosmetics.hair.spineData.maskRecolor;
    }

    if (hatCosmetic?.spineSkin) {
      const skin = skeletonData.findSkin(hatCosmetic.spineSkin);
      if (skin) {
        skeleton.setSkin(skin);
        skeleton.setupPose();
        updateWorldXform(skeleton, 0);
      }
    }

    if (skinCosmetic?.spineSkin && skinCosmetic.spineSkin !== "default") {
      const skin = skeletonData.findSkin(skinCosmetic.spineSkin);
      if (skin) {
        skeleton.setSkin(skin);
        skeleton.setupPose();
        updateWorldXform(skeleton, 0);
      }
    }

    configureSkinSwitches(skinRecolor);
    configureHairSwitches(hairRecolor, outfitToApply.cosmetics?.hair?.itemId);
    configureJacketSwitches(jacketRecolor);
    configureShoeSwitches(shoeCosmetic?.shoeAttachment);
    configureMaterialOverride(hatRecolor, skinRecolor, hairRecolor, jacketRecolor, shoeRecolor, hatEffect, skinEffect, hairEffect, jacketEffect, shoeEffect);
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

      // state.apply() only writes bone pose values for bones actively keyed
      // by a currently-running track. Clearing a track (e.g. when a reading
      // sequence or a fidget finishes) stops it from influencing future
      // frames, but any bone that track was the *only* thing keying -- like
      // ReadBook's L Arm/R Hand, which Idle/Idle never touches -- simply
      // keeps whatever value it last had, since nothing overwrites it. This
      // is why the left arm stayed bent behind the body after PutAwayBook:
      // the overlay track got cleared correctly, but the bone itself was
      // never told to go anywhere. Resetting bones to setup pose every frame
      // before applying the animation state means any bone not currently
      // claimed by an active track lands at a clean neutral position instead
      // of whatever stale pose it was left in. setupPoseBones() (not
      // setupPose()/setupPoseSlots()) is deliberate -- it leaves slot
      // attachments alone, so equipped cosmetics/outfit skins aren't reset
      // every frame.
      skeleton.setupPoseBones();
      state.apply(skeleton);

      // Apply wind gusts to make physics visible
      const currentTime = performance.now() / 1000; // Convert to seconds
      applySubtleWindGusts(skeleton, currentTime);
      shimmerTimeUniform.value = currentTime;

      updateWorldXform(skeleton, deltaSeconds);
      mesh.refreshMeshes();
      characterBone = skeleton.findBone(characterBoneName) || undefined;
    },
    setAnimation(name: string, loop = true) {
      state.setAnimation(0, name, loop);
    },
    playReaction(name: string) {
      idleDriver.playReaction(name as Parameters<LifelikeIdleNoMix["playReaction"]>[0]);
    },
    applyOutfit(outfitToApply?: OutfitSlot) {
      lastAppliedOutfit = outfitToApply;
      applyOutfitInternal(outfitToApply);
      mesh.refreshMeshes();
    },
    setSelectedPalettes(nextSelectedPalettes: Record<string, string>) {
      selectedPalettes = nextSelectedPalettes;
      applyOutfitInternal(lastAppliedOutfit);
      mesh.refreshMeshes();
    },
    getFeetLocalPosition() {
      if (!characterBone) {
        return { x: 0, y: 0 };
      }
      // Return the local position of the character bone relative to the skeleton origin
      // Use the bone's local setup position, not world coordinates
      return { x: characterBone.pose.x, y: characterBone.pose.y };
    },
  };
}
