// Which floor tiles Glidermon is free to wander to -- every grid tile for
// the current room tier minus whatever's covered by an occupied floor-kind
// slot (including multi-tile footprints like the bed). Wall-kind slots don't
// occupy a floor tile so they're not excluded here.
import { getSlotsForTier } from '../types/roomSlots';
import { ROOM_SIZE_TIERS } from '../../../data/stores/housingStore';
import type { GridTile } from '../../../data/stores/housingStore';

export function getWalkableTiles(
  roomSizeTier: number,
  activeFurnitureBySlot: Record<string, { furnitureId: string; variantId: string }>
): GridTile[] {
  const dims = ROOM_SIZE_TIERS[roomSizeTier] ?? ROOM_SIZE_TIERS[0];
  const occupied = new Set<string>();
  for (const slot of getSlotsForTier(roomSizeTier)) {
    if (slot.kind !== 'floor') continue;
    if (!activeFurnitureBySlot[slot.slotId]) continue;
    const w = slot.footprint?.w ?? 1;
    const h = slot.footprint?.h ?? 1;
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        occupied.add(`${slot.row + dr},${slot.col + dc}`);
      }
    }
  }

  const tiles: GridTile[] = [];
  for (let row = 0; row < dims.height; row++) {
    for (let col = 0; col < dims.width; col++) {
      if (!occupied.has(`${row},${col}`)) tiles.push({ row, col });
    }
  }
  return tiles;
}
