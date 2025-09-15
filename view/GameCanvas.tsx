// view/GameCanvas.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, useWindowDimensions, Platform, Text } from "react-native";
import { Asset } from "expo-asset";
import AnimatedSprite from "./AnimatedSprite";
import { makeGridRig } from "../sprites/rig";

// Local module ids (paths are from /view → /assets)
const idleModule  = require("../assets/idle8.png");
const blinkModule = require("../assets/idle8blink.png");
const hatModule   = require("../assets/GliderMonLeafHat.png");

export default function GameCanvas() {
  const { width, height } = useWindowDimensions();

  // Skia module (lazy)
  const [Skia, setSkia] = useState<any>(null);

  // Resolved sources for Skia.useImage
  //  • web: URI string (from expo-asset)
  //  • native: numeric module id
  const [texSource,   setTexSource]   = useState<string | number>(Platform.OS === "web" ? "" : idleModule);
  const [blinkSource, setBlinkSource] = useState<string | number>(Platform.OS === "web" ? "" : blinkModule);
  const [hatSource,   setHatSource]   = useState<string | number>(Platform.OS === "web" ? "" : hatModule);

  // Resolve assets (once)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Platform.OS === "web") {
        const aIdle  = Asset.fromModule(idleModule);
        const aBlink = Asset.fromModule(blinkModule);
        const aHat   = Asset.fromModule(hatModule);
        if (!aIdle.downloaded)  { try { await aIdle.downloadAsync(); }  catch {} }
        if (!aBlink.downloaded) { try { await aBlink.downloadAsync(); } catch {} }
        if (!aHat.downloaded)   { try { await aHat.downloadAsync(); }   catch {} }
        if (mounted) {
          setTexSource(aIdle.localUri ?? aIdle.uri);
          setBlinkSource(aBlink.localUri ?? aBlink.uri);
          setHatSource(aHat.localUri ?? aHat.uri);
        }
      } else {
        setTexSource(idleModule);
        setBlinkSource(blinkModule);
        setHatSource(hatModule);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Build the rig once the base texture is known
  const rig = useMemo(
    () => (texSource ? makeGridRig(texSource, 4, 2, 64, 64, 32, 61, { x: 34, y: 12 }) : null),
    [texSource]
  );

  // Lazy-load Skia (native immediately; web after CanvasKit bootstrap)
  useEffect(() => {
    if (Platform.OS !== "web") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      setSkia(require("@shopify/react-native-skia"));
      return;
    }
    const tryLoad = () => {
      if ((globalThis as any).CanvasKit) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        setSkia(require("@shopify/react-native-skia"));
        return true;
      }
      return false;
    };
    if (!tryLoad()) {
      const id = setInterval(() => { if (tryLoad()) clearInterval(id); }, 30);
      return () => clearInterval(id);
    }
  }, []);

  if (!Skia || !rig || !blinkSource || !hatSource) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0d1117" }}>
        <Text style={{ color: "#9cc4e4" }}>
          {!Skia ? "Initializing Skia…" : "Loading sprites…"}
        </Text>
      </View>
    );
  }

  const { Canvas, Rect } = Skia;

  // Place our sprite near the bottom center
  const pivotX = Math.round(width / 2);
  const groundY = Math.round(height * 0.75);

  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ width, height }}>
        {/* background */}
        <Rect x={0} y={0} width={width} height={height} color="#0d1117" />

        {/* the glider */}
        <AnimatedSprite
          Skia={Skia}
          rig={rig}
          x={pivotX}
          y={groundY}
          scale={3}
          clipTopPx={1}              // trims top bleed
          // Whole-loop blink: set to 1 temporarily to verify, then 4.
          blinkTex={blinkSource}
          blinkEvery={4}             // every 4th full loop uses the blink sheet
          // Hat cosmetic (saved values you picked)
          hatTex={hatSource}
          hatPivot={{ x: 18, y: 20 }}
          hatOffset={{ dx: -15, dy: 5 }}
        />
      </Canvas>
    </View>
  );
}
