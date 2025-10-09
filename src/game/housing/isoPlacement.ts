// Extracted isometric placement functions from IsometricHousingThreeJS.tsx
// These handle the coordinate transformations for the isometric view

import { HALF_W, HALF_H } from './coords';

const HALF_WIDTH_NUDGE = -20;
const HALF_HEIGHT_NUDGE = 0;
const FLOOR_ROWS = 8;
const FLOOR_COLS = 8;

const isoToScreenCentered = (x: number, y: number) => ({
  x: (x - y) * (HALF_W + HALF_WIDTH_NUDGE),
  y: (x + y) * (HALF_H + HALF_HEIGHT_NUDGE),
});

const roomCtr = isoToScreenCentered((FLOOR_COLS - 1) / 2, (FLOOR_ROWS - 1) / 2);

export const placeX = (sx: number) => sx - roomCtr.x;
export const placeY = (sy: number) => roomCtr.y - sy;

export type IsoFeetToSceneFn = (x: number, y: number) => { x: number; y: number; feetY: number };

export const isoFeetToScene: IsoFeetToSceneFn = (x: number, y: number) => {
  const c = isoToScreenCentered(x, y);
  const feetY = c.y + (HALF_H + HALF_HEIGHT_NUDGE);
  return { x: placeX(c.x), y: placeY(feetY), feetY };
};