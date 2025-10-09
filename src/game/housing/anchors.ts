import * as THREE from 'three';

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

// parse "A4" → "A4" (bones are named directly with TileId, not "t_A4")
export const boneNameToTileId = (boneName: string): TileId | null => {
  const m = /^([A-Z])(\d+)$/.exec(boneName);
  return m ? `${m[1]}${m[2]}` : null;
};

// optional: grid math fallback if an anchor is missing
export type IsoFeetToSceneFn = (x: number, y: number) => { x: number; y: number; feetY: number };

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