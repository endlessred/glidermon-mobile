// Fixed furniture slot positions for the 3D-primitive room shell, one layout
// per ROOM_SIZE_TIERS index. Positions are hardcoded per tier (not a general
// formula) since there are only 3 known tiers and which slots exist/where
// they sit shifts meaningfully between them (e.g. Storage temporarily
// borrows the back corner at 3x3 since Feature isn't unlocked yet) -- not
// just "add more empty tiles" as the room grows.
//
// Slots are intentionally fixed, not player-movable: each furniture type is
// authored once for one canonical position, so per-slot billboard/animation
// code never has to handle arbitrary placement or rotation. See the housing
// plan for the full reasoning.
export type SlotType =
  | 'bed'
  | 'seating'
  | 'storage'
  | 'rug'
  | 'wallDecor'
  | 'tableDesk'
  | 'lighting'
  | 'hobby'
  | 'feature';

export interface RoomSlotDef {
  slotId: string;
  type: SlotType;
  kind: 'floor' | 'wall';
  /** Reference grid tile. For 'wall' slots this is only used to derive the
   * position along the wall run -- the actual world position snaps to the
   * wall plane, not the tile center (see furnitureBillboard3D.ts). */
  row: number;
  col: number;
  /** Which wall run a 'wall' slot mounts on. Unused for 'floor' slots. */
  wall?: 'leftBack' | 'rightBack';
  /** Tile footprint for floor items wider than 1x1 (e.g. the bed spans 2
   * tiles along a row). Defaults to 1x1 when omitted. */
  footprint?: { w: number; h: number };
}

// Tier 0: 3x3 (backRow = backCol = 2) -- only the 5 essentials fit without
// crowding. Storage temporarily takes the back corner since Feature isn't
// unlocked at this size; it moves out once Feature appears at 4x4.
const TIER_0_SLOTS: RoomSlotDef[] = [
  // Footprint runs along the row axis (headboard one tile further back from
  // the open side of the room), not the column axis -- the bed art is drawn
  // elongated front-to-back, not side-to-side (confirmed by its processed
  // sprite being ~2x taller than other 1x1 props but only modestly wider).
  { slotId: 'bed', type: 'bed', kind: 'floor', row: 1, col: 0, footprint: { w: 1, h: 2 } },
  { slotId: 'seating', type: 'seating', kind: 'floor', row: 1, col: 1 },
  { slotId: 'storage', type: 'storage', kind: 'floor', row: 2, col: 2 },
  { slotId: 'rug', type: 'rug', kind: 'floor', row: 0, col: 0 },
  { slotId: 'wallDecor1', type: 'wallDecor', kind: 'wall', wall: 'leftBack', row: 2, col: 1 },
];

// Tier 1: 4x4 (backRow = backCol = 3) -- the default starting room, all 9 slots.
const TIER_1_SLOTS: RoomSlotDef[] = [
  // See TIER_0_SLOTS' bed comment -- footprint runs along the row axis.
  { slotId: 'bed', type: 'bed', kind: 'floor', row: 2, col: 0, footprint: { w: 1, h: 2 } },
  { slotId: 'feature', type: 'feature', kind: 'floor', row: 3, col: 3 },
  { slotId: 'storage', type: 'storage', kind: 'floor', row: 2, col: 3 },
  { slotId: 'lighting', type: 'lighting', kind: 'floor', row: 1, col: 3 },
  { slotId: 'tableDesk', type: 'tableDesk', kind: 'floor', row: 1, col: 2 },
  { slotId: 'seating', type: 'seating', kind: 'floor', row: 1, col: 1 },
  { slotId: 'hobby', type: 'hobby', kind: 'floor', row: 0, col: 0 },
  { slotId: 'rug', type: 'rug', kind: 'floor', row: 0, col: 2 },
  { slotId: 'wallDecor1', type: 'wallDecor', kind: 'wall', wall: 'leftBack', row: 3, col: 2 },
  { slotId: 'wallDecor2', type: 'wallDecor', kind: 'wall', wall: 'rightBack', row: 1, col: 3 },
];

// Tier 2: 5x5 (backRow = backCol = 4) -- same layout, shifted outward with
// extra breathing room around the furniture.
const TIER_2_SLOTS: RoomSlotDef[] = [
  // See TIER_0_SLOTS' bed comment -- footprint runs along the row axis.
  { slotId: 'bed', type: 'bed', kind: 'floor', row: 3, col: 0, footprint: { w: 1, h: 2 } },
  { slotId: 'feature', type: 'feature', kind: 'floor', row: 4, col: 4 },
  { slotId: 'storage', type: 'storage', kind: 'floor', row: 3, col: 4 },
  { slotId: 'lighting', type: 'lighting', kind: 'floor', row: 2, col: 4 },
  { slotId: 'tableDesk', type: 'tableDesk', kind: 'floor', row: 2, col: 3 },
  { slotId: 'seating', type: 'seating', kind: 'floor', row: 2, col: 2 },
  { slotId: 'hobby', type: 'hobby', kind: 'floor', row: 1, col: 1 },
  { slotId: 'rug', type: 'rug', kind: 'floor', row: 1, col: 3 },
  { slotId: 'wallDecor1', type: 'wallDecor', kind: 'wall', wall: 'leftBack', row: 4, col: 3 },
  { slotId: 'wallDecor2', type: 'wallDecor', kind: 'wall', wall: 'rightBack', row: 2, col: 4 },
];

export const ROOM_SLOT_LAYOUTS: RoomSlotDef[][] = [TIER_0_SLOTS, TIER_1_SLOTS, TIER_2_SLOTS];

export function getSlotsForTier(tier: number): RoomSlotDef[] {
  return ROOM_SLOT_LAYOUTS[tier] ?? ROOM_SLOT_LAYOUTS[0];
}
