// app/view/GameCanvas.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, useWindowDimensions, Platform, Text as RNText } from "react-native";
import { useGameStore } from "../stores/gameStore";
import { selectHudVM } from "./selectViewModel";

type TrendCode = 0 | 1 | 2 | 3; // 0=down, 1=flat, 2=up, 3=unknown

// --- tolerant extractors (adjust to your engine once finalized) ---
function getMgdl(engine: any): number | null {
  if (!engine) return null;
  return (
    engine.currentMgdl ??
    engine.mgdl ??
    engine.glucose?.mgdl ??
    engine.egvs?.current?.mgdl ??
    null
  );
}
function getTrendCode(engine: any): TrendCode | null {
  if (!engine) return null;
  const v =
    engine.currentTrendCode ??
    engine.trendCode ??
    engine.egvs?.current?.trendCode ??
    null;
  return (v ?? null) as TrendCode | null;
}
type HistPoint = { ts: number; mgdl: number };
function toTs(x: any): number | null {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Date.parse(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function normalizeHistory(engine: any): HistPoint[] {
  const raw =
    engine?.history ??
    engine?.egvs?.history ??
    engine?.readings ??
    [];
  const out: HistPoint[] = [];
  for (const r of raw) {
    if (!r) continue;
    const mgdl =
      Number(r.mgdl ?? r.value ?? r.value_mgdl ?? r.glucose ?? NaN);
    const ts =
      r.ts ??
      r.tsMs ??
      r.ms ??
      toTs(r.time) ??
      toTs(r.systemTime) ??
      toTs(r.displayTime) ??
      null;
    if (Number.isFinite(mgdl) && typeof ts === "number") {
      out.push({ ts, mgdl });
    }
  }
  // oldest-first + trim
  out.sort((a, b) => a.ts - b.ts);
  return out.slice(-120);
}
function bucketOf(mgdl: number | null, low = 80, high = 180): "LOW" | "IN_RANGE" | "HIGH" {
  if (mgdl == null) return "IN_RANGE";
  if (mgdl < low) return "LOW";
  if (mgdl > high) return "HIGH";
  return "IN_RANGE";
}
function trendGlyph(tc: TrendCode | null) {
  if (tc === 0) return "↓";
  if (tc === 1) return "→";
  if (tc === 2) return "↑";
  return "•";
}

export default function GameCanvas() {
  const { width, height } = useWindowDimensions();
  const [SkiaMod, setSkiaMod] = useState<any>(null);

  // subscribe to engine + toasts
  const engine = useGameStore((s: any) => s.engine);
  const { currentMgdl: mgdl, currentTrendCode: trendCode, history } =
  useGameStore(selectHudVM);
  const toasts = useGameStore((s: any) => s.ui?.toasts ?? []);

  

  // load Skia (web waits for CanvasKit)
  useEffect(() => {
    if (Platform.OS !== "web") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      setSkiaMod(require("@shopify/react-native-skia"));
      return;
    }
    const tryLoad = () => {
      if ((globalThis as any).CanvasKit) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        setSkiaMod(require("@shopify/react-native-skia"));
        return true;
      }
      return false;
    };
    if (!tryLoad()) {
      const id = setInterval(() => {
        if (tryLoad()) clearInterval(id);
      }, 30);
      return () => clearInterval(id);
    }
  }, []);

  if (!SkiaMod) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0d1117" }}>
        <RNText style={{ color: "#9cc4e4" }}>Initializing Skia…</RNText>
      </View>
    );
  }

  const { Canvas, Rect, Path, PathKit } = SkiaMod;

  // visuals
  const bucket = bucketOf(mgdl);
  const bg = "#0d1117";
  const band = bucket === "LOW" ? "#1f6feb" : bucket === "HIGH" ? "#ef4444" : "#10b981";
  const bandHeight = Math.max(60, Math.floor(height * 0.18));
  const pad = 12;

  // sparkline path
  const sparkPath = useMemo(() => {
    const p = PathKit.Path.Make();
    if (!history.length) return p;

    const left = 16;
    const right = width - 16;
    const top = bandHeight + 12;
    const bottom = height - 20;

    const xs = history.map(h => h.ts);
    const ys = history.map(h => h.mgdl);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(70, ...ys);
    const maxY = Math.max(200, ...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const xOf = (t: number) => left + ((t - minX) / spanX) * (right - left);
    const yOf = (v: number) => bottom - ((v - minY) / spanY) * (bottom - top);

    history.forEach((pt, i) => {
      const x = xOf(pt.ts);
      const y = yOf(pt.mgdl);
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    });
    return p;
  }, [history, width, height, bandHeight, PathKit]);

  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ width, height }}>
        {/* background */}
        <Rect x={0} y={0} width={width} height={height} color={bg} />

        {/* top band (state color) */}
        <Rect x={0} y={0} width={width} height={bandHeight} color={band} />

        {/* sparkline */}
        <Path
          path={sparkPath}
          strokeWidth={3}
          style="stroke"
          color="#e5e7eb"
          strokeJoin="round"
          strokeCap="round"
        />
      </Canvas>

      {/* HUD: big glucose + arrow */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: bandHeight,
          paddingHorizontal: pad,
          paddingTop: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <RNText
          style={{
            color: "white",
            fontSize: Math.min(64, Math.max(36, Math.floor(width * 0.12))),
            fontWeight: "800",
          }}
        >
          {mgdl == null ? "--" : String(Math.round(mgdl))}
        </RNText>
        <RNText
          style={{
            color: "white",
            fontSize: Math.min(48, Math.max(28, Math.floor(width * 0.08))),
            fontWeight: "700",
          }}
        >
          {trendGlyph(trendCode)}
        </RNText>
      </View>

      {/* Toasts from store.ui.toasts */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 24,
          alignItems: "center",
          gap: 8,
        }}
      >
        {toasts.map((t: any) => (
          <View
            key={t.id}
            style={{
              backgroundColor: "rgba(17,24,39,0.9)",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <RNText style={{ color: "white" }}>{t.text}</RNText>
          </View>
        ))}
      </View>
    </View>
  );
}
