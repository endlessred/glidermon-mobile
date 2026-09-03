// Daily Adventure Board -- the framed easel that physically stands in
// GliderMon's room at the `adventureBoard` system slot (roomSlots.ts). This
// module owns ONLY the Spine presentation (frame + easel + the "Placeholder"
// interior region). The dynamic goal content is a React Native overlay
// (DailyAdventureBoard) that IsometricRoomView3D positions by projecting this
// object's Placeholder bounds to screen space -- no dynamic text ever goes
// into Spine.
//
// v1: one complete Spine skin ("0"), used exactly as authored. The
// `FutureFrame` / `FutureEasel` slots (empty here) are where busier
// decoration will later be split out for a close-up detail mode -- not built
// yet, deliberately no placeholder state for it.
import * as THREE from 'three';
import { Physics } from '@esotericsoftware/spine-core';
import { loadSpineFromExpoAssets } from '../../../spine/loaders';
import { RoomDims3D, gridToWorld } from './grid3D';
import { getAdventureBoardSlot } from '../types/roomSlots';

const PHYSICS: any = Physics as any;

// World height (tile units, TILE_SIZE = 1) of the whole board silhouette. It
// is a world object: GliderMon stands ~1.6 units tall (characterScale 0.35 in
// HudScreen) and WALL_HEIGHT is 2.0, so the easel is a touch taller than him
// and stays clear of the wall. Tune on-device via `glidermon://home`.
const BOARD_DESIRED_WORLD_HEIGHT = 1.9;
// Small nudge tucking the easel into its corner rather than floating on the
// tile center: toward the left wall (-x) and slightly back from the open
// front edge (-z). Kept small so the tilted camera-facing billboard doesn't
// poke through the wall box.
const BOARD_NUDGE_X = -0.04;
const BOARD_NUDGE_Z = -0.16;
// The board's vertical placement is DERIVED, not guessed: after the group is
// built + billboard-rotated, its lowest visible world point (the easel feet)
// is dropped onto the room floor plane (world y = 0). Only a tiny epsilon
// keeps the feet from z-fighting the floor. `CALIBRATION_Y` stays 0 unless a
// deliberate, named nudge is ever needed -- never a magic `position.y -= …`.
const BOARD_GROUND_EPSILON = 0.01;
const BOARD_GROUND_CALIBRATION_Y = 0;
const FLOOR_WORLD_Y = 0;

export interface AdventureBoardObject {
  group: THREE.Group;
  /** Placeholder interior AABB in group-local units (z = 0 plane). The RN
   * board UI is aligned to this after projection through the camera. */
  placeholderLocalBounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** World-space center of the Placeholder region -- the RN overlay anchors here. */
  placeholderCenterWorld: THREE.Vector3;
  /** Placeholder world size. */
  placeholderWorldSize: { w: number; h: number };
  /** World-space center of the wooden Frame -- the Goals camera aims here so the
   * whole board (plaque + opening + rail) is evenly composed. */
  frameCenterWorld: THREE.Vector3;
  /** Wooden-frame world size, for fitting the Goals camera (width + height). */
  frameWorldSize: { w: number; h: number };
  dispose: () => void;
}

/**
 * Builds the board Spine object for a room tier. Positioned at the tier's
 * `adventureBoard` system slot; oriented with the shared billboard rotation
 * (same as furniture / character) so it faces the fixed isometric camera.
 */
export async function buildAdventureBoard3D(
  dims: RoomDims3D,
  billboardQuaternion: THREE.Quaternion,
  roomSizeTier: number
): Promise<AdventureBoardObject | null> {
  try {
    const atlasModule = require('../../../assets/Apartment/AdventureBoardSpine/AdventureBoard.atlas');
    const jsonModule = require('../../../assets/Apartment/AdventureBoardSpine/AdventureBoard.json');
    const png = require('../../../assets/Apartment/AdventureBoardSpine/AdventureBoard.png');
    const png2 = require('../../../assets/Apartment/AdventureBoardSpine/AdventureBoard_2.png');
    const png3 = require('../../../assets/Apartment/AdventureBoardSpine/AdventureBoard_3.png');

    const { skeleton, state, resolveTexture } = await loadSpineFromExpoAssets({
      atlasModule,
      jsonModule,
      textureModules: [png, png2, png3],
      defaultMix: 0,
    });

    const data: any = skeleton.data;
    const skW: number = data.width || 1440;
    const skH: number = data.height || 1509;
    const skX: number = data.x ?? 0;
    const skY: number = data.y ?? 0;

    const scale = BOARD_DESIRED_WORLD_HEIGHT / skH;

    // The file's single skin is named "default", so SkeletonJson already set
    // it as the default skin -- setupPose() below attaches it. Center the
    // skeleton horizontally on the group origin and drop its baseline to
    // y = 0, then let the group's position place it in the room.
    skeleton.scaleX = scale;
    skeleton.scaleY = scale;
    skeleton.x = -(skX + skW / 2) * scale;
    skeleton.y = -skY * scale; // rough centering; final grounding is derived below
    skeleton.setupPose();

    const anim = data.findAnimation?.('animation');
    if (anim) state.setAnimation(0, 'animation', true);

    skeleton.updateWorldTransform(PHYSICS.update);

    const { SkeletonMesh } = require('../../../spine/SpineThree');
    const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
    mesh.frustumCulled = false;
    mesh.update(0);
    // Board is always toward the back of the room, so it always loses the
    // depth argument to the character (same convention as furniture behind him).
    mesh.renderOrder = -1;

    // Read slot AABBs straight off the built geometry (group-local coords;
    // every Spine vert has z = 0):
    //  - Placeholder : the RN overlay's alignment target. Hidden -- it's only
    //    an alignment guide, not final visuals (spec).
    //  - Frame       : used to aim/fit the Goals camera on the whole board.
    let ph = { minX: -1, minY: -1, maxX: 1, maxY: 1 };
    let fr: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    mesh.traverse((o: any) => {
      if (!o?.geometry || !o.userData?.slotName) return;
      const name = o.userData.slotName;
      if (name === 'Placeholder') {
        o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        if (bb) ph = { minX: bb.min.x, minY: bb.min.y, maxX: bb.max.x, maxY: bb.max.y };
        o.visible = false;
      } else if (name === 'Frame') {
        o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        if (bb) fr = { minX: bb.min.x, minY: bb.min.y, maxX: bb.max.x, maxY: bb.max.y };
      }
    });
    const frame = fr ?? ph;

    const group = new THREE.Group();
    group.quaternion.copy(billboardQuaternion);
    group.add(mesh);

    const slot = getAdventureBoardSlot(roomSizeTier);
    const { x, z } = slot
      ? gridToWorld(slot.row, slot.col, dims)
      : { x: 0, z: 0 };
    // Place horizontally, then ground vertically from the built geometry.
    group.position.set(x + BOARD_NUDGE_X, 0, z + BOARD_NUDGE_Z);
    group.updateMatrixWorld(true);

    // World AABB of the VISIBLE board (Easel + Frame; Placeholder is hidden).
    // The billboard rotation lives on the group, so the lowest world point
    // isn't simply group.position.y + a local min -- union the rotated slot
    // boxes and read min.y.
    const worldBox = new THREE.Box3();
    const slotBox = new THREE.Box3();
    mesh.traverse((o: any) => {
      if (!o?.geometry || !o.userData?.slotName || o.visible === false) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      slotBox.copy(o.geometry.boundingBox).applyMatrix4(group.matrixWorld);
      worldBox.union(slotBox);
    });
    if (Number.isFinite(worldBox.min.y)) {
      group.position.y =
        FLOOR_WORLD_Y - worldBox.min.y + BOARD_GROUND_EPSILON + BOARD_GROUND_CALIBRATION_Y;
      group.updateMatrixWorld(true);
    }

    const placeholderCenterWorld = new THREE.Vector3(
      (ph.minX + ph.maxX) / 2,
      (ph.minY + ph.maxY) / 2,
      0
    ).applyMatrix4(group.matrixWorld);
    const frameCenterWorld = new THREE.Vector3(
      (frame.minX + frame.maxX) / 2,
      (frame.minY + frame.maxY) / 2,
      0
    ).applyMatrix4(group.matrixWorld);

    return {
      group,
      placeholderLocalBounds: ph,
      placeholderCenterWorld,
      placeholderWorldSize: { w: ph.maxX - ph.minX, h: ph.maxY - ph.minY },
      frameCenterWorld,
      frameWorldSize: { w: frame.maxX - frame.minX, h: frame.maxY - frame.minY },
      dispose: () => {
        group.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        });
      },
    };
  } catch (err) {
    if (__DEV__) console.error('[adventureBoard3D] build failed:', err);
    return null;
  }
}
