0) assumptions (align with what you built)

Spine room skeleton contains:

bones named <row><col> (e.g. A4) placed at the feet (bottom diamond vertex) of each tile.

The tile rows in this isometric room are from the top center tile, with the rows alphabetical starting from top moving down. The tiles on each row are number 1-8 from the top center tile moving left.

optional preview slots/attachments under those bones (editor-only).

back walls baked in a separate draw group (or another skeleton if you prefer), but no front walls.

Your runtime uses Three.js + @esotericsoftware/spine-core + our SkeletonMesh wrapper.

Your isometric grid render order is painter’s algorithm using feetY.

1) file layout & names

frc/assets/Apartment/skeleton.atlas|json|png (the room skeleton)

src/game/housing/rooms/RoomLoader.ts (new helper to load the room and expose tile anchors)

src/game/housing/anchors.ts (anchor/placement utilities)

Integrate with existing:

createSpineCharacterController.ts (unchanged except for a tiny expose of feet)

IsometricHousingThreeJS.tsx (now uses room anchors instead of math for floors/props/character)

2) typings & small utilities
// spine/anchors.ts
export type TileId = string; // "A4", "C7", etc.

export type Anchor = {
  id: TileId;
  // room-skeleton space (Spine worldX/worldY for the tile bone)
  spineX: number;
  spineY: number;
  // scene space (after your placeX/placeY transform)
  sceneX: number;
  sceneY: number;  // this is "feetY" for sorting
};

export type AnchorMap = Map<TileId, Anchor>;

// sorting: higher feetY → draw later
export const renderOrderFromFeetY = (base: number, feetY: number, bias = 0) =>
  base + Math.floor(feetY) * 10 + bias;

// parse "t_A4" → "A4"
export const boneNameToTileId = (boneName: string): TileId | null => {
  const m = /^t_([A-Z])(\d+)$/.exec(boneName);
  return m ? `${m[1]}${m[2]}` : null;
};

// optional: grid math fallback if an anchor is missing
export type IsoFeetToSceneFn = (x: number, y: number) => { x: number; y: number; feetY: number };

3) room loader: build anchor map once
// spine/rooms/RoomLoader.ts
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { loadSpineFromExpoAssets } from '../createSpineCharacterController/loaders'; // your loader
import { AnchorMap, Anchor, boneNameToTileId } from '../anchors';
import { placeX, placeY } from '../isoPlacement'; // small module you already have (centered scene transform)

export type LoadedRoom = {
  skeleton: import('@esotericsoftware/spine-core').Skeleton;
  mesh: any; // your SkeletonMesh type
  anchors: AnchorMap;
};

// Load a room skeleton (no physics needed; static)
export async function loadRoomSkeleton(): Promise<LoadedRoom> {
  const atlasModule    = require('./Apartment01/room.atlas');
  const jsonModule     = require('./Apartment01/room.json');
  const textureModule  = require('./Apartment01/room.png');

  const { skeleton, state, resolveTexture } = await loadSpineFromExpoAssets({
    atlasModule, jsonModule, textureModules: [textureModule],
    defaultMix: 0, // room is static
  });

  // ensure setup pose (so all bones are at authored transforms)
  skeleton.setToSetupPose();
  // NOTE: Spine 4.2 requires a physics object; create a minimal no-op object:
  const physics = { update: () => {}, reset: () => {}, pose: () => {} } as any;
  skeleton.updateWorldTransform(physics);

  // Build mesh (so you can show the walls / back layer if you kept them in)
  const { SkeletonMesh } = require('../SpineThree');
  const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
  mesh.frustumCulled = false;

  // Scan tile bones
  const anchors: AnchorMap = new Map();
  const bones = skeleton.bones ?? [];
  for (const b of bones) {
    const id = boneNameToTileId(b?.data?.name || b?.name || '');
    if (!id) continue;
    const ax = b.worldX;
    const ay = b.worldY;
    const sx = placeX(ax);
    const sy = placeY(ay);
    anchors.set(id, { id, spineX: ax, spineY: ay, sceneX: sx, sceneY: sy });
  }

  return { skeleton, mesh, anchors };
}


placeX/placeY are your centered transform (roomCtr logic). If you don’t have them as a module, lift them out of IsometricHousingThreeJS.tsx.

4) placing things (character, props) from anchors
// spine/anchors.ts (continued)
export type FeetLocal = { x: number; y: number }; // local "feet" of an object (usually 0,0 if authored that way)
export type Placeable = THREE.Object3D | { position: THREE.Vector3; scale: THREE.Vector3; renderOrder?: number };

export function placeByFeet(
  obj: Placeable,
  anchor: Anchor,
  localFeet: FeetLocal,
  scale: number
) {
  // offset to align feet with anchor
  const posX = anchor.sceneX - localFeet.x * scale;
  const posY = anchor.sceneY - localFeet.y * scale;
  obj.position.set(posX, posY, 0);
}

export function orderAtAnchor(base: number, anchor: Anchor, bias = 0) {
  return renderOrderFromFeetY(base, anchor.sceneY, bias);
}


for your character controller, you already compute feet and scale; switch to anchor.sceneY for sorting.

5) IsometricHousingThreeJS.tsx: new flow

Goal: stop computing a grid for floors/walls; instead:

load room skeleton as background layer (your Spine walls and floor “base” render, or keep your Three floor if you want).

get anchors map from the room.

place character and props using anchors.

sorting uses anchor.sceneY.

Core changes (pseudocode sized for a drop-in):

// inside handleContextCreate:

// 1) load room
const room = await loadRoomSkeleton();
scene.add(room.mesh);

// 2) expose anchors/scale
const roomScale = computeRoomScaleToFit(w, h, room); // or keep your existing scale calc
room.mesh.scale.set(roomScale, roomScale, 1);

// 3) keep a function to read a tile id → anchor in SCENE space (after scale)
const getAnchor = (id: string): Anchor | null => {
  const a = room.anchors.get(id);
  if (!a) return null;
  // apply same scale as mesh
  return {
    ...a,
    sceneX: a.sceneX * roomScale,
    sceneY: a.sceneY * roomScale,
  };
};

// 4) character setup (same controller)
const controller = await createSpineCharacterController(/* ... */);
room.mesh.add(controller.mesh); // add as child so it inherits room transform

// 5) place character at tile, or interpolate between tiles
const charFeetLocal = controller.getFeetLocalPosition(); // local feet
const desiredWorldScale = yourDesiredCharacterScale;
const appliedLocalScale = desiredWorldScale / roomScale;

function placeCharacterAt(tileId: string) {
  const a = getAnchor(tileId);
  if (!a) return;
  // position skeleton in Spine coords
  const sk = controller.skeleton;
  sk.scaleX = appliedLocalScale;
  sk.scaleY = appliedLocalScale;
  sk.x = a.sceneX - charFeetLocal.x * appliedLocalScale;
  sk.y = a.sceneY - charFeetLocal.y * appliedLocalScale;
  sk.updateWorldTransform({ update(){}, reset(){}, pose(){} } as any);
  controller.mesh.refreshMeshes();

  // render order
  controller.mesh.renderOrder = renderOrderFromFeetY(2000, a.sceneY, 5);
}

// 6) props
function addPropAt(mesh: THREE.Object3D, feetLocal: FeetLocal, tileId: string, scale: number, bias = 3) {
  const a = getAnchor(tileId);
  if (!a) return;
  // add under room mesh so it inherits room scale/position
  room.mesh.add(mesh);
  placeByFeet(mesh, a, feetLocal, scale / roomScale);
  mesh.renderOrder = renderOrderFromFeetY(2000, a.sceneY, bias);
}


6) “who is in front of whom?” rule

With anchors in place, the logic becomes trivial:

Let A be the anchor.sceneY of the character’s current tile (or their interpolated feet).

For every prop/furniture:

compute its primary anchor (see §8).

if prop.sceneY < A → behind; if > A → in front.

the painter’s algorithm renderOrderFromFeetY(2000, sceneY, bias) enforces it automatically.

No more custom row/column rules; feetY is the single depth axis.

7) interaction / selection

Store a small index so you can go both ways:

// query by id → anchor
room.anchors.get('D4');

// nearest tile to a free click (if you allow sub-tile movement)
function nearestTileId(sceneX: number, sceneY: number): TileId | null {
  let best: { id: TileId; d: number } | null = null;
  for (const [id, a] of room.anchors) {
    const dx = sceneX - a.sceneX, dy = sceneY - a.sceneY;
    const d2 = dx*dx + dy*dy;
    if (!best || d2 < best.d) best = { id, d: d2 };
  }
  return best?.id ?? null;
}

8) multi-tile furniture

Author the mesh with its local feet point where it actually touches the ground visually. Choose the primary anchor as the south-most tile it occupies (highest feetY). Use that anchor for sorting/placement, but keep a boundsTiles: TileId[] for layout/physics.

type FurnitureDef = {
  id: string;
  primary: TileId;
  occupies: TileId[];
  feetLocal: {x:number; y:number};
  scale: number;
};

9) editor hygiene

Keep preview art in slots under tile bones but disable them at runtime (or leave them; your runtime meshes will draw over with higher renderOrder).

Lock tile bones to avoid accidental nudge.

If you later need room variants, keep the same bone names/positions, swap only textures/skins.

10) performance notes

Build the anchor map once per room load.

Avoid per-frame findBone; cache bone refs if you’ll animate tile anchors (rare).

Keep renderer.sortObjects = false (we control renderOrder).

Leave depthTest/depthWrite = false on all floor/props/character to keep ordering deterministic.

11) common pitfalls (so you don’t get stuck)

For Spine 4.2+, always pass a physics object to skeleton.updateWorldTransform(physics) (even a no-op).

Scaling: if the room mesh is scaled, divide character/prop local scale by room scale (so world size stays as requested).

Feet offsets: if the character’s “feet” in Spine aren’t at (0,0), always subtract (feetLocal.x * localScale, feetLocal.y * localScale) when positioning.

Render order ties: give the character a tiny bias (e.g., +5) and props +3 to avoid z-fighting on exactly equal feetY.

Coordinate mixups: keep all anchors in scene space (after placeX/placeY and multiplied by roomScale) so numbers you compare are apples-to-apples.