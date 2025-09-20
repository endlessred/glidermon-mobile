// src/simCgms.ts
import type { TrendCode } from "./bleClient";
import { makeRng } from "../core/engine/rng";

type SimOpts = {
  onEgvs: (mgdl: number, trendCode: TrendCode, epochSec: number) => void;
  startMgdl?: number;        // default 120
  virtualStepSec?: number;   // how many "data seconds" per tick (default 300 = 5min)
  realTickMs?: number;       // real time between ticks (default 1500ms for quick demo)
  seed?: number;             // deterministic if provided
};

type Mode =
  | "stable"
  | "riseToHigh"
  | "highPlateau"
  | "fallToRange"
  | "fallToLow"
  | "lowDip"
  | "recoverToRange";

let timer: ReturnType<typeof setInterval> | null = null;

export function stopEgvsSimulator() {
  if (timer) { clearInterval(timer); timer = null; }
}

export function startEgvsSimulator({
  onEgvs,
  startMgdl = 120,
  virtualStepSec = 300,  // 5 minutes per EGV tick
  realTickMs = 1500,     // ~1.5s per “5min” for fast feedback
  seed,
}: SimOpts) {
  stopEgvsSimulator();

  const rng = makeRng(seed ?? Date.now());
  let mgdl = startMgdl;
  let epochSec = Math.floor(Date.now() / 1000);

  // episode state
  let mode: Mode = "stable";
  let ticksLeft = 6 + Math.floor(rng() * 6); // 6..11 ticks (30–55 min virtual)

  // helper: pick the next episode
  const pickNextMode = (current: Mode): Mode => {
    const r = rng();
    switch (current) {
      case "stable":
        if (r < 0.35) return "riseToHigh";
        if (r < 0.55) return "fallToLow";
        return "stable";
      case "riseToHigh":
        return "highPlateau";
      case "highPlateau":
        return r < 0.6 ? "fallToRange" : "fallToLow";
      case "fallToRange":
        return "stable";
      case "fallToLow":
        return "lowDip";
      case "lowDip":
        return "recoverToRange";
      case "recoverToRange":
        return "stable";
      default:
        return "stable";
    }
  };

  // per-episode drift (mg/dL per 5min)
  const driftFor = (m: Mode): number => {
    switch (m) {
      case "stable":          return (rng() - 0.5) * 4;   // -2..+2
      case "riseToHigh":      return 10 + rng() * 8;      // +10..+18
      case "highPlateau":     return (rng() - 0.5) * 2;   // -1..+1
      case "fallToRange":     return -(8 + rng() * 8);    // -8..-16
      case "fallToLow":       return -(10 + rng() * 8);   // -10..-18
      case "lowDip":          return (rng() - 0.5) * 2;   // -1..+1
      case "recoverToRange":  return 8 + rng() * 8;       // +8..+16
      default:                return 0;
    }
  };

  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

  // Generate the tick data and emit it
  const generateTick = () => {
    // time marches
    epochSec += virtualStepSec;

    // pick drift + tiny noise
    const baseDrift = driftFor(mode);
    const noise = (rng() - 0.5) * 3; // ±1.5 mg/dL
    mgdl = clamp(Math.round(mgdl + baseDrift + noise), 40, 350);

    // trend code derived from 5-min drift
    let trend: TrendCode = 1 as TrendCode; // flat
    if (baseDrift > 4) trend = 2 as TrendCode;  // up
    else if (baseDrift < -4) trend = 0 as TrendCode; // down

    // emit
    onEgvs(mgdl, trend, epochSec);

    // advance episode
    ticksLeft -= 1;
    if (ticksLeft <= 0) {
      mode = pickNextMode(mode);
      ticksLeft = 6 + Math.floor(rng() * 8); // 30–70 min
    }
  };

  // Generate the first data point immediately
  generateTick();

  // Then continue with regular interval
  timer = setInterval(generateTick, realTickMs);

  return { stop: stopEgvsSimulator };
}
