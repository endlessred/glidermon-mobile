import type { AssetKey } from "../assets/assetMap";

export type SocketName = "headTop" | "hand" | "earL" | "earR" | "center";

export type Anchor = { x: number; y: number; rot?: number }; // rot in degrees
export type AnchorOverride = Partial<Anchor> & { mode?: "add" | "set" };

export type FrameOverride =
  | { index: number; anchor: Partial<Record<SocketName, AnchorOverride>> }
  | { range: [number, number]; anchor: Partial<Record<SocketName, AnchorOverride>> };

export type SpriteSheetId = "glider_idle" | "glider_idle_blink";

export type SpriteSheetConfig = {
  id: SpriteSheetId;
  texKey: AssetKey;
  grid: { cols: number; rows: number; w: number; h: number };
  pivot: { x: number; y: number };
  defaultAnchors: Record<SocketName, Anchor>;
  overrides?: FrameOverride[];
  // If this sheet is the blink variant of another, link it (optional)
  variantOf?: SpriteSheetId;
};

export const SpriteCatalog: Record<SpriteSheetId, SpriteSheetConfig> = {
  glider_idle: {
    id: "glider_idle",
    texKey: "idle8",
    grid: { cols: 4, rows: 2, w: 64, h: 64 },
    pivot: { x: 32, y: 61 }, // +1px nudge you wanted
    defaultAnchors: {
      headTop: { x: 34, y: 12, rot: 0 },
      hand: { x: 40, y: 44, rot: 0 },
      center: { x: 32, y: 32, rot: 0 },
      earL: { x: 20, y: 10, rot: 0 },
      earR: { x: 44, y: 10, rot: 0 },
    },
    // Your test: frames 3..6 shift headTop left by 1px
    overrides: [
      { range: [3, 6], anchor: { headTop: { mode: "add", x: -1 } } },
    ],
  },
  glider_idle_blink: {
    id: "glider_idle_blink",
    texKey: "idle8blink",
    grid: { cols: 4, rows: 2, w: 64, h: 64 },
    pivot: { x: 32, y: 61 },
    defaultAnchors: {
      headTop: { x: 34, y: 12, rot: 0 },
      hand: { x: 40, y: 44, rot: 0 },
      center: { x: 32, y: 32, rot: 0 },
      earL: { x: 20, y: 10, rot: 0 },
      earR: { x: 44, y: 10, rot: 0 },
    },
    overrides: [
      { range: [3, 6], anchor: { headTop: { mode: "add", x: -1 } } },
    ],
    variantOf: "glider_idle",
  },
};
