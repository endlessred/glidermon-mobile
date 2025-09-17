// stores/gameStore.ts
import { create } from "zustand";
import {
  defaultState, type GameState,
  applyEgvsTick, updateNpcUnlocks, checkStale, updateNpcUnlocksByLevel, needsDailyReset, applyDailyReset, needsWeeklyReset, applyWeeklyReset
} from "../core/engine";
import { useProgressionStore } from "./progressionStore"; // ← add

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
  syncProgressionToEngine: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  engine: defaultState,
  ui: { toasts: [] },

  syncProgressionToEngine: () => {
  const s = get().engine;
  const prog = require("./progressionStore").useProgressionStore.getState();
  s.points = prog.acorns;
  s.level  = prog.level;
  (s as any).xp = prog.lifetimeXp;
  // keep NPC unlocks in sync with level
  const { updateNpcUnlocksByLevel } = require("../core/engine/npc");
  updateNpcUnlocksByLevel(s, prog.level);
  set({ engine: { ...s } });
},

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
  

  // Engine tick without awarding
  const { event } = applyEgvsTick(s, {
    mgdl,
    trendPer5Min: trendCode === 2 ? +2 : trendCode === 0 ? -2 : 0,
    tsMs: epochSec * 1000,
    award: false,
  });

  // Progression earn (single source of truth)
  useProgressionStore.getState().onEgvs(mgdl, (trendCode as any) ?? 1, epochSec * 1000);

  // Resets (engine keys)
  const d = new Date(epochSec * 1000);
  const dayKey  = d.toISOString().slice(0,10);
  const weekKey = d.toISOString().slice(0,7) + "-W";
  if (needsDailyReset(s, dayKey))  applyDailyReset(s, dayKey);
  if (needsWeeklyReset(s, weekKey)) applyWeeklyReset(s, weekKey);

  // Mirror progression → engine for legacy UI
  const prog = useProgressionStore.getState();
  s.points = prog.acorns;
  s.level  = prog.level;
  (s as any).xp = prog.lifetimeXp;

  updateNpcUnlocksByLevel(s, prog.level);
  checkStale(s, Date.now());
  set({ engine: { ...s, /* maybe stash lastEvent if you want */ } });

  if (event === "UNICORN") get().enqueueToast("🦄 Unicorn!");
  if (event === "RECOVER") get().enqueueToast("✅ Recovered");
},
}));
