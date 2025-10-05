// Real isometric tile dimensions from asset analysis
export const TILE_W = 404;    // Top diamond width in px
export const TILE_H = 202;    // Top diamond height in px (2:1 iso ratio)
export const TILE_SKIRT = 69; // Thickness below the diamond

// Wall dimensions based on asset analysis
export const WALL_W = 235;      // Total sprite width
export const WALL_H = 585;      // Height above floor line
export const WALL_SKIRT = 16;   // Bevel below floor line

// Exact isometric constants
export const HALF_W = TILE_W / 2;   // 202
export const HALF_H = TILE_H / 2;   // 101

export type Vec2 = { x: number; y: number };      // tile-space (floats ok)

export function isoToScreen(x: number, y: number) {
  // IMPORTANT: this returns the CENTER of the tile
  return { x: (x - y) * HALF_W, y: (x + y) * HALF_H };
}

export function screenToIso(px: number, py: number) {
  // inverse for picking; assumes same TILE_W/H
  const x = (px / (TILE_W / 2) + py / (TILE_H / 2)) / 2;
  const y = (py / (TILE_H / 2) - px / (TILE_W / 2)) / 2;
  return { x, y };
}

export function zFromFeetScreenY(screenY: number): number {
  // invert so larger y (closer to camera) draws in front
  return screenY * 0.001; // tiny scaling into [-1,1] range is fine
}