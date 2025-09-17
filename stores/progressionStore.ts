import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---- Tunables (safe to tweak) ----
const CFG = {
  perMin: {
    inFlat: 10,    // in-range & flat/slight
    inGentle: 7,   // in-range & gentle up/down
    out: 2,        // out-of-range floor (never 0)
  },
  dailyCap: 3000,            // max Acorns to wallet per day (XP ignores the cap)
  stableWindowMin: 20,       // minutes needed for "stable" bounty
  stableWindowsPerDay: 3,    // max times per day you can claim that bounty
  bounty: {
    stable20: 300,
    recoverHigh: 350,
    recoverLow: 400,
  },
  level: {
    base: 100,    // XP to go 1->2
    growth: 1.5,  // XP_N = base * N^growth
  }
};

// Bounds helper: use settings if present, else defaults.
function getBounds(): { low: number; high: number } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const st = require("./settingsStore").useSettingsStore;
    const low = st.getState()?.bounds?.low ?? st.getState()?.lowBound ?? st.getState()?.low ?? 70;
    const high = st.getState()?.bounds?.high ?? st.getState()?.highBound ?? st.getState()?.high ?? 180;
    return { low, high };
  } catch {
    return { low: 70, high: 180 };
  }
}

// Trend mapping (Dexcom-ish): 0 down, 1 flat, 2 up, 3 unknown
type TrendCode = 0 | 1 | 2 | 3;
type Bucket = "LOW" | "IN" | "HIGH";

function bucketOf(mgdl: number | null, low: number, high: number): Bucket {
  if (mgdl == null) return "IN";
  if (mgdl < low) return "LOW";
  if (mgdl > high) return "HIGH";
  return "IN";
}
function isFlat(trend: TrendCode) { return trend === 1; }
function isGentle(trend: TrendCode) { return trend === 0 || trend === 2 || trend === 3; }

// XP math
function xpForLevelUp(level: number) {
  // XP needed to go level -> level+1
  return Math.round(CFG.level.base * Math.pow(level, CFG.level.growth));
}
function applyLeveling(lifetimeXp: number, startLevel: number) {
  let lvl = Math.max(1, startLevel);
  let xpLeft = lifetimeXp;
  // compute cumulative threshold by subtracting step costs downward
  let needed = xpForLevelUp(lvl);
  // If you want large XP, this loop is fine (levels are small numbers)
  while (xpLeft >= needed) {
    xpLeft -= needed;
    lvl += 1;
    needed = xpForLevelUp(lvl);
  }
  // xpIntoCurrent = what's left toward the next level
  const xpIntoCurrent = xpForLevelUp(lvl) - needed + xpLeft; // normalize
  const nextReq = needed;
  return { level: lvl, nextReq, xpIntoCurrent };
}

export type ProgressionState = {
  // Wallet & XP
  acorns: number;          // spendable
  lifetimeXp: number;      // never spent
  level: number;
  nextXp: number;          // XP needed to reach next level from current
  xpIntoCurrent: number;   // progress bar helper

  // Day & caps
  dailyEarned: number;     // acorns earned today (subject to cap)
  dailyCap: number;        // exposed so UI can show it
  restedBank: number;      // overflow saved for future days
  lastResetDay: string;    // YYYY-MM-DD local

  // Bounties & streaks
  stableStreakMin: number;
  stableWindowsAwarded: number; // today
  inHighEpisode: boolean;
  inLowEpisode: boolean;

  // Tick bookkeeping
  lastTickMs: number | null; // for elapsed minutes scaling
  lastBucket: Bucket | null;

  // API
  onEgvs: (mgdl: number, trend: TrendCode, tsMs: number) => void;
  spend: (amount: number) => boolean;
  addAcorns: (amount: number, reason?: string) => void; // admin/additive
  resetDailyIfNeeded: (now: Date) => void;
  resetProgression: () => void; 
};

function todayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const capForLevel = (level: number) => {
  if (level < 5) return 1500;
  if (level < 10) return 2500;
  return 3000;
};

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set, get) => ({
      acorns: 0,
      lifetimeXp: 0,
      level: 1,
      nextXp: xpForLevelUp(1),
      xpIntoCurrent: 0,

      dailyEarned: 0,
      dailyCap: CFG.dailyCap,
      restedBank: 0,
      lastResetDay: todayKey(new Date()),

      stableStreakMin: 0,
      stableWindowsAwarded: 0,
      inHighEpisode: false,
      inLowEpisode: false,

      lastTickMs: null,
      lastBucket: null,
      resetProgression: () => {
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  set({
    acorns: 0,
    lifetimeXp: 0,
    level: 1,
    nextXp: xpForLevelUp(1),
    xpIntoCurrent: 0,
    dailyEarned: 0,
    restedBank: 0,
    lastResetDay: dayKey,
    stableStreakMin: 0,
    stableWindowsAwarded: 0,
    inHighEpisode: false,
    inLowEpisode: false,
  });
},

      resetDailyIfNeeded: (now: Date) => {
        const k = todayKey(now);
        if (get().lastResetDay !== k) {
          set({
            dailyEarned: 0,
            stableStreakMin: 0,
            stableWindowsAwarded: 0,
            lastResetDay: k,
            dailyCap: capForLevel(get().level),
            // drip a bit of rested into wallet at reset (optional)
            // acorns: get().acorns + Math.min(500, get().restedBank),
            // restedBank: Math.max(0, get().restedBank - Math.min(500, get().restedBank)),
          });
        }
      },

      onEgvs: (mgdl, trend, tsMs) => {
        const now = new Date(tsMs);
        get().resetDailyIfNeeded(now);

        const { low, high } = getBounds();
        const bucket = bucketOf(mgdl, low, high);

        // elapsed minutes since last tick (scale awards)
        const last = get().lastTickMs ?? tsMs;
        const mins = Math.max(0, Math.min(10, Math.round((tsMs - last) / 60000))) || 1; // default 1

        // per-minute earn
        let perMin = CFG.perMin.out;
        if (bucket === "IN") perMin = isFlat(trend) ? CFG.perMin.inFlat : CFG.perMin.inGentle;

        const rawEarn = perMin * mins;

        // wallet subject to daily cap; XP earns full amount
        const left = Math.max(0, get().dailyCap - get().dailyEarned);
        const toWallet = Math.min(rawEarn, left);
        const overflow = rawEarn - toWallet;

        // bounties
        let bounty = 0;
        // stable streak counting only when in-range & flat/gentle
        if (bucket === "IN" && (isFlat(trend) || isGentle(trend))) {
          const newStreak = get().stableStreakMin + mins;
          if (newStreak >= CFG.stableWindowMin && get().stableWindowsAwarded < CFG.stableWindowsPerDay) {
            bounty += CFG.bounty.stable20;
            set({
              stableStreakMin: 0,
              stableWindowsAwarded: get().stableWindowsAwarded + 1,
            });
          } else {
            set({ stableStreakMin: newStreak });
          }
        } else {
          set({ stableStreakMin: 0 });
        }

        // recover from episodes
        const wasHigh = get().inHighEpisode;
        const wasLow = get().inLowEpisode;

        if (bucket === "HIGH") set({ inHighEpisode: true });
        if (bucket === "LOW") set({ inLowEpisode: true });

        if (bucket === "IN") {
          if (wasHigh) { bounty += CFG.bounty.recoverHigh; set({ inHighEpisode: false }); }
          if (wasLow)  { bounty += CFG.bounty.recoverLow;  set({ inLowEpisode: false }); }
        }

        // final wallet increments
        const walletGain = toWallet + bounty;
        const restedGain = overflow; // overflow only, not bounties

        const newAcorns = get().acorns + walletGain;
        const newDaily = get().dailyEarned + toWallet;
        const newRested = get().restedBank + restedGain;

        // XP grows by full rawEarn + bounties (no cap)
        const newXp = get().lifetimeXp + rawEarn + bounty;
        const lvl = applyLeveling(newXp, get().level);

        set({
          acorns: newAcorns,
          dailyEarned: Math.min(get().dailyCap, newDaily),
          restedBank: newRested,
          lifetimeXp: newXp,
          level: lvl.level,
          nextXp: lvl.nextReq,
          xpIntoCurrent: lvl.xpIntoCurrent,
          dailyCap: capForLevel(lvl.level),
          lastTickMs: tsMs,
          lastBucket: bucket,
        });
      },

      spend: (amount) => {
        if (amount <= 0) return true;
        const have = get().acorns;
        if (have < amount) return false;
        set({ acorns: have - amount });
        return true;
      },

      addAcorns: (amount) => {
        if (!amount) return;
        const newA = get().acorns + Math.max(0, amount);
        set({ acorns: newA });
      },
    }),
    {
      name: "progression-v1",
      // persist the important bits only
      partialize: (s) => ({
        acorns: s.acorns,
        lifetimeXp: s.lifetimeXp,
        level: s.level,
        nextXp: s.nextXp,
        xpIntoCurrent: s.xpIntoCurrent,
        dailyEarned: s.dailyEarned,
        restedBank: s.restedBank,
        lastResetDay: s.lastResetDay,
        stableWindowsAwarded: s.stableWindowsAwarded,
      }),
    }
  )
);
