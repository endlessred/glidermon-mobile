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

export function gridToWorld(
  row: number,
  col: number,
  dims: RoomDims3D,
  footprint?: { w: number; h: number }
): { x: number; z: number } {
  const { halfWidth, halfDepth } = roomHalfExtents(dims);
  // A footprint wider/deeper than 1x1 (e.g. a 2-wide bed) is anchored at its
  // (row, col) corner tile, not its center -- shift by half the extra span
  // so multi-tile items are centered over their whole footprint instead of
  // overhanging asymmetrically off the anchor tile.
  const colOffset = footprint ? ((footprint.w - 1) * TILE_SIZE) / 2 : 0;
  const rowOffset = footprint ? ((footprint.h - 1) * TILE_SIZE) / 2 : 0;
  return {
    x: -halfWidth + TILE_SIZE / 2 + col * TILE_SIZE + colOffset,
    z: -halfDepth + TILE_SIZE / 2 + row * TILE_SIZE + rowOffset,
  };
}
