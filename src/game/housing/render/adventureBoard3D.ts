// Daily Adventure Board -- the framed easel that physically stands in
// GliderMon's room at the `adventureBoard` system slot (roomSlots.ts).
//
// This is one world entity with two internal layers, both children of the
// same billboard-rotated, floor-grounded group:
//   1. `boardSurfaceMesh` -- a plane showing the dynamic goal UI as a texture
//      (drawn with Skia offscreen, uploaded here). Sits just BEHIND the frame.
//   2. `spineMesh` -- the authored Spine frame / easel / leaves / notes, drawn
//      IN FRONT of the surface. Its transparent opening lets the surface show
//      through; wood / leaves / notes naturally occlude the surface edges.
// The whole board is depth-classified against GliderMon exactly like furniture
// (front / behind by isometric depth), so anything in the room can pass in
// front of or behind it according to world depth.
//
// v1: one complete Spine skin ("0"), used exactly as authored.
import * as THREE from 'three';
import { Physics } from '@esotericsoftware/spine-core';
import { loadSpineFromExpoAssets } from '../../../spine/loaders';
import { RoomDims3D, gridToWorld } from './grid3D';
import { getAdventureBoardSlot } from '../types/roomSlots';
import {
  BOARD_OPENING_OVERSCAN,
  BOARD_UI_LOCAL_DEPTH_OFFSET,
} from './adventureBoardLayout';

const PHYSICS: any = Physics as any;

const BOARD_DESIRED_WORLD_HEIGHT = 1.9;
const BOARD_NUDGE_X = -0.04;
const BOARD_NUDGE_Z = -0.16;
// Vertical placement is DERIVED (see below), never a magic offset. Only a tiny
// epsilon keeps the easel feet off the floor plane; CALIBRATION_Y stays 0.
const BOARD_GROUND_EPSILON = 0.01;
const BOARD_GROUND_CALIBRATION_Y = 0;
const FLOOR_WORLD_Y = 0;

// Isometric render-order bands -- the SAME values furnitureBillboard3D.ts uses
// so the board sorts against GliderMon on equal terms. Within the board, the
// surface draws just before the frame (tiny bias), both inside the band.
//
// The character's body/skin slots are OPAQUE-queue materials (hue-indexed
// recolor, see normalizeMaterialForSlot). three.js renders the whole opaque
// queue before the whole transparent queue regardless of renderOrder, so a
// transparent board can never lose to that skin via renderOrder -- it always
// draws in the later pass and covers him. So when the board is BEHIND him we
// move both its layers into the opaque queue (alpha-tested hard cutout,
// depthTest+write on) to compete on equal terms -- exactly what
// tileSprite.ts's `opaqueCutout` does for furniture. When the board is in
// FRONT of him it goes back to the transparent queue at a high renderOrder so
// it covers even his transparent face / hat / shoe slots.
const ORDER_IN_FRONT_OF_CHARACTER = 1000;
const ORDER_BEHIND_CHARACTER = -1;
// Both biases land the board strictly between furniture's "behind" band (-1)
// and GliderMon's own slot range (~2-70): the board is a front-corner object
// that should read as in front of the bed/rug behind it, but still lose to
// GliderMon when he steps in front of it. Surface below frame so the wooden
// lip always covers the writing surface's overscanned edge.
const BOARD_SURFACE_BIAS = 0.25;
const BOARD_FRAME_BIAS = 0.5;
// Hard-cutout threshold for the frame art while it's in the opaque queue --
// same value furniture uses (tileSprite.OPAQUE_CUTOUT_ALPHA_TEST).
const FRAME_CUTOUT_ALPHA_TEST = 0.5;

export type BoardDepthClass = 'front' | 'behind';

export interface AdventureBoardTexturePayloadLike {
  pixels: Uint8Array;
  width: number;
  height: number;
}
export interface AdventureBoardTextureSetLike {
  compact: AdventureBoardTexturePayloadLike;
  full: AdventureBoardTexturePayloadLike;
  version: string;
}

export interface AdventureBoardObject {
  group: THREE.Group;
  /** The dynamic-content plane. Raycast this for board taps. */
  boardSurfaceMesh: THREE.Mesh;
  /** World-space center of the wooden Frame -- the Goals camera aims here. */
  frameCenterWorld: THREE.Vector3;
  /** Wooden-frame world size, for fitting the Goals camera (width + height). */
  frameWorldSize: { w: number; h: number };
  /** Placeholder AABB in group-local units (dev/debug only now). */
  placeholderLocalBounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Base world position (easel foot) used for isometric depth classification. */
  baseWorldPos: { x: number; z: number };
  /** Upload a fresh compact+full texture set and show the one for `density`. */
  setTextures: (set: AdventureBoardTextureSetLike) => void;
  /** Switch the visible density (Goals -> full, otherwise compact). */
  setDensity: (density: 'full' | 'compact') => void;
  /** Re-sort the whole board in front of / behind GliderMon. */
  setDepthClass: (cls: BoardDepthClass) => void;
  dispose: () => void;
}

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

    skeleton.scaleX = scale;
    skeleton.scaleY = scale;
    skeleton.x = -(skX + skW / 2) * scale;
    skeleton.y = -skY * scale;
    skeleton.setupPose();

    const anim = data.findAnimation?.('animation');
    if (anim) state.setAnimation(0, 'animation', true);
    skeleton.updateWorldTransform(PHYSICS.update);

    const { SkeletonMesh } = require('../../../spine/SpineThree');
    const spineMesh = new SkeletonMesh(skeleton, state, resolveTexture);
    spineMesh.frustumCulled = false;
    spineMesh.update(0);

    // Measure Placeholder + Frame local AABBs; hide the Placeholder art (it's
    // only an alignment guide). Capture each visible slot's authored draw
    // index so depth reclassification can preserve intra-frame order.
    let ph = { minX: -1, minY: -1, maxX: 1, maxY: 1 };
    let fr: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    spineMesh.traverse((o: any) => {
      if (!o?.geometry || o.userData?.slotName === undefined) return;
      if (o.userData.__slotIdx === undefined) o.userData.__slotIdx = o.renderOrder;
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

    // ── The dynamic-content plane, sized from the calibrated opening ──────
    const ow = ph.maxX - ph.minX;
    const oh = ph.maxY - ph.minY;
    const os = BOARD_OPENING_OVERSCAN;
    const sx0 = ph.minX - ow * os.left;
    const sx1 = ph.maxX + ow * os.right;
    const sy0 = ph.minY - oh * os.bottom;
    const sy1 = ph.maxY + oh * os.top;
    const surfaceGeom = new THREE.PlaneGeometry(sx1 - sx0, sy1 - sy0);
    // Cream until the first texture arrives -- never a blank/black plane. The
    // Skia texture is fully opaque, so this plane lives in the OPAQUE queue and
    // participates in the real depth buffer (walls / furniture occlude it,
    // it's recessed behind the frame). `setDepthClass` flips it to the
    // transparent queue only for the "board in front of GliderMon" case.
    const surfaceMaterial = new THREE.MeshBasicMaterial({
      color: 0xf8eedc,
      transparent: false,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
    });
    const boardSurfaceMesh = new THREE.Mesh(surfaceGeom, surfaceMaterial);
    boardSurfaceMesh.frustumCulled = false;
    // Recessed along the billboard normal so the wooden lip sits proud of the
    // writing surface (local +Z faces the camera under the shared billboard
    // quaternion; a negative offset pushes the surface away from it).
    boardSurfaceMesh.position.set((sx0 + sx1) / 2, (sy0 + sy1) / 2, BOARD_UI_LOCAL_DEPTH_OFFSET);

    const group = new THREE.Group();
    group.quaternion.copy(billboardQuaternion);
    group.add(boardSurfaceMesh);
    group.add(spineMesh);

    const slot = getAdventureBoardSlot(roomSizeTier);
    const base = slot ? gridToWorld(slot.row, slot.col, dims) : { x: 0, z: 0 };
    const baseWorldPos = { x: base.x + BOARD_NUDGE_X, z: base.z + BOARD_NUDGE_Z };
    group.position.set(baseWorldPos.x, 0, baseWorldPos.z);
    group.updateMatrixWorld(true);

    // Ground the lowest VISIBLE world point (easel feet) onto the floor plane.
    const worldBox = new THREE.Box3();
    const slotBox = new THREE.Box3();
    spineMesh.traverse((o: any) => {
      if (!o?.geometry || o.userData?.slotName === undefined || o.visible === false) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      slotBox.copy(o.geometry.boundingBox).applyMatrix4(group.matrixWorld);
      worldBox.union(slotBox);
    });
    if (Number.isFinite(worldBox.min.y)) {
      group.position.y =
        FLOOR_WORLD_Y - worldBox.min.y + BOARD_GROUND_EPSILON + BOARD_GROUND_CALIBRATION_Y;
      group.updateMatrixWorld(true);
    }

    const frameCenterWorld = new THREE.Vector3(
      (frame.minX + frame.maxX) / 2,
      (frame.minY + frame.maxY) / 2,
      0
    ).applyMatrix4(group.matrixWorld);

    // ── texture + depth lifecycle ───────────────────────────────────────
    let compactTex: THREE.DataTexture | null = null;
    let fullTex: THREE.DataTexture | null = null;
    let density: 'full' | 'compact' = 'compact';

    const makeTex = (p: AdventureBoardTexturePayloadLike) => {
      const t = new THREE.DataTexture(p.pixels, p.width, p.height, THREE.RGBAFormat, THREE.UnsignedByteType);
      (t as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      t.needsUpdate = true;
      return t;
    };
    const applyMap = () => {
      const t = density === 'full' ? fullTex : compactTex;
      if (t) {
        surfaceMaterial.map = t;
        surfaceMaterial.color.setHex(0xffffff);
        surfaceMaterial.needsUpdate = true;
      }
    };

    const setTextures = (set: AdventureBoardTextureSetLike) => {
      const nextCompact = makeTex(set.compact);
      const nextFull = makeTex(set.full);
      const oldCompact = compactTex;
      const oldFull = fullTex;
      compactTex = nextCompact;
      fullTex = nextFull;
      applyMap(); // swap first, then free the previous GPU textures
      oldCompact?.dispose();
      oldFull?.dispose();
    };
    const setDensity = (d: 'full' | 'compact') => {
      if (d === density) return;
      density = d;
      applyMap();
    };

    // Toggle one board material between the opaque-cutout queue (so it can
    // sort behind GliderMon's opaque skin) and the transparent queue (so it
    // draws over even his transparent face/hat slots). `isFrameArt` keeps the
    // frame's soft edges alpha-blended when it's in front.
    const setQueueMode = (
      mat: THREE.Material | undefined,
      mode: BoardDepthClass,
      isFrameArt: boolean
    ) => {
      const m = mat as any;
      if (!m) return;
      if (mode === 'behind') {
        m.transparent = false;
        m.depthTest = true;
        m.depthWrite = true;
        m.alphaTest = isFrameArt ? FRAME_CUTOUT_ALPHA_TEST : 0;
      } else {
        m.transparent = true;
        m.depthTest = true;
        m.depthWrite = false;
        m.alphaTest = 0;
      }
      m.needsUpdate = true;
    };

    let depthClass: BoardDepthClass | null = null;
    const setDepthClass = (cls: BoardDepthClass) => {
      const bandBase = cls === 'front' ? ORDER_IN_FRONT_OF_CHARACTER : ORDER_BEHIND_CHARACTER;
      const modeChanged = cls !== depthClass;
      depthClass = cls;
      if (modeChanged) setQueueMode(boardSurfaceMesh.material, cls, false);
      boardSurfaceMesh.renderOrder = bandBase + BOARD_SURFACE_BIAS;
      spineMesh.traverse((o: any) => {
        if (o.userData?.slotName === undefined) return;
        if (modeChanged) setQueueMode(o.material, cls, true);
        // Frame draws just after the surface (occludes its overscanned edges),
        // still well inside the band -- below GliderMon when 'behind', above
        // him when 'front'.
        o.renderOrder = bandBase + BOARD_FRAME_BIAS + (o.userData.__slotIdx ?? 0) * 0.0001;
      });
    };
    setDepthClass('behind');

    return {
      group,
      boardSurfaceMesh,
      frameCenterWorld,
      frameWorldSize: { w: frame.maxX - frame.minX, h: frame.maxY - frame.minY },
      placeholderLocalBounds: ph,
      baseWorldPos,
      setTextures,
      setDensity,
      setDepthClass,
      dispose: () => {
        surfaceGeom.dispose();
        surfaceMaterial.dispose();
        compactTex?.dispose();
        fullTex?.dispose();
        group.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.geometry && m.geometry !== surfaceGeom) m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[] | undefined;
          if (mat && mat !== surfaceMaterial) {
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat.dispose();
          }
        });
      },
    };
  } catch (err) {
    if (__DEV__) console.error('[adventureBoard3D] build failed:', err);
    return null;
  }
}

/**
 * Classify the board in front of / behind GliderMon by isometric depth -- the
 * fixed camera looks along -(1,1,1), so "closer to camera" ∝ x + z. Same
 * formula as furnitureBillboard3D.ts.
 */
export function classifyBoardDepth(
  boardBase: { x: number; z: number },
  characterWorldPos: { x: number; z: number }
): BoardDepthClass {
  return boardBase.x + boardBase.z > characterWorldPos.x + characterWorldPos.z ? 'front' : 'behind';
}
