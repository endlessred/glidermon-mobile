import { GameState, LastEvent } from './state';

export function pickSprite(g: GameState, lastEvent?: LastEvent){
  if (lastEvent === 'UNICORN') return 'unicorn';
  if (lastEvent === 'FIRST_LOW') return 'sad';
  if (lastEvent === 'FIRST_HIGH') return 'sweaty';
  // trend-based placeholder; you can pass trend to refine this
  return 'base';
}

export function pickBehaviorTag(lastEvent?: LastEvent, gs?: 'IN_RANGE'|'LOW'|'HIGH'): string {
  if (lastEvent === 'UNICORN')   return 'unicornFlash';
  if (lastEvent === 'FIRST_LOW') return 'sadLow';
  if (lastEvent === 'FIRST_HIGH')return 'sweatyHigh';
  if (gs === 'LOW')  return 'sadLow';
  if (gs === 'HIGH') return 'sweatyHigh';
  return 'inRangeIdle';
}