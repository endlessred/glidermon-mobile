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
| `render/renderLayers.ts` | the two-pass split (below) — `ROOM_SHELL_LAYER`, `CONTENT_LAYER`, `assignLayer()` |
| `render/furnitureBillboard3D.ts` | `buildFurnitureSlotBillboard(slot, furnitureId, variantId, dims, billboardQ, characterWorldPos, forceInFront?)` — one camera-facing billboard per occupied slot, composited from `restPoseAsset` / `layers` |
| `render/billboard3D.ts` | `computeBillboardQuaternion(CAMERA_OFFSET)` — one shared rotation for every billboard (character, furniture, treetop) |
| `render/walkableTiles.ts` | wander destinations + furniture-interaction resolution (see below) |
| `render/characterScale.ts` | `computeNativeCharacterHeight` |
| `types/roomSlots.ts` | fixed furniture **and** character slots, per room-size tier |
| `types/furnitureCatalog.ts` | `FURNITURE_CATALOG` — one entry per `SlotType`, 1–2 variants each |
| `render/lightGlow3D.ts` | `buildLightGlow(socket, region, worldUnitsPerPixel, mirrorX)` — soft additive glow disc for a static-atlas lamp's light socket; see Recipes |

### Two-pass render: shell vs contents (`render/renderLayers.ts`)

The room shell (floor + walls, real `BoxGeometry` with a depth buffer) and room
contents (GliderMon, furniture, wall art, the Adventure Board — all billboards)
render in **two separate passes with two separate depth buffers**, not one:

```ts
renderer.clear(true, true, true);
camera.layers.set(ROOM_SHELL_LAYER);
renderer.render(scene, camera);   // floor, walls, treetop backdrop
renderer.clearDepth();
scene.background = null;         // else the sky quad repaints over pass 1
camera.layers.set(CONTENT_LAYER);
renderer.render(scene, camera);  // GliderMon, furniture, wall art, the board
scene.background = skyTexture;   // restored for next frame's pass 1
```

**Why**: a billboard is a flat plane with one depth value across its whole
face, while the shell's wall/floor surface depth varies continuously across
its own face. At the angles this fixed isometric camera favors, that mismatch
let a wall's near corner win the depth test against part of a tall/billboarded
object while losing against another part of the same object — the wall
visibly sliced through it (this is exactly the failure `treetopBackdrop3D.ts`
worked around one object at a time before this existed, and what eventually
also hit the Adventure Board and tall furniture). Splitting the passes makes
it structurally impossible: contents never share a depth buffer with the
shell, so the shell can never clip them.

**Layer assignment** — every object gets `assignLayer(root, LAYER)` (recursive,
sets `.layers` on every descendant) right after it's added to the scene, at
**every** build/rebuild site (initial `handleContextCreate`, the shell-pattern
rebuild effect, the furniture rebuild inside `populateFurnitureGroup`, both
board build/rebuild sites, the character):
- `ROOM_SHELL_LAYER`: the shell group, and the treetop backdrop (it
  deliberately depth-tests against the walls — see `treetopBackdrop3D.ts` — so
  it must share pass 1's depth buffer, not pass 2's).
- `CONTENT_LAYER`: furniture (`populateFurnitureGroup`, floor + wall-mounted),
  GliderMon (`characterGroup`), the Adventure Board (`board.group` — frame
  **and** writing-surface plane together).
- Lights (`ambient`/`sun`) call `.layers.enableAll()` — the shell's
  `MeshStandardMaterial` floor/walls need them in pass 1; contents are unlit
  `MeshBasicMaterial` so this is belt-and-suspenders.
- The board-tap `Raycaster` needs `raycaster.layers.set(CONTENT_LAYER)` before
  every `intersectObject` call — it defaults to layer 0 only and would
  silently miss `boardSurfaceMesh` otherwise (see `tryBoardTap`).

**Contents still share ONE depth buffer with each other** in pass 2 — this
change is purely about the shell. GliderMon ↔ furniture ↔ Adventure Board
occlusion is entirely unaffected: same `renderOrder` bands, same
`depthTest`/opaque-cutout-queue logic as before (see the Adventure Board
section below and `furnitureBillboard3D.ts`'s `RENDER_ORDER_BEHIND_CHARACTER` /
`RENDER_ORDER_IN_FRONT_OF_CHARACTER`).

**Adding a new content object**: call `assignLayer(theGroupYouJustAdded,
CONTENT_LAYER)` right after `scene.add(...)` — forgetting it makes the object
invisible in both passes (it stays on the default layer 0, which the camera
never renders once `camera.layers.set` is in play) rather than merely
mis-ordered, so the failure is loud, not subtle.

### Camera

Fixed isometric orthographic camera, direction always `-CAMERA_OFFSET`
(`(10,10,10)`), only the look-at point moves. Three modes via the `cameraMode` prop (`'nest' | 'glidermon' | 'goals'`, driven
by `CameraPresetTabs` on Home; the older `zoomedIn` boolean still works as a
fallback):

- `nest` (overview): frustum fit to the room's projected bounding box.
- `glidermon` (zoomed): frames `characterTargetRef` (character mid-height), eased
  over `CAMERA_PAN_DURATION_SECONDS` when he moves.
- `goals`: frames the Adventure Board's wooden frame
  (`goalsTargetRef` = `frameCenterWorld` from `adventureBoard3D`), fitting
  both projected width and height with `GOALS_MARGIN_RATIO` of context, eased the
  same way, and switches the board texture to `full` density. The goal content
  is a texture inside the scene now — no screen-space projection / RN overlay.

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

## System furnishings (`roomSlots.ts` → `getSystemSlotsForTier`)

Fixed objects the game places itself, **separate from the player-swappable
furniture** (`RoomSlotDef` / `activeFurnitureBySlot` / the shop) — kept as their
own `SystemSlotDef` concept rather than a new `SlotType` so the furniture
catalog's `Record<SlotType, …>` maps don't need fake entries. Their tiles are
force-marked non-walkable in `walkableTiles.ts` (GliderMon never idles on them).

Today there's one: the **Daily Adventure Board** (`slotId: 'adventureBoard'`),
front-left corner of tier 1 (`(3,0)`; tiers 0/2 fall back to an open left-side
tile). Rendered by `render/adventureBoard3D.ts` as **one world entity with two
layers**, both children of the same billboard-rotated, floor-grounded group:

1. `boardSurfaceMesh` — a `PlaneGeometry` showing the dynamic goal UI as a
   texture. The pixels are drawn offscreen with Skia
   (`ui/components/adventureBoard/AdventureBoardDrawing.ts` +
   `adventureBoardTexture.ts`), handed in via `IsometricRoomView3D`'s
   `boardTextures` prop, and uploaded here into a `THREE.DataTexture`
   (`setTextures`). Sized from the measured `Placeholder` local AABB expanded by
   `BOARD_OPENING_OVERSCAN` (`render/adventureBoardLayout.ts`), recessed behind
   the frame by `BOARD_UI_LOCAL_DEPTH_OFFSET` along the billboard normal so the
   wooden lip sits proud of it. `setDensity('full'|'compact')` swaps which
   pre-rendered texture shows (Goals camera → full).
2. `spineMesh` — the authored Spine frame / easel / leaves / sticky-notes, drawn
   **in front of** the surface. Its transparent opening lets the surface show
   through; wood / leaves / notes occlude the surface's overscanned edges. The
   `Placeholder` slot itself is hidden (`o.visible = false`) — it's only an
   alignment guide.

**Depth vs GliderMon — the queue-flip.** His body/skin slots are OPAQUE-queue
materials (hue-indexed recolor, `normalizeMaterialForSlot`), and three.js draws
the whole opaque queue before the whole transparent queue regardless of
`renderOrder` — so a *transparent* board can never sort behind his skin, it
always draws in the later pass and covers him. `setDepthClass('front'|'behind')`
classifies the whole board against GliderMon by isometric depth
(`classifyBoardDepth`, same `x+z` formula as `furnitureBillboard3D.ts`) and
switches **both** layers' materials to match — exactly what `tileSprite.ts`'s
`opaqueCutout` does for furniture:
- **behind** GliderMon → `transparent:false, depthTest:true, depthWrite:true`
  (frame art gets `alphaTest` 0.5 hard cutout), `renderOrder` in `[-1, 0)`. Now
  in the opaque queue, so his opaque skin (drawn after, `depthTest:false`)
  paints over it, and the real depth buffer sorts it against the walls / bed /
  rug behind it.
- **in front of** GliderMon → `transparent:true, depthTest:true,
  depthWrite:false`, `renderOrder` ~1000 (surface) / ~1001 (frame), so it draws
  after *all* his slots including the transparent face / hat / shoes.
`BOARD_SURFACE_BIAS` / `BOARD_FRAME_BIAS` keep both layers strictly between
furniture's "behind" band (`-1`) and his slot range (~2-70): surface just below
frame (lip covers the writing surface), whole board above the furniture behind
it. The `needsUpdate` on a mode switch only fires when the class actually
changes (rare — a wander onto/off the tiles in front of the easel).

Sized as a world object (~1.7 world units — ~90% of the original 1.9, a
first-pass shrink so it doesn't visually dominate the room next to GliderMon/
furniture — via `BOARD_DESIRED_WORLD_HEIGHT`, the one source of truth for its
size). **Vertical placement is derived, then calibrated:** after the group is
built + billboard-rotated, its lowest measured world point is dropped onto the
floor plane (`world y = 0`) via a `THREE.Box3` union over the visible slot
geometries, lifted by `BOARD_GROUND_EPSILON`. The Easel art itself draws its
two front legs at different heights in local Spine units (~46-unit gap
measured off the WoodEasel mesh) — a flat camera-facing billboard has one
rigid Y, so that single-point measurement only plants the shorter-drawn leg;
the other reads as floating by the remaining gap, and empirically by more
than the raw leg-to-leg gap alone accounts for. `BOARD_GROUND_EXTRA_DROP` is
the one on-device-tuned calibration knob for the residual — an additional
world-unit nudge applied on top of the derived grounding, tuned by eye until
both legs read as planted. Retune this constant (never a one-off
`position.y -=` elsewhere) if the board moves, rescales, or the art changes.
`getAdventureBoardSlot(tier)` is the single source of
truth for its position — the Goals camera preset (aims at `frameCenterWorld`,
fits `frameWorldSize`) derives from the built object, so moving the board moves
everything with no compensating offsets elsewhere. A tap on the room view while
the Goals camera frames a not-yet-planned board raycasts `boardSurfaceMesh`
(`boardInteractive` / `onBoardTap` props, movement-thresholded vs a drag) to open
the Morning Check-In. A dev-only `assertNoSlotCollisions()` in `roomSlots.ts`
flags overlaps.

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

### Add a light glow to a lamp (static-atlas lamps only)

Only static-atlas furniture (`FurnitureVariant.staticAtlas`, e.g.
`traffic_cone_lamp`) supports this — the older `restPoseAsset`/`layers` lamps
(`lamp_table`, `lamp_classic`) already bake a soft translucent halo directly
into their PNG's own alpha channel (confirmed by sampling
`1x1_TableLamp_On.png` — alpha fades from 0 to 255 well outside the shade's
hard edge). A static-atlas item can't do that: its art is flat
`#ff0000`/`#00ff00`/`#0000ff` hue-indexed recolor masks (see
`StaticFurnitureVisual`'s doc comment in `RoomConfig.ts`), and a soft alpha
gradient baked into that art would get misread as part of the recolor mask.
`render/lightGlow3D.ts` adds the same idea back as a separate, non-recolored,
always-on-top overlay instead.

1. Find the atlas region's `bounds:x,y,w,h` (page-space rect) and `rotate`
   value (e.g. `rotate:90`) in `ShadedFurniture.atlas`.
2. Crop that page rect out of `ShadedFurniture.png` and un-rotate it back to
   upright (rotate the crop by `-`rotate, i.e. clockwise for `rotate:90` — the
   same direction `scripts/buildFurnitureAtlasMetadata.ts`'s `toDisplayedLocal`
   uses) so you're looking at the same top-left-origin/y-down, un-rotated
   frame `anchorX`/`anchorY` are already defined in. No build step needed, a
   throwaway script is enough:
   ```python
   from PIL import Image
   img = Image.open('src/assets/Apartment/ShadedFurniture/ShadedFurniture.png')
   crop = img.crop((x, y, x + w, y + h))                   # bounds from the .atlas entry
   crop.rotate(-90, expand=True).save('lamp_upright.png')  # match the entry's rotate value
   ```
3. Open `lamp_upright.png` and read off the pixel coordinate of the
   light-emission point (bulb / shade opening / etc.) in that image —
   top-left origin, y-down, same units as the region's declared
   `width`/`height`.
4. Add `lightSocket: { x, y }` to that variant's `staticAtlas` in
   `furnitureCatalog.ts`:
   ```ts
   staticAtlas: { atlasRegion: "skeleton-Lighting-Traffic Cone Lamp_0", lightSocket: { x: 53, y: 62 } },
   ```
5. Reload and check on-device (`glidermon://home`) —
   `buildStaticFurnitureSlotBillboard` picks up `lightSocket` automatically and
   adds the glow as a sibling of the lamp mesh, so it inherits the slot's
   world position/rotation/`CONTENT_LAYER` for free. Nothing else to wire up.

Defaults, overridable per-lamp on the same `lightSocket` object: radius
`DEFAULT_LIGHT_GLOW_RADIUS` = 2 world units (`radius?`), tint `#fff3c4` warm
white (`color?`). Overall brightness (`DEFAULT_LIGHT_GLOW_OPACITY` = 0.5,
lowered from an initial 1.0 that read as too strong on-device) is currently a
module constant in `lightGlow3D.ts`, not per-variant — adjust it there, or
promote it to a per-socket field if a future lamp genuinely needs to look
brighter/dimmer than the rest rather than every lamp needing retuning together.

The glow always renders in front of *everything* in the room (character,
furniture, the Adventure Board) via `RENDER_ORDER_LIGHT_GLOW`
(`slotWorldPlacement3D.ts`) + `depthTest:false` — read that constant's comment
before changing it, and never give anything else a `renderOrder` at or above
it, or reuse a value at/below the Adventure Board's "in front" band
(~1000–1000.6) for a new glow-like effect.

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
