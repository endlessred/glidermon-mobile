// Room shell built from real 3D primitives (BoxGeometry) instead of flat
// sprite planes cut from pre-rendered isometric art. Position is a literal
// grid coordinate -- no skirt, no sprite pivot, no per-wall-segment corner
// math, no painter's-algorithm renderOrder. A real orthographic camera + the
// GPU depth buffer handle the isometric projection and occlusion for us.
//
// Floor/wall surfaces use procedurally generated tileable textures
// (proceduralTextures.ts) rather than the purchased isometric sprite pack --
// that art bakes in its own perspective, which would double-distort when
// mapped onto real 3D box faces viewed through a true 3D camera.
import * as THREE from 'three';
import { RoomGridConfig } from '../types/RoomConfig';
import { getFloorTexture, getWallTexture } from './proceduralTextures';
import { TILE_SIZE, roomHalfExtents, gridToWorld } from './grid3D';

const FLOOR_THICKNESS = 0.1;
const WALL_HEIGHT = 1.6;
const WALL_THICKNESS = 0.1;

export interface Built3DRoom {
  group: THREE.Group;
  /** Half-extents of the floor footprint, useful for framing the camera. */
  halfWidth: number;
  halfDepth: number;
}

export function buildRoomScene3D(grid: RoomGridConfig): Built3DRoom {
  const group = new THREE.Group();
  const { halfWidth, halfDepth } = roomHalfExtents(grid);

  const floorTexture = getFloorTexture(grid.defaultFloor.set);
  floorTexture.repeat.set(1, 1);
  const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
  const floorGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.95, FLOOR_THICKNESS, TILE_SIZE * 0.95);

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      const tile = new THREE.Mesh(floorGeometry, floorMaterial);
      const { x, z } = gridToWorld(row, col, grid);
      tile.position.set(x, -FLOOR_THICKNESS / 2, z);
      group.add(tile);
    }
  }

  const wallTexture = getWallTexture(grid.defaultWall.set);

  // Back wall along the X axis, at the far Z edge -- one box spanning the
  // whole room width. No per-tile segments needed.
  const wallTextureX = wallTexture.clone();
  wallTextureX.repeat.set(grid.width, 1);
  wallTextureX.needsUpdate = true;
  const backWallX = new THREE.Mesh(
    new THREE.BoxGeometry(grid.width * TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS),
    new THREE.MeshStandardMaterial({ map: wallTextureX })
  );
  backWallX.position.set(0, WALL_HEIGHT / 2, -halfDepth);
  group.add(backWallX);

  // Back wall along the Z axis, at the far X edge -- one box spanning the
  // whole room depth.
  const wallTextureZ = wallTexture.clone();
  wallTextureZ.repeat.set(grid.height, 1);
  wallTextureZ.needsUpdate = true;
  const backWallZ = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, grid.height * TILE_SIZE),
    new THREE.MeshStandardMaterial({ map: wallTextureZ })
  );
  backWallZ.position.set(-halfWidth, WALL_HEIGHT / 2, 0);
  group.add(backWallZ);

  return { group, halfWidth, halfDepth };
}
