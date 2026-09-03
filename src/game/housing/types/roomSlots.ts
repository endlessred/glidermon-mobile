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
// System furnishings -- fixed objects the game places itself, NOT part of the
// player-swappable furniture inventory (roomSlots.ts's RoomSlotDef / the
// housingStore.activeFurnitureBySlot map / the shop). Kept as a separate
// concept rather than a new SlotType so the furniture catalog's
// `Record<SlotType, ...>` maps don't need fake entries.
//
// The Daily Adventure Board is the first: it lives at the front-left corner
// (the left vertex of the isometric diorama) -- an open, unobstructed area
// that no furniture or idle position competes for, doesn't consume a
// hobby/feature interaction slot, and has a predictable fixed location the
// Goals camera can frame.
// ---------------------------------------------------------------------------

export type SystemSlotType = 'adventureBoard';

export interface SystemSlotDef {
  slotId: string;
  type: SystemSlotType;
  row: number;
  col: number;
  /** System furnishings are always fixed -- never player-movable/removable. */
  fixed: true;
  category: 'system';
}

// One entry per ROOM_SIZE_TIERS index. Left side of the room, clear of every
// RoomSlotDef in the matching tier (see assertNoSlotCollisions). Tier 1 (the
// default room) puts it at the front-left corner (3,0); tiers 0/2 have the
// bed at that corner, so they fall back to the nearest open left-side tile.
const SYSTEM_SLOT_LAYOUTS: SystemSlotDef[][] = [
  [{ slotId: 'adventureBoard', type: 'adventureBoard', row: 0, col: 1, fixed: true, category: 'system' }],
  [{ slotId: 'adventureBoard', type: 'adventureBoard', row: 3, col: 0, fixed: true, category: 'system' }],
  [{ slotId: 'adventureBoard', type: 'adventureBoard', row: 0, col: 0, fixed: true, category: 'system' }],
];

export function getSystemSlotsForTier(tier: number): SystemSlotDef[] {
  return SYSTEM_SLOT_LAYOUTS[tier] ?? [];
}

/** The Daily Adventure Board's fixed slot for a room tier (always present). */
export function getAdventureBoardSlot(tier: number): SystemSlotDef | undefined {
  return getSystemSlotsForTier(tier).find((s) => s.slotId === 'adventureBoard');
}

// Dev guard: no two occupied grid tiles (furniture footprints + system slots)
// may overlap within a tier. Cheap, runs once on module load in __DEV__ so a
// future layout edit that collides the board with furniture is caught
// immediately rather than as a confusing render overlap.
function assertNoSlotCollisions(): void {
  for (let tier = 0; tier < ROOM_SLOT_LAYOUTS.length; tier++) {
    const seen = new Map<string, string>();
    const claim = (row: number, col: number, who: string) => {
      const key = `${row},${col}`;
      const prev = seen.get(key);
      if (prev) {
        console.warn(
          `[roomSlots] tier ${tier}: duplicate occupied grid tile ${key} (${prev} vs ${who})`
        );
      } else {
        seen.set(key, who);
      }
    };
    for (const slot of ROOM_SLOT_LAYOUTS[tier]) {
      if (slot.kind !== 'floor') continue;
      const w = slot.footprint?.w ?? 1;
      const h = slot.footprint?.h ?? 1;
      for (let dr = 0; dr < h; dr++) {
        for (let dc = 0; dc < w; dc++) claim(slot.row + dr, slot.col + dc, slot.slotId);
      }
    }
    for (const sys of SYSTEM_SLOT_LAYOUTS[tier] ?? []) claim(sys.row, sys.col, sys.slotId);
  }
}

if (__DEV__) assertNoSlotCollisions();

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
  // Pure idle positions -- keep the center usable and open.
  { id: 'center', row: 2, col: 2 },
  { id: 'frontMiddle', row: 3, col: 1 },
  // NOTE: the old `bedside` (3,0) idle position was removed when the Daily
  // Adventure Board took that front-left-corner tile as its fixed system slot
  // -- GliderMon must not idle inside/overlap the board (its `bed` "sleep"
  // interaction was never implemented anyway). Likewise the earlier
  // `backRight` (0,3). Five authored positions is enough for the current
  // random-position system.
];

// Tiers 0 and 2 are not authored yet -- an empty list means the wander
// scheduler uses only the plain open-tile pool for those room sizes.
export const CHARACTER_SLOT_LAYOUTS: CharacterSlotDef[][] = [[], TIER_1_CHARACTER_SLOTS, []];

export function getCharacterSlotsForTier(tier: number): CharacterSlotDef[] {
  return CHARACTER_SLOT_LAYOUTS[tier] ?? [];
}
