// core/engine/npc.ts
import { GameState } from './state';
import { NPC_UNLOCKS } from './economy';

export function updateNpcUnlocksByLevel(g: GameState, level: number){
  g.npc.vendorUnlocked     = level >= NPC_UNLOCKS.vendor  || g.npc.vendorUnlocked;
  g.npc.healerUnlocked     = level >= NPC_UNLOCKS.healer  || g.npc.healerUnlocked;
  g.npc.builderUnlocked    = level >= NPC_UNLOCKS.builder || g.npc.builderUnlocked;
  g.npc.travelersUnlocked  = level >= NPC_UNLOCKS.travelers || g.npc.travelersUnlocked;
}

// (optional) keep a backward-compatible wrapper using g.level
export function updateNpcUnlocks(g: GameState){
  return updateNpcUnlocksByLevel(g, g.level);
}
