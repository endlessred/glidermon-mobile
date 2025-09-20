// stores/gameStore.ts
import { create } from "zustand";
import { useProgressionStore, TrendCode } from "./progressionStore";
import { applyEgvsTick } from "../../engine/scoring";

// Minimal engine shape that satisfies scoring.ts reads
type Engine = {
  stale: boolean;
  staleSinceMs?: number;
  lastTickMs?: number;
  glucoseState: "IN_RANGE" | "LOW" | "HIGH";
  trail: Array<{ ts: number; mgdl: number }>;
  lastBg?: number;

  // scoring.ts reads these:
  points: number;
  xp: number;
  level: number;
  streak: number;
  buffs: { focusUntil: number | null };
  tirSamplesToday: { inRange: number; total: number };
  unicornsToday: number;

  // optional last event bookkeeping
  lastEvent?: string;
  lastDelta?: number;
};

const makeDefaultEngine = (): Engine => ({
  stale: false,
  staleSinceMs: undefined,
  lastTickMs: undefined,
  glucoseState: "IN_RANGE",
  trail: [],
  lastBg: undefined,

  points: 0,
  xp: 0,
  level: 1,
  streak: 0,
  buffs: { focusUntil: null },
  tirSamplesToday: { inRange: 0, total: 0 },
  unicornsToday: 0,
});

type GameStore = {
  engine: Engine;
  setEngine: (g: Partial<Engine> | Engine) => void;

  /** Primary entrypoint for ticks from simulator/Dexcom. */
  onEgvs: (mgdl: number, trendCode: TrendCode, epochSec: number) => void;

  /** Re-sync engine’s level/xp/points to match progression store. */
  syncProgressionToEngine: () => void;

  lastDelta?: number;
  lastEvent?: string;
};

export const useGameStore = create<GameStore>((set, get) => ({
  engine: makeDefaultEngine(),

  setEngine: (g) => {
    const cur = get().engine ?? makeDefaultEngine();
    const next = ("trail" in g || "points" in g || "xp" in g || "level" in g)
      ? { ...cur, ...(g as Engine) }
      : { ...cur, ...(g as Partial<Engine>) };
    set({ engine: next });
  },

  onEgvs: (mgdl, trendCode, epochSec) => {
    // 1) Award via progression (currency/xp/levels + overlays)
    useProgressionStore.getState().onEgvsTick(mgdl, trendCode, epochSec);

    // 2) Maintain engine state for HUD/FX (no double awards)
    const eng = get().engine ?? makeDefaultEngine();

    const { delta, event } = applyEgvsTick(eng as any, {
      mgdl,
      trendPer5Min: trendCode,
      tsMs: epochSec * 1000,
      award: false, // <<< critical
    });

    // scoring mutates eng internally; we also ensure a trail with 1-hour rolling window
    if (!Array.isArray(eng.trail)) eng.trail = [];
    const now = epochSec * 1000; // Current timestamp in milliseconds
    const oneHourAgo = now - (60 * 60 * 1000); // 1 hour ago

    // Add new reading and filter to keep only last hour of data
    eng.trail = [...eng.trail, { ts: now, mgdl }]
      .filter(reading => reading.ts > oneHourAgo);

    set({ engine: eng, lastDelta: delta, lastEvent: event });
  },

  /** Map progression → engine so HUD/scoring have consistent numbers. */
  syncProgressionToEngine: () => {
    const p = useProgressionStore.getState();
    const eng = get().engine ?? makeDefaultEngine();

    // scoring’s xp/points relation: in scoring, xp = floor(points/100).
    // We’ll mirror progression.xpTotal to engine.xp, and pick a points that matches.
    const xp = Math.max(0, Math.floor(p.xpTotal));
    const points = xp * 100;

    const patched: Engine = {
      ...eng,
      level: p.level,
      xp,
      points,
      // keep trail and other runtime fields as-is
    };

    set({ engine: patched });
  },
}));
