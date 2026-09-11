// Room shell built from real 3D primitives (BoxGeometry) instead of flat
// sprite planes cut from pre-rendered isometric art. Position is a literal
// grid coordinate -- no skirt, no sprite pivot, no per-wall-segment corner
// math, no painter's-algorithm renderOrder. A real orthographic camera + the
// GPU depth buffer handle the isometric projection and occlusion for us.
//
// Floor/wall surfaces come from one of three sources:
//  - procedurally generated tileable textures (proceduralTextures.ts)
//  - 'material'-kind catalog entries: real photographic PBR textures
//    (materialTextures.ts) loaded from the curated src/assets/Materials pack
//  - 'fullWall'/'fullFloor' Nest Theme pieces (nestThemeCatalog.ts): one
//    authored composition mapped once across the whole surface, cropped
//    (never stretched) for smaller room tiers -- see resolveWallMaterial /
//    buildFullFloorPlane below.
// Unlike the older purchased isometric sprite pack (which bakes in its own
// perspective and would double-distort here), all three of these are genuine
// flat maps that project correctly onto real 3D box faces viewed through a
// true 3D camera.
import * as THREE from 'three';
import { getFloorTexture, getWallTexture } from './proceduralTextures';
import { loadFloorMaterialTexture, loadWallMaterialTexture, loadPremiumSurfaceTexture } from '../assets/materialTextures';
import { getFloorPatternById, getWallPatternById, DEFAULT_FLOOR_PATTERN_ID } from '../types/proceduralPatternCatalog';
import { getNestThemeWallPieceById, getNestThemeFloorPieceById, PREMIUM_MASTER_ROOM_TILES } from '../types/nestThemeCatalog';
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
  /** backWallZ / PX -- the visible LEFT screen wall's selection. */
  wallPatternIdLeft: string;
  /** backWallX / PZ -- the visible RIGHT screen wall's selection. */
  wallPatternIdRight: string;
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
// valid width/height. The same rule applies to the premium/theme loader
// below -- resolveWallMaterial's two call sites each pass a distinct
// cacheKey (wallLeft vs wallRight), so left/right always get their own
// texture instance and never share one that a differing repeat/offset would
// then corrupt for the other side.
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

// --- Premium 'fullWall' authored surfaces ----------------------------------
//
// UV orientation, verified against an on-device diagnostic test texture
// before this was written (see the housing docs for the raw findings): the
// default BoxGeometry UV for the two visible wall faces is NOT symmetric
// between them.
//   - backWallX / PZ (visible RIGHT screen wall): default U runs
//     inside-corner (U=0) -> outer-edge (U=1). This already matches the
//     authoring convention below with no correction needed.
//   - backWallZ / PX (visible LEFT screen wall): default U runs the other
//     way -- outer-edge (U=0) -> inside-corner (U=1). Authored art follows
//     ONE convention for both files (source-left = inside corner,
//     source-right = outer edge), so this wall needs its sampled U flipped
//     in code -- artists never mirror the PNG themselves.
//
// Verified against three.js's actual UV transform rather than assumed: with
// rotation=0 and the default (0,0) texture.center, Matrix3.setUvTransform
// reduces to a plain affine map `sampledU = repeat.x * geometryU + offset.x`
// (no wrapping-mode-dependent behavior at all -- wrapping only matters once
// a sampled coordinate leaves [0,1], which never happens here since every
// crop below stays within [0, visibleFraction] ⊆ [0,1]). A negative
// repeat.x is therefore just a mirror in that same affine map, not a special
// case three.js needs to be coaxed into supporting.
//
// Room-tier cropping: the master art represents the largest room
// (PREMIUM_MASTER_ROOM_TILES tiles wide), authored corner-first. A smaller
// room reveals only the portion nearest the shared inside corner --
// cropped via repeat/offset, never stretched.
function computeFullWallUv(tileCount: number, side: 'left' | 'right'): { repeatX: number; offsetX: number } {
  const visibleFraction = Math.min(1, tileCount / PREMIUM_MASTER_ROOM_TILES);
  if (side === 'right') {
    // geometryU=0 already the corner, geometryU=1 already the outer edge --
    // sample the corner-nearest slice of the image directly.
    return { repeatX: visibleFraction, offsetX: 0 };
  }
  // geometryU=0 is the OUTER edge and geometryU=1 is the corner for this
  // wall's default UV, so mirror: sampledU = visibleFraction * (1 - geometryU)
  //   = -visibleFraction * geometryU + visibleFraction
  return { repeatX: -visibleFraction, offsetX: visibleFraction };
}

async function loadFullWallMaterial(
  cacheKey: string,
  source: any,
  tileCount: number,
  side: 'left' | 'right'
): Promise<THREE.MeshStandardMaterial | null> {
  try {
    const texture = await loadPremiumSurfaceTexture(cacheKey, source);
    const { repeatX, offsetX } = computeFullWallUv(tileCount, side);
    // Vertical UV always covers the complete wall (V = 0..1, no crop, no
    // flip) -- the diagnostic confirmed TOP/BOTTOM already read correctly on
    // both walls with the untouched default V mapping.
    texture.repeat.set(repeatX, 1);
    texture.offset.set(offsetX, 0);
    texture.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: texture, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });
  } catch (e) {
    if (__DEV__) console.warn(`[housing3D] failed to load premium wall texture for ${cacheKey}, falling back`, e);
    return null;
  }
}

async function resolveWallMaterial(
  patternId: string,
  tileCount: number,
  side: 'left' | 'right'
): Promise<THREE.MeshStandardMaterial> {
  const themePiece = getNestThemeWallPieceById(patternId);
  if (themePiece) {
    const material = await loadFullWallMaterial(patternId, themePiece.source, tileCount, side);
    if (material) return material;
    // Authored asset failed to load -- fall through to the safe default
    // below rather than leaving the wall without a material.
  }
  const item = getWallPatternById(patternId);
  if (item?.kind === 'material') {
    const texture = await loadWallMaterialTexture(item.materialId);
    if (texture) {
      texture.repeat.set(tileCount, 1);
      texture.needsUpdate = true;
      return new THREE.MeshStandardMaterial({ map: texture, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });
    }
  }
  const wallTexture = getWallTexture(patternId).clone();
  wallTexture.repeat.set(tileCount, 1);
  wallTexture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: wallTexture, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });
}

// --- Premium 'fullFloor' authored surface ----------------------------------
//
// The logical per-tile floor grid (the loop in buildRoomScene3D below) is
// untouched and still built for every room -- it's what furniture placement,
// occupancy, movement, and room-size logic key off via grid3D.ts/roomSlots.ts,
// none of which ever look at the Three.js scene graph. This plane is a purely
// visual addition on top of it: one authored image spanning the whole floor,
// center-anchored (unlike the corner-anchored walls) so a centered motif like
// the Retro-Future starburst medallion stays centered at every room tier.
const FULL_FLOOR_Y_OFFSET = 0.002; // sits a hair above the tile tops (y=0) -- same small-deliberate-epsilon idiom as FLOOR_THICKNESS/2 below, avoids z-fighting without needing polygonOffset (unused elsewhere in this renderer)

async function buildFullFloorPlane(
  cacheKey: string,
  source: any,
  widthTiles: number,
  heightTiles: number
): Promise<THREE.Mesh | null> {
  try {
    const texture = await loadPremiumSurfaceTexture(cacheKey, source);
    const visibleFractionX = Math.min(1, widthTiles / PREMIUM_MASTER_ROOM_TILES);
    const visibleFractionZ = Math.min(1, heightTiles / PREMIUM_MASTER_ROOM_TILES);
    // Centered crop: reveal the middle visibleFraction of the master image on
    // each axis so its center (e.g. a starburst medallion) never drifts off
    // the room's physical center as the tier shrinks.
    texture.repeat.set(visibleFractionX, visibleFractionZ);
    texture.offset.set((1 - visibleFractionX) / 2, (1 - visibleFractionZ) / 2);
    texture.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({ map: texture, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });
    const geometry = new THREE.PlaneGeometry(widthTiles * TILE_SIZE, heightTiles * TILE_SIZE);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // lay flat on the XZ plane, facing +Y (up)
    mesh.position.set(0, FULL_FLOOR_Y_OFFSET, 0);
    return mesh;
  } catch (e) {
    if (__DEV__) console.warn(`[housing3D] failed to load premium floor texture for ${cacheKey}, falling back to tiled floor`, e);
    return null;
  }
}

export async function buildRoomScene3D(grid: Room3DConfig): Promise<Built3DRoom> {
  const group = new THREE.Group();
  const { halfWidth, halfDepth } = roomHalfExtents(grid);
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: EDGE_COLOR, metalness: ROOM_METALNESS, roughness: ROOM_ROUGHNESS });

  // A 'fullFloor' theme piece drives a separate plane (below); the logical
  // per-tile meshes still get built underneath it exactly as before -- when
  // grid.floorPatternId names a theme piece rather than a real
  // procedural/material catalog id, resolveFloorMaterial would otherwise warn
  // about an unknown pattern id, so the hidden tiles fall back to the normal
  // default pattern instead (their appearance never shows once the plane is
  // on top of them).
  const floorThemePiece = getNestThemeFloorPieceById(grid.floorPatternId);
  const floorMaterial = await resolveFloorMaterial(floorThemePiece ? DEFAULT_FLOOR_PATTERN_ID : grid.floorPatternId);
  const floorGeometry = new THREE.BoxGeometry(TILE_SIZE, FLOOR_THICKNESS, TILE_SIZE);
  const floorFaceMaterials = buildFaceMaterials(edgeMaterial, BOX_FACE.PY, floorMaterial);

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      const tile = new THREE.Mesh(floorGeometry, floorFaceMaterials);
      const { x, z } = gridToWorld(row, col, grid);
      tile.position.set(x, -FLOOR_THICKNESS / 2, z);
      // Read by Furnish Nest's shell raycast fallback (IsometricRoomView3D.tsx)
      // -- never rendered, no visible debug geometry.
      tile.userData.furnishSurface = 'floor';
      group.add(tile);
    }
  }

  if (floorThemePiece) {
    const plane = await buildFullFloorPlane(grid.floorPatternId, floorThemePiece.source, grid.width, grid.height);
    if (plane) group.add(plane);
  }

  // Back wall along the X axis, at the far Z edge -- one box spanning the
  // whole room width. No per-tile segments needed. Positioned so its
  // *inner* face stays flush with the floor edge (-halfDepth) and thickness
  // extends outward/backward only -- centering the box on -halfDepth would
  // eat WALL_THICKNESS/2 into the floor footprint instead. Its +Z face is
  // the one facing back into the room (see EDGE_COLOR comment above), so
  // that's the one that gets the actual wall texture. This is the visible
  // RIGHT screen wall (see computeFullWallUv's comment above) -- world axis
  // and screen side deliberately don't share a name here.
  const wallMaterialRight = await resolveWallMaterial(grid.wallPatternIdRight, grid.width, 'right');
  const backWallX = new THREE.Mesh(
    new THREE.BoxGeometry(grid.width * TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS),
    buildFaceMaterials(edgeMaterial, BOX_FACE.PZ, wallMaterialRight)
  );
  backWallX.position.set(0, WALL_HEIGHT / 2, -halfDepth - WALL_THICKNESS / 2);
  // Visible RIGHT screen wall -- see Furnish Nest's shell raycast fallback.
  backWallX.userData.furnishSurface = 'rightWall';
  group.add(backWallX);

  // Back wall along the Z axis, at the far X edge -- one box spanning the
  // whole room depth. Same flush-inner-face positioning as above; its +X
  // face is the one facing into the room. This is the visible LEFT screen
  // wall.
  const wallMaterialLeft = await resolveWallMaterial(grid.wallPatternIdLeft, grid.height, 'left');
  const backWallZ = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, grid.height * TILE_SIZE),
    buildFaceMaterials(edgeMaterial, BOX_FACE.PX, wallMaterialLeft)
  );
  backWallZ.position.set(-halfWidth - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0);
  // Visible LEFT screen wall -- see Furnish Nest's shell raycast fallback.
  backWallZ.userData.furnishSurface = 'leftWall';
  group.add(backWallZ);

  return { group, halfWidth, halfDepth, wallHeight: WALL_HEIGHT };
}
