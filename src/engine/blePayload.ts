import { GameState } from './state';

const clamp = (n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

export function buildBlePayload(g: GameState, trendPer5Min: number){
  const mgdl = clamp(g.lastBg ?? 0, 0, 2047);
  const H0 = mgdl & 0xff; const H1 = (mgdl >> 8) & 0xff;
  const B = (trendPer5Min << 24) >> 24; // int8
  let I = 0;
  if (g.glucoseState === 'IN_RANGE') I |= 1<<0;
  if (g.glucoseState === 'LOW')      I |= 1<<1;
  if (g.glucoseState === 'HIGH')     I |= 1<<2;
  if (g.stale)                       I |= 1<<3; // STALE
  // bits 4..6 for event sprites can be set by UI if desired
  const map = (v:number)=> clamp(Math.round(((clamp(v,40,300)-40)/260)*255),0,255);
  const trail = g.trail.slice(-12);
  const pad = Array.from({length: 12 - trail.length}, ()=> map(g.lastBg ?? 100));
  const bytes = [...pad, ...trail.map(x=>map(x.mgdl))];
  return Uint8Array.from([H1, H0, (B & 0xff), I, ...bytes]);
}