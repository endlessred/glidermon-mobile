import { GameState } from './state';

export function needsDailyReset(g: GameState, today: string){ return g.today !== today; }
export function needsWeeklyReset(g: GameState, weekOf: string){ return g.weekOf !== weekOf; }

export function applyDailyReset(g: GameState, today: string){
  g.today = today;
  g.unicornsToday = 0;
  g.tirSamplesToday = { inRange: 0, total: 0 };
  // daily chest availability can be flagged here if you add that
  return g;
}

export function applyWeeklyReset(g: GameState, weekOf: string){
  g.weekOf = weekOf;
  // reset weekly challenges progress here (add fields as needed)
  return g;
}
