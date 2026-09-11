// game/housing/render/furnishSlotMarkers3D.ts
//
// Builds the subtle world-space slot markers + invisible hit proxies shown
// only while Furnish Nest is active. Deliberately iterates getSlotsForTier
// only (never getSystemSlotsForTier) -- this is the structural guarantee
// that the Adventure Board (and any future system slot) never gets a
// marker, is never selectable, and never appears here at all.
import * as THREE from 'three';
import { makeSpritePlane } from './tileSprite';
import { resolveSlotWorldPlacement, RENDER_ORDER_BEHIND_CHARACTER, RENDER_ORDER_IN_FRONT_OF_CHARACTER } from './furnitureBillboard3D';
import { getFurnishMarkerTexture, FurnishMarkerState } from './furnishMarkerTexture';
import { getSlotsForTier, RoomSlotDef } from '../types/roomSlots';
import { SLOT_TYPE_LABELS } from '../types/furnitureCatalog';
import { RoomDims3D, TILE_SIZE } from './grid3D';

type FurniturePlacementMap = Record<string, { furnitureId: string; variantId: string }>;

export interface FurnishSlotMarkersHandle {
  group: THREE.Group;
  /** One entry per editable slot -- lets the selection-only update path
   * (IsometricRoomView3D.tsx) swap a marker's texture/scale in place instead
   * of rebuilding the whole group when only selectedSlotId changes. */
  markerMeshes: Map<string, THREE.Mesh>;
}

// Marker chip world size (independent of the slot's own furniture
// footprint -- it's a small floating label, not a footprint outline).
const MARKER_WORLD_WIDTH = 0.72;
const MARKER_ASPECT = 200 / 76; // matches furnishMarkerTexture.ts's texture dims
const MARKER_WORLD_HEIGHT = MARKER_WORLD_WIDTH / MARKER_ASPECT;
// Marker hierarchy: selected > empty > occupied. Occupied furniture is
// already tappable on its own, so its marker collapses to a small quiet dot
// (see furnishMarkerTexture.ts's drawOccupiedDot) rather than competing with
// the furniture art for attention; empty slots stay clearly legible since
// the marker IS the primary way to discover them; selected is the most
// assertive so the currently-edited slot is unambiguous.
const SCALE_BY_STATE: Record<FurnishMarkerState, number> = {
  occupied: 0.55,
  empty: 1.0,
  selected: 1.3,
};
// Small lift off the floor plane so the marker plane doesn't z-fight with
// the floor tile directly beneath it.
const FLOOR_MARKER_LIFT = 0.06;

// Empty-slot hit proxies are deliberately larger than the visual marker AND
// larger than the slot's literal furniture footprint -- a 1-tile isometric
// footprint projects small on a phone screen, so a proxy sized exactly to it
// would be a frustratingly tiny tap target.
const HIT_PROXY_FOOTPRINT_MARGIN = 1.5;

function slotLabel(slot: RoomSlotDef): string {
  return SLOT_TYPE_LABELS[slot.type];
}

function markerState(slot: RoomSlotDef, placements: FurniturePlacementMap, selectedSlotId: string | null): FurnishMarkerState {
  if (selectedSlotId === slot.slotId) return 'selected';
  return placements[slot.slotId] ? 'occupied' : 'empty';
}

/** Same front/behind classification furniture already uses for this exact
 * slot, plus a small in-band epsilon -- never a global always-on-top order. */
function markerRenderOrder(
  position: { x: number; y: number; z: number },
  characterWorldPos: { x: number; z: number },
  state: FurnishMarkerState
): { renderOrder: number; behind: boolean } {
  const slotDepthScore = position.x + position.y + position.z;
  const characterDepthScore = characterWorldPos.x + characterWorldPos.z;
  const behind = slotDepthScore <= characterDepthScore;
  const epsilon = state === 'selected' ? (behind ? 0.08 : 0.6) : (behind ? 0.05 : 0.5);
  const band = behind ? RENDER_ORDER_BEHIND_CHARACTER : RENDER_ORDER_IN_FRONT_OF_CHARACTER;
  return { renderOrder: band + epsilon, behind };
}

function buildMarkerMesh(
  slot: RoomSlotDef,
  dims: RoomDims3D,
  billboardQuaternion: THREE.Quaternion,
  characterWorldPos: { x: number; z: number },
  state: FurnishMarkerState
): THREE.Mesh | null {
  const texture = getFurnishMarkerTexture(slotLabel(slot), state);
  if (!texture) return null;
  const { position, quaternion } = resolveSlotWorldPlacement(slot, dims, billboardQuaternion);
  const { renderOrder, behind } = markerRenderOrder(position, characterWorldPos, state);

  const mesh = makeSpritePlane(texture, MARKER_WORLD_WIDTH, MARKER_WORLD_HEIGHT, {
    depthTest: true,
    opaqueCutout: behind,
  });
  const scale = SCALE_BY_STATE[state];
  mesh.scale.set(scale, scale, 1);
  mesh.renderOrder = renderOrder;
  mesh.quaternion.copy(quaternion);
  const lift = slot.kind === 'floor' ? FLOOR_MARKER_LIFT : 0;
  mesh.position.set(position.x, position.y + lift, position.z);
  mesh.userData.slotId = slot.slotId;
  return mesh;
}

function buildEmptySlotHitProxy(
  slot: RoomSlotDef,
  dims: RoomDims3D,
  billboardQuaternion: THREE.Quaternion
): THREE.Mesh {
  const { position, quaternion } = resolveSlotWorldPlacement(slot, dims, billboardQuaternion);
  const footprintW = (slot.footprint?.w ?? 1) * TILE_SIZE;
  const footprintH = (slot.footprint?.h ?? 1) * TILE_SIZE;
  const geom = new THREE.PlaneGeometry(footprintW * HIT_PROXY_FOOTPRINT_MARGIN, footprintH * HIT_PROXY_FOOTPRINT_MARGIN);
  // side: DoubleSide is deliberate -- a proxy's orientation (especially wall
  // slots, mounted flat against the wall plane rather than standing upright)
  // is easy to get backwards, which would look correctly positioned but
  // silently fail every raycast from the camera's actual side.
  const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geom, material);
  // visible MUST stay true (the default) -- Raycaster.intersectObject skips
  // visible=false objects entirely; opacity 0 is what makes this invisible.
  mesh.quaternion.copy(quaternion);
  if (slot.kind === 'floor') {
    // Floor proxies lie flat on the ground, not standing upright like a
    // billboard -- rotate the plane's default +Z-facing normal to +Y.
    mesh.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    mesh.position.set(position.x, position.y + 0.01, position.z);
  } else {
    mesh.position.set(position.x, position.y, position.z);
  }
  mesh.userData.slotId = slot.slotId;
  return mesh;
}

export function buildFurnishSlotMarkers3D(
  roomSizeTier: number,
  effectivePlacements: FurniturePlacementMap,
  dims: RoomDims3D,
  billboardQuaternion: THREE.Quaternion,
  characterWorldPos: { x: number; z: number },
  selectedSlotId: string | null
): FurnishSlotMarkersHandle {
  const group = new THREE.Group();
  const markerMeshes = new Map<string, THREE.Mesh>();

  for (const slot of getSlotsForTier(roomSizeTier)) {
    const state = markerState(slot, effectivePlacements, selectedSlotId);
    const marker = buildMarkerMesh(slot, dims, billboardQuaternion, characterWorldPos, state);
    if (marker) {
      group.add(marker);
      markerMeshes.set(slot.slotId, marker);
    }
    if (!effectivePlacements[slot.slotId]) {
      group.add(buildEmptySlotHitProxy(slot, dims, billboardQuaternion));
    }
  }

  return { group, markerMeshes };
}

/** Swaps just the two affected markers' texture/scale in place when only
 * selectedSlotId changes -- avoids rebuilding the whole group (and, in
 * principle, avoids any Skia work, though getFurnishMarkerTexture is already
 * cached either way). No-ops for a slotId with no marker (shouldn't happen
 * for editable slots, but tolerated defensively). */
export function updateFurnishMarkerSelection(
  markerMeshes: Map<string, THREE.Mesh>,
  effectivePlacements: FurniturePlacementMap,
  roomSizeTier: number,
  characterWorldPos: { x: number; z: number },
  previousSelectedSlotId: string | null,
  nextSelectedSlotId: string | null
): void {
  const slots = getSlotsForTier(roomSizeTier);
  for (const slotId of new Set([previousSelectedSlotId, nextSelectedSlotId].filter(Boolean) as string[])) {
    const mesh = markerMeshes.get(slotId);
    const slot = slots.find((s) => s.slotId === slotId);
    if (!mesh || !slot) continue;
    const state = markerState(slot, effectivePlacements, nextSelectedSlotId);
    const texture = getFurnishMarkerTexture(slotLabel(slot), state);
    if (texture) {
      (mesh.material as THREE.MeshBasicMaterial).map = texture;
      (mesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
    const scale = SCALE_BY_STATE[state];
    mesh.scale.set(scale, scale, 1);
    const { renderOrder, behind } = markerRenderOrder(
      { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      characterWorldPos,
      state
    );
    mesh.renderOrder = renderOrder;
    (mesh.material as THREE.MeshBasicMaterial).transparent = !behind;
    (mesh.material as THREE.MeshBasicMaterial).depthWrite = behind;
    (mesh.material as any).alphaTest = behind ? 0.5 : 0;
  }
}
