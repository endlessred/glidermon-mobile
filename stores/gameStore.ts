// stores/gameStore.ts
import { create } from "zustand";
import {
  defaultState, type GameState,
  applyEgvsTick, updateNpcUnlocks, checkStale
} from "../core/engine";

type TrendCode = 0 | 1 | 2 | 3;
type HudPoint = { ts: number; mgdl: number };

type UIState = {
  focusedNpc?: "vendor" | "healer" | "builder";
  toasts: { id: string; text: string; ts: number }[];
};

type HudState = {
  currentMgdl: number | null;
  currentTrendCode: TrendCode | null;
  history: HudPoint[]; // oldest-first
};

type GameStore = {
  engine: GameState;
  ui: UIState;
  hud: HudState;
  enqueueToast: (text: string) => void;
  clearOldToasts: () => void;
  onEgvs: (mgdl: number, trendCode: number, epochSec: number) => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  engine: defaultState,
  ui: { toasts: [] },
  hud: { currentMgdl: null, currentTrendCode: null, history: [] },

  enqueueToast: (text) =>
    set((s) => ({
      ui: {
        ...s.ui,
        toasts: [
          ...s.ui.toasts,
          { id: Math.random().toString(36).slice(2), text, ts: Date.now() },
        ],
      },
    })), // <-- RETURNS a partial state

  clearOldToasts: () =>
    set((s) => {
      const filtered = s.ui.toasts.filter((t) => Date.now() - t.ts < 2500);
      if (filtered.length === s.ui.toasts.length) {
        return s; // <-- RETURNS (no change) OK to return the same state
      }
      return { ui: { ...s.ui, toasts: filtered } }; // <-- RETURNS partial
    }),

  onEgvs: (mgdl, trendCode, epochSec) => {
    // Advance engine
    const engine = get().engine;
    const { event } = applyEgvsTick(engine, {
      mgdl,
      trendPer5Min: trendCode === 2 ? +2 : trendCode === 0 ? -2 : 0,
      tsMs: epochSec * 1000,
    });
    updateNpcUnlocks(engine);
    checkStale(engine, Date.now());

    // Update HUD slice + engine
    set((state) => {
      const nextHist =
        state.hud.history.length >= 360
          ? [...state.hud.history.slice(1), { ts: epochSec * 1000, mgdl }]
          : [...state.hud.history, { ts: epochSec * 1000, mgdl }];

      return {
        engine: { ...engine }, // <-- RETURNS partial
        hud: {
          currentMgdl: mgdl,
          currentTrendCode: (trendCode as TrendCode) ?? null,
          history: nextHist,
        },
      };
    });

    if (event === "UNICORN") get().enqueueToast("🦄 Unicorn!");
    if (event === "RECOVER") get().enqueueToast("✅ Recovered");
  },
}));
