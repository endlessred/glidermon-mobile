// Shared grid-to-world math for the 3D-primitive room shell. Position is a
// literal function of grid coordinates -- no screen-space projection, no
// per-asset skirt/pivot correction like the isometric-sprite (`quad`)
// renderer needs. Floor tiles, furniture, and the character all resolve
// "where is tile (row, col)" through this one function so they can't drift
// out of sync with each other.
export const TILE_SIZE = 1;

export interface RoomDims3D {
  width: number;
  height: number;
}

export function roomHalfExtents(dims: RoomDims3D) {
  return {
    halfWidth: (dims.width * TILE_SIZE) / 2,
    halfDepth: (dims.height * TILE_SIZE) / 2,
  };
}

export function gridToWorld(row: number, col: number, dims: RoomDims3D): { x: number; z: number } {
  const { halfWidth, halfDepth } = roomHalfExtents(dims);
  return {
    x: -halfWidth + TILE_SIZE / 2 + col * TILE_SIZE,
    z: -halfDepth + TILE_SIZE / 2 + row * TILE_SIZE,
  };
}
