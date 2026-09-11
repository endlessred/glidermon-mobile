// World-placement + character-depth-arbitration helpers shared by every
// furniture billboard renderer (the layers/restPoseAsset path in
// furnitureBillboard3D.ts and the static-atlas path in
// staticFurnitureBillboard3D.ts), plus the Furnish Nest slot-marker renderer
// (furnishSlotMarkers3D.ts). Split out of furnitureBillboard3D.ts so the two
// billboard renderers can both depend on this without importing each other
// (furnitureBillboard3D.ts delegates to staticFurnitureBillboard3D.ts for
// staticAtlas variants, so the reverse import would be circular).
import * as THREE from 'three';
import { gridToWorld, roomHalfExtents, RoomDims3D } from './grid3D';
import { WALL_HEIGHT } from './sceneBuilder3D';
import { RoomSlotDef } from '../types/roomSlots';

// Mount height for wall-mounted décor (bottom of the billboard, which pivots
// bottom-center), and how far in front of the wall plane it sits so it
// doesn't z-fight with the wall box itself. Expressed as a fraction of
// WALL_HEIGHT (rather than a fixed world-unit height) so décor stays
// properly "up on the wall" instead of looking low if WALL_HEIGHT
// (sceneBuilder3D.ts) changes again.
const WALL_DECOR_HEIGHT_RATIO = 0.55;
// Exported so furnitureBillboard3D.ts can compute wallHeightBudget (how much
// headroom wall décor has above its mount point before poking through the
// wall's top edge) without redefining this constant.
export const WALL_DECOR_HEIGHT = WALL_HEIGHT * WALL_DECOR_HEIGHT_RATIO;
// Wall décor mounts flush against the actual wall plane, angled with it,
// instead of standing upright like a camera-facing billboard -- these two
// fixed quaternions orient a decor plane to lie flat against each wall run.
// PlaneGeometry's default normal is +Z, which already matches the leftBack
// wall's inner face (backWallX in sceneBuilder3D) exactly, so it needs no
// rotation; the rightBack wall's inner face points +X instead, a 90° turn
// around Y away.
const LEFT_BACK_WALL_QUATERNION = new THREE.Quaternion();
const RIGHT_BACK_WALL_QUATERNION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
// Nudges the décor plane just off the wall's exact inner-face depth so it
// doesn't z-fight with the wall box itself.
const WALL_FLUSH_INSET = 0.015;

export interface BuiltFurnitureBillboard {
  group: THREE.Group;
  /** Present when at least one layer is a frame-cycling flipbook animation. */
  update?: (dt: number) => void;
}

/**
 * Given a RoomSlotDef, resolves where it sits in world space and how it's
 * oriented -- wall slots snap to their wall plane (mirrored/rotated per
 * which wall run), floor slots sit at their grid tile and share the room's
 * one billboard-facing quaternion.
 */
export function resolveSlotWorldPlacement(
  slot: RoomSlotDef,
  dims: RoomDims3D,
  billboardQuaternion: THREE.Quaternion
): { position: { x: number; y: number; z: number }; quaternion: THREE.Quaternion; mirrorX: boolean } {
  const { halfWidth, halfDepth } = roomHalfExtents(dims);
  // The 'leftBack' wall renders on-screen right under this fixed camera --
  // its art comes in backwards relative to that wall (confirmed by on-device
  // inspection), so it's mirrored here rather than re-exporting the asset.
  const mirrorX = slot.kind === 'wall' && slot.wall === 'leftBack';
  let position: { x: number; y: number; z: number };
  if (slot.kind === 'wall') {
    if (slot.wall === 'leftBack') {
      const { x } = gridToWorld(slot.row, slot.col, dims);
      position = { x, y: WALL_DECOR_HEIGHT, z: -halfDepth + WALL_FLUSH_INSET };
    } else {
      const { z } = gridToWorld(slot.row, slot.col, dims);
      position = { x: -halfWidth + WALL_FLUSH_INSET, y: WALL_DECOR_HEIGHT, z };
    }
  } else {
    const { x, z } = gridToWorld(slot.row, slot.col, dims, slot.footprint);
    position = { x, y: 0, z };
  }
  const quaternion =
    slot.kind === 'wall'
      ? slot.wall === 'leftBack'
        ? LEFT_BACK_WALL_QUATERNION
        : RIGHT_BACK_WALL_QUATERNION
      : billboardQuaternion;
  return { position, quaternion, mirrorX };
}

// Furniture (depthTest:true) can never correctly depth-sort against the
// character (deliberately depthTest:false/depthWrite:false in SpineThree.ts,
// so room geometry never clips it -- see that file for why). Ordering
// between the two has to be arbitrated via renderOrder instead: these sit
// well outside the character's own per-slot renderOrder range (small
// integers, roughly 0..30) so furniture always loses to a "front" character
// slot and always wins against a "behind" one, regardless of skeleton size.
export const RENDER_ORDER_BEHIND_CHARACTER = -1;
export const RENDER_ORDER_IN_FRONT_OF_CHARACTER = 1000;
