// stores/progressionStore.ts
import { Platform } from "react-native";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLevelUpStore } from "./levelUpStore";

/** Trend codes aligned with your pipeline (0=down,1=flat,2=up,3=uncertain) */
export type TrendCode = 0 | 1 | 2 | 3;

type ProgressionState = {
  // currency & leveling
  acorns: number;
  level: number;
  xpIntoCurrent: number; // progress within current level
  nextXp: number;        // XP needed to go to next level
  xpTotal: number;       // lifetime XP (canonical)
  /** Back-compat for older code */
  lifetimeXp: number;

  // daily economy
  dailyEarned: number;
  dailyCap: number;
  restedBank: number;
  lastResetDay: string; // YYYY-MM-DD

  // hydration status
  _rehydrated: boolean;

  // actions
  spend: (cost: number) => boolean;
  grantAcorns: (n: number) => void; // not capped
  resetDailyIfNeeded: () => void;
  resetProgression: () => void;

  // core tick
  onEgvsTick: (mgdl: number, trend: TrendCode, epochSec: number) => void;
};

// -------------------- Tunables --------------------
const DAILY_CAP_DEFAULT = 2400;
const BASE_ACORNS_IN_RANGE = 10;
const BASE_ACORNS_GENTLE   = 7;
const BASE_ACORNS_FLOOR    = 2;
const XP_PER_ACORN_TICK = 1;
const ACORNS_PER_LEVEL = 50;
const LOW_MGDL = 70;
const HIGH_MGDL = 180;

// Persisted schema version — bump if you change shapes
const STORE_VERSION = 1;

const xpNeededForLevel = (lvl: number) => {
  if (lvl <= 1) return 100;
  return Math.round(100 + (lvl - 1) * 55 * 1.0);
};
const ymd = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function consumeXpIntoLevels(startLevel: number, startCarryXp: number) {
  let lvl = startLevel, carry = startCarryXp, leveled = 0;
  while (carry >= xpNeededForLevel(lvl)) {
    carry -= xpNeededForLevel(lvl);
    lvl += 1;
    leveled += 1;
  }
  return { level: lvl, xpOverflow: carry, leveled };
}
function calcTickAcorns(mgdl: number, trend: TrendCode): number {
  const inRange = mgdl >= LOW_MGDL && mgdl <= HIGH_MGDL;
  if (!inRange) return BASE_ACORNS_FLOOR;
  if (trend === 1) return BASE_ACORNS_IN_RANGE;               // flat
  if (trend === 0 || trend === 2) return BASE_ACORNS_GENTLE;  // gentle down/up
  return BASE_ACORNS_GENTLE;
}

// Choose platform storage
const storage = createJSONStorage(() =>
  Platform.OS === "web" ? {
    getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key))
  } : AsyncStorage
);

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set, get) => ({
      // -------- initial --------
      acorns: 0,
      level: 1,
      xpIntoCurrent: 0,
      nextXp: xpNeededForLevel(1),
      xpTotal: 0,
      lifetimeXp: 0,

      dailyEarned: 0,
      dailyCap: DAILY_CAP_DEFAULT,
      restedBank: 0,
      lastResetDay: ymd(),

      _rehydrated: false,

      // -------- actions --------
      spend: (cost: number) => {
        const s = get();
        if (cost <= 0) return true;
        if (s.acorns < cost) return false;
        set({ acorns: s.acorns - cost });
        return true;
      },

      grantAcorns: (n: number) => {
        if (!n) return;
        set((s) => ({ acorns: s.acorns + Math.max(0, n) }));
      },

      resetDailyIfNeeded: () => {
        const today = ymd();
        const s = get();
        if (s.lastResetDay !== today) {
          set({ dailyEarned: 0, lastResetDay: today });
        }
      },

      resetProgression: () => {
        set({
          acorns: 0,
          level: 1,
          xpIntoCurrent: 0,
          nextXp: xpNeededForLevel(1),
          xpTotal: 0,
          lifetimeXp: 0,
          dailyEarned: 0,
          dailyCap: DAILY_CAP_DEFAULT,
          restedBank: 0,
          lastResetDay: ymd(),
        });
      },

      onEgvsTick: (mgdl, trend, _epochSec) => {
        get().resetDailyIfNeeded();

        const s0 = get();
        const tickAcorns = calcTickAcorns(mgdl, trend);

        // daily cap application for CURRENCY
        const remainingCap = Math.max(0, s0.dailyCap - s0.dailyEarned);
        const earnNow = Math.min(remainingCap, tickAcorns);
        const overflow = Math.max(0, tickAcorns - earnNow);

        const newAcorns = s0.acorns + earnNow;
        const newDaily  = s0.dailyEarned + earnNow;
        const newRested = s0.restedBank + overflow;

        // XP continues even when currency hits cap
        const xpFromTick = tickAcorns * XP_PER_ACORN_TICK;
        const prevLevel = s0.level;
        const carry = s0.xpIntoCurrent + xpFromTick;
        const rolled = consumeXpIntoLevels(prevLevel, carry);

        const nextLevel = rolled.level;
        const nextInto  = rolled.xpOverflow;
        const leveledCount = rolled.leveled;

        let acornsFromLevels = 0;
        if (leveledCount > 0) {
          useLevelUpStore.getState().enqueueRange(prevLevel, nextLevel, () => ({ acorns: ACORNS_PER_LEVEL }));
          acornsFromLevels = leveledCount * ACORNS_PER_LEVEL; // immediate reward
        }

        const newTotalXp = s0.xpTotal + xpFromTick;

        set({
          acorns: newAcorns + acornsFromLevels,
          level: nextLevel,
          xpIntoCurrent: nextInto,
          nextXp: xpNeededForLevel(nextLevel),
          xpTotal: newTotalXp,
          lifetimeXp: newTotalXp, // keep alias in sync
          dailyEarned: newDaily,
          restedBank: newRested,
        });
      },
    }),
    {
      name: "glidermon/progression-v1",
      version: STORE_VERSION,
      storage,
      // Only persist actual progression data; computed helpers can recompute
      partialize: (s) => ({
        acorns: s.acorns,
        level: s.level,
        xpIntoCurrent: s.xpIntoCurrent,
        nextXp: s.nextXp,
        xpTotal: s.xpTotal,
        lifetimeXp: s.lifetimeXp,
        dailyEarned: s.dailyEarned,
        dailyCap: s.dailyCap,
        restedBank: s.restedBank,
        lastResetDay: s.lastResetDay,
      }),
      // Example migration scaffold
      migrate: (persisted: any, fromVersion) => {
        let out = { ...persisted };
        if (fromVersion < 1) {
          // ensure lifetimeXp mirrors xpTotal
          out.lifetimeXp = out.xpTotal ?? 0;
        }
        return out;
      },
      onRehydrateStorage: () => (_state, error) => {
  if (error) {
    console.warn("[progression] rehydrate error:", error);
    return;
  }
  // Use the store's setter here (not the local `set` from the creator scope)
  // This runs after storage has been read.
  try {
    useProgressionStore.setState((s) => ({
      _rehydrated: true,
      nextXp: xpNeededForLevel(s.level || 1),
      lifetimeXp: s.xpTotal ?? 0,
    }));
  } catch (e) {
    console.warn("[progression] post-rehydrate patch error:", e);
  }
},
    }
  )
);
