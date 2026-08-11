// Single source of truth for the procedural floor/wall pattern system used by
// the 3D-primitive room shell (IsometricRoomView3D.tsx). Deliberately
// SEPARATE from FloorSetName/WallSetName (RoomConfig.ts) -- those are tied to
// real PNG assets from the purchased pack for the `quad`/`legacy` renderers,
// and adding procedural-only names into that shared type would let a player
// "unlock" a set with no backing art for those fallback renderers. Both the
// in-scene THREE.DataTexture generator (render/proceduralTextures.ts) and the
// shop preview (ui/components/PatternSwatch.tsx) import FAMILY_COLORS from
// here so the two never drift apart.
//
// Also folds in a second, 'material' kind of floor/wall product backed by
// real photographic PBR textures (see materialCatalogManifest.ts, generated
// by process_materials.py from the curated src/assets/Materials pack) rather
// than a generated DataTexture -- both kinds share this same catalog/id
// space since they're both consumed only by the primitive3d room shell.
import { materialCatalogManifest } from '../assets/generated/materialCatalogManifest';

export type PatternFamily = 'BlackWhite' | 'Blue' | 'Brown1' | 'Dark' | 'Grey' | 'Red' | 'Yellow';

export const PATTERN_FAMILIES: PatternFamily[] = ['BlackWhite', 'Blue', 'Brown1', 'Dark', 'Grey', 'Red', 'Yellow'];

export const FAMILY_DISPLAY_NAMES: Record<PatternFamily, string> = {
  BlackWhite: 'Black & White',
  Blue: 'Blue',
  Brown1: 'Brown',
  Dark: 'Charcoal',
  Grey: 'Grey',
  Red: 'Red',
  Yellow: 'Yellow',
};

export interface FamilyColors {
  base: string;
  light: string;
  dark: string;
}

export const FAMILY_COLORS: Record<PatternFamily, FamilyColors> = {
  BlackWhite: { base: '#d2d2d2', light: '#f0f0f0', dark: '#282828' },
  Blue: { base: '#5a82c8', light: '#82a5e1', dark: '#32508c' },
  Brown1: { base: '#a9784c', light: '#c49669', dark: '#6e4a2a' },
  Dark: { base: '#464448', light: '#5f5c64', dark: '#232226' },
  Grey: { base: '#8c8c91', light: '#aaaaaf', dark: '#5f5f64' },
  Red: { base: '#b44641', light: '#cd695f', dark: '#782826' },
  Yellow: { base: '#e8b84b', light: '#f5d278', dark: '#b4872d' },
};

export type FloorPatternStyle =
  | 'Blank'
  | 'Carpet'
  | 'Checkered'
  | 'Wood'
  | 'Stripe'
  | 'PolkaDot'
  | 'Gingham'
  | 'DiagonalCheckered'
  | 'Terrazzo'
  | 'Herringbone'
  | 'Basketweave'
  | 'Hexagon'
  | 'Marble';

export const FLOOR_STYLES: { style: FloorPatternStyle; name: string; cost: number }[] = [
  { style: 'Blank', name: 'Blank', cost: 80 },
  { style: 'Carpet', name: 'Carpet', cost: 120 },
  { style: 'Checkered', name: 'Checkered', cost: 120 },
  { style: 'Wood', name: 'Wood Floor', cost: 130 },
  { style: 'Stripe', name: 'Striped', cost: 100 },
  { style: 'PolkaDot', name: 'Polka Dot', cost: 110 },
  { style: 'Gingham', name: 'Gingham', cost: 130 },
  { style: 'DiagonalCheckered', name: 'Diagonal Checker', cost: 140 },
  { style: 'Terrazzo', name: 'Terrazzo', cost: 150 },
  { style: 'Herringbone', name: 'Herringbone', cost: 160 },
  { style: 'Basketweave', name: 'Basketweave', cost: 160 },
  { style: 'Hexagon', name: 'Hexagon Tile', cost: 170 },
  { style: 'Marble', name: 'Marble', cost: 180 },
];

export type WallPatternStyle =
  | 'Blank'
  | 'Brick'
  | 'WoodPaneling'
  | 'VerticalPaneling'
  | 'Stripe'
  | 'PolkaDot'
  | 'Beadboard'
  | 'Wainscoting'
  | 'SubwayTile';

export const WALL_STYLES: { style: WallPatternStyle; name: string; cost: number }[] = [
  { style: 'Blank', name: 'Blank', cost: 100 },
  { style: 'Brick', name: 'Brick', cost: 150 },
  { style: 'WoodPaneling', name: 'Wood Paneling', cost: 150 },
  { style: 'VerticalPaneling', name: 'Vertical Paneling', cost: 150 },
  { style: 'Stripe', name: 'Striped Wallpaper', cost: 120 },
  { style: 'PolkaDot', name: 'Polka Dot Wallpaper', cost: 130 },
  { style: 'Beadboard', name: 'Beadboard', cost: 160 },
  { style: 'Wainscoting', name: 'Wainscoting', cost: 190 },
  { style: 'SubwayTile', name: 'Subway Tile', cost: 180 },
];

// Two kinds of floor/wall product: 'procedural' (the DataTexture-painted
// styles above, tinted per family) and 'material' (real photographic PBR
// textures from the curated src/assets/Materials pack -- see
// materialCatalogManifest.ts / materialTextures.ts). Both render in the same
// shop grid and flow through the same unlock/equip id strings in
// housingStore.ts, so no store changes were needed to add the second kind.
interface ProceduralFloorPatternItem {
  id: string;
  kind: 'procedural';
  family: PatternFamily;
  style: FloorPatternStyle;
  name: string;
  cost: number;
}

export interface MaterialFloorPatternItem {
  id: string;
  kind: 'material';
  materialId: string;
  name: string;
  cost: number;
}

export type FloorPatternItem = ProceduralFloorPatternItem | MaterialFloorPatternItem;

interface ProceduralWallPatternItem {
  id: string;
  kind: 'procedural';
  family: PatternFamily;
  style: WallPatternStyle;
  name: string;
  cost: number;
}

export interface MaterialWallPatternItem {
  id: string;
  kind: 'material';
  materialId: string;
  name: string;
  cost: number;
}

export type WallPatternItem = ProceduralWallPatternItem | MaterialWallPatternItem;

const PROCEDURAL_FLOOR_PATTERN_CATALOG: FloorPatternItem[] = PATTERN_FAMILIES.flatMap((family) =>
  FLOOR_STYLES.map(({ style, name, cost }) => ({
    id: `${family}_${style}`,
    kind: 'procedural' as const,
    family,
    style,
    name: `${FAMILY_DISPLAY_NAMES[family]} ${name}`,
    cost,
  }))
);

const PROCEDURAL_WALL_PATTERN_CATALOG: WallPatternItem[] = PATTERN_FAMILIES.flatMap((family) =>
  WALL_STYLES.map(({ style, name, cost }) => ({
    id: `${family}_${style}`,
    kind: 'procedural' as const,
    family,
    style,
    name: `${FAMILY_DISPLAY_NAMES[family]} ${name}`,
    cost,
  }))
);

const MATERIAL_FLOOR_PATTERN_CATALOG: FloorPatternItem[] = materialCatalogManifest
  .filter((entry) => entry.kind === 'floor')
  .map((entry) => ({
    id: entry.id,
    kind: 'material' as const,
    materialId: entry.id,
    name: entry.name,
    cost: entry.cost,
  }));

const MATERIAL_WALL_PATTERN_CATALOG: WallPatternItem[] = materialCatalogManifest
  .filter((entry) => entry.kind === 'wall')
  .map((entry) => ({
    id: entry.id,
    kind: 'material' as const,
    materialId: entry.id,
    name: entry.name,
    cost: entry.cost,
  }));

export const FLOOR_PATTERN_CATALOG: FloorPatternItem[] = [
  ...PROCEDURAL_FLOOR_PATTERN_CATALOG,
  ...MATERIAL_FLOOR_PATTERN_CATALOG,
];

export const WALL_PATTERN_CATALOG: WallPatternItem[] = [
  ...PROCEDURAL_WALL_PATTERN_CATALOG,
  ...MATERIAL_WALL_PATTERN_CATALOG,
];

const floorPatternById = new Map(FLOOR_PATTERN_CATALOG.map((item) => [item.id, item]));
const wallPatternById = new Map(WALL_PATTERN_CATALOG.map((item) => [item.id, item]));

export function getFloorPatternById(id: string): FloorPatternItem | undefined {
  return floorPatternById.get(id);
}

export function getWallPatternById(id: string): WallPatternItem | undefined {
  return wallPatternById.get(id);
}

export const DEFAULT_FLOOR_PATTERN_ID: string = 'Yellow_Carpet';
export const DEFAULT_WALL_PATTERN_ID: string = 'Brown1_WoodPaneling';
