# Housing system

> Older docs (`docs/HOUSING_AND_ISO.md`, `docs/HOUSING_AND_SPINE.md`,
> `docs/HOUSING_SPINE_REPLACEMENT.md`, `FURNITURE-SYSTEM.md`, `rooms/CLAUDE.md`)
> describe the **legacy** `legacy`/`quad` renderers (Apartment Spine skeleton,
> JSON room files, `spineX/spineY`, tile bones). Those are kept only as
> fallbacks. **This doc covers the live renderer** — `primitive3d` /
> `IsometricRoomView3D` — set in `src/ui/screens/HudScreen.tsx`
> (`HOUSING_RENDERER`).

## The three renderers

`HudScreen.tsx`'s `HOUSING_RENDERER` picks one:

| value | component | status |
|---|---|---|
| `primitive3d` | `view/IsometricRoomView3D.tsx` | **live default** — real Three.js primitives, procedurally-textured floor/walls, furniture billboards |
| `quad` | `view/IsometricRoomView.tsx` | fallback — flat sprite planes, freeform `furniturePlacements` |
| `legacy` | `view/IsometricHousingThreeJS.tsx` | fallback — original Apartment Spine room skeleton |

Only edit `primitive3d` unless you're specifically told otherwise. The other
two read different `housingStore` fields (see below) and different catalogs.

## 3D-primitive room shell (`primitive3d`)

Built once per GL-context in `IsometricRoomView3D.handleContextCreate`; only the
character skeleton + frame-cycling furniture layers (campfire, chest) update per
frame. Store changes rebuild just the affected layer, never the whole scene.

Key files:

| file | role |
|---|---|
| `render/grid3D.ts` | `gridToWorld(row, col, dims, footprint?)` → world `{x, z}`. **The single source of truth for "where is tile (row,col)".** `TILE_SIZE = 1`. No screen projection, no skirt/pivot math (unlike `quad`). |
| `render/sceneBuilder3D.ts` | floor tiles + 2 back walls from a `RoomGridConfig` |
| `render/proceduralTextures.ts` / `types/proceduralPatternCatalog.ts` | floor/wall patterns (procedural, **not** the asset-backed `FloorSetName`/`WallSetName` the other renderers use) |
| `render/furnitureBillboard3D.ts` | `buildFurnitureSlotBillboard(slot, furnitureId, variantId, dims, billboardQ, characterWorldPos, forceInFront?)` — one camera-facing billboard per occupied slot, composited from `restPoseAsset` / `layers` |
| `render/billboard3D.ts` | `computeBillboardQuaternion(CAMERA_OFFSET)` — one shared rotation for every billboard (character, furniture, treetop) |
| `render/walkableTiles.ts` | wander destinations + furniture-interaction resolution (see below) |
| `render/characterScale.ts` | `computeNativeCharacterHeight` |
| `types/roomSlots.ts` | fixed furniture **and** character slots, per room-size tier |
| `types/furnitureCatalog.ts` | `FURNITURE_CATALOG` — one entry per `SlotType`, 1–2 variants each |

### Camera

Fixed isometric orthographic camera, direction always `-CAMERA_OFFSET`
(`(10,10,10)`), only the look-at point moves. Two modes via the `zoomedIn` prop
(driven by `CameraPresetTabs` on Home — "Nest" = overview, "Glidermon" = close
follow):

- Overview: frustum fit to the room's projected bounding box.
- Zoomed: frames `characterTargetRef` (character mid-height), eased over
  `CAMERA_PAN_DURATION_SECONDS` when he moves.

**Anything that moves the character's render position must also call the
effect-local `aimCameraAt(x, z)`** or the follow-camera aims at the wrong spot
(that was the bug when GliderMon sat down — camera stayed on the approach tile).

### `housingStore` fields the `primitive3d` renderer reads

- `roomSizeTier` (0/1/2 → `ROOM_SIZE_TIERS` = 3×3 / 4×4 / 5×5). **1 is the default.**
- `activeFloorPatternId` / `activeWallPatternId` (procedural catalog)
- `activeFurnitureBySlot: Record<slotId, { furnitureId, variantId }>` — a slot
  with no entry renders empty. This is **separate** from the `quad`/`legacy`
  `furniturePlacements` (freeform row/col). Don't confuse them.
- `characterTile: GridTile` — where GliderMon last wandered to; persisted.

## Furniture slots (`roomSlots.ts`)

`RoomSlotDef` — fixed positions, authored per tier in `ROOM_SLOT_LAYOUTS`
(`getSlotsForTier(tier)`). Slots are **not player-movable**: each furniture
type's art is drawn once for one canonical position, so billboard/animation
code never handles rotation or arbitrary placement.

`SlotType`: `bed | seating | storage | rug | wallDecor | tableDesk | lighting |
hobby | feature`. `SLOT_TYPE_FOR_FURNITURE_ID` maps a catalog `furnitureId` →
its slot type (the catalog's `chair` entry predates the slot system and keeps
its historical id instead of being renamed to `seating`).

`wallDecor` has two physical slots (`wallDecor1`/`wallDecor2`); every other type
has exactly one.

To retune a layout: edit the tier's array in `roomSlots.ts`. `bed` has
`footprint: { w: 1, h: 2 }` (runs along the row axis — headboard one tile
further back). Coordinates want an on-device pass; `glidermon://home` +
screenshots.

## Character-slot + furniture-interaction system

Lets GliderMon occasionally *use* nearby furniture (sit, dance, …) on top of the
existing Tamagotchi-style teleport-wander. **No pathfinding, no walk cycle** —
he still just repositions.

### Layers

1. **Furniture slots** — hold furniture; not random standing destinations.
2. **Character slots** (`CharacterSlotDef` in `roomSlots.ts`) — authored open
   positions GliderMon may relocate to. Some also reference a nearby furniture
   slot.
3. Every plain open floor tile is *also* a valid destination (lower weight) —
   authored slots don't replace free-roam, they just dominate it.

```ts
interface CharacterSlotDef {
  id: string;
  row: number; col: number;
  interactions?: CharacterSlotInteraction[];   // absent / [] => pure idle spot
}
interface CharacterSlotInteraction {
  furnitureSlotId: string;      // must match a RoomSlotDef.slotId in the same tier
  interactionType?: string;     // optional hint; behavior really comes from the furniture
  facing?: string;              // authoring note only — GliderMon stays front-facing
}
```

Authored in `CHARACTER_SLOT_LAYOUTS` (`getCharacterSlotsForTier(tier)`).
**Only tier 1 is authored** (`[[], TIER_1_CHARACTER_SLOTS, []]`) — tiers 0/2
return `[]` and fall back to plain open-tile wandering with no interactions.
`home` (0,1) is the historical default spawn — keep it there.

### Furniture declares what an interaction *does* (`RoomConfig.ts`)

```ts
interface FurnitureInteractionDef {
  behavior: string;             // 'sit' | 'dance' | 'campfire' | 'sleep' | ...
  animation?: string;           // hint into the behavior registry
  interactionSide?: string;     // authoring note
  characterFlipX?: boolean;     // mirror him (scale.x *= -1) for the duration — still front-facing
  interactionAnchor?: { xOffset: number; yOffset: number; zOffset?: number };
}
```

`interaction` is allowed on **`FurnitureDef`** (default for the type) and on a
**`FurnitureVariant`** (override). `getFurnitureInteraction(furnitureId,
variantId)` shallow-merges them (variant wins per-key — e.g. a variant can
override just `interactionAnchor`).

`interactionAnchor` is an offset from the **furniture object's world origin**
(`gridToWorld(furnitureSlot.row, furnitureSlot.col, dims, footprint)`), *not*
the character slot's tile. `+x`/`+z` = toward the camera / down-screen, `-y` =
lower. It's how a seated character snaps onto the seat. **Tune per variant.**

Current catalog interactions:

| catalog entry | behavior | supported? |
|---|---|---|
| `chair` (def) | `sit` (+ `characterFlipX`, anchor) | ✅ real |
| `hobby` (def) | `dance` | ✅ placeholder composite (no dedicated clip yet) |
| `feature` (def) | `campfire` | ❌ unsupported → graceful idle fallback |
| `bed` (def) | `sleep` | ❌ unsupported → graceful idle fallback |

### Behavior layer (`src/game/view/lifelikeIdle_noMix.ts`)

`INTERACTION_BEHAVIORS: Record<string, Composite>` — the behaviors that are
actually performed. `SUPPORTED_INTERACTION_BEHAVIORS` (exported set of its keys)
is what the eligibility check consults. Today: `sit` (real, `BODY.sit`),
`dance` (placeholder — held `BODY.leanRight` + wings/tail/smile).

```ts
startInteraction(
  behaviorKey: string,
  holdSeconds?: number,                                  // omit → use the spec's holdRange
  onDone?: (reason: 'completed' | 'interrupted') => void,
): boolean   // false if not idle or behaviorKey unsupported → caller just idles
```

Reuses the existing body-composite state machine, so no new timeout bookkeeping.
`onDone` fires **exactly once** — on natural completion (`'completed'`) and on
every interruption path (`forceIdle()`, a body `playReaction()`) (`'interrupted'`).
The room relies on this to always restore render position / clear its flags.

### Eligibility — an interaction is available only when

1. the character slot references a furniture slot, **and**
2. that furniture slot currently has an occupant, **and**
3. the occupant's `interaction.behavior` is in `SUPPORTED_INTERACTION_BEHAVIORS`.

Otherwise the character slot is still a perfectly good plain idle position. An
empty hobby slot / unimplemented `sleep` never breaks anything.
`resolveSlotInteractions(slot, activeFurnitureBySlot)` (`walkableTiles.ts`)
returns the `ResolvedInteraction[]` (possibly empty).

### Wander scheduler (`IsometricRoomView3D.tsx`)

`getWanderDestinations(tier, activeFurnitureBySlot)` → one `WanderDestination`
per tile (deduped by `"row,col"`): plain tiles weight 1, authored character-slot
tiles weight `CHARACTER_SLOT_WEIGHT` (3) + `characterSlotId` + resolved
`interactions`.

`attemptWander` (setTimeout chain, `WANDER_INTERVAL_RANGE_MS`, defers via
`WANDER_RETRY_DELAY_MS` while `idleDriver` is mid-behavior or `interactingRef`):

- `chooseWanderActivity(canInteract)` → `'idle'` (~70%) or `'interact'`
  (`INTERACT_ACTIVITY_CHANCE` ≈ 30%). Union type keeps room for a `'special'`
  bucket later. **This is the choke point** for future contextual weighting
  (time of day, trust, glucose, personality) — none of that is wired now, and
  health data must not reach the furniture system.
- Anti-repeat: `recentFurnitureRef` ring buffer (`RECENT_FURNITURE_MEMORY` = 3)
  — skip a furniture slot used recently unless that leaves no options.
- On an interaction pick: `setCharacterTile(dest.tile)` + stash
  `pendingInteractionRef`. The `characterTile` effect repositions him, then
  consumes `pendingInteractionRef` → `idleDriver.startInteraction(...)`.

### While an interaction is active

- `interactionTransformRef` holds `{x, y, z, scaleX}`; the **render loop
  re-asserts it every frame**, so a stray effect re-run (furniture change, etc.)
  can't knock him off the seat.
- `characterGroup.scale.x = -1` does the flip. It's a **parent-group** transform
  (survives the per-frame skeleton pose reset); all Spine materials are
  `DoubleSide` so the mirrored winding isn't backface-culled.
- `aimCameraAt(seatX, seatZ)` re-points the follow-camera; `onDone` calls
  `aimCameraAt(tileX, tileZ)` to pan back.
- `forceInFront` (a `Set<string>` of slot ids threaded through
  `populateFurnitureGroup` → `buildFurnitureSlotBillboard`) can pin a slot's
  billboard in front of him regardless of depth score. **Currently unused for
  the plain chair** — its tall backrest would then draw over his torso. It's
  plumbed for a future layered seat asset (see Constraints).

### On-device anchor/flip tuning

`IsometricRoomView3D.tsx` has a dev block:

```ts
const DEBUG_FORCE_INTERACTION = { furnitureSlotId: 'seating', behaviorKey: 'sit' }; // null to disable
const DEBUG_INTERACTION_ANCHOR  = { xOffset: 0.06, yOffset: -0.05, zOffset: 0.17 };
const DEBUG_INTERACTION_FLIP_X  = true;
```

Set `DEBUG_FORCE_INTERACTION`, reload, and GliderMon is parked in that
interaction indefinitely with wandering off. Nudge the anchor
(`+x`/`+z` = toward camera / down-screen, `-y` = lower), reload. The anchor
constants are effect deps so Fast Refresh re-applies without a full reload when
it's cooperating. When it looks right, copy `DEBUG_INTERACTION_ANCHOR` into the
furniture entry's `interaction.interactionAnchor` in `furnitureCatalog.ts`, set
`DEBUG_FORCE_INTERACTION` back to `null`.

## Recipes

### Add a new interactable furniture item

1. Add the variant/def to `FURNITURE_CATALOG` (`furnitureCatalog.ts`) as usual
   (`restPoseAsset` / `layers`, `shopStock`, etc.).
2. Add `interaction: { behavior, animation?, characterFlipX?, interactionAnchor? }`
   to the `FurnitureDef` (all variants) or a specific `FurnitureVariant`.
3. If `behavior` isn't in `SUPPORTED_INTERACTION_BEHAVIORS` yet, that's fine —
   it degrades to a plain idle at that slot until the behavior exists.
4. Make sure some `CharacterSlotDef` in the relevant tier lists that furniture
   slot in its `interactions` (e.g. `hobby` items are reachable from `home`).
5. Tune `interactionAnchor` via `DEBUG_FORCE_INTERACTION`.

### Add a new interaction behavior (e.g. `paint`, `telescope`)

1. Add a `Composite` to `INTERACTION_BEHAVIORS` in `lifelikeIdle_noMix.ts`
   (assemble from the primitive catalog in that file, or a dedicated clip once
   exported). It's auto-added to `SUPPORTED_INTERACTION_BEHAVIORS`.
2. Point furniture at it via `interaction.behavior`.
3. Nothing else — `walkableTiles.ts` / `IsometricRoomView3D.tsx` are behavior-agnostic.

### Add a new character slot

Add a `CharacterSlotDef` to the tier's array in `CHARACTER_SLOT_LAYOUTS`. Its
tile must be walkable (not covered by furniture). Give it `interactions` only if
a furniture slot is genuinely adjacent.

## Constraints / gotchas

- **No walk cycle, no pathfinding, no back-facing art.** Interactions must work
  with the front-facing character (a horizontal flip is fine; a back view is not).
- **Character ≈ 4.5 tiles tall, chair ≈ 0.9.** When he sits centered on a
  bottom-pivoted single-billboard chair, the chair mostly renders behind him and
  can't be cleanly "around" him. A believable seat needs **layered chair art** —
  the asset pack's `1x1_Armchair_*` set already ships `FrontLayerOver/Under` +
  `BackLayerOver/Under` for exactly this; the `forceInFront` hook is waiting for it.
- `activeFurnitureBySlot` (primitive3d) ≠ `furniturePlacements` (quad/legacy).
- Procedural floor/wall patterns (primitive3d) ≠ `FloorSetName`/`WallSetName`
  asset sets (quad/legacy). Two deliberately separate systems.
- Furniture rebuilds are **build-then-swap** (`populateFurnitureGroup` builds the
  new billboards fully before clearing the old set) — don't reintroduce a
  `clearGroup`-first path, it blinks all furniture out for a few frames.
- `HudScreen.tsx` gates `FurnitureDevPanel` behind `SHOW_FURNITURE_DEV_PANEL`.
- Dev deep link: `adb shell am start -a android.intent.action.VIEW -d "glidermon://home"`.
