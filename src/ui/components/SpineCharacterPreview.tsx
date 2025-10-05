// src/components/SpineCharacterPreview.tsx
import React, { useRef, useEffect } from "react";
import { View, Text } from "react-native";
import { GLView } from "expo-gl";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as THREE from "three";
import { Renderer } from "expo-three";
import {
  Skeleton,
  AnimationState,
  AnimationStateData,
  AtlasAttachmentLoader,
  SkeletonJson,
  TextureAtlas,
  Physics,
} from "@esotericsoftware/spine-core";
import { SkeletonMesh } from "../../spine/SpineThree";
import { LifelikeIdleNoMix } from "../../game/view/lifelikeIdle_noMix";
import { makeMaskRecolorMaterial } from "../../spine/MaskRecolor";
import { makeHueIndexedRecolorMaterial } from "../../spine/HueIndexedRecolor";
import { normalizeMaterialForSlot } from "../../spine/SpineThree";
import { useTheme } from "../../data/hooks/useTheme";
import { OutfitSlot, CosmeticSocket } from "../../data/types/outfitTypes";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";

// Find an attachment by (slotName, attachmentName) across default skin and all named skins.
function getAttachmentFromAnySkin(
  skeletonData: any,
  slotName: string,
  attachmentName: string
) {
  // Find slot index by searching through slots array
  let slotIndex = -1;
  for (let i = 0; i < skeletonData.slots.length; i++) {
    if (skeletonData.slots[i].name === slotName) {
      slotIndex = i;
      break;
    }
  }
  if (slotIndex < 0) return null;

  // 1) Try the special default skin first (JSON "default")
  const defSkin = skeletonData.defaultSkin;
  if (defSkin) {
    const a = defSkin.getAttachment(slotIndex, attachmentName);
    if (a) return a;
  }

  // 2) Try all named skins
  const skins: any[] = skeletonData.skins || [];
  for (const s of skins) {
    const a = s.getAttachment(slotIndex, attachmentName);
    if (a) return a;
  }

  return null;
}

// ---- simple recolor material cache (per page + colors) ----
const RECOLOR_CACHE = new Map<string, THREE.ShaderMaterial>();

// Regex to detect shader slots (consistent with SpineThree.ts)
const SHADER_SLOT_REGEX = /Shader$/i;

interface SpineCharacterPreviewProps {
  outfit: OutfitSlot;
  highlightSocket?: CosmeticSocket | null;
  size?: "small" | "medium" | "large";
}

export default function SpineCharacterPreview({
  outfit,
  highlightSocket,
  size = "medium",
}: SpineCharacterPreviewProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const rafRef = useRef<number>(0);

  const skeletonRef = useRef<Skeleton | null>(null);
  const skeletonDataRef = useRef<any>(null);
  const skeletonMeshRef = useRef<SkeletonMesh | null>(null);
  const idleDriverRef = useRef<LifelikeIdleNoMix | null>(null);

  // Base textures keyed by atlas page name (e.g., "skeleton.png")
  const pageBaseTexturesRef = useRef<Record<string, THREE.Texture>>({});

  const { catalog } = useCosmeticsStore();

  const sizeConfig = {
    small: { width: 80, height: 100 },
    medium: { width: 120, height: 150 },
    large: { width: 200, height: 250 },
  };
  const config = sizeConfig[size];

  // utilities: skin + recolor config for current outfit
  const getSpineSkin = () => {
    const equippedHat = outfit.cosmetics.headTop;
    if (!equippedHat?.itemId) return "default";
    const cosmeticItem = catalog.find((item) => item.id === equippedHat.itemId);
    return cosmeticItem?.spineSkin || "default";
  };

  const getHatMaskRecolor = () => {
    const equippedHat = outfit.cosmetics.headTop;
    if (!equippedHat?.itemId) return null;
    const cosmeticItem = catalog.find((item) => item.id === equippedHat.itemId);
    return cosmeticItem?.maskRecolor || null; // expected shape: { r?: string, g?: string, b?: string, a?: string }
  };

  const getSkinMaskRecolor = () => {
    const equippedSkin = outfit.cosmetics.skin;
    if (!equippedSkin?.itemId) return null;
    const cosmeticItem = catalog.find((item) => item.id === equippedSkin.itemId);
    return cosmeticItem?.maskRecolor || null; // 4-channel recoloring for body parts
  };

  // ---- set/refresh material override: recolor both hats and body parts ----
  const setupMaterialOverride = (skeletonMesh: SkeletonMesh, hatRecolor: any, skinRecolor: any) => {

    if (!hatRecolor && !skinRecolor) {
      skeletonMesh.materialOverride = undefined;
      return;
    }

    // Body part slots that should be recolored with skin cosmetics (excluding shoes - they're separate)
    const skinSlots = ["Tail", "R_Wing", "L_Wing", "L_Leg", "L_Arm", "R_Leg", "R_Arm", "L_Ear", "Head", "R_Ear", "Cheeks", "Nose", "Torso"];

    // Switch skin slots to their shader variants when skin recoloring is enabled
    if (skinRecolor) {
      const slotToShaderMap: Record<string, string> = {
        "Tail": "NewTailShader",
        "R_Wing": "R_WingShader",
        "L_Wing": "L_WingShader",
        "L_Leg": "L_LegShader",
        "L_Arm": "L_ArmShader",
        "R_Leg": "R_LegShader",
        "R_Arm": "R_ArmShader",
        "L_Ear": "L_EarShader",
        "Head": "HeadShader",
        "R_Ear": "R_EarShader",
        "Cheeks": "CheeksShader",
        "Nose": "NoseShader",
        "Torso": "TorsoShader"
        // Note: L_Shoe and R_Shoe excluded - they'll be separate recolorable pieces
      };

      const skeleton = skeletonRef.current;
      if (skeleton) {
        for (const baseSlotName of skinSlots) {
          const shaderAttachmentName = slotToShaderMap[baseSlotName];
          if (shaderAttachmentName) {
            const slot = skeleton.findSlot(baseSlotName);
            if (slot) {
              const shaderAttachment = getAttachmentFromAnySkin(skeletonDataRef.current, baseSlotName, shaderAttachmentName);
              if (shaderAttachment) {
                slot.setAttachment(shaderAttachment);
                console.log(`✅ Preview: Switched ${baseSlotName} slot to shader variant: ${shaderAttachmentName}`);
              } else {
                console.warn(`⚠️ Preview: Could not find shader attachment: ${shaderAttachmentName} for slot: ${baseSlotName}`);
              }
            } else {
              console.warn(`⚠️ Preview: Could not find slot: ${baseSlotName}`);
            }
          }
        }

        // Keep our attachment switches; just recompute world transforms
        skeleton.updateWorldTransform(Physics.update);

        // Verify the switches stuck
        console.log('🔎 Preview: Verifying attachment switches:');
        for (const baseSlotName of skinSlots) {
          const slot = skeleton.findSlot(baseSlotName);
          if (slot) {
            console.log(`🔎 Preview: ${baseSlotName} now has attachment:`, slot.getAttachment()?.name || 'none');
          }
        }
      }
    }

    skeletonMesh.materialOverride = (slot: any, baseTex: THREE.Texture) => {
      const slotName: string = slot?.data?.name ?? "";
      const attachment = slot.getAttachment?.();
      const attName = (attachment && attachment.name) ? String(attachment.name) : "";
      const isShaderAttachment = SHADER_SLOT_REGEX.test(attName); // Check attachment name, not slot name

      // Determine which recolor to apply
      let recolorData = null;

      // Hat example (unchanged)
      if (slotName === "Hat_Base" && hatRecolor) {
        recolorData = hatRecolor;
      }
      // Skin via shader variant
      else if (isShaderAttachment && skinRecolor) {
        const baseSlotName = slotName; // shader is on the attachment, slot name stays the same
        if (skinSlots.includes(baseSlotName)) {
          recolorData = skinRecolor;
        }
      }
      // Legacy fallback (non-shader attachment) - show info message for debugging
      else if (skinSlots.includes(slotName) && skinRecolor) {
        console.log(`ℹ️ Preview: Non-shader slot "${slotName}" (attachment: "${attName}") found - no recoloring applied`);
        return null;
      }

      if (!recolorData) return null;

      // Check if this slot should use special alphaTest handling (like pupils)
      const isPupil = /Pupil/i.test(slotName);
      const alphaTest = isPupil ? 0.0 : 0.0015; // Match SpineThree logic

      if (isShaderAttachment) {
        // Use hue-indexed recolor for shader slots
        const key = `hue|${(baseTex as any).uuid}|${recolorData.r}|${recolorData.g}|${recolorData.b}|${recolorData.a}|${slotName}|${alphaTest}`;
        let mat = RECOLOR_CACHE.get(key);
        if (!mat) {
          mat = makeHueIndexedRecolorMaterial(baseTex, {
            alphaTest,
            strength: 1,
            shadeMode: true,
            satMin: 0.1,        // Lower threshold to catch more pixels
            hueCosMin: 0.75,    // More lenient angle matching (was 0.90)
            useYellow: true,    // Enable yellow detection
            preserveDarkThreshold: 0.15,
            colors: {
              red: recolorData.r ?? "#ff0000",
              green: recolorData.g ?? "#00ff00",
              blue: recolorData.b ?? recolorData.r ?? "#ff0000",
              yellow: recolorData.a ?? "#ffff00",
            }
          });
          RECOLOR_CACHE.set(key, mat);
          console.log(`✅ Applied ${slotName} hue-indexed recolor: R=${recolorData.r}, G=${recolorData.g}, B=${recolorData.b}, Y=${recolorData.a}`);
        }

        // Apply material normalization for proper render pass
        normalizeMaterialForSlot(slot, mat);
        return mat;
      } else {
        // Legacy non-shader slots: skip recoloring (all skin parts should now be shader variants)
        console.log(`ℹ️ Non-shader slot "${slotName}" found - no recoloring applied (consider updating to shader variant)`);
        return null;
      }
    };
  };

  // ---- react to outfit/cosmetics changes (apply new skin and override) ----
  useEffect(() => {
    const skeleton = skeletonRef.current;
    const skeletonData = skeletonDataRef.current;
    const skeletonMesh = skeletonMeshRef.current;
    if (!skeleton || !skeletonData || !skeletonMesh) return;

    const skinName = getSpineSkin();
    const hatRecolor = getHatMaskRecolor();
    const skinRecolor = getSkinMaskRecolor();

    if (skinName && skinName !== "default") {
      const skin = skeletonData.findSkin(skinName);
      if (skin) {
        skeleton.setSkin(skin);
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform(Physics.update);
        console.log(`✅ Applied character preview skin: ${skinName}`);
      }
    } else {
      skeleton.setSkin(skeletonData.defaultSkin);
      skeleton.setToSetupPose();
      skeleton.updateWorldTransform(Physics.update);
    }

    setupMaterialOverride(skeletonMesh, hatRecolor, skinRecolor);
  }, [outfit.cosmetics.headTop, outfit.cosmetics.skin, catalog]);

  const onContextCreate = async (gl: any) => {
    try {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      const scene = new THREE.Scene();
      // Y-down ortho to match your working HUD/adapter convention
      const camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
      camera.position.z = 1;

      const renderer = new Renderer({ gl });
      renderer.sortObjects = true;
      renderer.setSize(width, height);
      renderer.setClearColor(0x0a0a12, 0);

      // ---- Load Spine assets (atlas + json + base page(s)) ----
      const atlasRequire = require("../../assets/GliderMonSpine/skeleton.atlas");
      const jsonRequire = require("../../assets/GliderMonSpine/skeleton.json");
      const basePageRequire = require("../../assets/GliderMonSpine/skeleton.png");

      const skeletonJsonData = jsonRequire; // Metro-parsed JSON
      const atlasAsset = Asset.fromModule(atlasRequire);
      await atlasAsset.downloadAsync();
      const atlasText = await FileSystem.readAsStringAsync(atlasAsset.localUri ?? atlasAsset.uri);

      // Base page(s)
      const pageBaseTextures = pageBaseTexturesRef.current;

      try {
        const { loadAsync } = require("expo-three");
        const baseTex: THREE.Texture = await loadAsync(basePageRequire);
        baseTex.flipY = false;
        baseTex.generateMipmaps = false; // match your pipeline (no mips)
        baseTex.needsUpdate = true;
        pageBaseTextures["skeleton.png"] = baseTex;
      } catch (e) {
        console.error("Failed to load base atlas page:", e);
        // Fallback: simple solid texture
        const size = 2;
        const data = new Uint8Array([255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255, 255]);
        const fallback = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        fallback.flipY = false;
        fallback.needsUpdate = true;
        pageBaseTextures["skeleton.png"] = fallback;
      }

      // Hue-indexed recolor system doesn't need mask textures

      // ---- Build Spine objects ----
      const atlas = new TextureAtlas(atlasText);

      // Set up texture resolver
      atlas.pages.forEach(page => {
        const pageName = page.name;
        const texture = pageBaseTextures[pageName] || pageBaseTextures[Object.keys(pageBaseTextures)[0]];
        if (texture) {
          page.texture = texture as any;
        }
      });

      const attachmentLoader = new AtlasAttachmentLoader(atlas);
      const skeletonJson = new SkeletonJson(attachmentLoader);
      const skeletonData = skeletonJson.readSkeletonData(skeletonJsonData);
      const skeleton = new Skeleton(skeletonData);

      skeletonRef.current = skeleton;
      skeletonDataRef.current = skeletonData;

      // Set up lifelike idle animation system
      const stateData = new AnimationStateData(skeletonData);
      const idleDriver = new LifelikeIdleNoMix(stateData);
      const state = idleDriver.animationState;

      idleDriverRef.current = idleDriver;

      // Set skin initially
      const initialSkin = getSpineSkin();
      if (initialSkin && initialSkin !== "default") {
        const skin = skeletonData.findSkin(initialSkin);
        if (skin) {
          skeleton.setSkin(skin);
          skeleton.setSlotsToSetupPose();
        }
      } else {
        skeleton.setToSetupPose();
      }

      // The lifelike idle system will handle animation automatically

      // Resolve textures by page name or filename
      const resolveTexture = (pageOrFileName: string): THREE.Texture | undefined => {
        if (pageBaseTextures[pageOrFileName]) return pageBaseTextures[pageOrFileName];
        const short = pageOrFileName.split("/").pop()!;
        return pageBaseTextures[short];
      };

      // Position/scale via Spine transform (not Three) - adjust scale based on size
      const scaleMultiplier = size === "small" ? 0.15 : size === "medium" ? 0.25 : 0.3;
      const finalScale = scaleMultiplier;
      const posX = width * 0.5;
      const posY = height * 0.25; // Move character lower to show hats better (lower Y = down in flipped system)
      skeleton.scaleX = finalScale;
      skeleton.scaleY = finalScale;
      skeleton.x = posX;
      skeleton.y = posY;

      // Create our mesh adapter
      const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
      skeletonMeshRef.current = mesh;

      // Keep Three object at identity; Spine handles transforms
      mesh.position.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      scene.add(mesh);

      // Initial recolor override
      setupMaterialOverride(mesh, getHatMaskRecolor(), getSkinMaskRecolor());

      // Render loop
      let lastTime = Date.now() / 1000;
      const renderLoop = () => {
        const now = Date.now() / 1000;
        const delta = now - lastTime;
        lastTime = now;

        // Update lifelike idle system (handles eye movements, blinking, and base idle)
        idleDriver.update(delta);
        skeleton.update(delta);
        state.apply(skeleton);
        skeleton.updateWorldTransform(Physics.update);
        mesh.refreshMeshes();

        renderer.render(scene, camera);
        gl.endFrameEXP();

        rafRef.current = requestAnimationFrame(renderLoop);
      };
      renderLoop();
    } catch (error) {
      console.error("Error initializing Spine character preview:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <View
      style={{
        width: config.width,
        height: config.height,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: colors.gray[200],
        overflow: "hidden",
      }}
    >
      <GLView
        style={{ width: config.width, height: config.height }}
        onContextCreate={onContextCreate}
      />

      {/* Animation indicator */}
      <View
        style={{
          position: "absolute",
          bottom: spacing.xs,
          right: spacing.xs,
          width: 6,
          height: 6,
          backgroundColor: colors.health[500],
          borderRadius: 3,
          opacity: 0.8,
        }}
      />

      {/* Highlight indicator */}
      {highlightSocket && (
        <View
          style={{
            position: "absolute",
            top: spacing.sm,
            right: spacing.sm,
            backgroundColor: colors.primary[100],
            paddingHorizontal: spacing.xs,
            paddingVertical: 2,
            borderRadius: borderRadius.sm,
            borderWidth: 1,
            borderColor: colors.primary[300],
          }}
        >
          <Text
            style={{
              fontSize: size === "small" ? 8 : 10,
              color: colors.primary[700],
              fontWeight: typography.weight.medium as any,
            }}
          >
            {highlightSocket}
          </Text>
        </View>
      )}

      {/* Spine indicator */}
      <View
        style={{
          position: "absolute",
          bottom: spacing.xs,
          left: spacing.xs,
          backgroundColor: colors.accent.lavender,
          paddingHorizontal: spacing.xs,
          paddingVertical: 1,
          borderRadius: borderRadius.sm,
        }}
      >
        <Text
          style={{
            fontSize: 6,
            color: colors.text.primary,
            fontWeight: typography.weight.medium as any,
          }}
        >
          SPINE
        </Text>
      </View>
    </View>
  );
}
