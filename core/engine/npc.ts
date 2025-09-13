import { GameState } from './state';
import { NPC_UNLOCKS } from './economy';

export function updateNpcUnlocks(g: GameState){
  if (g.level >= NPC_UNLOCKS.vendor) g.npc.vendorUnlocked = true;
  if (g.level >= NPC_UNLOCKS.healer) g.npc.healerUnlocked = true;
  if (g.level >= NPC_UNLOCKS.builder) g.npc.builderUnlocked = true;
  if (g.level >= NPC_UNLOCKS.travelers) g.npc.travelersUnlocked = true;
}

export type StoryAdvance =
  | { npc: 'vendor', flag: 'vendor_supplyRun_done', unlockedCosmetic?: string }
  | { npc: 'healer', flag: 'healer_trial_done', unlockedCosmetic?: string }
  | { npc: 'builder', flag: 'builder_sky_done', unlockedCosmetic?: string };

export function completeStoryFlag(g: GameState, adv: StoryAdvance){
  g.npc[adv.flag] = true as any;
  if (adv.unlockedCosmetic) g.inventory.cosmeticsOwned[adv.unlockedCosmetic] = true;
}
