import { GameState, LastEvent } from './state';
import { BOUNDS, REWARDS, DAILY_STALE_MS } from './economy';

const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const nowMs = ()=>Date.now();

export type TickInput = {
  mgdl: number;
  trendPer5Min: number; // optional, for sprite/trail; not used in scoring formula here
  tsMs?: number;        // when reading occurred (ms); default Date.now()
  low?: number; high?: number; softLow?: number; softHigh?: number; target?: number;
};

export function applyEgvsTick(g: GameState, t: TickInput){
  const low = t.low ?? BOUNDS.LOW, high = t.high ?? BOUNDS.HIGH;
  const softLow = t.softLow ?? BOUNDS.SOFT_LOW, softHigh = t.softHigh ?? BOUNDS.SOFT_HIGH;
  const target = t.target ?? BOUNDS.TARGET;
  const ts = t.tsMs ?? nowMs();

  // freshness
  g.stale = false; g.lastTickMs = ts;

  // state
  let gs: GameState['glucoseState'] = 'IN_RANGE';
  if (t.mgdl <= low) gs = 'LOW'; else if (t.mgdl >= high) gs = 'HIGH';
  const prevGs = g.glucoseState;
  g.glucoseState = gs;

  // events
  let event: LastEvent;
  if (t.mgdl === target) event = 'UNICORN';
  else if (gs === 'LOW' && prevGs !== 'LOW') event = 'FIRST_LOW';
  else if (gs === 'HIGH' && prevGs !== 'HIGH') event = 'FIRST_HIGH';
  else if (gs === 'IN_RANGE' && (prevGs === 'LOW' || prevGs === 'HIGH')) event = 'RECOVER';

  // scoring
  let delta = 0;
  if (gs === 'IN_RANGE') {
    delta += REWARDS.baseInRange;
    if (t.mgdl >= softLow && t.mgdl <= softHigh) delta += REWARDS.softBonus;
    const deviationBonus = Math.max(0, 5 - Math.abs(t.mgdl - target) / 10);
    delta += Math.floor(deviationBonus);
    g.streak += 1;
    // every ~30 min (6 ticks)
    if (g.streak > 0 && g.streak % 6 === 0) {
      delta += REWARDS.streakBonusPer30Min;
      // Focus buff: 30 min
      g.buffs.focusUntil = ts + 30*60*1000;
    }
    g.tirSamplesToday.inRange++;
  } else {
    // small penalties if you later choose to display net delta (optional)
    g.streak = 0;
  }
  g.tirSamplesToday.total++;

  if (event === 'UNICORN') { delta += REWARDS.unicornBonus; g.unicornsToday++; }
  // passive focus
  if (g.buffs.focusUntil && g.buffs.focusUntil > ts) delta += REWARDS.focusPassivePerTick;

  // finalize
  g.points = Math.max(0, g.points + delta);
  // XP from points (1 XP per 100 pts)
  const xpBefore = g.xp;
  g.xp = Math.floor(g.points / 100);
  const levelsGained = (g.xp > xpBefore) ? Math.max(0, g.xp - xpBefore) : 0;
  if (levelsGained > 0) g.level += levelsGained;

  g.lastBg = t.mgdl;

  // trail maintenance (last 12 samples)
  const p = { ts, mgdl: t.mgdl };
  g.trail = [...g.trail, p].slice(-12);

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
