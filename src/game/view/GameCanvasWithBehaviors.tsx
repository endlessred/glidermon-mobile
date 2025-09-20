// Example of GameCanvas with new behavior system
// This demonstrates how to use the new behavior system alongside the existing setup
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Text, View, useWindowDimensions, LayoutChangeEvent } from "react-native";
import AnimatedSprite from "./AnimatedSprite"; // Original sprite
import BehaviorSprite from "./BehaviorSprite"; // New behavior-enabled sprite
import { makeGridRig } from "../sprites/rig";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import TiltShiftEffect from "../../ui/components/TiltShiftEffect";
import { useGliderBehaviorDefinition, useBehaviorByName } from "./useGliderBehavior";
import { BehaviorLoader } from "../behaviors/behaviorLoader";
import type { AnimationState } from "../behaviors/behaviors";

// Assets (same as original)
const idleSheet      = require("../../assets/idle8.png");
const idleBlinkSheet = require("../../assets/idle8blink.png");
const skyboxPng      = require("../../assets/skybox/gliderNestSkybox.png");
const nestPng        = require("../../assets/nest.png");
const hatLeafPng     = require("../../assets/GliderMonLeafHat.png");
const hatGreaterPng  = require("../../assets/GliderMonGreaterHat.png");

function resolveForSkia(mod: any): any {
  if (Platform.OS === "web") {
    const { Asset } = require("expo-asset");
    return Asset.fromModule(mod).uri;
  }
  return mod;
}

type Props = {
  variant?: "embedded" | "standalone";
  // New prop to control behavior mode
  behaviorMode?: "legacy" | "enhanced" | "custom";
  customBehaviorName?: string;
};

export default function GameCanvasWithBehaviors({
  variant = "standalone",
  behaviorMode = "legacy",
  customBehaviorName
}: Props) {
  const [ckReady, setCkReady] = useState(Platform.OS !== "web");
  const [Skia, setSkia] = useState<any>(null);

  // Load custom behaviors on mount (disabled for now)
  useEffect(() => {
    // Custom behavior file loading disabled for now
    console.log("Custom behavior loading disabled");
  }, []);

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
        <GameCanvasInner Skia={Skia} variant={variant} behaviorMode={behaviorMode} customBehaviorName={customBehaviorName} />
      )}
    </SizedContainer>
  );
}

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
        {children}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0d1117", alignItems: "stretch", justifyContent: "center" }}>
      {children}
    </View>
  );
}

function GameCanvasInner({
  Skia,
  variant,
  behaviorMode,
  customBehaviorName
}: {
  Skia: any;
  variant: "embedded" | "standalone";
  behaviorMode: "legacy" | "enhanced" | "custom";
  customBehaviorName?: string;
}) {
  const { width, height } = useWindowDimensions();
  const { Canvas, Image: SkImageNode, Rect, useImage, Group } = Skia;

  // Figure out the square box and top-left origin
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

  // Sprite rig + placement
  const rig = useMemo(
    () => makeGridRig(idleSheet, 4, 2, 64, 64, 32, 60, { x: 34, y: 12 }),
    []
  );
  const pivotX  = x0 + Math.round(boxSize / 2);
  const groundY = y0 + Math.round(boxSize * 0.78);
  const spriteScale = Math.max(2, Math.floor(boxSize / 96));
  const scaleUsed = spriteScale - 2;

  // Equipped hat
  const equippedHatId = useCosmeticsStore((s) => s.equipped?.headTop) || null;
  const HAT_MODS: Record<string, any> = { leaf_hat: hatLeafPng, greater_hat: hatGreaterPng };
  const hatMod = equippedHatId ? HAT_MODS[equippedHatId] : null;

  // Behavior system
  const gliderBehavior = useGliderBehaviorDefinition(idleBlinkSheet);
  const customBehavior = useBehaviorByName(customBehaviorName || "");

  // State for behavior feedback
  const [currentBehaviorState, setCurrentBehaviorState] = useState<AnimationState | null>(null);

  // Choose which behavior to use
  const activeBehavior = useMemo(() => {
    switch (behaviorMode) {
      case "enhanced":
        return gliderBehavior;
      case "custom":
        return customBehavior || gliderBehavior; // Fallback to enhanced if custom not found
      default:
        return null; // Legacy mode
    }
  }, [behaviorMode, gliderBehavior, customBehavior]);

  // Canvas size
  const canvasW = variant === "embedded" ? boxSize : width;
  const canvasH = variant === "embedded" ? boxSize : height;

  return (
    <Canvas style={{ width: canvasW, height: canvasH }}>
      {/* Backdrop */}
      {variant === "standalone" && (
        <Rect x={0} y={0} width={canvasW} height={canvasH} color="#0d1117" />
      )}

      {/* SKY - Background */}
      {skyImg && skyDraw && (
        <SkImageNode image={skyImg} x={skyDraw.drawX} y={skyDraw.drawY} width={skyDraw.drawW} height={skyDraw.drawH} fit="fill" />
      )}

      {/* NEST - Midground */}
      {nestImg && (
        <SkImageNode image={nestImg} x={x0} y={y0} width={boxSize} height={boxSize} fit="cover" />
      )}

      {/* CHARACTER - Choose between legacy and behavior-enabled sprite */}
      {activeBehavior ? (
        <BehaviorSprite
          Skia={Skia}
          rig={rig}
          behavior={activeBehavior}
          x={pivotX}
          y={groundY}
          scale={scaleUsed}
          flipX={false}
          hatTex={hatMod ?? undefined}
          hatPivot={{ x: 18, y: 20 }}
          hatOffset={{ dx: -15, dy: 5 }}
          anchorOverrides={[{ range: [3, 6], headTop: { dx: -1 } }]}
          onBehaviorStateChange={setCurrentBehaviorState}
        />
      ) : (
        <AnimatedSprite
          Skia={Skia}
          rig={rig}
          x={pivotX}
          y={groundY}
          scale={scaleUsed}
          flipX={false}
          blinkTex={idleBlinkSheet}
          blinkEveryMin={4}
          blinkEveryMax={7}
          hatTex={hatMod ?? undefined}
          hatPivot={{ x: 18, y: 20 }}
          hatOffset={{ dx: -15, dy: 5 }}
          anchorOverrides={[{ range: [3, 6], headTop: { dx: -1 } }]}
        />
      )}

      {/* Tilt-shift effect */}
      <TiltShiftEffect
        Skia={Skia}
        width={canvasW}
        height={canvasH}
        focusCenter={0.6}
        focusWidth={0.4}
        blurIntensity={8}
      >
        {skyImg && skyDraw && (
          <SkImageNode image={skyImg} x={skyDraw.drawX} y={skyDraw.drawY} width={skyDraw.drawW} height={skyDraw.drawH} fit="fill" />
        )}
        {nestImg && (
          <SkImageNode image={nestImg} x={x0} y={y0} width={boxSize} height={boxSize} fit="cover" />
        )}
      </TiltShiftEffect>

      {/* Debug info for behavior state (remove in production) */}
      {currentBehaviorState && behaviorMode !== "legacy" && (
        <Rect x={10} y={10} width={200} height={60} color="rgba(0,0,0,0.7)" />
        // Note: You'd need to add text rendering here for debug info
      )}
    </Canvas>
  );
}