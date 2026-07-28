// Single source of truth for the procedural floor/wall pattern system used by
// the 3D-primitive room shell (IsometricRoomView3D.tsx). Deliberately
// SEPARATE from FloorSetName/WallSetName (RoomConfig.ts) -- those are tied to
// real PNG assets from the purchased pack for the `quad`/`legacy` renderers,
// and adding procedural-only names into that shared type would let a player
// "unlock" a set with no backing art for those fallback renderers. Both the
// in-scene THREE.DataTexture generator (render/proceduralTextures.ts) and the
// shop preview (ui/components/PatternSwatch.tsx) import FAMILY_COLORS from
// here so the two never drift apart.
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

export interface FloorPatternItem {
  id: string;
  family: PatternFamily;
  style: FloorPatternStyle;
  name: string;
  cost: number;
}

export interface WallPatternItem {
  id: string;
  family: PatternFamily;
  style: WallPatternStyle;
  name: string;
  cost: number;
}

export const FLOOR_PATTERN_CATALOG: FloorPatternItem[] = PATTERN_FAMILIES.flatMap((family) =>
  FLOOR_STYLES.map(({ style, name, cost }) => ({
    id: `${family}_${style}`,
    family,
    style,
    name: `${FAMILY_DISPLAY_NAMES[family]} ${name}`,
    cost,
  }))
);

export const WALL_PATTERN_CATALOG: WallPatternItem[] = PATTERN_FAMILIES.flatMap((family) =>
  WALL_STYLES.map(({ style, name, cost }) => ({
    id: `${family}_${style}`,
    family,
    style,
    name: `${FAMILY_DISPLAY_NAMES[family]} ${name}`,
    cost,
  }))
);

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
