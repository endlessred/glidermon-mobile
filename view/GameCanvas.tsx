// view/GameCanvas.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Text, View, useWindowDimensions } from "react-native";
import AnimatedSprite from "./AnimatedSprite";
import { makeGridRig } from "../sprites/rig";
import { useCosmeticsStore } from "../stores/cosmeticsStore";

// Assets
const idleSheet      = require("../assets/idle8.png");                    // 64x64 x8 (4x2)
const idleBlinkSheet = require("../assets/idle8blink.png");              // full 8-frame blink
const skyboxPng      = require("../assets/skybox/gliderNestSkybox.png"); // 3 frames (240x240 each)
const nestPng        = require("../assets/nest.png");
const hatLeafPng     = require("../assets/GliderMonLeafHat.png");
const hatGreaterPng  = require("../assets/GliderMonGreaterHat.png");

function resolveForSkia(mod: any): any {
  if (Platform.OS === "web") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Asset } = require("expo-asset");
    return Asset.fromModule(mod).uri;
  }
  return mod;
}

export default function GameCanvas() {
  const [ckReady, setCkReady] = useState(Platform.OS !== "web");
  const [Skia, setSkia] = useState<any>(null);

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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@shopify/react-native-skia");
    setSkia(mod);
  }, [ckReady]);

  if (!Skia) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0d1117" }}>
        <Text style={{ color: "#9cc4e4" }}>
          Initializing Skia… {Platform.OS === "web" ? (ckReady ? "ckReady ✓" : "waiting for CanvasKit") : "native"}
        </Text>
      </View>
    );
  }

  return <GameCanvasInner Skia={Skia} />;
}

function GameCanvasInner({ Skia }: { Skia: any }) {
  const { width, height } = useWindowDimensions();
  const { Canvas, Image: SkImageNode, Rect, useImage } = Skia;

  // Square game area
  const boxSize = Math.floor(width);
  const x0 = Math.floor((width - boxSize) / 2);
  const y0 = Math.floor((height - boxSize) / 2);

  // Load images
  const skySrc  = resolveForSkia(skyboxPng);
  const nestSrc = resolveForSkia(nestPng);
  const skyImg  = useImage(skySrc);
  const nestImg = useImage(nestSrc);

  // Animate sky (slide strip) — 1 fps
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

  // Sprite rig + placement (compatible with our AnimatedSprite)
  const rig = useMemo(
    () => makeGridRig(idleSheet, 4, 2, 64, 64, 32, 60, { x: 34, y: 12 }),
    []
  );
  const pivotX  = x0 + Math.round(boxSize / 2);
  const groundY = y0 + Math.round(boxSize * 0.78);
  const spriteScale = Math.max(2, Math.floor(boxSize / 96));
  const scaleUsed = spriteScale - 2;

  // Equipped hat (store uses headTop)
  const equippedHatId = useCosmeticsStore((s) => s.equipped?.headTop) || null;
  const HAT_MODS: Record<string, any> = {
    leaf_hat: hatLeafPng,
    greater_hat: hatGreaterPng,
  };
  const hatMod = equippedHatId ? HAT_MODS[equippedHatId] : null;

  const ready = !!nestImg && !!skyImg;

  return (
    <View style={{ flex: 1, backgroundColor: "#0d1117" }}>
      <Canvas style={{ width, height }}>
        {/* Backdrop */}
        <Rect x={0} y={0} width={width} height={height} color="#0d1117" />

        {/* SKY (back) */}
        {ready && skyDraw && (
          <SkImageNode
            image={skyImg!}
            x={skyDraw.drawX}
            y={skyDraw.drawY}
            width={skyDraw.drawW}
            height={skyDraw.drawH}
            fit="fill"
          />
        )}

        {/* NEST (under character) */}
        {ready && (
          <SkImageNode image={nestImg!} x={x0} y={y0} width={boxSize} height={boxSize} fit="cover" />
        )}

        {/* CHARACTER + BLINK BEHAVIOR + HAT */}
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
      </Canvas>

      {/* debug footer */}
      <View style={{ position: "absolute", bottom: 6, alignSelf: "center", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#0008" }}>
        <Text style={{ color: "#9cc4e4", fontSize: 12 }}>
          sky: {skyImg ? "ok" : "…"} (sliding) • nest: {nestImg ? "ok" : "…"} • frame {frameIdx + 1}/3 • hat: {equippedHatId || "—"}
        </Text>
      </View>
    </View>
  );
}
