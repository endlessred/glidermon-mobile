// Furniture for the 3D-primitive room shell, rendered as a depth-tested
// billboard sprite using the same purchased rest-pose art the `quad`
// renderer uses (furnitureSprite.ts) -- kept as a separate file so that
// renderer stays untouched. The billboard always faces the camera via a
// shared, precomputed quaternion (billboard3D.ts) rather than flattening
// occlusion into a manual renderOrder like the old painter's-algorithm
// approach: with a real 3D camera and depth buffer, opaque room geometry
// (floor/walls) and this billboard occlude each other correctly for free.
import * as THREE from 'three';
import { makeSpritePlane } from './tileSprite';
import { loadFurnitureTexture } from '../assets/quadTextures';
import { getFurnitureDef } from '../types/furnitureCatalog';
import { gridToWorld, RoomDims3D, TILE_SIZE } from './grid3D';

// Rest-pose art comes from the asset pack in raw trimmed-pixel dimensions
// (e.g. ~100-300px), while this scene works in 1-world-unit-per-tile space --
// scale the plane down so it reads as roughly chair-height relative to a
// tile instead of a room-engulfing quad with only its transparent padding
// inside the camera frustum.
const FURNITURE_DESIRED_TILE_HEIGHT = 0.9;

export interface FurniturePlacement3D {
  furnitureId: string;
  variantId: string;
  row: number;
  col: number;
  facing?: 'left' | 'right';
}

export async function buildFurnitureBillboard3D(
  placement: FurniturePlacement3D,
  dims: RoomDims3D,
  billboardQuaternion: THREE.Quaternion
): Promise<THREE.Group | null> {
  const def = getFurnitureDef(placement.furnitureId);
  const variant = def?.variants.find((v) => v.id === placement.variantId);
  if (!def || !variant?.restPoseAsset) {
    if (__DEV__) {
      console.warn(`[housing3D] no rest-pose art for ${placement.furnitureId}/${placement.variantId}`);
    }
    return null;
  }

  const tex = await loadFurnitureTexture(variant.restPoseAsset);
  if (!tex) return null;

  const mesh = makeSpritePlane(tex.texture, tex.width, tex.height, { depthTest: true });
  const scaleFactor = (TILE_SIZE * FURNITURE_DESIRED_TILE_HEIGHT) / tex.height;
  mesh.scale.setScalar(scaleFactor);

  // makeSpritePlane's geometry.translate(w/2, h, 0) leaves the plane's local
  // origin at the sprite's bottom-LEFT-plus-h/2 corner, not the bottom-center
  // "feet" point it's meant to represent (see tileSprite.ts) -- the true
  // bottom-center sits at local (w/2, h/2) in the already-translated
  // geometry, so shift the mesh by the negative of that (scaled) to bring
  // the feet to the group's ground-level, tile-centered origin.
  mesh.position.set(-(tex.width / 2) * scaleFactor, -(tex.height / 2) * scaleFactor, 0);

  const defaultFacing = def.defaultFacing ?? 'left';
  const effectiveFacing = placement.facing ?? defaultFacing;
  if (def.supportsFacing && effectiveFacing !== defaultFacing) {
    mesh.scale.x *= -1;
  }

  const group = new THREE.Group();
  const { x, z } = gridToWorld(placement.row, placement.col, dims);
  group.position.set(x, 0, z);
  group.quaternion.copy(billboardQuaternion);
  group.add(mesh);

  return group;
}
