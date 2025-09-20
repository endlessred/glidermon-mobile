// types/sprites/rig.ts
export type SpriteSource = number | string; // <-- support web (string) + native (number)

export type FrameAnchor = { x: number; y: number; rot?: number; z?: number }; // rot in degrees
export type FrameDef = {
  x: number; y: number; w: number; h: number;
  pivotX: number; pivotY: number;
  anchors: Record<string, FrameAnchor>;
};
export type AnimTag = { name: string; from: number; to: number; durationMs: number };
export type SpriteRig = {
  tex: SpriteSource;       // <-- string | number
  frames: FrameDef[];
  tags: AnimTag[];
};

export function makeGridRig(
  tex: SpriteSource,
  cols = 4,
  rows = 2,
  w = 64,
  h = 64,
  pivotX = 32,
  pivotY = 60,
  headTop = { x: 34, y: 12 }
): SpriteRig {
  const frames: FrameDef[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    frames.push({ x: c*w, y: r*h, w, h, pivotX, pivotY, anchors: { headTop: { ...headTop } } });
  }
  return { tex, frames, tags: [{ name: "idle", from: 0, to: cols*rows - 1, durationMs: 900 }] };
}
