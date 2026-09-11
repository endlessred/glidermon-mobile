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

export interface WallFurnitureConfig {
  /** Unique identifier for this wall furniture instance */
  id: string;
  /** Variant ID from the wall furniture definition */
  variantId: string;
  /** The wall ID where furniture is placed (e.g., "LeftBack5", "RightBack2") */
  wallId: string;
  /** Rendering layer for wall furniture */
  layer: "background" | "foreground";
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
  /** Wall-mounted furniture and art */
  wallFurniture?: WallFurnitureConfig[];
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

export interface FurnitureVariantLayer {
  /** Source filename stem, same convention as `restPoseAsset` below. */
  assetName: string;
  /** If >1, this layer is a horizontal flipbook sprite-sheet with this many
   * equal-width frames, cycled at `fps` -- e.g. a campfire flicker or a
   * chest opening. Omitted/1 means a plain static image. */
  frameCount?: number;
  fps?: number;
}

/**
 * Describes what happens when GliderMon interacts with a piece of furniture
 * from an adjacent character slot (see roomSlots.ts' CharacterSlotDef). The
 * furniture -- not the room logic -- owns this metadata, so new furniture can
 * be added without touching the room/behavior code. An unsupported `behavior`
 * (not in SUPPORTED_INTERACTION_BEHAVIORS, lifelikeIdle_noMix.ts) is not an
 * error: the character slot simply stays a plain idle position.
 */
export interface FurnitureInteractionDef {
  /** Behavior key, e.g. 'sit' | 'dance' | 'campfire' | 'sleep'. Resolved
   * against the behavior registry in lifelikeIdle_noMix.ts. */
  behavior: string;
  /** Optional hint into the behavior registry / future dedicated clip. */
  animation?: string;
  /** Authoring hint for which side the character stands on ('front' | 'back'
   * | 'left' | 'right'). Not enforced -- the character stays front-facing. */
  interactionSide?: string;
  /** Mirror the character horizontally (scale.x *= -1) while the interaction
   * behavior is active -- e.g. so he faces into a chair whose art points the
   * other way. Purely a left/right flip, still front-facing (no back-facing
   * art needed). Cleared automatically when the interaction ends. */
  characterFlipX?: boolean;
  /**
   * Character render-position offset applied while the interaction behavior is
   * active, relative to the FURNITURE object's world origin
   * (gridToWorld(slot.row, slot.col, dims, slot.footprint) in grid3D.ts) --
   * NOT the character slot's tile. World units (TILE_SIZE = 1). Lets seating
   * (chairs/couches/benches/hammocks) snap the character onto the seat.
   * Expected to be tuned per variant.
   */
  interactionAnchor?: { xOffset: number; yOffset: number; zOffset?: number };
}

export interface FurnitureVariant {
  /** Variant identifier */
  id: string;
  /**
   * Player-facing name -- the only name ever shown in Shop/Furnish/etc.
   * `id`/`skin` are internal asset-pipeline identifiers (e.g. "TableLamp_On")
   * and must never leak into player-visible UI; always set this explicitly
   * rather than deriving one from `id`/`skin` at render time.
   */
  displayName: string;
  /** Acorn cost to unlock this variant in the shop. */
  cost: number;
  /** Optional skin override for this variant */
  skin?: string;
  /** Optional tint color for this variant */
  tint?: string;
  /**
   * Per-variant interaction override. Shallow-merged over the FurnitureDef's
   * `interaction` by getFurnitureInteraction() -- a variant can override just
   * `interactionAnchor` (seat position differs per chair model) while
   * inheriting the shared `behavior`. */
  interaction?: FurnitureInteractionDef;
  /**
   * Source filename stem (from the Exports/ asset pack, e.g.
   * "1x1_WoodChair_Front_Green") for this variant's idle rest-pose art.
   * Used by the quad-based renderer to draw furniture as a static sprite
   * when it isn't being actively animated as a Spine skeleton.
   */
  restPoseAsset?: string;
  /**
   * Ordered stack of billboard layers for the 3D-primitive room shell --
   * lets a variant composite multiple images (e.g. bed frame + bedding)
   * and/or include a frame-cycling animated layer, instead of exactly one
   * static image. Falls back to a single layer built from `restPoseAsset`
   * when omitted.
   */
  layers?: FurnitureVariantLayer[];

  // Shop stock metadata (see data/shop/shopTypes.ts) -- independent of cost
  // above. Absence of shopStock just means this variant isn't sold through
  // the Luma/Sable restock system.
  rarity?: import("../../../data/shop/shopTypes").Rarity;
  tags?: string[];
  shopStock?: import("../../../data/shop/shopTypes").ShopStockConfig[];
}

// --- Plain-data grid/slot model for the quad-based room renderer ---
// (Phase 1: replaces Spine-slot-name coupling with plain row/col data.
// Does not replace the set/variant types above, which are shared with the
// legacy Spine-based renderer.)

export interface RoomGridConfig {
  width: number;
  height: number;
  /** Variant is always auto-computed per tile (corner/edge/interior) -- not settable here. */
  defaultFloor: { set: FloorSetName };
  /** Variant is always auto-computed per wall-run position -- not settable here. */
  defaultWall: { set: WallSetName };
  /** Sparse per-tile floor overrides; row/col are 0-based, variant is explicit (not auto-computed). */
  floorOverrides?: { row: number; col: number; set: FloorSetName; variant: FloorVariant }[];
}

export interface FurnitureSlot {
  /** Stable id, independent of room-size tier (e.g. "floor-1", "wall-3"). */
  slotId: string;
  row: number;
  col: number;
  kind: 'floor' | 'wall';
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
  /**
   * Default interaction for every variant of this furniture type. A variant's
   * own `interaction` is shallow-merged over this (see getFurnitureInteraction
   * in furnitureCatalog.ts). Omit for furniture that can't be interacted with.
   */
  interaction?: FurnitureInteractionDef;
  /** Whether this furniture supports facing direction (uses FlipX animation) */
  supportsFacing?: boolean;
  /** Default facing direction */
  defaultFacing?: "left" | "right";
  /**
   * Overrides the 3D-primitive renderer's global billboard scale
   * (`FURNITURE_DESIRED_TILE_HEIGHT` in furnitureBillboard3D.ts) for this
   * furniture type. Most furniture reads fine at the shared default; a few
   * (e.g. the bed) need to read larger relative to their footprint.
   */
  desiredTileHeight?: number;
}

export interface FurnitureCatalog {
  [furnitureId: string]: FurnitureDef;
}