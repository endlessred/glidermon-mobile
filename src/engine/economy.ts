export const BOUNDS = { LOW: 70, HIGH: 180, SOFT_LOW: 90, SOFT_HIGH: 140, TARGET: 100 };

export function xpNeededFor(level: number){
  // XP_needed = 20 + 20*(level-1) + (level-1)^2
  const n = level - 1;
  return 20 + 20*n + n*n;
}

export const REWARDS = {
  baseInRange: 10,
  softBonus: 5,
  unicornBonus: 10,
  streakBonusPer30Min: 20,
  focusPassivePerTick: 1,
  dailyChestPointsMin: 50,
  dailyChestPointsMax: 100,
};

export const NPC_UNLOCKS = {
  vendor: 5,
  healer: 10,
  builder: 15,
  travelers: 20,
};

export const FRAGMENT_COSTS = { wizard_hat: 3 }; // example

export const DAILY_STALE_MS = 15 * 60 * 1000;
export const TRAIL_MAX = 12; // last 60 mins (5-min ticks)
