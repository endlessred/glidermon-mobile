// Room shell rendered from real 3D primitives (see sceneBuilder3D.ts) with
// procedurally textured floor/walls, furniture billboards, and Glidermon
// himself. Only the character animates per frame -- the room shell and
// furniture are built once and never touched again, same principle as the
// `quad` renderer (see sceneBuilder.ts).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { Physics } from '@esotericsoftware/spine-core';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { useHousingStore, ROOM_SIZE_TIERS } from '../../../data/stores/housingStore';
import { useCosmeticsStore } from '../../../data/stores/cosmeticsStore';
import { useCharacterReactionStore } from '../../../data/stores/characterReactionStore';
import { OutfitSlot } from '../../../data/types/outfitTypes';
import { createSpineCharacterController, SpineCharacterController } from '../../../spine/createSpineCharacterController';
import { buildRoomScene3D, WALL_HEIGHT } from '../render/sceneBuilder3D';
import { buildFurnitureSlotBillboard } from '../render/furnitureBillboard3D';
import { computeBillboardQuaternion } from '../render/billboard3D';
import { computeNativeCharacterHeight } from '../render/characterScale';
import { gridToWorld, TILE_SIZE } from '../render/grid3D';
import { createSkyTexture, getSkyPalette, paintSky, rgbToHex } from '../render/sky3D';
import { createTreetopBackdrop3D } from '../render/treetopBackdrop3D';
import { ROOM_SHELL_LAYER, CONTENT_LAYER, assignLayer } from '../render/renderLayers';
import { getSlotsForTier, getCharacterSlotsForTier, RoomSlotDef } from '../types/roomSlots';
import { getFurnitureDef } from '../types/furnitureCatalog';
import { getWanderDestinations } from '../render/walkableTiles';
import {
  buildInteractiveHobbyItem3D,
  InteractiveHobbyItem3D,
  TarotCardId,
} from '../render/interactiveHobbyItem3D';
import {
  buildAdventureBoard3D,
  AdventureBoardObject,
  AdventureBoardTextureSetLike,
  classifyBoardDepth,
} from '../render/adventureBoard3D';
import {
  buildFurnishSlotMarkers3D,
  updateFurnishMarkerSelection,
  FurnishSlotMarkersHandle,
} from '../render/furnishSlotMarkers3D';
import { buildFurnishSurfaceHighlight3D, FurnishSurface } from '../render/furnishSurfaceHighlight3D';

export type RoomCameraMode = 'nest' | 'glidermon' | 'goals';

interface IsometricRoomView3DProps {
  width?: number;
  height?: number;
  characterScale?: number;
  animation?: string;
  outfit?: OutfitSlot | null;
  /** Controlled camera mode: false = standard wide Nest overview, true =
   * close camera following Glidermon. Driven externally (e.g. by
   * CameraPresetTabs on the Home screen) rather than an internal toggle.
   * Superseded by `cameraMode` when that is provided. */
  zoomedIn?: boolean;
  /** Controlled camera preset. `nest` = wide overview, `glidermon` = close
   * follow, `goals` = framed on the Daily Adventure Board. Takes precedence
   * over `zoomedIn`. */
  cameraMode?: RoomCameraMode;
  /** Compact + full board-UI texture payloads (Skia offscreen), regenerated
   * only when the board's goal state changes. Uploaded onto the in-world
   * board-surface plane. */
  boardTextures?: AdventureBoardTextureSetLike | null;
  /** true while a tap on the in-world board should open the Morning Check-In
   * (Goals camera + no plan set yet + a check-in slot is available). */
  boardInteractive?: boolean;
  /** Invoked when the board surface is tapped while `boardInteractive`. */
  onBoardTap?: () => void;
  /** True while the Furnish Nest editor is active. Forces the furniture
   * layer to render `draftFurnitureBySlot` instead of the persisted store
   * value, shows slot markers, pauses wandering, and enables slot-tap
   * raycasting. */
  furnishMode?: boolean;
  /** Draft placements to preview while `furnishMode` is true. Ignored when
   * `furnishMode` is false. */
  draftFurnitureBySlot?: Record<string, { furnitureId: string; variantId: string }> | null;
  /** Currently-selected housing slot in the Furnish session (for marker
   * highlighting and safe-park). */
  selectedSlotId?: string | null;
  /** Draft floor/wall surface ids to preview while `furnishMode` is true
   * (ignored otherwise). Fed into the existing shell-rebuild path exactly
   * like `draftFurnitureBySlot` feeds the furniture-rebuild path. */
  draftSurfaces?: { floor: string; leftWall: string; rightWall: string } | null;
  /** Currently-selected room surface in the Furnish session, for the
   * selection highlight. Mutually exclusive with `selectedSlotId` by
   * construction one level up (useFurnishSession's selectedTarget). */
  selectedSurface?: FurnishSurface | null;
  /** Invoked when a tap resolves to either an editable housing slot
   * (furniture, marker, or empty-slot hit proxy) or a room surface
   * (floor/left wall/right wall) while `furnishMode` is true. */
  onSelectTarget?: (target: { kind: 'slot'; slotId: string } | { kind: 'surface'; surface: FurnishSurface }) => void;
}

// The wooden board frame fills ~1/(1+ratio) of the Goals-camera frame. ~0 so
// the frame (plaque, opening, rail) sits just inside the viewport on its
// tighter axis, maximising the readable interior without cropping it.
const GOALS_MARGIN_RATIO = 0.01;

// Glidermon teleports (Tamagotchi-style, no walk cycle) to a weighted-random
// wander destination at a random interval in this range. Destinations are
// authored character slots (higher weight, may carry furniture interactions)
// plus every plain open floor tile -- see getWanderDestinations.
const WANDER_INTERVAL_RANGE_MS: [number, number] = [30_000, 180_000];
// If a "big" idle behavior (reading, a body-composite fidget, a reaction) is
// mid-playback when the wander timer fires, teleporting would cut it off
// jarringly -- wait this long and check again instead of skipping the cycle.
const WANDER_RETRY_DELAY_MS = 5_000;
// Roughly how often an eligible wander tick becomes a furniture interaction
// rather than a plain relocation. The rest are plain relocations. (A third
// "special / contextual" bucket is intentionally left for later, once an
// actual special behavior exists -- see chooseWanderActivity.)
const INTERACT_ACTIVITY_CHANCE = 0.3;
// How many recently-used furniture slots to avoid re-picking when other
// interaction options exist, so GliderMon doesn't operate the same item
// over and over.
const RECENT_FURNITURE_MEMORY = 3;

// --- DEV: furniture-interaction tuning aid --------------------------------
// When non-null, wandering is disabled and GliderMon is parked permanently in
// this interaction so the anchor/flip below can be dialed in with Fast Refresh
// (editing this file remounts the view). Once it looks right, copy
// DEBUG_INTERACTION_ANCHOR into the matching furniture entry's
// `interaction.interactionAnchor` in furnitureCatalog.ts, set
// `characterFlipX` to DEBUG_INTERACTION_FLIP_X, and set this back to null.
const DEBUG_FORCE_INTERACTION: { furnitureSlotId: string; behaviorKey: string } | null = null;
// e.g. { furnitureSlotId: 'seating', behaviorKey: 'sit' }
// +x/+z = toward the camera (down-screen), -y = lower. Once dialed in, copy
// these into the furniture entry's interaction.interactionAnchor in
// furnitureCatalog.ts and set DEBUG_FORCE_INTERACTION back to null.
const DEBUG_INTERACTION_ANCHOR = { xOffset: 0.06, yOffset: -0.05, zOffset: 0.17 };
const DEBUG_INTERACTION_FLIP_X = true;

// --- DEV: interactive hobby item testing aid -------------------------------
// When non-null, unlocks + equips this hobby variant into the `hobby` slot
// on mount (DEV only, never touches DEFAULT_FURNITURE_BY_SLOT/the permanent
// default) so each new item can be exercised without a shop purchase. Set
// back to null before finishing -- see src/game/housing/CLAUDE.md and the
// interactive-hobby-item spec's "Testing controls" section.
const DEBUG_FORCE_HOBBY_ITEM:
  | 'hobby_boombox'
  | 'hobby_mushroom_record_player'
  | 'hobby_tarot_table'
  | 'hobby_witchy_potion_station'
  | null = null;
// -----------------------------------------------------------------------

function randInMs([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

type WanderActivity = 'idle' | 'interact';

// Extensible choke point for wander behavior selection -- later this can fold
// in time of day, trust level, glucose state, personality, etc. (return type
// deliberately a union so a 'special' bucket can be added without callers
// changing shape).
function chooseWanderActivity(canInteract: boolean): WanderActivity {
  if (canInteract && Math.random() < INTERACT_ACTIVITY_CHANCE) return 'interact';
  return 'idle';
}

function pickWeighted<T>(items: T[], weightOf: (item: T) => number): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
  if (total <= 0) return items[(Math.random() * items.length) | 0];
  let r = Math.random() * total;
  for (const item of items) {
    r -= Math.max(0, weightOf(item));
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

// --- Furnish Nest: safe-park (see the selectedSlotId effect below) --------
// v1 rule: GliderMon "obscures" a slot if his tile falls inside that slot's
// footprint. He can never actually be teleported onto an OCCUPIED floor slot
// (getWalkableTiles excludes those), so in practice this only ever fires for
// an EMPTY slot he happens to be idling on/near when the player selects it.
// Known limitation (see the plan/CLAUDE.md): his sprite reads much larger on
// screen than one tile, so an adjacent tile can still visually cover most of
// the furniture -- ship this simple rule first and widen it only if that
// proves visible on-device, rather than redesigning safe-park up front.
function characterObscuresSlot(tile: { row: number; col: number }, slot: RoomSlotDef): boolean {
  if (slot.kind !== 'floor') return false;
  const w = slot.footprint?.w ?? 1;
  const h = slot.footprint?.h ?? 1;
  return tile.row >= slot.row && tile.row < slot.row + h && tile.col >= slot.col && tile.col < slot.col + w;
}

/** First authored, pure-idle (no interactions) character slot whose own
 * tile doesn't overlap `avoidSlot`. Returns undefined on tiers with no
 * authored character slots (0/2) or if every idle slot happens to overlap --
 * callers leave GliderMon where he is in that case, per spec. */
function findSafeFurnishIdleTile(tier: number, avoidSlot: RoomSlotDef): { row: number; col: number } | undefined {
  const idleSlots = getCharacterSlotsForTier(tier).filter((s) => !s.interactions || s.interactions.length === 0);
  const safe = idleSlots.find((s) => !characterObscuresSlot({ row: s.row, col: s.col }, avoidSlot));
  return safe ? { row: safe.row, col: safe.col } : undefined;
}

const DEFAULT_CHARACTER_SCALE = 1;
// NOTE: this constant is NOT comparable to the same-named constant in
// IsometricRoomView.tsx (quad renderer) or IsometricHousingThreeJS.tsx
// (legacy). Those renderers divide by a separate `roomScale` (fit-to-view)
// factor and apply extra empirically-tuned fudge multipliers on top, so
// their constants only make sense inside their own pixel-space chains. This
// renderer computes world-unit height directly with no such chain, so the
// constant here is tuned fresh against the `characterScale` value actually
// passed in from HudScreen.tsx (0.3) to land at a sensible size relative to
// TILE_SIZE/WALL_HEIGHT/furniture.
const CHARACTER_DESIRED_TILE_HEIGHT = 4.5;
const PHYSICS: any = Physics as any;

// Fixed camera offset from whatever point it's looking at -- the isometric
// *direction* never changes, only the look-at point does (overview: room
// origin; zoomed in: Glidermon). Translating position+target together by
// the same offset keeps the viewing angle identical in both modes.
const CAMERA_OFFSET = new THREE.Vector3(10, 10, 10);
// Fraction of extra breathing room added around the room's exact projected
// bounding box in overview mode -- big enough that walls don't touch the
// frame edge, small enough that the room still fills nearly all of it.
const OVERVIEW_MARGIN_RATIO = 0.06;
// Zoomed-in framing is computed from the character's actual world height
// (see characterHeightRef below) rather than a fixed guess, so it stays
// correctly framed regardless of characterScale. This ratio is how much of
// the vertical frustum the character's standing height should fill -- kept
// well under 1.0 to leave headroom for animations that extend past the base
// pose (wings raising, arms up, jumping).
const ZOOM_FRAME_FILL_RATIO = 0.55;
// How long the zoomed-in camera takes to pan from Glidermon's old spot to his
// new one after he wanders, instead of snapping instantly. Only applies while
// already zoomed in -- toggling into zoomed mode still frames on him
// immediately, since that's a deliberate user action, not a background move.
const CAMERA_PAN_DURATION_SECONDS = 2.5;

// How often the sky/lighting palette is re-sampled from the clock. Time of
// day drifts slowly, so there's no need to recompute every frame.
const SKY_UPDATE_INTERVAL_MS = 30000;

// Disposes every mesh's geometry + material(s) under `group` and removes
// them, without touching `group` itself -- used to clear out the previous
// furniture set before rebuilding it in response to a store change.
//
// A child tagged `userData.persistentContent` (an interactive hobby item's
// group -- see HobbyControllerCacheEntry below) is only ever detached here,
// never disposed: its Spine controller is reused across rebuilds (wander
// re-classifies front/behind every relocation, which would otherwise tear
// down and rebuild the skeleton mid-animation) and re-added by
// populateFurnitureGroup itself. Its own dispose() is called explicitly
// wherever the cache actually invalidates the entry (occupant changed) or
// the component unmounts.
function clearGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
    if (child.userData?.persistentContent) continue;
    child.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
  }
}

// One cache entry per hobby-type slot currently occupied by an
// interactiveHobbySpine variant -- keyed by slotId in the ref
// populateFurnitureGroup's callers thread through (hobbyControllersRef).
// Reused across ordinary rebuilds (wander, unrelated furniture/palette
// changes) as long as the occupant (variantId + paletteId) hasn't actually
// changed; disposed and rebuilt only when it has.
interface HobbyControllerCacheEntry {
  variantId: string;
  paletteId?: string;
  controller: InteractiveHobbyItem3D;
}

// (Re)builds every occupied slot's billboard into `group` and returns the
// per-frame update callbacks for any animated layers -- shared between the
// initial scene build and the reactive rebuild-on-store-change effect below,
// so buying/applying furniture in the shop is reflected without requiring a
// full app reload (the GL context itself is only ever created once; see
// `handleContextCreate`'s `initializedRef` guard).
//
// Build-then-swap: every new billboard is built first (texture loads await),
// and only once they're all ready is the old set cleared and the new one
// added, in a single synchronous step. Clearing first would leave the group
// empty across those awaits, blinking all furniture out for a few frames --
// visible when GliderMon sits/stands (which triggers a reclassify rebuild).
async function populateFurnitureGroup(
  group: THREE.Group,
  roomSizeTier: number,
  activeFurnitureBySlot: Record<string, { furnitureId: string; variantId: string; paletteId?: string }>,
  dims: { width: number; height: number },
  billboardQuaternion: THREE.Quaternion,
  characterWorldPos: { x: number; z: number },
  /** Slot ids to force in front of the character (the seat he's sitting in). */
  forceInFrontSlotIds?: Set<string>,
  /** Persistent interactive-hobby controller cache, keyed by slotId -- see
   * HobbyControllerCacheEntry. Reused across calls (held in a ref by the
   * component) so an active dance/tarot sequence survives an unrelated
   * rebuild instead of being torn down and losing its animation state. */
  hobbyCache?: Map<string, HobbyControllerCacheEntry>,
  /** Called when a cache entry is disposed because its occupant actually
   * changed (not just reclassified) -- lets the caller cancel any
   * in-progress GliderMon interaction that was targeting that slot before
   * the furniture it depends on disappears out from under it. */
  onHobbyControllerInvalidated?: (slotId: string) => void
): Promise<Array<(dt: number) => void>> {
  // Read fresh rather than threading through every populateFurnitureGroup
  // caller (several call sites rebuild for unrelated reasons -- wander,
  // sitting down, a palette change -- and none of them know or care about
  // lamp state) -- this is a plain async function, not a hook, so
  // useHousingStore.getState() is the same static read already used
  // elsewhere in this file (e.g. the wander scheduler). Only bakes the
  // INITIAL glow visibility for a freshly-built billboard; the interactive
  // toggle itself (tryLampTap) flips the already-built glow mesh in place
  // via the lampOffBySlot effect below instead of forcing a rebuild here.
  const lampOffBySlot = useHousingStore.getState().lampOffBySlot;

  // Drop/dispose any cached hobby controller whose slot is no longer
  // occupied by the same interactiveHobbySpine occupant (slot cleared,
  // furniture replaced, or its colorway changed) -- BEFORE building the new
  // set, so a genuinely stale controller never gets reused.
  if (hobbyCache) {
    for (const [slotId, entry] of [...hobbyCache.entries()]) {
      const occupant = activeFurnitureBySlot[slotId];
      const stillSame = occupant && occupant.variantId === entry.variantId && occupant.paletteId === entry.paletteId;
      if (!stillSame) {
        entry.controller.dispose();
        hobbyCache.delete(slotId);
        onHobbyControllerInvalidated?.(slotId);
      }
    }
  }

  const built: Array<{ group: THREE.Group; update?: (dt: number) => void }> = [];
  for (const slot of getSlotsForTier(roomSizeTier)) {
    const occupant = activeFurnitureBySlot[slot.slotId];
    if (!occupant) continue;

    const variant = getFurnitureDef(occupant.furnitureId)?.variants.find((v) => v.id === occupant.variantId);
    if (variant?.interactiveHobbySpine && hobbyCache) {
      const forceInFront = forceInFrontSlotIds?.has(slot.slotId) ?? false;
      let entry = hobbyCache.get(slot.slotId);
      if (!entry) {
        const controller = await buildInteractiveHobbyItem3D(
          slot,
          variant,
          dims,
          billboardQuaternion,
          characterWorldPos,
          occupant.paletteId,
          forceInFront
        );
        if (!controller) continue;
        controller.group.userData.persistentContent = true;
        entry = { variantId: occupant.variantId, paletteId: occupant.paletteId, controller };
        hobbyCache.set(slot.slotId, entry);
      } else {
        entry.controller.setDepthClass(forceInFront || isSlotAheadOfCharacter(slot, dims, characterWorldPos));
      }
      built.push({ group: entry.controller.group, update: entry.controller.update });
      continue;
    }

    const built3 = await buildFurnitureSlotBillboard(
      slot,
      occupant.furnitureId,
      occupant.variantId,
      dims,
      billboardQuaternion,
      characterWorldPos,
      forceInFrontSlotIds?.has(slot.slotId) ?? false,
      occupant.paletteId,
      !lampOffBySlot[slot.slotId]
    );
    if (built3) built.push(built3);
  }

  clearGroup(group);
  const updaters: Array<(dt: number) => void> = [];
  for (const b of built) {
    group.add(b.group);
    // Every furniture billboard (floor + wall-mounted) is room CONTENT, never
    // shell -- see renderLayers.ts.
    assignLayer(b.group, CONTENT_LAYER);
    if (b.update) updaters.push(b.update);
  }
  return updaters;
}

// Same isometric depth classification furniture uses (see
// slotWorldPlacement3D.ts) -- pulled out so a cached hobby controller can be
// reclassified without rebuilding it.
function isSlotAheadOfCharacter(
  slot: RoomSlotDef,
  dims: { width: number; height: number },
  characterWorldPos: { x: number; z: number }
): boolean {
  const { x, z } = gridToWorld(slot.row, slot.col, dims, slot.footprint);
  return x + z > characterWorldPos.x + characterWorldPos.z;
}

export default function IsometricRoomView3D({
  width = 300,
  height = 250,
  characterScale = DEFAULT_CHARACTER_SCALE,
  animation = 'idle',
  outfit,
  zoomedIn = false,
  cameraMode,
  boardTextures,
  boardInteractive = false,
  onBoardTap,
  furnishMode = false,
  draftFurnitureBySlot = null,
  selectedSlotId = null,
  draftSurfaces = null,
  selectedSurface = null,
  onSelectTarget,
}: IsometricRoomView3DProps) {
  const resolvedMode: RoomCameraMode = cameraMode ?? (zoomedIn ? 'glidermon' : 'nest');
  const catalog = useCosmeticsStore((state) => state.catalog);
  const selectedPaletteByCosmeticId = useCosmeticsStore((state) => state.selectedPaletteByCosmeticId);
  const roomSizeTier = useHousingStore((s) => s.roomSizeTier);
  const activeFloorPatternId = useHousingStore((s) => s.activeFloorPatternId);
  const activeWallPatternIdLeft = useHousingStore((s) => s.activeWallPatternIdLeft);
  const activeWallPatternIdRight = useHousingStore((s) => s.activeWallPatternIdRight);
  const persistedFurnitureBySlot = useHousingStore((s) => s.activeFurnitureBySlot);
  const characterTile = useHousingStore((s) => s.characterTile);
  const lampOffBySlot = useHousingStore((s) => s.lampOffBySlot);
  // While Furnish Nest is active, the room previews the draft session's
  // placements instead of the persisted store value -- everything below that
  // builds/rebuilds the furniture layer reads this, not the raw store value,
  // so Cancel/Done semantics stay entirely in the caller (HudScreen).
  const effectiveFurnitureBySlot = furnishMode && draftFurnitureBySlot ? draftFurnitureBySlot : persistedFurnitureBySlot;
  // Same reasoning as effectiveFurnitureBySlot -- while furnishing, preview
  // the draft surface ids; Cancel/Done semantics stay entirely in the
  // caller (HudScreen/useFurnishSession), this component never writes them.
  const effectiveFloorPatternId = furnishMode && draftSurfaces ? draftSurfaces.floor : activeFloorPatternId;
  const effectiveWallPatternIdLeft = furnishMode && draftSurfaces ? draftSurfaces.leftWall : activeWallPatternIdLeft;
  const effectiveWallPatternIdRight = furnishMode && draftSurfaces ? draftSurfaces.rightWall : activeWallPatternIdRight;

  const [isLoaded, setIsLoaded] = useState(false);
  const initializedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const glRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const spineRef = useRef<SpineCharacterController | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const glSizeRef = useRef({ w: width, h: height });
  const roomBoundsRef = useRef({ halfWidth: 2, halfDepth: 2, wallHeight: WALL_HEIGHT });
  // Where the zoomed-in camera should end up -- updated immediately whenever
  // Glidermon's tile changes.
  const characterTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  // Where the zoomed-in camera actually looks right now -- eases toward
  // characterTargetRef over CAMERA_PAN_DURATION_SECONDS rather than jumping
  // straight to it (see the characterTile effect and render loop below).
  const cameraLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPanFromRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPanElapsedRef = useRef(0);
  const characterHeightRef = useRef(TILE_SIZE * CHARACTER_DESIRED_TILE_HEIGHT * DEFAULT_CHARACTER_SCALE);
  const isZoomedInRef = useRef(false);
  // --- Goals camera + in-world Adventure Board ----------------------------
  const goalsModeRef = useRef(false);
  const boardObjectRef = useRef<AdventureBoardObject | null>(null);
  // The Goals camera aims at the board's frame center; its own eased look-at
  // is kept separate from the character follow-camera machinery above.
  const goalsTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const goalsLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const goalsPanFromRef = useRef(new THREE.Vector3(0, 0, 0));
  const goalsPanElapsedRef = useRef(0);
  const boardTextureVersionRef = useRef<string | null>(null);
  // Latest texture set, mirrored into a ref so the GL-context / tier-rebuild
  // paths (which don't re-run when the `boardTextures` prop changes) can pick
  // up whatever is current at build time.
  const boardTexturesRef = useRef(boardTextures);
  const boardInteractiveRef = useRef(boardInteractive);
  const onBoardTapRef = useRef(onBoardTap);
  const raycasterRef = useRef(new THREE.Raycaster());
  const tapStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // Layout px of this view -- for the tap raycast's NDC conversion.
  const layoutSizeRef = useRef({ w: width, h: height });
  useEffect(() => { boardTexturesRef.current = boardTextures; }, [boardTextures]);
  useEffect(() => { boardInteractiveRef.current = boardInteractive; }, [boardInteractive]);
  useEffect(() => { onBoardTapRef.current = onBoardTap; }, [onBoardTap]);
  useEffect(() => { layoutSizeRef.current = { w: width, h: height }; }, [width, height]);
  const skyTextureRef = useRef<THREE.DataTexture | null>(null);
  const skyDataRef = useRef<Uint8Array | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const lastSkyUpdateRef = useRef<number | null>(null);
  const treetopGroupRef = useRef<THREE.Group | null>(null);
  const furnitureUpdatersRef = useRef<Array<(dt: number) => void>>([]);
  // Dedicated sub-group for furniture billboards, added to the room group
  // once at initial build -- lets furniture be torn down/rebuilt in
  // response to store changes (buy/apply in the shop) without needing to
  // recreate the whole GL scene, which `handleContextCreate`'s
  // `initializedRef` guard only ever runs once per mount.
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  // Persistent interactive-hobby Spine controllers, keyed by slotId -- see
  // HobbyControllerCacheEntry / populateFurnitureGroup. Survives ordinary
  // furniture rebuilds (wander, unrelated palette/furniture changes) so an
  // active dance/tarot sequence isn't torn down mid-animation; only disposed
  // when its slot's actual occupant changes, or on unmount.
  const hobbyControllersRef = useRef<Map<string, HobbyControllerCacheEntry>>(new Map());
  // --- Furnish Nest: slot markers + tap-to-select --------------------------
  const furnishModeRef = useRef(furnishMode);
  const selectedSlotIdRef = useRef(selectedSlotId);
  const onSelectTargetRef = useRef(onSelectTarget);
  const furnishMarkerGroupRef = useRef<THREE.Group | null>(null);
  const furnishMarkerHandleRef = useRef<FurnishSlotMarkersHandle | null>(null);
  const previousSelectedSlotIdRef = useRef<string | null>(selectedSlotId);
  // --- Furnish Nest: room-surface (floor/wall) selection highlight --------
  const selectedSurfaceRef = useRef(selectedSurface);
  const furnishHighlightMeshRef = useRef<THREE.Mesh | null>(null);
  useEffect(() => { furnishModeRef.current = furnishMode; }, [furnishMode]);
  useEffect(() => { selectedSlotIdRef.current = selectedSlotId; }, [selectedSlotId]);
  useEffect(() => { selectedSurfaceRef.current = selectedSurface; }, [selectedSurface]);
  useEffect(() => { onSelectTargetRef.current = onSelectTarget; }, [onSelectTarget]);
  const billboardQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const roomDimsRef = useRef<{ width: number; height: number } | null>(null);
  // Reused by every furniture rebuild for front/behind renderOrder
  // classification -- see buildFurnitureSlotBillboard. Updated whenever
  // Glidermon wanders to a new tile (see the characterTile effect below).
  const characterWorldPosRef = useRef<{ x: number; z: number } | null>(null);
  // The wrapping group whose position places Glidermon in the room -- held
  // in a ref (not just a local var in handleContextCreate) so the
  // characterTile effect can move it after the initial scene build.
  const characterGroupRef = useRef<THREE.Group | null>(null);

  // Furniture-interaction wander state (see the wander scheduler + characterTile
  // effect below). `pendingInteractionRef` is set by the scheduler when it
  // decides a relocation should end in a furniture interaction; the
  // characterTile effect consumes it once Glidermon has been repositioned.
  // `interactingRef` blocks further wandering until the interaction ends.
  // `recentFurnitureRef` is a small ring buffer for anti-repeat.
  const pendingInteractionRef = useRef<
    | {
        behaviorKey: string;
        furnitureSlotId: string;
        anchor?: { xOffset: number; yOffset: number; zOffset?: number };
        flipX?: boolean;
      }
    | null
  >(null);
  const interactingRef = useRef(false);
  const recentFurnitureRef = useRef<string[]>([]);
  // While an anchored/flipped interaction is active, the render loop re-asserts
  // this transform on the character group every frame -- so a stray effect
  // re-run (StrictMode, a furniture change) can't knock him off the seat.
  // null => the character group is positioned normally by the characterTile effect.
  const interactionTransformRef = useRef<{ x: number; y: number; z: number; scaleX: number } | null>(null);
  // Which hobby-type furniture slot (if any) the CURRENT interaction targets
  // -- set right before starting a dance/tarot sequence, cleared once that
  // sequence fully ends. Lets cancelActiveFurnitureInteraction() find the
  // right controller to stopAndReset() without guessing from behaviorKey
  // alone (both the legacy piano/record-player placeholder AND the new
  // BoomBox/Mushroom variants share behaviorKey "dance").
  const activeHobbySlotIdRef = useRef<string | null>(null);
  // Tarot's two-phase sub-state -- see the pending-interaction handling
  // below. null outside of a tarot interaction. Guards against the
  // synchronous forceIdle() call inside the reveal-start handoff re-entering
  // the "thinking" phase's own onDone as if it were a genuine interruption.
  const tarotPhaseRef = useRef<'thinking' | 'celebrating' | null>(null);

  const scaleRef = useRef(characterScale);
  useEffect(() => {
    scaleRef.current = characterScale;
  }, [characterScale]);

  // Cancels any in-progress furniture interaction (chair sit, hobby dance/
  // tarot, ...) cleanly, from outside the characterTile effect that started
  // it. forceIdle() synchronously fires whatever onDone callback that effect
  // registered -- which already does the full cleanup (interactingRef,
  // render position, rebuildFurniture, camera) and, for a hobby interaction,
  // also resets the furniture-side Spine controller (see the pending-
  // interaction handling below) -- so this needs no cleanup logic of its
  // own. A no-op when nothing is actually interacting. See spec section 15 /
  // this file's furnishMode and unmount effects for the call sites.
  const cancelActiveFurnitureInteraction = useCallback(() => {
    if (!interactingRef.current) return;
    spineRef.current?.idleDriver.forceIdle();
  }, []);

  // Furnish Nest lets the player replace/remove furniture (including an
  // active hobby item) while GliderMon might be mid-interaction with it --
  // cancel before that can happen. Only fires on the false->true edge (the
  // dep array + the ref check inside make this idempotent either way).
  useEffect(() => {
    if (furnishMode) cancelActiveFurnitureInteraction();
  }, [furnishMode, cancelActiveFurnitureInteraction]);

  // Rebuilds just the furniture layer when the store changes (buy/apply in
  // the shop) -- skips the very first render, since the initial scene build
  // in handleContextCreate already populates it from the same state.
  const skipInitialFurnitureEffect = useRef(true);
  useEffect(() => {
    if (__DEV__) console.log(`[housing3D DEBUG] furniture effect fired, skip=${skipInitialFurnitureEffect.current}, hasGroup=${!!furnitureGroupRef.current}`);
    if (skipInitialFurnitureEffect.current) {
      skipInitialFurnitureEffect.current = false;
      return;
    }
    const group = furnitureGroupRef.current;
    const dims = roomDimsRef.current;
    const billboardQuaternion = billboardQuaternionRef.current;
    const characterWorldPos = characterWorldPosRef.current;
    if (!group || !dims || !billboardQuaternion || !characterWorldPos) return;
    let cancelled = false;
    populateFurnitureGroup(
      group,
      roomSizeTier,
      effectiveFurnitureBySlot,
      dims,
      billboardQuaternion,
      characterWorldPos,
      undefined,
      hobbyControllersRef.current,
      (slotId) => {
        if (activeHobbySlotIdRef.current === slotId) cancelActiveFurnitureInteraction();
      }
    ).then((updaters) => {
      if (__DEV__) console.log(`[housing3D DEBUG] rebuilt furniture layer, ${updaters.length} updater(s)`);
      if (!cancelled) furnitureUpdatersRef.current = updaters;
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveFurnitureBySlot, roomSizeTier]);

  // Tap-to-toggle a placed lamp's light (tryLampTap below) flips
  // lampOffBySlot instead of touching activeFurnitureBySlot, specifically so
  // it DOESN'T have to go through the (async, texture-reloading) furniture
  // rebuild above -- this just flips the `.visible` flag on each lamp's
  // already-built glow mesh (tagged userData.isLightGlow in
  // staticFurnitureBillboard3D.ts) directly. A freshly-built billboard's
  // glow already starts in the right state (populateFurnitureGroup reads
  // lampOffBySlot itself), so this effect only has real work to do on an
  // actual toggle, but it's harmless to also run right after a rebuild.
  useEffect(() => {
    const group = furnitureGroupRef.current;
    if (!group) return;
    for (const slotGroup of group.children) {
      const slotId = slotGroup.userData?.slotId;
      if (typeof slotId !== 'string') continue;
      const glow = slotGroup.children.find((c) => c.userData?.isLightGlow);
      if (glow) glow.visible = !lampOffBySlot[slotId];
    }
  }, [lampOffBySlot, effectiveFurnitureBySlot]);

  // Furnish Nest: full marker-group build/rebuild/teardown. Only when
  // furnishMode toggles or the actual slot occupancy/tier changes -- a pure
  // selection change is handled by the lighter effect right below instead,
  // so re-selecting a slot never re-triggers this (or any Skia work; marker
  // textures are cached by (label,state) regardless).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (furnishMarkerGroupRef.current) {
      scene.remove(furnishMarkerGroupRef.current);
      // Plain geometry/material dispose -- Material.dispose() does not
      // cascade into disposing its .map, so the shared cached marker
      // textures (furnishMarkerTexture.ts) are untouched.
      clearGroup(furnishMarkerGroupRef.current);
      furnishMarkerGroupRef.current = null;
      furnishMarkerHandleRef.current = null;
    }

    const dims = roomDimsRef.current;
    const billboardQuaternion = billboardQuaternionRef.current;
    const characterWorldPos = characterWorldPosRef.current;
    if (!furnishMode || !dims || !billboardQuaternion || !characterWorldPos) return;

    const handle = buildFurnishSlotMarkers3D(
      roomSizeTier,
      effectiveFurnitureBySlot,
      dims,
      billboardQuaternion,
      characterWorldPos,
      selectedSlotIdRef.current
    );
    scene.add(handle.group);
    assignLayer(handle.group, CONTENT_LAYER);
    furnishMarkerGroupRef.current = handle.group;
    furnishMarkerHandleRef.current = handle;
    previousSelectedSlotIdRef.current = selectedSlotIdRef.current;
  }, [furnishMode, effectiveFurnitureBySlot, roomSizeTier]);

  // Furnish Nest: selection-only marker update. Swaps just the two affected
  // markers' texture/scale/renderOrder in place -- no group rebuild.
  useEffect(() => {
    const handle = furnishMarkerHandleRef.current;
    const characterWorldPos = characterWorldPosRef.current;
    if (handle && characterWorldPos) {
      updateFurnishMarkerSelection(
        handle.markerMeshes,
        effectiveFurnitureBySlot,
        roomSizeTier,
        characterWorldPos,
        previousSelectedSlotIdRef.current,
        selectedSlotId
      );
    }
    previousSelectedSlotIdRef.current = selectedSlotId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlotId]);

  // Furnish Nest: selected room-surface (floor/wall) highlight. At most one
  // at a time -- selectedSurface and selectedSlotId are mutually exclusive
  // by construction one level up (useFurnishSession's selectedTarget), so
  // this never competes with the furniture-slot marker system above.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (furnishHighlightMeshRef.current) {
      scene.remove(furnishHighlightMeshRef.current);
      furnishHighlightMeshRef.current.geometry.dispose();
      (furnishHighlightMeshRef.current.material as THREE.Material).dispose();
      furnishHighlightMeshRef.current = null;
    }
    if (!furnishMode || !selectedSurface) return;
    const bounds = roomBoundsRef.current;
    const mesh = buildFurnishSurfaceHighlight3D(selectedSurface, bounds.halfWidth, bounds.halfDepth);
    if (!mesh) return;
    scene.add(mesh);
    assignLayer(mesh, CONTENT_LAYER);
    furnishHighlightMeshRef.current = mesh;
  }, [furnishMode, selectedSurface, roomSizeTier]);

  // Moves Glidermon to his current tile whenever it changes after the
  // initial mount (the wander scheduler below writes to housingStore's
  // characterTile) -- teleports instantly (Tamagotchi-style, no walk cycle),
  // then re-baked furniture renderOrder against the new position so he
  // still layers correctly in front of/behind furniture on his new tile.
  const skipInitialTileEffect = useRef(true);
  useEffect(() => {
    if (skipInitialTileEffect.current) {
      skipInitialTileEffect.current = false;
      return;
    }
    const characterGroup = characterGroupRef.current;
    const furnitureGroup = furnitureGroupRef.current;
    const dims = roomDimsRef.current;
    const billboardQuaternion = billboardQuaternionRef.current;
    if (!characterGroup || !furnitureGroup || !dims || !billboardQuaternion) return;

    const { x: charX, z: charZ } = gridToWorld(characterTile.row, characterTile.col, dims);
    characterGroup.position.set(charX, 0, charZ);
    characterGroup.scale.x = 1; // clear any interaction flip from a previous tile
    characterWorldPosRef.current = { x: charX, z: charZ };
    characterTargetRef.current.set(charX, characterHeightRef.current / 2, charZ);

    // Re-sort the board in front of / behind GliderMon by isometric depth now
    // that he's moved -- same classification furniture uses.
    const boardObj = boardObjectRef.current;
    if (boardObj) boardObj.setDepthClass(classifyBoardDepth(boardObj.baseWorldPos, { x: charX, z: charZ }));

    // Kick off a camera pan toward the new target if zoomed in and visible;
    // otherwise there's nothing to animate, so just snap the (unseen)
    // look-at point to match -- avoids a jarring jump if the user zooms in
    // later mid-"pan".
    if (isZoomedInRef.current) {
      cameraPanFromRef.current.copy(cameraLookAtRef.current);
      cameraPanElapsedRef.current = 0;
    } else {
      cameraLookAtRef.current.copy(characterTargetRef.current);
    }

    // Consume a furniture interaction queued by the wander scheduler now that
    // Glidermon has been repositioned onto the interaction tile. The idle
    // driver owns the behavior + its duration; `onEnd` fires on BOTH natural
    // completion and any interruption (reaction, forceIdle), so render-position
    // cleanup and the `interactingRef` reset always run.
    let cancelled = false;
    // (Re)build furniture billboards classified against `charPos` for
    // in-front/behind-the-character renderOrder. While seated, `forceInFront`
    // pins the seat's own billboard in front of GliderMon so its seat/back
    // draw over his legs -- independent of his world position.
    const rebuildFurniture = (charPos: { x: number; z: number }, forceInFront?: Set<string>) => {
      populateFurnitureGroup(
        furnitureGroup,
        roomSizeTier,
        effectiveFurnitureBySlot,
        dims,
        billboardQuaternion,
        charPos,
        forceInFront,
        hobbyControllersRef.current,
        (slotId) => {
          if (activeHobbySlotIdRef.current === slotId) cancelActiveFurnitureInteraction();
        }
      ).then((updaters) => {
        if (!cancelled) furnitureUpdatersRef.current = updaters;
      });
    };

    // Point the zoomed-in camera at a world x/z (character mid-height) --
    // smoothly if already zoomed in, snap the unseen look-at otherwise. Used
    // to follow GliderMon onto a seat anchor and back off again.
    const aimCameraAt = (ax: number, az: number) => {
      characterTargetRef.current.set(ax, characterHeightRef.current / 2, az);
      if (isZoomedInRef.current) {
        cameraPanFromRef.current.copy(cameraLookAtRef.current);
        cameraPanElapsedRef.current = 0;
      } else {
        cameraLookAtRef.current.copy(characterTargetRef.current);
      }
    };

    const pending = pendingInteractionRef.current;
    pendingInteractionRef.current = null;
    let furniturePos = { x: charX, z: charZ };
    // Force set stays undefined for the plain chair (its tall backrest would
    // then draw over his torso). Kept plumbed for a future layered seat asset.
    const forceInFrontSlots: Set<string> | undefined = undefined;
    if (pending) {
      const driver = spineRef.current?.idleDriver;
      // Shared cleanup for every interaction kind (generic, hobby dance,
      // tarot) -- resets render position/camera and rebuilds furniture.
      // Hobby-specific paths below reset the furniture-side Spine controller
      // and hobby-only refs FIRST, then call this.
      const finishInteraction = (reason: string) => {
        interactingRef.current = false;
        interactionTransformRef.current = null;
        characterGroup.position.set(charX, 0, charZ);
        characterGroup.scale.x = 1;
        characterWorldPosRef.current = { x: charX, z: charZ };
        if (!cancelled) {
          rebuildFurniture({ x: charX, z: charZ });
          aimCameraAt(charX, charZ); // pan back off the seat when he stands
        }
        if (__DEV__) console.log(`[housing3D] interaction "${pending.behaviorKey}" ended (${reason})`);
      };

      // An interactive hobby item (BoomBox/MushroomRecordPlayer/TarotTable --
      // see interactiveHobbyItem3D.ts) is distinguished from the legacy
      // piano/record-player placeholder (which shares behaviorKey "dance")
      // by presence in hobbyControllersRef, not by behaviorKey alone.
      const hobbyController = hobbyControllersRef.current.get(pending.furnitureSlotId)?.controller;
      let started = false;

      if (hobbyController && pending.behaviorKey === 'tarotThink') {
        // Two-phase sequence: GliderMon thinks while the table shuffles, then
        // both switch to celebration/reveal together once the shuffle
        // completes (driven by the controller's onRevealStart, itself fired
        // from a Spine TrackEntry completion listener -- see
        // interactiveHobbyItem3D.ts's playTarotSequence). The 120s hold below
        // is only a safety net in case onRevealStart never fires (e.g. a
        // missing animation) -- normal sequences never reach it.
        activeHobbySlotIdRef.current = pending.furnitureSlotId;
        tarotPhaseRef.current = 'thinking';

        const onThinkPhaseEnd = (reason: string) => {
          // A no-op when this fires as the synchronous side effect of our
          // own forceIdle() call in onRevealStart below (tarotPhaseRef has
          // already moved on to 'celebrating' by then) -- only a genuine
          // early end (external interruption, or the safety-net timeout)
          // still finds 'thinking' here.
          if (tarotPhaseRef.current !== 'thinking') return;
          tarotPhaseRef.current = null;
          activeHobbySlotIdRef.current = null;
          hobbyController.stopAndReset();
          finishInteraction(reason);
        };
        const onCelebratePhaseEnd = (reason: string) => {
          if (tarotPhaseRef.current !== 'celebrating') return;
          tarotPhaseRef.current = null;
          activeHobbySlotIdRef.current = null;
          hobbyController.stopAndReset();
          finishInteraction(reason);
        };

        started = driver?.startInteraction('tarotThink', 120, onThinkPhaseEnd) ?? false;
        if (started) {
          hobbyController.playTarotSequence({
            onRevealStart: (_card, revealDurationSeconds) => {
              if (tarotPhaseRef.current !== 'thinking') return;
              tarotPhaseRef.current = 'celebrating';
              driver?.forceIdle(); // ends "thinking" -- onThinkPhaseEnd above no-ops, already past that phase
              // Sized to the reveal clip's own real duration so GliderMon's
              // celebration and the visible card end together (see spec
              // section 12) instead of the card vanishing mid-celebration
              // (stopAndReset() fires the instant the reveal clip completes).
              const celebrateStarted = driver?.startInteraction('dance', revealDurationSeconds, onCelebratePhaseEnd) ?? false;
              if (!celebrateStarted) {
                // Shouldn't happen (forceIdle just returned the driver to
                // idle) -- fail safe rather than leaving state stuck.
                tarotPhaseRef.current = null;
                activeHobbySlotIdRef.current = null;
                hobbyController.stopAndReset();
                finishInteraction('interrupted');
              }
            },
          });
        }
      } else if (hobbyController && pending.behaviorKey === 'dance') {
        // Simple dance: GliderMon's temporary dance behavior + the item's own
        // dance loop + Music/NotesRising, all sharing one randomized 5-7s
        // duration (spec section 7/8) so they start and end together.
        activeHobbySlotIdRef.current = pending.furnitureSlotId;
        const danceDurationSeconds = 5 + Math.random() * 2;
        started =
          driver?.startInteraction('dance', danceDurationSeconds, (reason) => {
            activeHobbySlotIdRef.current = null;
            hobbyController.stopAndReset();
            finishInteraction(reason);
          }) ?? false;
        if (started) hobbyController.playDance(danceDurationSeconds);
      } else {
        started = driver?.startInteraction(pending.behaviorKey, undefined, finishInteraction) ?? false;
      }

      if (started) {
        interactingRef.current = true;
        // Seating-style anchor: offset from the furniture's own world origin
        // (NOT this tile), plus an optional horizontal mirror (to face into a
        // chair). Held every frame by the render loop via
        // interactionTransformRef so a stray effect re-run can't knock him off.
        // DoubleSide materials => the flip won't backface-cull.
        let x = charX;
        let z = charZ;
        if (pending.anchor) {
          const furnitureSlot = getSlotsForTier(roomSizeTier).find((s) => s.slotId === pending.furnitureSlotId);
          if (furnitureSlot) {
            const seat = gridToWorld(furnitureSlot.row, furnitureSlot.col, dims, furnitureSlot.footprint);
            x = seat.x + pending.anchor.xOffset;
            z = seat.z + (pending.anchor.zOffset ?? 0);
          }
        }
        const y = pending.anchor?.yOffset ?? 0;
        const scaleX = pending.flipX ? -1 : 1;
        if (pending.anchor || pending.flipX) {
          interactionTransformRef.current = { x, y, z, scaleX };
          characterGroup.position.set(x, y, z);
          characterGroup.scale.x = scaleX;
          characterWorldPosRef.current = { x, z };
          furniturePos = { x, z };
          aimCameraAt(x, z); // follow him onto the seat, not the approach tile
        }
      }
    }

    rebuildFurniture(furniturePos, forceInFrontSlots);
    return () => {
      cancelled = true;
    };
  }, [characterTile, roomSizeTier, effectiveFurnitureBySlot]);

  // Wander scheduler: at each WANDER_INTERVAL_RANGE_MS tick, if Glidermon
  // isn't mid-behavior or mid-interaction, pick a weighted-random wander
  // destination (authored character slots + plain open tiles) and either just
  // relocate there or, ~30% of eligible ticks, relocate + start a furniture
  // interaction. Runs on a plain setTimeout chain (not the rAF render loop)
  // since this cadence doesn't need per-frame precision.
  useEffect(() => {
    if (!isLoaded) return;
    // DEV: parked-interaction tuning mode disables wandering entirely.
    if (DEBUG_FORCE_INTERACTION) return;
    // Furnish Nest: pause wandering for the duration of the editing session
    // so GliderMon doesn't repeatedly walk over furniture the player is
    // trying to place. Toggling furnishMode re-runs this effect (it's in the
    // deps below), which cancels the pending timeout on the way out and
    // restarts the chain fresh when it flips back to false.
    if (furnishMode) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const scheduleNext = () => {
      timeoutId = setTimeout(attemptWander, randInMs(WANDER_INTERVAL_RANGE_MS));
    };

    const attemptWander = () => {
      if (cancelled) return;
      const idleDriver = spineRef.current?.idleDriver;
      // Don't teleport out of an in-progress behavior or a furniture
      // interaction -- retry shortly instead of skipping the cycle.
      if (interactingRef.current || (idleDriver && idleDriver.getCurrentBehavior() !== 'idle')) {
        timeoutId = setTimeout(attemptWander, WANDER_RETRY_DELAY_MS);
        return;
      }
      const { roomSizeTier: tier, activeFurnitureBySlot: occupied, characterTile: current, setCharacterTile } =
        useHousingStore.getState();

      const destinations = getWanderDestinations(tier, occupied).filter(
        (d) => d.tile.row !== current.row || d.tile.col !== current.col
      );
      if (destinations.length === 0) {
        scheduleNext();
        return;
      }

      // Interaction candidates, preferring furniture not used recently (fall
      // back to allowing repeats only if that leaves nothing).
      const withInteraction = destinations.filter((d) => d.interactions.length > 0);
      const fresh = withInteraction.filter((d) =>
        d.interactions.some((i) => !recentFurnitureRef.current.includes(i.furnitureSlotId))
      );
      const interactionPool = fresh.length > 0 ? fresh : withInteraction;

      if (chooseWanderActivity(interactionPool.length > 0) === 'interact') {
        const dest = pickWeighted(interactionPool, (d) => d.weight);
        const chosen =
          dest?.interactions.find((i) => !recentFurnitureRef.current.includes(i.furnitureSlotId)) ??
          dest?.interactions[0];
        if (dest && chosen) {
          recentFurnitureRef.current = [chosen.furnitureSlotId, ...recentFurnitureRef.current].slice(
            0,
            RECENT_FURNITURE_MEMORY
          );
          pendingInteractionRef.current = {
            behaviorKey: chosen.behavior,
            furnitureSlotId: chosen.furnitureSlotId,
            anchor: chosen.interactionAnchor,
            flipX: chosen.characterFlipX,
          };
          if (__DEV__) {
            console.log(
              `[housing3D] wander -> interact "${chosen.behavior}" @ ${chosen.furnitureSlotId}, tile (${dest.tile.row},${dest.tile.col}), flipX=${chosen.characterFlipX}`
            );
          }
          setCharacterTile(dest.tile);
          scheduleNext();
          return;
        }
      }

      // Plain relocation (authored slots weighted higher, plain tiles still in play).
      const dest = pickWeighted(destinations, (d) => d.weight) ?? destinations[0];
      if (__DEV__) {
        console.log(
          `[housing3D] wander -> idle tile (${dest.tile.row},${dest.tile.col})${
            dest.characterSlotId ? ` [${dest.characterSlotId}]` : ''
          }`
        );
      }
      setCharacterTile(dest.tile);
      scheduleNext();
    };

    timeoutId = setTimeout(attemptWander, randInMs(WANDER_INTERVAL_RANGE_MS));
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoaded, furnishMode]);

  // Furnish Nest: reactive safe-park. Entering Furnish alone moves nothing --
  // only selecting a slot (or switching to a different one) checks whether
  // GliderMon is currently standing in the way of THAT slot, and relocates
  // him only then. Uses only the existing setCharacterTile action; doesn't
  // touch the permanent wander system.
  useEffect(() => {
    if (!furnishMode || !selectedSlotId) return;
    const dims = roomDimsRef.current;
    if (!dims) return;
    const slot = getSlotsForTier(roomSizeTier).find((s) => s.slotId === selectedSlotId);
    if (!slot || !characterObscuresSlot(characterTile, slot)) return;
    const safeTile = findSafeFurnishIdleTile(roomSizeTier, slot);
    if (safeTile) useHousingStore.getState().setCharacterTile(safeTile);
  }, [furnishMode, selectedSlotId, characterTile, roomSizeTier]);

  // DEV: when DEBUG_FORCE_HOBBY_ITEM is set, unlock + equip that variant into
  // the `hobby` slot once, so it can be exercised without a shop purchase.
  // Only writes the store once per mount (guarded by hasAppliedRef) -- it
  // does NOT keep forcing the slot back if the player (or Furnish Nest)
  // changes it afterward.
  const debugHobbyItemAppliedRef = useRef(false);
  useEffect(() => {
    if (!DEBUG_FORCE_HOBBY_ITEM || !isLoaded || debugHobbyItemAppliedRef.current) return;
    debugHobbyItemAppliedRef.current = true;
    const store = useHousingStore.getState();
    const furnitureId = 'hobby';
    const variantId = DEBUG_FORCE_HOBBY_ITEM;
    store.unlockFurniture(`${furnitureId}_${variantId}`);
    store.setActiveFurniture('hobby', furnitureId, variantId);
    if (__DEV__) console.log(`[housing3D] DEBUG_FORCE_HOBBY_ITEM: equipped ${furnitureId}_${variantId}`);
  }, [isLoaded]);

  // DEV: when DEBUG_FORCE_INTERACTION is set, park Glidermon in that
  // interaction indefinitely with the tuning anchor/flip constants above --
  // applied directly (not via the wander/characterTile path) so editing the
  // constants and letting Fast Refresh remount the view re-applies them.
  useEffect(() => {
    if (!DEBUG_FORCE_INTERACTION || !isLoaded) return;
    const characterGroup = characterGroupRef.current;
    const dims = roomDimsRef.current;
    const driver = spineRef.current?.idleDriver;
    if (!characterGroup || !dims || !driver) return;

    const { furnitureSlotId, behaviorKey } = DEBUG_FORCE_INTERACTION;
    const furnitureSlot = getSlotsForTier(roomSizeTier).find((s) => s.slotId === furnitureSlotId);
    if (!furnitureSlot) {
      if (__DEV__) console.warn(`[housing3D] DEBUG_FORCE_INTERACTION: no furniture slot "${furnitureSlotId}"`);
      return;
    }
    const seat = gridToWorld(furnitureSlot.row, furnitureSlot.col, dims, furnitureSlot.footprint);
    const a = DEBUG_INTERACTION_ANCHOR;
    const x = seat.x + a.xOffset;
    const y = a.yOffset;
    const z = seat.z + a.zOffset;
    const scaleX = DEBUG_INTERACTION_FLIP_X ? -1 : 1;
    interactionTransformRef.current = { x, y, z, scaleX };
    characterGroup.position.set(x, y, z);
    characterGroup.scale.x = scaleX;
    characterWorldPosRef.current = { x, z };
    characterTargetRef.current.set(x, characterHeightRef.current / 2, z);
    cameraLookAtRef.current.copy(characterTargetRef.current);

    interactingRef.current = true;
    driver.forceIdle();
    const ok = driver.startInteraction(behaviorKey, 1e9);

    // Re-classify furniture renderOrder against the seated position so the
    // chair front can render over his legs.
    const furnitureGroup = furnitureGroupRef.current;
    const billboardQuaternion = billboardQuaternionRef.current;
    if (furnitureGroup && billboardQuaternion) {
      populateFurnitureGroup(
        furnitureGroup,
        roomSizeTier,
        useHousingStore.getState().activeFurnitureBySlot,
        dims,
        billboardQuaternion,
        { x, z },
        undefined,
        hobbyControllersRef.current
      ).then((updaters) => {
        furnitureUpdatersRef.current = updaters;
      });
    }

    if (__DEV__) {
      console.log(
        `[housing3D] DEBUG park "${behaviorKey}" @ ${furnitureSlotId} slot=(${furnitureSlot.row},${furnitureSlot.col}) dims=${dims.width}x${dims.height} seat=(${seat.x.toFixed(2)},${seat.z.toFixed(2)}) charPos=(${characterGroup.position.x.toFixed(2)},${characterGroup.position.y.toFixed(2)},${characterGroup.position.z.toFixed(2)}) anchor=${JSON.stringify(a)} flipX=${DEBUG_INTERACTION_FLIP_X} started=${ok}`
      );
    }
    // Anchor/flip constants in deps so Fast Refresh re-applies them without a
    // full reload while tuning.
  }, [isLoaded, roomSizeTier, DEBUG_INTERACTION_ANCHOR.xOffset, DEBUG_INTERACTION_ANCHOR.yOffset, DEBUG_INTERACTION_ANCHOR.zOffset, DEBUG_INTERACTION_FLIP_X]);

  const animationRef = useRef(animation);
  useEffect(() => {
    animationRef.current = animation;
    // 'idle' is the sentinel default meaning "let the lifelike idle driver
    // run" -- it isn't a real Spine clip name (the controller maps it to
    // Idle/Idle at creation), so forwarding it verbatim to state.setAnimation
    // throws "Animation not found: idle". Skip the sentinel; guard the rest so
    // a bad name can't red-box the whole room (also protects against Fast
    // Refresh re-running this effect after the controller already exists).
    if (!spineRef.current || !animation || animation === 'idle') return;
    try {
      spineRef.current.setAnimation(animation, true);
    } catch (err) {
      if (__DEV__) console.warn(`[housing3D] setAnimation("${animation}") failed:`, err);
    }
  }, [animation]);

  const outfitRef = useRef<OutfitSlot | undefined>(outfit ?? undefined);
  useEffect(() => {
    outfitRef.current = outfit ?? undefined;
    if (spineRef.current) spineRef.current.applyOutfit(outfitRef.current);
  }, [outfit]);

  // Re-applies the currently-equipped outfit so an equipped recolorable
  // cosmetic (e.g. a hat) picks up a new colorway chosen on the Outfit
  // screen without needing to re-equip it.
  useEffect(() => {
    if (spineRef.current) spineRef.current.setSelectedPalettes(selectedPaletteByCosmeticId);
  }, [selectedPaletteByCosmeticId]);

  const updateCameraForZoom = useCallback((camera: THREE.OrthographicCamera, zoomedIn: boolean) => {
    const { w: glW, h: glH } = glSizeRef.current;
    const aspect = glW / glH;

    // Goals preset: aim at the Placeholder's center and fit BOTH the wooden
    // frame's width and height (whichever is tighter, so it works on narrow
    // devices) with a thin even margin. The board is billboarded toward the
    // fixed iso camera, so its world w/h map ~1:1 to screen extents.
    if (goalsModeRef.current) {
      const gTarget = goalsLookAtRef.current;
      camera.position.copy(gTarget).add(CAMERA_OFFSET);
      camera.lookAt(gTarget);
      const size = boardObjectRef.current?.frameWorldSize ?? { w: 2.6, h: 3.0 };
      const halfForHeight = size.h / 2;
      const halfForWidth = size.w / (2 * aspect);
      const half = Math.max(halfForHeight, halfForWidth) * (1 + GOALS_MARGIN_RATIO);
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();
      return;
    }

    const target = zoomedIn ? cameraLookAtRef.current : new THREE.Vector3(0, 0, 0);
    camera.position.copy(target).add(CAMERA_OFFSET);
    camera.lookAt(target);

    if (zoomedIn) {
      const halfExtent = characterHeightRef.current / (2 * ZOOM_FRAME_FILL_RATIO);
      camera.left = -halfExtent * aspect;
      camera.right = halfExtent * aspect;
      camera.top = halfExtent;
      camera.bottom = -halfExtent;
      camera.updateProjectionMatrix();
      return;
    }

    // Overview mode: fit the frustum to the room's exact projected bounding
    // box instead of a fixed/guessed extent. The isometric angle foreshortens
    // the floor footprint (X/Z) and the wall height (Y) by different amounts,
    // so a fixed extent either clips the walls or leaves a lot of dead space
    // -- projecting the actual room corners into camera space and fitting to
    // that gets the tightest frame that still shows the whole room. Camera
    // space is used directly (not world space) since OrthographicCamera's
    // left/right/top/bottom are defined in that space.
    camera.updateMatrixWorld(true);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const { halfWidth, halfDepth, wallHeight } = roomBoundsRef.current;

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    const corner = new THREE.Vector3();
    for (const x of [-halfWidth, halfWidth]) {
      for (const y of [0, wallHeight]) {
        for (const z of [-halfDepth, halfDepth]) {
          corner.set(x, y, z).sub(camera.position);
          const u = corner.dot(right);
          const v = corner.dot(up);
          minU = Math.min(minU, u);
          maxU = Math.max(maxU, u);
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
        }
      }
    }

    const contentWidth = (maxU - minU) * (1 + OVERVIEW_MARGIN_RATIO);
    const contentHeight = (maxV - minV) * (1 + OVERVIEW_MARGIN_RATIO);
    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;

    // Whichever dimension is aspect-starved dictates the final span, so the
    // frustum keeps the viewport's aspect ratio (otherwise the room would
    // render stretched) while still fully containing the other dimension.
    const finalHeight = Math.max(contentHeight, contentWidth / aspect);
    const finalWidth = finalHeight * aspect;

    camera.left = centerU - finalWidth / 2;
    camera.right = centerU + finalWidth / 2;
    camera.bottom = centerV - finalHeight / 2;
    camera.top = centerV + finalHeight / 2;
    camera.updateProjectionMatrix();
  }, []);

  // Re-fits the renderer/camera if the underlying GL surface's OWN reported
  // buffer size (gl.drawingBufferWidth/Height) ever actually changes.
  // Confirmed on-device (Android emulator, expo-gl) that it does NOT: the
  // native GL surface is sized once at creation and does not resize when
  // this component's `width`/`height` props change afterward, however the
  // RN layout box grows/shrinks around it -- the rendered content simply
  // stays pinned at its original size within the new layout bounds, leaving
  // an unpainted band. That's why HudScreen does not attempt to grow the
  // room while Furnish Nest is active: doing so cleanly would require
  // remounting this component (a new GL context, i.e. a brief full
  // texture/Spine reload) rather than a live resize, which reads as a worse
  // regression than not growing it. Kept as defensive dead-weight-free
  // code (a cheap per-frame check, see `render` below) in case a future
  // expo-gl/platform version does start resizing the surface live, or a
  // genuine device rotation triggers it differently than a same-orientation
  // layout change did in testing -- never rely on this alone to grow the
  // room. Reads gl.drawingBufferWidth/Height (physical pixels, already
  // scaled by device density) rather than the `width`/`height` props, which
  // are React Native LOGICAL/dp units -- a different unit system than the
  // GL surface's own size (handleContextCreate always sized the renderer
  // from the GL context's own reported buffer dimensions, never from the RN
  // layout props, and renderer.setPixelRatio(1) means the renderer treats
  // whatever it's given as 1:1 physical pixels).
  const syncGlSizeIfChanged = useCallback(() => {
    const gl = glRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!gl || !renderer || !camera) return;
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    if (w === glSizeRef.current.w && h === glSizeRef.current.h) return;
    glSizeRef.current = { w, h };
    gl.viewport(0, 0, w, h);
    renderer.setSize(w, h, false);
    renderer.setViewport(0, 0, w, h);
    updateCameraForZoom(camera, isZoomedInRef.current);
  }, [updateCameraForZoom]);

  // Rebuilds just the floor/wall shell when the store changes (buy/apply a
  // material or procedural pattern in the shop) -- skips the very first
  // render for the same reason as the furniture effect above. The shell
  // group holds only the floor tiles + 2 walls (furniture/character/treetop
  // are separate scene children, not nested under it -- see
  // handleContextCreate), so it can be torn down and replaced wholesale
  // without touching anything else in the scene.
  const skipInitialShellEffect = useRef(true);
  useEffect(() => {
    if (skipInitialShellEffect.current) {
      skipInitialShellEffect.current = false;
      return;
    }
    const scene = sceneRef.current;
    const oldGroup = roomGroupRef.current;
    const dims = roomDimsRef.current;
    const camera = cameraRef.current;
    if (!scene || !oldGroup || !dims || !camera) return;
    let cancelled = false;
    const grid = {
      width: dims.width,
      height: dims.height,
      floorPatternId: effectiveFloorPatternId,
      wallPatternIdLeft: effectiveWallPatternIdLeft,
      wallPatternIdRight: effectiveWallPatternIdRight,
    };
    buildRoomScene3D(grid).then((built) => {
      if (cancelled) return;
      scene.remove(oldGroup);
      clearGroup(oldGroup);
      scene.add(built.group);
      assignLayer(built.group, ROOM_SHELL_LAYER);
      roomGroupRef.current = built.group;
      roomBoundsRef.current = { halfWidth: built.halfWidth, halfDepth: built.halfDepth, wallHeight: built.wallHeight };
      updateCameraForZoom(camera, isZoomedInRef.current);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveFloorPatternId, effectiveWallPatternIdLeft, effectiveWallPatternIdRight, updateCameraForZoom]);

  useEffect(() => {
    isZoomedInRef.current = resolvedMode === 'glidermon';
    goalsModeRef.current = resolvedMode === 'goals';
    const camera = cameraRef.current;

    if (resolvedMode === 'glidermon') {
      // Deliberate user action, not a background wander -- frame on Glidermon
      // immediately rather than starting a multi-second pan from wherever the
      // (unseen) look-at point last was.
      cameraLookAtRef.current.copy(characterTargetRef.current);
    } else if (resolvedMode === 'goals') {
      // Ease from wherever the camera is currently looking to the board.
      if (camera) goalsPanFromRef.current.copy(camera.position).sub(CAMERA_OFFSET);
      else goalsPanFromRef.current.set(0, 0, 0);
      goalsLookAtRef.current.copy(goalsPanFromRef.current);
      goalsPanElapsedRef.current = 0;
    }

    if (camera) updateCameraForZoom(camera, isZoomedInRef.current);
    // Full board texture only when the Goals camera frames it; compact otherwise.
    boardObjectRef.current?.setDensity(resolvedMode === 'goals' ? 'full' : 'compact');
  }, [resolvedMode, updateCameraForZoom]);

  // Upload a fresh board-UI texture set when its versioned goal state changes
  // (never on movement / camera / unrelated re-renders). The previous texture
  // stays visible until this runs; the board object disposes the old GPU ones.
  useEffect(() => {
    const board = boardObjectRef.current;
    // No board yet -> handleContextCreate / the tier rebuild will pick up
    // boardTexturesRef.current when it finishes building.
    if (!board || !boardTextures) return;
    if (boardTextures.version !== boardTextureVersionRef.current) {
      boardTextureVersionRef.current = boardTextures.version;
      board.setTextures(boardTextures);
    }
    board.setDensity(resolvedMode === 'goals' ? 'full' : 'compact');
  }, [boardTextures, resolvedMode]);

  // Tap -> raycast the board surface -> start check-in (Goals + not-planned).
  // Tap (outside Furnish Nest only) -> raycast the furniture layer -> if the
  // hit slot's billboard has a light-glow child (staticFurnitureBillboard3D.ts
  // tags it userData.isLightGlow -- only lamps with a lightSocket ever get
  // one), flip that lamp's on/off state. Deliberately independent of
  // tryBoardTap/tryFurnishTap below: it raycasts a different object
  // (furnitureGroupRef, not the board surface or the marker group), so it
  // can just run first and fall through harmlessly when nothing lamp-shaped
  // was hit, same NDC/layer setup as the other two.
  const tryLampTap = useCallback((localX: number, localY: number): boolean => {
    if (furnishModeRef.current) return false;
    const camera = cameraRef.current;
    const furnitureGroup = furnitureGroupRef.current;
    if (!camera || !furnitureGroup) return false;
    const { w, h } = layoutSizeRef.current;
    if (w <= 0 || h <= 0) return false;
    const ndc = new THREE.Vector2((localX / w) * 2 - 1, -((localY / h) * 2 - 1));
    raycasterRef.current.layers.set(CONTENT_LAYER);
    raycasterRef.current.setFromCamera(ndc, camera);
    const hits = raycasterRef.current.intersectObject(furnitureGroup, true);
    for (const hit of hits) {
      // Climb to the direct child of furnitureGroup -- that's one slot's
      // whole billboard group (userData.slotId, see populateFurnitureGroup),
      // whose own direct children are its mesh + (maybe) its glow.
      let obj: THREE.Object3D | null = hit.object;
      while (obj && obj.parent !== furnitureGroup) obj = obj.parent;
      if (!obj) continue;
      const slotId = obj.userData?.slotId;
      if (typeof slotId !== 'string') continue;
      const hasLight = obj.children.some((c) => c.userData?.isLightGlow);
      if (hasLight) {
        useHousingStore.getState().toggleLamp(slotId);
        return true;
      }
      return false; // hit real furniture, just not a lamp -- don't fall through to the board.
    }
    return false;
  }, []);

  const tryBoardTap = useCallback((localX: number, localY: number) => {
    if (!boardInteractiveRef.current || !onBoardTapRef.current) return;
    const camera = cameraRef.current;
    const board = boardObjectRef.current;
    if (!camera || !board) return;
    const { w, h } = layoutSizeRef.current;
    if (w <= 0 || h <= 0) return;
    const ndc = new THREE.Vector2((localX / w) * 2 - 1, -((localY / h) * 2 - 1));
    // The board surface lives on CONTENT_LAYER (see renderLayers.ts); a
    // Raycaster defaults to layer 0 only, which would silently miss it.
    raycasterRef.current.layers.set(CONTENT_LAYER);
    raycasterRef.current.setFromCamera(ndc, camera);
    const hits = raycasterRef.current.intersectObject(board.boardSurfaceMesh, false);
    if (hits.length > 0) onBoardTapRef.current();
  }, []);

  // Tap -> raycast, in priority order: (1) occupied furniture + empty-slot
  // hit-proxies/markers (CONTENT_LAYER) -> a housing slot; (2) only if that
  // came up empty, the room shell itself (ROOM_SHELL_LAYER, floor + 2 walls)
  // -> a room surface; (3) otherwise nothing. This is what makes "tap a
  // chair" resolve to Seating rather than the floor underneath it, and "tap
  // the framed picture" resolve to its Wall Art slot rather than the wall
  // behind it -- both fall out of pass (1) always running first, not from
  // any bespoke per-case logic. Mirrors tryBoardTap's NDC/layer setup;
  // only the target objects and hit-resolution differ.
  const tryFurnishTap = useCallback((localX: number, localY: number) => {
    if (!furnishModeRef.current || !onSelectTargetRef.current) return;
    const camera = cameraRef.current;
    if (!camera) return;
    const { w, h } = layoutSizeRef.current;
    if (w <= 0 || h <= 0) return;
    const ndc = new THREE.Vector2((localX / w) * 2 - 1, -((localY / h) * 2 - 1));

    // Pass 1: furniture (incl. wall art) + empty-slot markers/hit-proxies.
    const furnitureGroup = furnitureGroupRef.current;
    const markerGroup = furnishMarkerGroupRef.current;
    if (furnitureGroup || markerGroup) {
      raycasterRef.current.layers.set(CONTENT_LAYER);
      raycasterRef.current.setFromCamera(ndc, camera);
      const targets = [furnitureGroup, markerGroup].filter(Boolean) as THREE.Object3D[];
      const hits = raycasterRef.current.intersectObjects(targets, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          const slotId = obj.userData?.slotId;
          if (typeof slotId === 'string') {
            onSelectTargetRef.current({ kind: 'slot', slotId });
            return;
          }
          obj = obj.parent;
        }
      }
    }

    // Pass 2: the room shell itself (floor + 2 walls) -- only reached when
    // pass 1 found nothing at all.
    const roomGroup = roomGroupRef.current;
    if (roomGroup) {
      raycasterRef.current.layers.set(ROOM_SHELL_LAYER);
      raycasterRef.current.setFromCamera(ndc, camera);
      const shellHits = raycasterRef.current.intersectObject(roomGroup, true);
      for (const hit of shellHits) {
        const surface = hit.object.userData?.furnishSurface;
        if (surface === 'floor' || surface === 'leftWall' || surface === 'rightWall') {
          onSelectTargetRef.current({ kind: 'surface', surface });
          return;
        }
      }
    }
  }, []);

  // Plays a one-shot positive reaction whenever something outside this
  // component (e.g. completing a Home-screen goal) fires
  // characterReactionStore -- a decoupled trigger bus, same pattern as
  // acornFxStore, since nothing outside this component holds a ref to the
  // Spine controller. No-ops harmlessly if the controller isn't ready yet.
  const reactionNonce = useCharacterReactionStore((s) => s.nonce);
  const reactionName = useCharacterReactionStore((s) => s.reaction);
  const lastReactionNonceRef = useRef(0);
  useEffect(() => {
    if (reactionNonce === lastReactionNonceRef.current) return;
    lastReactionNonceRef.current = reactionNonce;
    if (reactionName) spineRef.current?.playReaction(reactionName);
  }, [reactionNonce, reactionName]);

  // Rebuild the board when the room tier changes (rare -- a progression
  // unlock). Skips the first run; the initial build happens in
  // handleContextCreate from the same state.
  const skipInitialBoardEffect = useRef(true);
  useEffect(() => {
    if (skipInitialBoardEffect.current) { skipInitialBoardEffect.current = false; return; }
    const scene = sceneRef.current;
    const billboardQuaternion = billboardQuaternionRef.current;
    if (!scene || !billboardQuaternion) return;
    const dims = ROOM_SIZE_TIERS[roomSizeTier] ?? ROOM_SIZE_TIERS[0];
    let cancelled = false;
    buildAdventureBoard3D(dims, billboardQuaternion, roomSizeTier).then((board) => {
      if (cancelled || !board) return;
      const old = boardObjectRef.current;
      if (old) { scene.remove(old.group); old.dispose(); }
      scene.add(board.group);
      assignLayer(board.group, CONTENT_LAYER);
      boardObjectRef.current = board;
      goalsTargetRef.current.copy(board.frameCenterWorld);
      const tex = boardTexturesRef.current;
      if (tex) { board.setTextures(tex); boardTextureVersionRef.current = tex.version; }
      board.setDensity(goalsModeRef.current ? 'full' : 'compact');
      const cw = characterWorldPosRef.current;
      if (cw) board.setDepthClass(classifyBoardDepth(board.baseWorldPos, cw));
    });
    return () => { cancelled = true; };
    // boardTextures intentionally not a dep -- the dedicated texture effect handles updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSizeTier]);

  useEffect(
    () => () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      cancelActiveFurnitureInteraction();
      for (const entry of hobbyControllersRef.current.values()) entry.controller.dispose();
      hobbyControllersRef.current.clear();
      rendererRef.current?.dispose();
      boardObjectRef.current?.dispose();
      skyTextureRef.current?.dispose();
      const treetopMesh = treetopGroupRef.current?.children[0] as THREE.Mesh | undefined;
      if (treetopMesh) {
        treetopMesh.geometry.dispose();
        (treetopMesh.material as THREE.MeshBasicMaterial).map?.dispose();
        (treetopMesh.material as THREE.MeshBasicMaterial).dispose();
      }
    },
    [cancelActiveFurnitureInteraction]
  );

  const handleContextCreate = useCallback(async (gl: any) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      glRef.current = gl;
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      glSizeRef.current = { w, h };
      gl.viewport(0, 0, w, h);

      const renderer = new Renderer({ gl });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.setViewport(0, 0, w, h);
      renderer.setClearColor(0x1a1c2c, 1);
      // Two-pass room render (see renderLayers.ts) drives clear/clearDepth
      // itself between passes -- a plain per-frame autoClear would wipe pass
      // 1's shell before pass 2 could use its depth, or double-clear.
      renderer.autoClear = false;

      const scene = new THREE.Scene();
      sceneRef.current = scene;
      const initialSkyPalette = getSkyPalette();
      const { texture: skyTexture, data: skyData } = createSkyTexture();
      scene.background = skyTexture;
      skyTextureRef.current = skyTexture;
      skyDataRef.current = skyData;
      lastSkyUpdateRef.current = performance.now();

      const dims = ROOM_SIZE_TIERS[roomSizeTier] ?? ROOM_SIZE_TIERS[0];
      const grid = {
        width: dims.width,
        height: dims.height,
        floorPatternId: effectiveFloorPatternId,
        wallPatternIdLeft: effectiveWallPatternIdLeft,
        wallPatternIdRight: effectiveWallPatternIdRight,
      };
      const built = await buildRoomScene3D(grid);
      scene.add(built.group);
      assignLayer(built.group, ROOM_SHELL_LAYER);
      roomBoundsRef.current = { halfWidth: built.halfWidth, halfDepth: built.halfDepth, wallHeight: built.wallHeight };

      const ambient = new THREE.AmbientLight(
        rgbToHex(initialSkyPalette.ambientColor),
        initialSkyPalette.ambientIntensity
      );
      scene.add(ambient);
      ambientLightRef.current = ambient;

      const sun = new THREE.DirectionalLight(rgbToHex(initialSkyPalette.sunColor), initialSkyPalette.sunIntensity);
      sun.position.set(3, 5, 2);
      scene.add(sun);
      sunLightRef.current = sun;
      // Lights are layer-gated like everything else -- the shell's
      // MeshStandardMaterial floor/walls need them in pass 1; contents are
      // unlit MeshBasicMaterial so this is just belt-and-suspenders.
      ambient.layers.enableAll();
      sun.layers.enableAll();

      // True isometric camera: equal offset on all three axes + lookAt the
      // origin. No hand-derived projection math -- Three.js's own camera
      // matrix does the isometric projection for us. Bounds are placeholder
      // here -- updateCameraForZoom sets the real framing once the room and
      // character are both built below.
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      cameraRef.current = camera;

      // Every billboard (furniture, character, treetop) shares this one
      // fixed rotation instead of each computing its own lookAt -- see
      // billboard3D.ts for why that matters under an orthographic camera.
      // Uses the fixed CAMERA_OFFSET direction rather than the live
      // camera.position, since that position now pans during zoom -- the
      // viewing *direction* (and therefore correct billboard facing) never
      // changes, only where it's centered.
      const billboardQuaternion = computeBillboardQuaternion(CAMERA_OFFSET);
      const treetopPromise = createTreetopBackdrop3D(built.halfWidth, built.halfDepth, billboardQuaternion);

      roomGroupRef.current = built.group;
      billboardQuaternionRef.current = billboardQuaternion;
      roomDimsRef.current = dims;

      // Computed here (before furniture/character are built) so both can
      // share it -- furniture uses it to classify itself as in front of or
      // behind the character for renderOrder (see buildFurnitureSlotBillboard).
      const characterWorldPos = gridToWorld(characterTile.row, characterTile.col, dims);
      characterWorldPosRef.current = characterWorldPos;

      const furnitureGroup = new THREE.Group();
      scene.add(furnitureGroup);
      furnitureGroupRef.current = furnitureGroup;
      furnitureUpdatersRef.current = await populateFurnitureGroup(
        furnitureGroup,
        roomSizeTier,
        effectiveFurnitureBySlot,
        dims,
        billboardQuaternion,
        characterWorldPos,
        undefined,
        hobbyControllersRef.current
      );

      // Daily Adventure Board -- fixed system furnishing at the `adventureBoard`
      // slot. The Spine frame + easel and a texture-mapped surface plane for
      // the dynamic goal UI, both inside the scene so world depth sorts them
      // against GliderMon and furniture naturally.
      const board = await buildAdventureBoard3D(dims, billboardQuaternion, roomSizeTier);
      if (board) {
        scene.add(board.group);
        assignLayer(board.group, CONTENT_LAYER);
        boardObjectRef.current = board;
        goalsTargetRef.current.copy(board.frameCenterWorld);
        goalsLookAtRef.current.copy(board.frameCenterWorld);
        const tex = boardTexturesRef.current;
        if (tex) {
          board.setTextures(tex);
          boardTextureVersionRef.current = tex.version;
        }
        board.setDensity(goalsModeRef.current ? 'full' : 'compact');
        board.setDepthClass(classifyBoardDepth(board.baseWorldPos, characterWorldPos));
      }

      const controller = await createSpineCharacterController({
        animation: animationRef.current,
        outfit: outfitRef.current,
        catalog,
        selectedPaletteByCosmeticId,
      });
      controller.mesh.frustumCulled = false;

      const characterGroup = new THREE.Group();
      characterGroup.quaternion.copy(billboardQuaternion);

      let characterWorldHeight = TILE_SIZE * CHARACTER_DESIRED_TILE_HEIGHT * DEFAULT_CHARACTER_SCALE;
      const nativeHeight = computeNativeCharacterHeight(controller.mesh);
      if (nativeHeight && nativeHeight > 0) {
        const scaleMultiplier = scaleRef.current > 0 ? scaleRef.current : DEFAULT_CHARACTER_SCALE;
        const desiredWorldHeight = TILE_SIZE * CHARACTER_DESIRED_TILE_HEIGHT * scaleMultiplier;
        characterWorldHeight = desiredWorldHeight;
        const finalScale = desiredWorldHeight / nativeHeight;

        if (Number.isFinite(finalScale)) {
          const sk = controller.skeleton;
          sk.scaleX = finalScale;
          sk.scaleY = finalScale;

          // Feet land at the group's local origin -- world placement is
          // handled entirely by characterGroup.position below.
          const feet = controller.getFeetLocalPosition();
          sk.x = -feet.x * finalScale;
          sk.y = -feet.y * finalScale;

          sk.updateWorldTransform(PHYSICS.update);
          controller.mesh.refreshMeshes();
        }
      }

      characterGroup.add(controller.mesh);
      const { x: charX, z: charZ } = characterWorldPos;
      characterGroup.position.set(charX, 0, charZ);
      scene.add(characterGroup);
      assignLayer(characterGroup, CONTENT_LAYER);
      characterGroupRef.current = characterGroup;

      // Zoomed-in framing centers on the character's mid-height, not their
      // feet, so the camera doesn't look like it's aimed at the floor.
      characterTargetRef.current.set(charX, characterWorldHeight / 2, charZ);
      cameraLookAtRef.current.copy(characterTargetRef.current);
      cameraPanFromRef.current.copy(characterTargetRef.current);
      characterHeightRef.current = characterWorldHeight;

      // Real world-space billboard (not screen-locked), so it naturally
      // pans/scales with the room when the camera zooms in on the character
      // -- same depth-tested approach as furniture (treetopBackdrop3D.ts).
      const treetopGroup = await treetopPromise;
      scene.add(treetopGroup);
      // Shell, not content -- it deliberately depth-tests against the walls
      // (see treetopBackdrop3D.ts), so it must share pass 1's depth buffer.
      assignLayer(treetopGroup, ROOM_SHELL_LAYER);
      treetopGroupRef.current = treetopGroup;

      updateCameraForZoom(camera, isZoomedInRef.current);

      rendererRef.current = renderer;
      spineRef.current = controller;
      lastTimeRef.current = null;

      const render = () => {
        try {
          syncGlSizeIfChanged();

          const now = performance.now();
          const last = lastTimeRef.current ?? now;
          const deltaSeconds = Math.min((now - last) / 1000, 1 / 15);
          lastTimeRef.current = now;

          // Only the character skeleton and any animated furniture (e.g. a
          // campfire flicker, a chest opening) update per frame -- everything
          // else in the room shell was built once above.
          controller.update(deltaSeconds);
          for (const update of furnitureUpdatersRef.current) update(deltaSeconds);

          // Pin the character onto an interaction anchor/flip for the duration,
          // overriding any effect that repositioned him this frame.
          const it = interactionTransformRef.current;
          if (it) {
            characterGroup.position.set(it.x, it.y, it.z);
            characterGroup.scale.x = it.scaleX;
          }

          // Re-aim every frame while zoomed in (not just on toggle) so the
          // camera tracks Glidermon live -- this is what makes the zoomed-in
          // view follow him if/when his position in the room changes, rather
          // than only framing where he was when zoom was switched on. The
          // look-at point eases toward characterTargetRef.current (see the
          // characterTile effect above) instead of jumping straight there,
          // so a wander pans the view smoothly rather than snapping.
          if (isZoomedInRef.current) {
            cameraPanElapsedRef.current += deltaSeconds;
            const t = Math.min(cameraPanElapsedRef.current / CAMERA_PAN_DURATION_SECONDS, 1);
            const eased = t * t * (3 - 2 * t); // smoothstep ease-in-out
            cameraLookAtRef.current.lerpVectors(cameraPanFromRef.current, characterTargetRef.current, eased);
            updateCameraForZoom(camera, true);
          }

          // Goals preset: ease the (static) board target the same way.
          if (goalsModeRef.current) {
            goalsPanElapsedRef.current += deltaSeconds;
            const gt = Math.min(goalsPanElapsedRef.current / CAMERA_PAN_DURATION_SECONDS, 1);
            const gEased = gt * gt * (3 - 2 * gt);
            goalsLookAtRef.current.lerpVectors(goalsPanFromRef.current, goalsTargetRef.current, gEased);
            updateCameraForZoom(camera, false);
          }

          if (now - (lastSkyUpdateRef.current ?? 0) > SKY_UPDATE_INTERVAL_MS) {
            lastSkyUpdateRef.current = now;
            const palette = getSkyPalette();
            if (skyDataRef.current && skyTextureRef.current) {
              paintSky(skyDataRef.current, palette);
              skyTextureRef.current.needsUpdate = true;
            }
            if (ambientLightRef.current) {
              ambientLightRef.current.color.setHex(rgbToHex(palette.ambientColor));
              ambientLightRef.current.intensity = palette.ambientIntensity;
            }
            if (sunLightRef.current) {
              sunLightRef.current.color.setHex(rgbToHex(palette.sunColor));
              sunLightRef.current.intensity = palette.sunIntensity;
            }
          }

          // Two-pass room render (see renderLayers.ts): the architectural
          // shell (floor/walls + the treetop backdrop that depth-tests
          // against them) gets its own depth buffer in pass 1, which is then
          // cleared before room CONTENTS (GliderMon, furniture, wall art, the
          // Adventure Board) render in pass 2 against a fresh buffer -- so
          // the shell's real 3D geometry can never depth-test (and clip)
          // against a billboarded content object. Contents still share ONE
          // depth buffer with each other, so their existing renderOrder-based
          // occlusion (furnitureBillboard3D.ts / adventureBoard3D.ts) is
          // unaffected. `scene.background` is toggled off for pass 2 only --
          // three.js draws it as a full-screen quad on every render() call
          // regardless of autoClear, so left on it would paint over pass 1.
          renderer.clear(true, true, true);
          camera.layers.set(ROOM_SHELL_LAYER);
          renderer.render(scene, camera);
          renderer.clearDepth();
          scene.background = null;
          camera.layers.set(CONTENT_LAYER);
          renderer.render(scene, camera);
          scene.background = skyTexture;

          gl.endFrameEXP();
          rafRef.current = requestAnimationFrame(render);
        } catch (err) {
          console.error('IsometricRoomView3D render error', err);
        }
      };

      render();
    } catch (error) {
      console.error('Failed to initialize 3D room view:', error);
    } finally {
      setIsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSizeTier, effectiveFloorPatternId, effectiveWallPatternIdLeft, effectiveWallPatternIdRight, effectiveFurnitureBySlot, catalog]);

  return (
    <View
      style={{ width, height, backgroundColor: 'transparent' }}
      // Tap detection for: the in-world Adventure Board (Goals +
      // not-planned); while Furnish Nest is active, furniture/slot-marker
      // selection; and, outside Furnish Nest, toggling a tapped lamp's
      // light. Always claims the responder (this view is a fixed,
      // non-scrolling panel -- see HudScreen.tsx -- so there's no drag/scroll
      // to conflict with); a quick tap that barely moves raycasts, anything
      // larger is left alone (no room drag today, but future-proof).
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        tapStartRef.current = {
          x: e.nativeEvent.locationX,
          y: e.nativeEvent.locationY,
          t: Date.now(),
        };
      }}
      onResponderRelease={(e) => {
        const s = tapStartRef.current;
        tapStartRef.current = null;
        if (!s) return;
        const dx = e.nativeEvent.locationX - s.x;
        const dy = e.nativeEvent.locationY - s.y;
        if (Math.hypot(dx, dy) > 12 || Date.now() - s.t > 600) return;
        if (furnishModeRef.current) {
          tryFurnishTap(e.nativeEvent.locationX, e.nativeEvent.locationY);
        } else if (!tryLampTap(e.nativeEvent.locationX, e.nativeEvent.locationY)) {
          tryBoardTap(e.nativeEvent.locationX, e.nativeEvent.locationY);
        }
      }}
    >
      <GLView style={{ flex: 1 }} onContextCreate={handleContextCreate} />
      {!isLoaded && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(26, 28, 44, 0.4)',
          }}
        />
      )}
    </View>
  );
}
