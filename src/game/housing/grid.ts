// Plain-data grid math for the quad-based room renderer.
// Generalizes the corner/edge/interior tile-variant logic from
// RoomBuilder.ts (Spine-slot based) to arbitrary room width/height,
// using 0-based row/col instead of Excel-style tile ids.

import { FloorVariant, WallVariant } from './types/RoomConfig';

export interface RoomDimensions {
  width: number;
  height: number;
}

export function determineFloorVariant(row: number, col: number, dims: RoomDimensions): FloorVariant {
  const isTopRow = row === 0;
  const isBottomRow = row === dims.height - 1;
  const isLeftCol = col === 0;
  const isRightCol = col === dims.width - 1;

  if (isTopRow && isLeftCol) return 'CornerTop';
  if (isTopRow && isRightCol) return 'CornerLeft';
  if (isBottomRow && isRightCol) return 'CornerBottom';
  if (isBottomRow && isLeftCol) return 'CornerRight';

  if (isTopRow) return 'SideTopLeft';
  if (isRightCol) return 'SideBottomLeft';
  if (isBottomRow) return 'SideBottomRight';
  if (isLeftCol) return 'SideTopRight';

  return 'Sides2';
}

// index/length describe position along a single back-wall run (LeftBack or
// RightBack), not the whole room — e.g. for a 4-wide RightBack run, index
// goes 0..3. The two ends of the run get end-cap art; everything between is
// a plain repeating section.
export function determineWallVariant(index: number, length: number): WallVariant {
  if (length <= 1) return 'Sides2';
  if (index === 0) return 'EndWallTop';
  if (index === length - 1) return 'EndWallBottom';
  return 'Sides2';
}
