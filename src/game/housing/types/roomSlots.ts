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
// Composition goal (see CharacterSlotDef layout below): furniture hugs the
// perimeter, a loose usable region runs through the middle, and the
// seating+table form a small living area toward one side.
const TIER_1_SLOTS: RoomSlotDef[] = [
  // See TIER_0_SLOTS' bed comment -- footprint runs along the row axis.
  // Pulled one row toward the back-left wall (was row 2) so bedding reads as
  // tucked into the corner and the front-left tile opens up.
  { slotId: 'bed', type: 'bed', kind: 'floor', row: 1, col: 0, footprint: { w: 1, h: 2 } },
  { slotId: 'feature', type: 'feature', kind: 'floor', row: 3, col: 3 },
  { slotId: 'storage', type: 'storage', kind: 'floor', row: 2, col: 3 },
  { slotId: 'lighting', type: 'lighting', kind: 'floor', row: 1, col: 3 },
  // tableDesk stays on the back row next to seating -- together they read as a
  // small living-area nook against the wall, keeping the room center open.
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

// ---------------------------------------------------------------------------
// Character slots -- authored standing positions GliderMon may relocate to
// (Tamagotchi-style teleport, no walk cycle). Separate from the furniture
// slots above: furniture slots hold furniture and are NOT random standing
// destinations; character slots are open positions, some of which also
// double as interaction positions for an adjacent furniture slot.
//
// These are additive to the existing "any open floor tile" wander pool (see
// walkableTiles.ts' getWanderDestinations) -- authored slots just get a
// higher selection weight and carry interaction metadata. A tier with no
// authored slots (0 and 2 today) falls back cleanly to the plain open-tile
// behavior.
//
// Uses row/col (not raw x/y) to stay in the same grid space as RoomSlotDef
// and gridToWorld (grid3D.ts).
// ---------------------------------------------------------------------------

export interface CharacterSlotInteraction {
  /** Must match a RoomSlotDef.slotId in the same tier. */
  furnitureSlotId: string;
  /** Optional hint/filter; the concrete behavior normally comes from the
   * furniture item's own interaction metadata (furnitureCatalog.ts). */
  interactionType?: string;
  /** Authoring hint only -- GliderMon stays front-facing (no back-facing
   * outfit art), so this is documentation for now. */
  facing?: string;
}

export interface CharacterSlotDef {
  id: string;
  row: number;
  col: number;
  /** Furniture this position can interact with. Empty/absent => a pure idle
   * position. Presence of an entry does NOT guarantee an interaction happens:
   * the furniture slot must be occupied by an item whose interaction behavior
   * is supported, and GliderMon only interacts occasionally (see
   * IsometricRoomView3D.tsx's wander scheduler). */
  interactions?: CharacterSlotInteraction[];
}

// Tier 1 (4x4 default room). ~7 positions, 4 interaction-enabled, all also
// valid as plain idle spots. `home` matches the historical default spawn
// (DEFAULT_CHARACTER_TILE in housingStore.ts).
const TIER_1_CHARACTER_SLOTS: CharacterSlotDef[] = [
  // home (0,1): historical default spawn, back-middle, beside the rear hobby.
  { id: 'home', row: 0, col: 1, interactions: [{ furnitureSlotId: 'hobby', facing: 'backLeft' }] },
  // bySeat (2,1): in front of the seating slot (1,1).
  { id: 'bySeat', row: 2, col: 1, interactions: [{ furnitureSlotId: 'seating', facing: 'back' }] },
  // byFire (3,2): inward-facing, next to the front feature slot (3,3).
  { id: 'byFire', row: 3, col: 2, interactions: [{ furnitureSlotId: 'feature', facing: 'right' }] },
  // bedside (3,0): at the foot of the bed (occupies rows 1-2, col 0).
  { id: 'bedside', row: 3, col: 0, interactions: [{ furnitureSlotId: 'bed', facing: 'back' }] },
  // Pure idle positions -- keep the center usable and open.
  { id: 'center', row: 2, col: 2 },
  { id: 'frontMiddle', row: 3, col: 1 },
  { id: 'backRight', row: 0, col: 3 },
];

// Tiers 0 and 2 are not authored yet -- an empty list means the wander
// scheduler uses only the plain open-tile pool for those room sizes.
export const CHARACTER_SLOT_LAYOUTS: CharacterSlotDef[][] = [[], TIER_1_CHARACTER_SLOTS, []];

export function getCharacterSlotsForTier(tier: number): CharacterSlotDef[] {
  return CHARACTER_SLOT_LAYOUTS[tier] ?? [];
}
