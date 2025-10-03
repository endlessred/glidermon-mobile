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
import { makeMaskRecolorMaterial } from "../../spine/MaskRecolor";
import { useTheme } from "../../data/hooks/useTheme";
import { OutfitSlot, CosmeticSocket } from "../../data/types/outfitTypes";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";

// ---- simple recolor material cache (per page + colors) ----
const RECOLOR_CACHE = new Map<string, THREE.ShaderMaterial>();

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

  // Base and mask textures keyed by atlas page name (e.g., "skeleton.png")
  const pageBaseTexturesRef = useRef<Record<string, THREE.Texture>>({});
  const pageMaskTexturesRef = useRef<Record<string, THREE.Texture>>({});

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

  const getMaskRecolor = () => {
    const equippedHat = outfit.cosmetics.headTop;
    if (!equippedHat?.itemId) return null;
    const cosmeticItem = catalog.find((item) => item.id === equippedHat.itemId);
    return cosmeticItem?.maskRecolor || null; // expected shape: { r?: string, g?: string, b?: string, a?: string }
  };

  // ---- set/refresh material override: recolor Hat_Base only ----
  const setupMaterialOverride = (skeletonMesh: SkeletonMesh, maskRecolor: any) => {
    const pageMaskTextures = pageMaskTexturesRef.current;

    if (!maskRecolor) {
      skeletonMesh.materialOverride = undefined;
      return;
    }

    skeletonMesh.materialOverride = (slot: any, baseTex: THREE.Texture) => {
      const slotName: string = slot?.data?.name ?? "";

      // Only recolor the hat base mesh (adjust if you want more parts)
      if (slotName !== "Hat_Base") return null;

      // Resolve attachment's page name to grab the correct mask page
      const att: any = slot.getAttachment?.();
      const pageName: string | undefined = att?.region?.page?.name;

      if (!pageName) return null;
      const maskTex = pageMaskTextures[pageName];
      if (!maskTex) {
        // If there's no mask page for this atlas page, skip recolor gracefully
        // console.warn(`No mask page found for atlas page "${pageName}" — skipping recolor for ${slotName}`);
        return null;
      }

      // Cache per (page uuid + chosen colors)
      const key = `${(baseTex as any).uuid}|${maskRecolor.r}|${maskRecolor.g}|${maskRecolor.b}|${maskRecolor.a}|shade|pma1`;
      let mat = RECOLOR_CACHE.get(key);
      if (!mat) {
        mat = makeMaskRecolorMaterial(
          baseTex,
          maskTex,
          {
            r: maskRecolor.r ?? "#ffffff",
            g: maskRecolor.g,
            b: maskRecolor.b,
            a: maskRecolor.a,
          },
          {
            mode: "shade", // keep grayscale shading from base
            premultipliedAlpha: true,
            alphaTest: 0.0015,
            preserveDarkThreshold: 0.14, // keep near-black outlines unpainted
            strength: 1,
          }
        );
        RECOLOR_CACHE.set(key, mat);
      }
      return mat;
    };
  };

  // ---- react to outfit/cosmetics changes (apply new skin and override) ----
  useEffect(() => {
    const skeleton = skeletonRef.current;
    const skeletonData = skeletonDataRef.current;
    const skeletonMesh = skeletonMeshRef.current;
    if (!skeleton || !skeletonData || !skeletonMesh) return;

    const skinName = getSpineSkin();
    const maskRecolor = getMaskRecolor();

    if (skinName && skinName !== "default") {
      const skin = skeletonData.findSkin(skinName);
      if (skin) {
        skeleton.setSkin(skin);
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform(Physics.update);
      }
    } else {
      skeleton.setSkin(null);
      skeleton.setSlotsToSetupPose();
    }

    setupMaterialOverride(skeletonMesh, maskRecolor);
  }, [outfit.cosmetics.headTop, catalog]);

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
      const pageMaskTextures = pageMaskTexturesRef.current;

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

      // ---- Load mask page(s) matching the base atlas pages ----
      // IMPORTANT: ensure this file exists and matches base page dimensions/layout
      try {
        const { loadAsync } = require("expo-three");
        const maskPageRequire = require("../../assets/GliderMonSpine/skeleton_mask.png");
        const maskTex: THREE.Texture = await loadAsync(maskPageRequire);
        maskTex.flipY = false;
        maskTex.generateMipmaps = false;
        maskTex.needsUpdate = true;
        // Key by the same base page name ("skeleton.png") so we can find it by attachment.page.name
        pageMaskTextures["skeleton.png"] = maskTex;
      } catch (e) {
        console.warn("No mask page found (skeleton_mask.png). Hat recolor will be skipped for that page.");
      }

      // ---- Build Spine objects ----
      const atlas = new TextureAtlas(atlasText, (pageName: string) => {
        // the resolver is called with atlas page name, e.g. "skeleton.png"
        return pageBaseTextures[pageName] || pageBaseTextures[Object.keys(pageBaseTextures)[0]];
      });

      const attachmentLoader = new AtlasAttachmentLoader(atlas);
      const skeletonJson = new SkeletonJson(attachmentLoader);
      const skeletonData = skeletonJson.readSkeletonData(skeletonJsonData);
      const skeleton = new Skeleton(skeletonData);

      skeletonRef.current = skeleton;
      skeletonDataRef.current = skeletonData;

      // Anim state
      const stateData = new AnimationStateData(skeletonData);
      const state = new AnimationState(stateData);

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

      // Idle anim (if present)
      const idle = skeletonData.findAnimation("idle");
      if (idle) state.setAnimation(0, idle, true);

      // Resolve textures by page name or filename
      const resolveTexture = (pageOrFileName: string): THREE.Texture | undefined => {
        if (pageBaseTextures[pageOrFileName]) return pageBaseTextures[pageOrFileName];
        const short = pageOrFileName.split("/").pop()!;
        return pageBaseTextures[short];
      };

      // Position/scale via Spine transform (not Three)
      const finalScale = 0.3;
      const posX = width * 0.5;
      const posY = height * 0.4;
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
      setupMaterialOverride(mesh, getMaskRecolor());

      // Render loop
      let lastTime = Date.now() / 1000;
      const renderLoop = () => {
        const now = Date.now() / 1000;
        const delta = now - lastTime;
        lastTime = now;

        mesh.update(delta);
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
