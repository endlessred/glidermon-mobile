import React, { useEffect, useState } from "react";
import { View, useWindowDimensions, Platform, Text } from "react-native";
import AnimatedSprite from "./AnimatedSprite";
import { buildRigFromCatalog, resolveVariantTex } from "../sprites/spriteLoader";
import { useGliderBehavior } from "./useGliderBehavior";
import { useCosmeticsStore } from "../stores/cosmeticsStore";

// Fallback hat (bundled module)
const hatModule = require("../assets/GliderMonLeafHat.png");

export default function GameCanvas() {
  const { width, height } = useWindowDimensions();

  // Skia lazy import
  const [Skia, setSkia] = useState<any>(null);
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

  // Rig + blink source
  const [rig, setRig] = useState<any>(null);
  const [blinkSource, setBlinkSource] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { rig } = await buildRigFromCatalog("glider_idle");
        const blinkTex = await resolveVariantTex("glider_idle_blink");
        if (mounted) {
          setRig(rig);
          setBlinkSource(blinkTex);
          // one-time sanity log
          console.log("[GameCanvas] rig & blink loaded.");
        }
      } catch (e) {
        console.error("Sprite load failed:", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Cosmetics: ensure catalog is loaded, and wait for hydration before reading equipped
  const hydrated   = useCosmeticsStore(s => s.hydrated);
  const loadCatalog = useCosmeticsStore(s => s.loadCatalog);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const catalog = useCosmeticsStore(s => s.catalog);
  const equippedHatId = useCosmeticsStore(s => s.equipped.headTop);

  // Pick hat: if hydrated & found in catalog → that item; else fallback to default hat file
  const hatDef = hydrated ? catalog.find(c => c.id === equippedHatId) : undefined;
  const hatTex   = hatDef?.tex ?? hatModule;
  const hatPivot = hatDef?.pivot ?? { x: 18, y: 20 };
  const hatOffset= hatDef?.offset ?? { dx: -15, dy: 5 };

  // Behavior (idle + randomized blinks 4–7 loops)
  const behavior = useGliderBehavior(blinkSource || undefined);

  // Logs to help verify the path
  useEffect(() => {
    console.log("[GameCanvas] hydrated:", hydrated,
      "equipped:", equippedHatId,
      "hatDef?", !!hatDef,
      "hatTex type:", typeof hatTex
    );
  }, [hydrated, equippedHatId, hatDef, hatTex]);

  if (!Skia || !rig || !blinkSource) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0d1117" }}>
        <Text style={{ color: "#9cc4e4" }}>
          {!Skia ? "Initializing Skia…" : "Loading sprites…"}
        </Text>
      </View>
    );
  }

  const { Canvas, Rect } = Skia;
  const pivotX = Math.round(width / 2);
  const groundY = Math.round(height * 0.75);

  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ width, height }}>
        <Rect x={0} y={0} width={width} height={height} color="#0d1117" />
        <AnimatedSprite
          Skia={Skia}
          rig={rig}
          x={pivotX}
          y={groundY}
          scale={3}
          clipTopPx={1}

          // behavior-driven anim
          tag={behavior.tag}
          fps={behavior.fps}
          blinkTex={behavior.blinkTex}
          blinkMinLoops={behavior.blinkMinLoops}
          blinkMaxLoops={behavior.blinkMaxLoops}

          // equipped cosmetic (fallback to default leaf hat)
          hatTex={hatTex}
          hatPivot={hatPivot}
          hatOffset={hatOffset}

          // TEMP: anchor debug to verify headTop location (remove after)
          debugAnchors={true}
        />
      </Canvas>
    </View>
  );
}
