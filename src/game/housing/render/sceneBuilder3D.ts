// Room shell built from real 3D primitives (BoxGeometry) instead of flat
// sprite planes cut from pre-rendered isometric art. Position is a literal
// grid coordinate -- no skirt, no sprite pivot, no per-wall-segment corner
// math, no painter's-algorithm renderOrder. A real orthographic camera + the
// GPU depth buffer handle the isometric projection and occlusion for us.
//
// Floor/wall surfaces use either procedurally generated tileable textures
// (proceduralTextures.ts) or, for 'material'-kind catalog entries, real
// photographic PBR textures (materialTextures.ts) loaded from the curated
// src/assets/Materials pack -- unlike the older purchased isometric sprite
// pack (which bakes in its own perspective and would double-distort here),
// these are genuine seamless tileable maps and map cleanly onto real 3D box
// faces viewed through a true 3D camera.
import * as THREE from 'three';
import { getFloorTexture, getWallTexture } from './proceduralTextures';
import { loadFloorMaterialTexture, loadWallMaterialTexture } from '../assets/materialTextures';
import { getFloorPatternById, getWallPatternById } from '../types/proceduralPatternCatalog';
import { TILE_SIZE, roomHalfExtents, gridToWorld } from './grid3D';

const FLOOR_THICKNESS = 0.1;
// Diorama-box proportions: tall/thick enough that the wall reads as a solid
// parapet with real depth (like the reference isometric room art) instead of
// a thin card standing on its edge.
export const WALL_HEIGHT = 2.0;
const WALL_THICKNESS = 0.3;

// The fixed isometric camera (see IsometricRoomView3D.tsx's CAMERA_OFFSET)
// only ever sees the floor's top face and each back wall's inner face -- the
// tile edges, wall backs/ends/tops, and floor undersides are never visible
// from that angle. Rather than let the selected texture stretch/tile onto
// those hidden faces too, they get a plain "unfinished" color instead, like
// a dollhouse cutaway. BoxGeometry's default face-group order is fixed:
// [+X, -X, +Y, -Y, +Z, -Z].
const EDGE_COLOR = 0x3b2a1f;
const BOX_FACE = { PX: 0, NX: 1, PY: 2, NY: 3, PZ: 4, NZ: 5 } as const;

// None of the room shell's surfaces are metallic, but MeshStandardMaterial's
// constructor defaults leave metalness/roughness unset -- with no
// environment map to source reflections from, that dead specular response
// reads as a flat, slightly plasticky look. Explicit matte-surface values
// let the diffuse color/lighting actually carry the material instead.
const ROOM_METALNESS = 0;
const ROOM_ROUGHNESS = 0.85;

function buildFaceMaterials(
  edgeMaterial: THREE.Material,
  visibleFaceIndex: number,
  visibleMaterial: THREE.Material
): THREE.Material[] {
  const materials = [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial];
  materials[visibleFaceIndex] = visibleMaterial;
  return materials;
}

export interface Room3DConfig {
  width: number;
  height: number;
  floorPatternId: string;
  wallPatternId: string;
}

export interface Built3DRoom {
  group: THREE.Group;
  /** Half-extents of the floor footprint, useful for framing the camera. */
  halfWidth: number;
  halfDepth: number;
  /** Wall top height (y), the other dimension the camera needs to frame. */
  wallHeight: number;
}

// Material-kind textures are used directly from materialTextures.ts's cache,
// never .clone()'d -- confirmed by device testing that cloning an
// expo-three-loaded texture (whose .image is an Asset-uri wrapper, not a
// plain bitmap) breaks whatever native path expo-gl uses to actually upload
// pixels, silently rendering solid black despite the clone reporting a
// valid width/height. Sharing one texture across both walls' materials is
// safe here because ROOM_SIZE_TIERS (housingStore.ts) is always square, so
// backWallX/backWallZ always want the same repeat count anyway.
async function resolveFloorMaterial(patternId: string): Promise<THREE.MeshStandardMaterial> {
  const item = getFloorPatternById(patternId);
  if (item?.kind === 'material') {
    const texture = await loadFloorMaterialTexture(item.materialId);
    if (texture) {
      return new THREE.MeshStandardMaterial({ map: texture, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });
    }
  }
  const floorTexture = getFloorTexture(patternId);
  floorTexture.repeat.set(1, 1);
  return new THREE.MeshStandardMaterial({ map: floorTexture, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });
}

async function resolveWallMaterial(patternId: string, repeatCount: number): Promise<THREE.MeshStandardMaterial> {
  const item = getWallPatternById(patternId);
  if (item?.kind === 'material') {
    const texture = await loadWallMaterialTexture(item.materialId);
    if (texture) {
      texture.repeat.set(repeatCount, 1);
      texture.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map: texture, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });
    }
  }
  const wallTexture = getWallTexture(patternId).clone();
  wallTexture.repeat.set(repeatCount, 1);
  wallTexture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: wallTexture, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });
}

export async function buildRoomScene3D(grid: Room3DConfig): Promise<Built3DRoom> {
  const group = new THREE.Group();
  const { halfWidth, halfDepth } = roomHalfExtents(grid);
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: EDGE_COLOR, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });

  const floorMaterial = await resolveFloorMaterial(grid.floorPatternId);
  const floorGeometry = new THREE.BoxGeometry(TILE_SIZE, FLOOR_THICKNESS, TILE_SIZE);
  const floorFaceMaterials = buildFaceMaterials(edgeMaterial, BOX_FACE.PY, floorMaterial);

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      const tile = new THREE.Mesh(floorGeometry, floorFaceMaterials);
      const { x, z } = gridToWorld(row, col, grid);
      tile.position.set(x, -FLOOR_THICKNESS / 2, z);
      group.add(tile);
    }
  }

  // Back wall along the X axis, at the far Z edge -- one box spanning the
  // whole room width. No per-tile segments needed. Positioned so its
  // *inner* face stays flush with the floor edge (-halfDepth) and thickness
  // extends outward/backward only -- centering the box on -halfDepth would
  // eat WALL_THICKNESS/2 into the floor footprint instead. Its +Z face is
  // the one facing back into the room (see EDGE_COLOR comment above), so
  // that's the one that gets the actual wall texture.
  const wallMaterialX = await resolveWallMaterial(grid.wallPatternId, grid.width);
  const backWallX = new THREE.Mesh(
    new THREE.BoxGeometry(grid.width * TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS),
    buildFaceMaterials(edgeMaterial, BOX_FACE.PZ, wallMaterialX)
  );
  backWallX.position.set(0, WALL_HEIGHT / 2, -halfDepth - WALL_THICKNESS / 2);
  group.add(backWallX);

  // Back wall along the Z axis, at the far X edge -- one box spanning the
  // whole room depth. Same flush-inner-face positioning as above; its +X
  // face is the one facing into the room.
  const wallMaterialZ = await resolveWallMaterial(grid.wallPatternId, grid.height);
  const backWallZ = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, grid.height * TILE_SIZE),
    buildFaceMaterials(edgeMaterial, BOX_FACE.PX, wallMaterialZ)
  );
  backWallZ.position.set(-halfWidth - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
  group.add(backWallZ);

  return { group, halfWidth, halfDepth, wallHeight: WALL_HEIGHT };
}
