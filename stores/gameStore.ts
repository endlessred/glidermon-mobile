import { create } from "zustand";
import {
  defaultState, type GameState,
  applyEgvsTick, updateNpcUnlocks, checkStale
} from "../core/engine"; // adjust path!

type UIState = {
  focusedNpc?: "vendor" | "healer" | "builder";
  toasts: { id: string; text: string; ts: number }[];
};

type GameStore = {
  engine: GameState;
  ui: UIState;
  enqueueToast: (text: string) => void;
  clearOldToasts: () => void;
  onEgvs: (mgdl: number, trendCode: number, epochSec: number) => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  engine: defaultState,
  ui: { toasts: [] },
  enqueueToast: (text) =>
    set((s) => ({
      ui: { ...s.ui, toasts: [...s.ui.toasts, { id: Math.random().toString(36).slice(2), text, ts: Date.now() }] }
    })),
  clearOldToasts: () =>
    set((s) => ({
      ui: { ...s.ui, toasts: s.ui.toasts.filter(t => Date.now() - t.ts < 2500) }
    })),
  onEgvs: (mgdl, trendCode, epochSec) => {
    const s = get().engine;
    const { event } = applyEgvsTick(s, {
      mgdl,
      trendPer5Min: trendCode === 2 ? +2 : trendCode === 0 ? -2 : 0,
      tsMs: epochSec * 1000
    });
    updateNpcUnlocks(s);
    checkStale(s, Date.now());
    set({ engine: { ...s } });

    if (event === "UNICORN") get().enqueueToast("🦄 Unicorn!");
    if (event === "RECOVER") get().enqueueToast("✅ Recovered");
  },
}));
