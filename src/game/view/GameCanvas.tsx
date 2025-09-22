// view/GameCanvas.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Text, View, useWindowDimensions, LayoutChangeEvent } from "react-native";
import AnimatedSprite from "./AnimatedSprite";
import BehaviorSprite from "./BehaviorSprite";
import { makeGridRig } from "../sprites/rig";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import { useActiveLocalOutfit } from "../../data/stores/outfitStore";
import { shallow } from "zustand/shallow";
import TiltShiftEffect from "../../ui/components/TiltShiftEffect";
import { useGliderBehaviorDefinition } from "./useGliderBehavior";
import { useCosmeticRenderer } from "./CosmeticSprite";
import PaletteSwappedBehaviorSprite from "./PaletteSwappedBehaviorSprite";
import { AssetMap } from "../../assets/assetMap";

// Stable selector to prevent infinite re-renders
const selectEquippedCosmetics = (s: any) => {
  const equipped = s.equipped || {};
  return Object.values(equipped).filter(Boolean) as string[];
};

// Assets - updated for new palette-based sprites
const idleSheet      = AssetMap.idle8;                                      // 64x64 x8 (1x8 layout)
const idleBlinkSheet = AssetMap.idle8blink;                                 // full 8-frame blink
const skyboxPng      = require("../../assets/skybox/gliderNestSkybox.png"); // 3 frames (240x240 each)
const nestPng        = require("../../assets/nest.png");
const hatLeafPng     = require("../../assets/GliderMonLeafHat.png");
const hatGreaterPng  = require("../../assets/GliderMonGreaterHat.png");
const hatPackPng     = require("../../assets/hats/hat_pack_1.png");

function resolveForSkia(mod: any): any {
  if (Platform.OS === "web") {
    const { Asset } = require("expo-asset");
    return Asset.fromModule(mod).uri;
  }
  return mod;
}

type Props = {
  /** "embedded" = square-only (HUD). "standalone" = old Game tab (centers vertically). */
  variant?: "embedded" | "standalone";
};

export default function GameCanvas({ variant = "standalone" }: Props) {
  const [ckReady, setCkReady] = useState(Platform.OS !== "web");
  const [Skia, setSkia] = useState<any>(null);

  // Web: wait for CanvasKit (safe bootstrap)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const ready = () => {
      const ck = (globalThis as any).CanvasKit;
      return !!(ck && ck.MakeImageFromEncoded && ck.PictureRecorder);
    };
    if (ready()) { setCkReady(true); return; }
    const id = setInterval(() => { if (ready()) { clearInterval(id); setCkReady(true); } }, 30);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && !ckReady) return;
    const mod = require("@shopify/react-native-skia");
    setSkia(mod);
  }, [ckReady]);

  // While Skia loads, keep the container sized correctly
  return (
    <SizedContainer variant={variant}>
      {!Skia ? (
        <Text style={{ color: "#9cc4e4" }}>
          Initializing Skia… {Platform.OS === "web" ? (ckReady ? "ckReady ✓" : "waiting for CanvasKit") : "native"}
        </Text>
      ) : (
        <GameCanvasInner Skia={Skia} variant={variant} />
      )}
    </SizedContainer>
  );
}

/** Squares itself to the parent width when embedded; otherwise fills like before. */
function SizedContainer({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "embedded" | "standalone";
}) {
  const { width, height } = useWindowDimensions();
  const [w, setW] = useState<number>(Math.floor(width));

  const onLayout = (e: LayoutChangeEvent) => {
    if (variant === "embedded") {
      const next = Math.max(1, Math.floor(e.nativeEvent.layout.width));
      if (next !== w) setW(next);
    }
  };

  if (variant === "embedded") {
    return (
      <View onLayout={onLayout} style={{ width: "100%", aspectRatio: 1, overflow: "hidden", alignSelf: "center", backgroundColor: "#0d1117" }}>
        {/* children will render a Canvas sized to this exact square */}
        {children}
      </View>
    );
  }

  // standalone = old Game tab behavior (flex fill)
  return (
    <View style={{ flex: 1, backgroundColor: "#0d1117", alignItems: "stretch", justifyContent: "center" }}>
      {children}
    </View>
  );
}

function GameCanvasInner({ Skia, variant }: { Skia: any; variant: "embedded" | "standalone" }) {
  const { width, height } = useWindowDimensions();
  const { Canvas, Image: SkImageNode, Rect, useImage, Group } = Skia;

  // Get active outfit for palette settings
  const activeOutfit = useActiveLocalOutfit();

  // Figure out the square box and top-left origin:
  // - embedded: square = parent width, origin at (0,0) -> no extra padding
  // - standalone: square = screen width, centered vertically (old behavior)
  const boxSize = Math.floor(width);
  const x0 = 0;
  const y0 = variant === "embedded" ? 0 : Math.floor((height - boxSize) / 2);

  // Load images
  const skyImg  = useImage(resolveForSkia(skyboxPng));
  const nestImg = useImage(resolveForSkia(nestPng));

  // Animate sky (slide strip) — like your original: 1 fps, 3 frames
  const [frameIdx, setFrameIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrameIdx((f) => (f + 1) % 3), 1000);
    return () => clearInterval(id);
  }, []);

  const skyDraw = useMemo(() => {
    if (!skyImg) return null;
    const srcW = skyImg.width() || 720;
    const srcH = skyImg.height() || 240;
    const frames = 3;
    const frameW = srcW / frames;
    const scale = boxSize / frameW;
    return {
      drawW: srcW * scale,
      drawH: srcH * scale,
      drawX: x0 - frameIdx * frameW * scale,
      drawY: y0,
    };
  }, [skyImg, frameIdx, boxSize, x0, y0]);

  // Sprite rig + placement (updated for new 1x8 layout)
  const rig = useMemo(
    () => makeGridRig(idleSheet, 8, 1, 64, 64, 32, 60, { x: 34, y: 12 }),
    []
  );
  const pivotX  = x0 + Math.round(boxSize / 2);
  const groundY = y0 + Math.round(boxSize * 0.78);
  const spriteScale = Math.max(2, Math.floor(boxSize / 96));
  const scaleUsed = spriteScale - 2;

  // Equipped hat (keep the old system working for now)
  const equippedHatId = useCosmeticsStore((s) => s.equipped?.headTop) || null;

  // Hat configurations: texture, frame info, and position adjustments
  const HAT_CONFIGS: Record<string, {
    tex: any;
    frameIndex?: number;
    offset?: { dx?: number; dy?: number };
  }> = {
    // Original full sprite sheet hats
    leaf_hat: { tex: require("../../assets/GliderMonLeafHat.png") },
    greater_hat: { tex: require("../../assets/GliderMonGreaterHat.png") },

    // Hat pack hats - each uses a specific frame from the sprite sheet
    frog_hat: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 0, offset: { dx: -15, dy: 8 } },
    black_headphones: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 1 },
    white_headphones: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 2 },
    pink_headphones: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 3 },
    pink_aniphones: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 4 },
    feather_cap: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 5 },
    viking_hat: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 6 },
    adventurer_fedora: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 7 },
  };

  const hatConfig = equippedHatId ? HAT_CONFIGS[equippedHatId] : null;

  // New behavior system - automatically adjusts based on glucose levels
  const gliderBehavior = useGliderBehaviorDefinition(idleBlinkSheet);

  // Canvas size:
  const canvasW = variant === "embedded" ? boxSize : width;
  const canvasH = variant === "embedded" ? boxSize : height;

  return (
    <Canvas style={{ width: canvasW, height: canvasH }}>
      {/* Backdrop: only useful for standalone/fullscreen; embedded is clipped by the parent square */}
      {variant === "standalone" && (
        <Rect x={0} y={0} width={canvasW} height={canvasH} color="#0d1117" />
      )}

      {/* STEP 1: Render all content normally */}
      {/* SKY - Background */}
      {skyImg && skyDraw && (
        <SkImageNode image={skyImg} x={skyDraw.drawX} y={skyDraw.drawY} width={skyDraw.drawW} height={skyDraw.drawH} fit="fill" />
      )}

      {/* NEST - Midground */}
      {nestImg && (
        <SkImageNode image={nestImg} x={x0} y={y0} width={boxSize} height={boxSize} fit="cover" />
      )}

      {/* CHARACTER + BLINK + HAT - Palette Swapped */}
      <PaletteSwappedBehaviorSprite
        Skia={Skia}
        rig={rig}
        behavior={gliderBehavior}
        x={pivotX}
        y={groundY}
        scale={scaleUsed}
        flipX={false}
        skinVariation={activeOutfit?.skinVariation || 'default'}
        eyeColor={activeOutfit?.eyeColor || 'blue'}
        shoeVariation={activeOutfit?.shoeVariation || 'brown'}
        blinkTex={idleBlinkSheet}
        blinkEveryMin={4}
        blinkEveryMax={7}
        hatTex={hatConfig?.tex ?? undefined}
        hatFrameIndex={hatConfig?.frameIndex}
        hatPivot={{ x: 18, y: 20 }}
        hatOffset={hatConfig?.offset ?? { dx: -15, dy: 5 }}
        anchorOverrides={[{ range: [3, 6], headTop: { dx: -1 } }]}
      />

      {/* STEP 2: Apply tilt-shift effect as overlay */}
      <TiltShiftEffect
        Skia={Skia}
        width={canvasW}
        height={canvasH}
        focusCenter={0.6} // Focus around character center
        focusWidth={0.4} // Medium focus area
        blurIntensity={8}  // Reduced blur intensity
      >
        {/* Only render background/midground content for blur - NOT the character */}
        {skyImg && skyDraw && (
          <SkImageNode image={skyImg} x={skyDraw.drawX} y={skyDraw.drawY} width={skyDraw.drawW} height={skyDraw.drawH} fit="fill" />
        )}
        {nestImg && (
          <SkImageNode image={nestImg} x={x0} y={y0} width={boxSize} height={boxSize} fit="cover" />
        )}
        {/* Character NOT included in blur overlay - it stays sharp */}
      </TiltShiftEffect>
    </Canvas>
  );
}
