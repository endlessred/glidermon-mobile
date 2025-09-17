// core/engine/scoring.ts
import { GameState, LastEvent } from './state';
import { BOUNDS, REWARDS, DAILY_STALE_MS } from './economy';

const nowMs = ()=>Date.now();

export type TickInput = {
  mgdl: number;
  trendPer5Min: number;
  tsMs?: number;
  low?: number; high?: number; softLow?: number; softHigh?: number; target?: number;
  award?: boolean; // NEW: default false in app
};

export function applyEgvsTick(g: GameState, t: TickInput){
  const low = t.low ?? BOUNDS.LOW, high = t.high ?? BOUNDS.HIGH;
  const softLow = t.softLow ?? BOUNDS.SOFT_LOW, softHigh = t.softHigh ?? BOUNDS.SOFT_HIGH;
  const target = t.target ?? BOUNDS.TARGET;
  const ts = t.tsMs ?? nowMs();
  const doAward = t.award ?? false; // ← default off in app

  g.stale = false; g.lastTickMs = ts;

  let gs: GameState['glucoseState'] = 'IN_RANGE';
  if (t.mgdl <= low) gs = 'LOW'; else if (t.mgdl >= high) gs = 'HIGH';
  const prevGs = g.glucoseState;
  g.glucoseState = gs;

  let event: LastEvent;
  if (t.mgdl === target) event = 'UNICORN';
  else if (gs === 'LOW'  && prevGs !== 'LOW')  event = 'FIRST_LOW';
  else if (gs === 'HIGH' && prevGs !== 'HIGH') event = 'FIRST_HIGH';
  else if (gs === 'IN_RANGE' && (prevGs === 'LOW' || prevGs === 'HIGH')) event = 'RECOVER';

  // ----- scoring “delta” remains computed for telemetry/toasts
  let delta = 0;
  if (gs === 'IN_RANGE') {
    delta += REWARDS.baseInRange;
    if (t.mgdl >= softLow && t.mgdl <= softHigh) delta += REWARDS.softBonus;
    const deviationBonus = Math.max(0, 5 - Math.abs(t.mgdl - target) / 10);
    delta += Math.floor(deviationBonus);
    g.streak += 1;
    if (g.streak > 0 && g.streak % 6 === 0) {
      delta += REWARDS.streakBonusPer30Min;
      g.buffs.focusUntil = ts + 30*60*1000;
    }
    g.tirSamplesToday.inRange++;
  } else {
    g.streak = 0;
  }
  g.tirSamplesToday.total++;

  if (event === 'UNICORN') { delta += REWARDS.unicornBonus; g.unicornsToday++; }
  if (g.buffs.focusUntil && g.buffs.focusUntil > ts) delta += REWARDS.focusPassivePerTick;

  // 🚫 Do NOT mutate points/xp/level unless doAward=true (device could use it)
  if (doAward) {
    g.points = Math.max(0, g.points + delta);
    const xpBefore = g.xp;
    g.xp = Math.floor(g.points / 100);
    const levelsGained = (g.xp > xpBefore) ? Math.max(0, g.xp - xpBefore) : 0;
    if (levelsGained > 0) g.level += levelsGained;
  }

  g.lastBg = t.mgdl;
  g.trail = [...g.trail, { ts, mgdl: t.mgdl }].slice(-12);

  return { event, delta };
}

export function checkStale(g: GameState, atMs = nowMs()){
  if (!g.lastTickMs) return true;
  const stale = (atMs - g.lastTickMs) >= DAILY_STALE_MS;
  g.stale = stale;
  if (stale && !g.staleSinceMs) g.staleSinceMs = atMs;
  if (!stale) g.staleSinceMs = undefined;
  return stale;
}
