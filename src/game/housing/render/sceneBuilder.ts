// Builds the room as plain textured quads (floor + walls) instead of a
// giant Spine skeleton. Only rebuilt when the room config/furniture layout
// changes -- never per-frame -- which is the whole point: this eliminates
// the O(n^2) Spine refreshMeshes() cost that was starving Glidermon's frame
// budget (see plan: Housing System Rewrite Phase 1).
import * as THREE from 'three';
import { isoToScreen, zFromFeetScreenY, TILE_SKIRT, WALL_SKIRT } from '../coords';
import { renderOrderFromFeetY } from '../anchors';
import { determineFloorVariant, determineWallVariant, RoomDimensions } from '../grid';
import { loadFloorTexture, loadWallTexture } from '../assets/quadTextures';
import { makeSpritePlane } from './tileSprite';
import { RoomGridConfig } from '../types/RoomConfig';
import { buildFurnitureSprite, FurniturePlacement } from './furnitureSprite';

const RENDER_BASE = 0;
// Walls use a different depth key than floor/furniture (single-axis row or
// col vs. row+col), so their raw values aren't comparable on the same
// continuum -- a wall segment can end up numerically "in front of" furniture
// sitting in the middle of the room. Walls are structurally always behind
// the floor and everything on it, so give them a fixed, very-negative base
// and only use feetY for ordering *between* wall segments of the same run.
const WALL_RENDER_BASE = -10000;

export interface BuiltRoom {
  group: THREE.Group;
  roomBounds: { width: number; height: number };
}

export interface RoomSceneInput {
  grid: RoomGridConfig;
  furniture?: FurniturePlacement[];
}

export async function buildRoomScene({ grid, furniture = [] }: RoomSceneInput): Promise<BuiltRoom> {
  const group = new THREE.Group();
  const dims: RoomDimensions = { width: grid.width, height: grid.height };

  const overrideBySlot = new Map<string, { set: string; variant: string }>();
  for (const o of grid.floorOverrides ?? []) {
    overrideBySlot.set(`${o.row},${o.col}`, { set: o.set, variant: o.variant });
  }

  for (let row = 0; row < dims.height; row++) {
    for (let col = 0; col < dims.width; col++) {
      const override = overrideBySlot.get(`${row},${col}`);
      const set = override?.set ?? grid.defaultFloor.set;
      const variant = override?.variant ?? determineFloorVariant(row, col, dims);
      const tex = await loadFloorTexture(set, variant);
      if (!tex) continue;

      const mesh = makeSpritePlane(tex.texture, tex.width, tex.height);
      const p = isoToScreen(col, row);
      const feetY = p.y - TILE_SKIRT;
      mesh.position.set(p.x, feetY, zFromFeetScreenY(p.y));
      // Larger feetY (row+col) renders toward the TOP of the screen (back of
      // the room) under this camera setup, not the bottom -- so the sign is
      // inverted here: back-of-room tiles need a SMALLER renderOrder (drawn
      // first/behind), front-of-room tiles (near the viewer) a LARGER one.
      mesh.renderOrder = renderOrderFromFeetY(RENDER_BASE, -feetY);
      group.add(mesh);
    }
  }

  const wallSet = grid.defaultWall.set;

  // LeftBack run: along the col=0 edge, one piece per row.
  for (let row = 0; row < dims.height; row++) {
    const variant = determineWallVariant(row, dims.height);
    const tex = await loadWallTexture(wallSet, variant);
    if (!tex) continue;

    const mesh = makeSpritePlane(tex.texture, tex.width, tex.height);
    const p = isoToScreen(0, row);
    const feetY = p.y - WALL_SKIRT;
    mesh.position.set(p.x, feetY, zFromFeetScreenY(p.y));
    mesh.renderOrder = renderOrderFromFeetY(WALL_RENDER_BASE, -feetY);
    group.add(mesh);
  }

  // RightBack run: along the row=0 edge, one piece per col. Mirrored
  // horizontally to face the opposite direction, matching the legacy
  // wallAnchors.ts `needsFlip` convention for RightBack walls.
  for (let col = 0; col < dims.width; col++) {
    const variant = determineWallVariant(col, dims.width);
    const tex = await loadWallTexture(wallSet, variant);
    if (!tex) continue;

    const mesh = makeSpritePlane(tex.texture, tex.width, tex.height);
    const p = isoToScreen(col, 0);
    const feetY = p.y - WALL_SKIRT;
    mesh.position.set(p.x, feetY, zFromFeetScreenY(p.y));
    mesh.scale.x *= -1;
    mesh.renderOrder = renderOrderFromFeetY(WALL_RENDER_BASE, -feetY);
    group.add(mesh);
  }

  for (const placement of furniture) {
    const mesh = await buildFurnitureSprite(placement);
    if (mesh) group.add(mesh);
  }

  return { group, roomBounds: { width: dims.width, height: dims.height } };
}
