// Premium "Nest Theme" catalog -- a cohesive, intentionally-composed set of
// wall/floor art for the 3D-primitive room shell, kept deliberately SEPARATE
// from proceduralPatternCatalog.ts's WALL_PATTERN_CATALOG/FLOOR_PATTERN_CATALOG.
// Those catalogs hold independent, tileable/repeating per-surface products
// (procedural styles + photographic PBR materials) where the same id can sit
// on any wall or any floor interchangeably. A Nest Theme is the opposite: one
// authored composition that spans a whole architectural surface, with the
// left wall, right wall, and floor pieces meant to be seen together -- see
// housingStore.ts's `applyNestTheme` for how a theme's pieces get equipped
// into the existing per-surface selection fields without inventing a
// parallel store shape.
//
// Render-mode vocabulary (consumed by render/sceneBuilder3D.ts):
//   - 'repeat'/'tile'   = the existing proceduralPatternCatalog.ts behavior
//                         (texture repeats across the wall / once per tile).
//   - 'fullWall'/'fullFloor' = this file's authored-composition behavior
//                         (one image mapped once across the whole surface,
//                         cropped rather than stretched for smaller room
//                         tiers -- see sceneBuilder3D.ts).
import { isPremiumEntitled } from '../premiumEntitlement';

export type WallRenderMode = 'repeat' | 'fullWall';
export type FloorRenderMode = 'tile' | 'fullFloor';

// The master wall/floor art is authored at the largest room tier (Tier 2,
// 5 tiles) and cropped down for smaller tiers rather than stretched -- see
// sceneBuilder3D.ts's PREMIUM_MASTER_ROOM_TILES usage for both the
// corner-anchored wall crop and the center-anchored floor crop.
export const PREMIUM_MASTER_ROOM_TILES = 5;

export interface NestThemeWallSpec {
  /** backWallZ / PX -- the visible LEFT screen wall. See sceneBuilder3D.ts's
   *  BOX_FACE comment for why this is a screen-facing name, not a world-axis
   *  one -- world axis and screen side do NOT match 1:1 for these two walls. */
  left: any;
  /** backWallX / PZ -- the visible RIGHT screen wall. */
  right: any;
  mode: 'fullWall';
}

export interface NestThemeFloorSpec {
  texture: any;
  mode: 'fullFloor';
}

export interface NestThemeDefinition {
  id: string;
  name: string;
  /** No billing implementation yet -- see premiumEntitlement.ts. Rendering
   *  never checks this itself; entitlement is enforced once, in
   *  housingStore.ts's `applyNestTheme`, before any selection is written. */
  premiumOnly: boolean;
  walls: NestThemeWallSpec;
  floor: NestThemeFloorSpec;
}

export const NEST_THEME_CATALOG: NestThemeDefinition[] = [
  {
    id: 'retro_future_capsule',
    name: 'Retro-Future Capsule',
    premiumOnly: true,
    walls: {
      left: require('../../../assets/Materials/Processed/Premium/RetroFuture/RetroFutureLeftWall.png'),
      right: require('../../../assets/Materials/Processed/Premium/RetroFuture/RetroFutureRightWall.png'),
      mode: 'fullWall',
    },
    floor: {
      texture: require('../../../assets/Materials/Processed/Premium/RetroFuture/RetroFutureFloor.png'),
      mode: 'fullFloor',
    },
  },
  {
    id: 'mossy_grove',
    name: 'Mossy Grove',
    premiumOnly: true,
    walls: {
      left: require('../../../assets/Materials/Processed/Premium/MossyGrove/MossyGroveLeftWall.png'),
      right: require('../../../assets/Materials/Processed/Premium/MossyGrove/MossyGroveRightWall.png'),
      mode: 'fullWall',
    },
    floor: {
      texture: require('../../../assets/Materials/Processed/Premium/MossyGrove/MossyGroveFloor.png'),
      mode: 'fullFloor',
    },
  },
  {
    id: 'cozy_witchy_room',
    name: 'Cozy Witchy Room',
    premiumOnly: true,
    walls: {
      left: require('../../../assets/Materials/Processed/Premium/CozyWitchy/CozyWitchyRoomLeftWall.png'),
      right: require('../../../assets/Materials/Processed/Premium/CozyWitchy/CozyWitchyRoomRightWall.png'),
      mode: 'fullWall',
    },
    floor: {
      texture: require('../../../assets/Materials/Processed/Premium/CozyWitchy/CozyWitchyRoomFloor.png'),
      mode: 'fullFloor',
    },
  },
];

const themeById = new Map(NEST_THEME_CATALOG.map((t) => [t.id, t]));

export function getNestThemeById(id: string): NestThemeDefinition | undefined {
  return themeById.get(id);
}

// The one "which themes can Furnish Nest show/apply" gate -- v1 shows only
// usable themes (no locked-theme upsell UI yet, per the housing plan), so
// this is a plain filter rather than a per-theme ownership list.
export function getUsableNestThemes(): NestThemeDefinition[] {
  return NEST_THEME_CATALOG.filter((t) => !t.premiumOnly || isPremiumEntitled());
}

// Deterministic per-surface ids so housingStore's existing single-id
// wall-pattern/floor-pattern fields can each hold one authored theme piece
// without a parallel selection schema -- see housingStore.ts's
// `activeWallPatternIdLeft`/`activeWallPatternIdRight`/`activeFloorPatternId`.
// These ids intentionally live outside proceduralPatternCatalog.ts's id space
// (never collide with a real procedural/material catalog id) so
// sceneBuilder3D.ts can tell "is this a theme piece?" apart from "is this an
// unknown/corrupt catalog id?" before falling back.
export function nestThemeWallLeftId(themeId: string): string {
  return `nestTheme:${themeId}:wallLeft`;
}
export function nestThemeWallRightId(themeId: string): string {
  return `nestTheme:${themeId}:wallRight`;
}
export function nestThemeFloorId(themeId: string): string {
  return `nestTheme:${themeId}:floor`;
}

export interface ThemeWallPiece {
  themeId: string;
  side: 'left' | 'right';
  source: any;
  mode: 'fullWall';
}

export function getNestThemeWallPieceById(id: string): ThemeWallPiece | undefined {
  for (const theme of NEST_THEME_CATALOG) {
    if (id === nestThemeWallLeftId(theme.id)) {
      return { themeId: theme.id, side: 'left', source: theme.walls.left, mode: 'fullWall' };
    }
    if (id === nestThemeWallRightId(theme.id)) {
      return { themeId: theme.id, side: 'right', source: theme.walls.right, mode: 'fullWall' };
    }
  }
  return undefined;
}

export interface ThemeFloorPiece {
  themeId: string;
  source: any;
  mode: 'fullFloor';
}

export function getNestThemeFloorPieceById(id: string): ThemeFloorPiece | undefined {
  for (const theme of NEST_THEME_CATALOG) {
    if (id === nestThemeFloorId(theme.id)) {
      return { themeId: theme.id, source: theme.floor.texture, mode: 'fullFloor' };
    }
  }
  return undefined;
}
