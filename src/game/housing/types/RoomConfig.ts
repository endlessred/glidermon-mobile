// Room configuration types for programmatic room building

export interface RoomTileConfig {
  /** The tile ID (A1, A2, B1, etc.) */
  tileId: string;
  /** Floor tile configuration */
  floor?: {
    /** Floor set name (e.g., "BlueBlankFloor", "RedCarpet") */
    set: string;
    /** Tile variant (e.g., "CornerTop", "Sides1") */
    variant: string;
  };
}

export interface RoomWallConfig {
  /** The wall slot ID (LeftBack1, RightBack1, etc.) */
  wallId: string;
  /** Wall tile configuration */
  wall?: {
    /** Wall set name (e.g., "BlueBlankWall", "Brown1BrickWall") */
    set: string;
    /** Wall variant (e.g., "EndWallTop", "Sides1") */
    variant: string;
  };
}

export interface RoomFurnitureConfig {
  /** Unique identifier for this furniture instance */
  id: string;
  /** Variant ID from the furniture definition */
  variantId: string;
  /** The tile ID where furniture is placed */
  tileId: string;
  /** Rotation in degrees (0, 90, 180, 270) */
  rotation: number;
  /** Rendering layer */
  layer: "under" | "mid" | "over";
  /** Chair orientation: "left" (default) or "right" (uses FlipX animation) */
  facing?: "left" | "right";
}

export interface RoomLayoutConfig {
  /** Room metadata */
  name: string;
  /** Room dimensions (width x height in tiles) */
  dimensions: { width: number; height: number };
  /** Default floor style for the room */
  defaultFloor?: {
    set: string;
    variant: string;
  };
  /** Default wall style for the room */
  defaultWall?: {
    set: string;
    variant: string;
  };
  /** Floor tile configurations */
  floors: RoomTileConfig[];
  /** Wall configurations */
  walls: RoomWallConfig[];
  /** Furniture placements */
  furniture?: RoomFurnitureConfig[];
}

// Pre-defined room templates
export interface RoomTemplate {
  id: string;
  name: string;
  description: string;
  layout: RoomLayoutConfig;
}

// Available floor sets (matching our organized assets)
export const AVAILABLE_FLOOR_SETS = [
  'BlackWhiteBlankFloor', 'BlackWhiteCarpet', 'BlackWhiteCheckeredFloor1', 'BlackWhiteWoodFloor',
  'BlueBlankFloor', 'BlueCarpet', 'BlueCheckeredFloor1', 'BlueWoodFloor',
  'Brown1BlankFloor', 'Brown1Carpet', 'Brown1CheckeredFloor1', 'Brown1WoodFloor',
  'DarkBlankFloor', 'DarkCarpet', 'DarkCheckeredFloor1', 'DarkWoodFloor',
  'GreyBlankFloor', 'GreyCarpet', 'GreyCheckeredFloor1', 'GreyWoodFloor',
  'RedBlankFloor', 'RedCarpet', 'RedCheckeredFloor1', 'RedWoodFloor',
  'YellowBlankFloor', 'YellowCarpet', 'YellowCheckeredFloor1', 'YellowWoodFloor'
] as const;

// Available wall sets (matching our organized assets)
export const AVAILABLE_WALL_SETS = [
  'BlueBlankWall', 'BlueBrickWall', 'BlueOldWall1', 'BlueWoodPaneling',
  'Brown1BlankWall', 'Brown1BrickWall', 'Brown1OldWall1', 'Brown1WoodPaneling',
  'DarkBlankWall', 'DarkBrickWall', 'DarkOldWall1', 'DarkWoodPaneling',
  'GreyBlankWall', 'GreyBrickWall', 'GreyOldWall1', 'GreyWoodPaneling',
  'WhiteBlankWall', 'WhiteBrickWall', 'WhiteOldWall1', 'WhiteWoodPaneling'
] as const;

// Available floor variants
export const FLOOR_VARIANTS = [
  'CornerBottom', 'CornerLeft', 'CornerRight', 'CornerTop',
  'SideBottomLeft', 'SideBottomRight', 'Sides1', 'Sides2',
  'SideTopLeft', 'SideTopRight'
] as const;

// Available wall variants
export const WALL_VARIANTS = [
  'EndWallBottom', 'EndWallTop', 'Sides1', 'Sides2'
] as const;

export type FloorSetName = typeof AVAILABLE_FLOOR_SETS[number];
export type WallSetName = typeof AVAILABLE_WALL_SETS[number];
export type FloorVariant = typeof FLOOR_VARIANTS[number];
export type WallVariant = typeof WALL_VARIANTS[number];

// Furniture catalog system
export interface FurnitureFootprint {
  /** Width in tiles */
  w: number;
  /** Height in tiles */
  h: number;
  /** Allowed rotation angles in degrees */
  allowedRot: number[];
}

export interface FurnitureVariant {
  /** Variant identifier */
  id: string;
  /** Optional skin override for this variant */
  skin?: string;
  /** Optional tint color for this variant */
  tint?: string;
}

export interface FurnitureDef {
  /** Furniture type identifier (e.g., "chair_wood") */
  id: string;
  /** Spine skeleton key or atlas id */
  skeleton: string;
  /** Possible footprints for this furniture */
  footprints: FurnitureFootprint[];
  /** Fine positioning adjustment per tile center */
  anchors?: { dx?: number; dy?: number };
  /** Supported rendering layers */
  supportsLayers: Array<"under" | "mid" | "over">;
  /** Occlusion behavior for z-ordering */
  occlusion: "none" | "footboard" | "tall";
  /** Available variants for this furniture */
  variants: FurnitureVariant[];
  /** Whether this furniture supports facing direction (uses FlipX animation) */
  supportsFacing?: boolean;
  /** Default facing direction */
  defaultFacing?: "left" | "right";
}

export interface FurnitureCatalog {
  [furnitureId: string]: FurnitureDef;
}