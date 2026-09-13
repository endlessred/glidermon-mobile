// Which floor tiles Glidermon is free to wander to -- every grid tile for
// the current room tier minus whatever's covered by an occupied floor-kind
// slot (including multi-tile footprints like the bed). Wall-kind slots don't
// occupy a floor tile so they're not excluded here.
import { getSlotsForTier, getCharacterSlotsForTier, getSystemSlotsForTier, CharacterSlotDef } from '../types/roomSlots';
import { getFurnitureInteraction } from '../types/furnitureCatalog';
import { SUPPORTED_INTERACTION_BEHAVIORS } from '../../view/lifelikeIdle_noMix';
import { ROOM_SIZE_TIERS } from '../../../data/stores/housingStore';
import type { GridTile } from '../../../data/stores/housingStore';

type FurnitureBySlot = Record<string, { furnitureId: string; variantId: string }>;

export function getWalkableTiles(
  roomSizeTier: number,
  activeFurnitureBySlot: FurnitureBySlot
): GridTile[] {
  const dims = ROOM_SIZE_TIERS[roomSizeTier] ?? ROOM_SIZE_TIERS[0];
  const occupied = new Set<string>();
  // System furnishings (e.g. the Daily Adventure Board) permanently occupy
  // their tile -- GliderMon may never wander onto / overlap them.
  for (const sys of getSystemSlotsForTier(roomSizeTier)) {
    occupied.add(`${sys.row},${sys.col}`);
  }
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

// ---------------------------------------------------------------------------
// Wander destinations: the walkable tiles above, with authored character
// slots (roomSlots.ts) merged in -- one entry per tile, authored tiles get a
// higher selection weight and carry any currently-available furniture
// interactions. This is what the wander scheduler in IsometricRoomView3D.tsx
// picks from; it deliberately still includes plain open tiles so GliderMon
// keeps his full roaming range, not just the authored spots.
// ---------------------------------------------------------------------------

const FREE_TILE_WEIGHT = 1;
const CHARACTER_SLOT_WEIGHT = 3;

/** A furniture interaction that is actually available right now from a given
 * character slot: the referenced furniture slot is occupied AND the occupant's
 * declared behavior is one the idle driver supports. */
export interface ResolvedInteraction {
  furnitureSlotId: string;
  furnitureId: string;
  variantId: string;
  /** Supported behavior key (see SUPPORTED_INTERACTION_BEHAVIORS). */
  behavior: string;
  animation?: string;
  interactionAnchor?: { xOffset: number; yOffset: number; zOffset?: number };
  characterFlipX?: boolean;
}

export interface WanderDestination {
  tile: GridTile;
  weight: number;
  /** Present when this tile is an authored character slot. */
  characterSlotId?: string;
  /** Available furniture interactions from this tile. Empty is normal -- the
   * tile is still a perfectly valid plain idle position. */
  interactions: ResolvedInteraction[];
}

/**
 * For one character slot, which of its declared furniture relationships are
 * actually actionable right now: the furniture slot must contain an item, and
 * that item's interaction behavior (furnitureCatalog.ts) must be supported by
 * the idle driver. An empty result is expected and fine -- e.g. an empty
 * hobby slot, or a bed whose 'sleep' behavior isn't implemented yet.
 */
export function resolveSlotInteractions(
  slot: CharacterSlotDef,
  activeFurnitureBySlot: FurnitureBySlot
): ResolvedInteraction[] {
  const out: ResolvedInteraction[] = [];
  for (const rel of slot.interactions ?? []) {
    const occupant = activeFurnitureBySlot[rel.furnitureSlotId];
    if (!occupant) continue;
    const interaction = getFurnitureInteraction(occupant.furnitureId, occupant.variantId);
    if (!interaction) continue;
    if (!SUPPORTED_INTERACTION_BEHAVIORS.has(interaction.behavior)) continue;
    out.push({
      furnitureSlotId: rel.furnitureSlotId,
      furnitureId: occupant.furnitureId,
      variantId: occupant.variantId,
      behavior: interaction.behavior,
      animation: interaction.animation,
      interactionAnchor: interaction.interactionAnchor,
      characterFlipX: interaction.characterFlipX,
    });
  }
  return out;
}

export function getWanderDestinations(
  roomSizeTier: number,
  activeFurnitureBySlot: FurnitureBySlot
): WanderDestination[] {
  const byTile = new Map<string, WanderDestination>();
  for (const tile of getWalkableTiles(roomSizeTier, activeFurnitureBySlot)) {
    byTile.set(`${tile.row},${tile.col}`, { tile, weight: FREE_TILE_WEIGHT, interactions: [] });
  }

  for (const slot of getCharacterSlotsForTier(roomSizeTier)) {
    // If an authored slot's tile is currently covered by furniture, it isn't
    // walkable -- skip it rather than adding an un-standable destination.
    const entry = byTile.get(`${slot.row},${slot.col}`);
    if (!entry) continue;
    entry.weight = CHARACTER_SLOT_WEIGHT;
    entry.characterSlotId = slot.id;
    entry.interactions = resolveSlotInteractions(slot, activeFurnitureBySlot);
  }

  return [...byTile.values()];
}
