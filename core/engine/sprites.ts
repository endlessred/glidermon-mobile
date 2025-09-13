import { GameState, LastEvent } from './state';

export function pickSprite(g: GameState, lastEvent?: LastEvent){
  if (lastEvent === 'UNICORN') return 'unicorn';
  if (lastEvent === 'FIRST_LOW') return 'sad';
  if (lastEvent === 'FIRST_HIGH') return 'sweaty';
  // trend-based placeholder; you can pass trend to refine this
  return 'base';
}