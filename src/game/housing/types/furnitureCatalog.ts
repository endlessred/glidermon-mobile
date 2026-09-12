import { FurnitureCatalog, FurnitureDef, FurnitureInteractionDef } from './RoomConfig';
import { SlotType } from './roomSlots';
import type { Rarity, ShopStockConfig } from '../../../data/shop/shopTypes';
import { FURNITURE_RECOLOR_PALETTES } from '../furniture/FurnitureColors';

// Furniture catalog defining all available furniture items, one entry per
// slot type (see roomSlots.ts) with 1-2 starter variants each, sourced from
// real assets in Processed/ (see the housing plan's "Starter catalog" table
// for the exact source paths). Two variants use `layers` with a
// frame-cycling animated layer (Chest, Campfire); everything else is a
// static billboard, same as the original chair.
export const FURNITURE_CATALOG: FurnitureCatalog = {
  chair: {
    id: "chair",
    skeleton: "Chair",
    footprints: [{ w: 1, h: 1, allowedRot: [0, 90, 180, 270] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["under", "mid", "over"],
    occlusion: "none",
    supportsFacing: true,
    defaultFacing: "left",
    // Sit is a real behavior today (BODY.sit in lifelikeIdle_noMix.ts). The
    // chair art points the opposite way to GliderMon's rest pose, so he's
    // mirrored while seated. Anchor offsets are relative to the chair's world
    // origin -- tuned on-device via DEBUG_FORCE_INTERACTION in
    // IsometricRoomView3D.tsx; expected to differ per seating variant.
    interaction: {
      behavior: "sit",
      animation: "sit",
      interactionSide: "front",
      characterFlipX: true,
      // Offset from the chair's world origin: +x/+z = toward the camera, -y =
      // lower. Tuned on-device via DEBUG_FORCE_INTERACTION in
      // IsometricRoomView3D.tsx to centre him on the seat. GliderMon is much
      // larger than the chair so it mostly sits behind him -- refine per variant.
      interactionAnchor: { xOffset: 0.06, yOffset: -0.05, zOffset: 0.17 },
    },
    variants: [
      {
        id: "wood_chair_green", displayName: "Green Wood Chair", cost: 150, skin: "WoodChair_Green", restPoseAsset: "1x1_WoodChair_Front_Green",
        rarity: "common", tags: ["cozy", "casual", "cheerful"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
      {
        id: "wood_chair_brown", displayName: "Brown Wood Chair", cost: 150, skin: "WoodChair_Brown", restPoseAsset: "1x1_WoodChair_Front_Brown",
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      // Static-atlas migration (ShadedFurniture.atlas) -- pixel-anchored via
      // render/staticFurnitureBillboard3D.ts instead of a Spine skeleton, see
      // that file and scripts/buildFurnitureAtlasMetadata.ts. `recolorable` +
      // `palettes` let the player pick a colorway for this ONE owned item
      // (Furnish Nest's "Colors" action, mirroring Outfit's ColorwaySheet) --
      // see FurnitureColors.ts' FURNITURE_RECOLOR_PALETTES for the shared
      // palette list and why this art recolors this way.
      {
        id: "leaf_chair", displayName: "Leaf Chair", cost: 170,
        staticAtlas: { atlasRegion: "skeleton-Chair-LeafChair_0" },
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "uncommon", tags: ["nature", "cozy"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "crescent_moon_chair", displayName: "Crescent Moon Chair", cost: 210,
        staticAtlas: { atlasRegion: "skeleton-Chair-Crescent Moon Chair_0" },
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "uncommon", tags: ["mysterious", "night"],
        shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
      },
      {
        id: "gamer_chair", displayName: "Gamer Chair", cost: 190,
        staticAtlas: { atlasRegion: "skeleton-Chair-GamerChair_0" },
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "uncommon", tags: ["casual", "fun"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "half_pipe_chair", displayName: "Half-Pipe Chair", cost: 190,
        staticAtlas: { atlasRegion: "skeleton-Chair-HalfPipeChair_0" },
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "uncommon", tags: ["fun", "casual"],
        shopStock: [{ store: "luma", weight: 5 }, { store: "sable", weight: 5 }],
      },
      {
        id: "carved_wood_chair", displayName: "Carved Wood Chair", cost: 160,
        staticAtlas: { atlasRegion: "skeleton-Chair-WoodChair_0" },
        // WoodChair only paints its red channel (confirmed by channel-usage
        // sampling) -- palette swaps just act as a stain-color change here.
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
    ]
  },

  bed: {
    id: "bed",
    skeleton: "Bed",
    footprints: [{ w: 2, h: 1, allowedRot: [0, 90, 180, 270] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid", "over"],
    occlusion: "footboard",
    desiredTileHeight: 1.5,
    // 'sleep' isn't a supported behavior yet -- the bedside character slot
    // stays a plain idle position until a sleep clip exists. Declared now so
    // the architecture (and the eligibility check) is exercised.
    interaction: { behavior: "sleep", animation: "sleep" },
    variants: [
      {
        id: "bed_single_wood",
        displayName: "Wood Single Bed",
        cost: 260,
        skin: "BedSingle_Wood",
        restPoseAsset: "SingleBed1",
        rarity: "uncommon",
        tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "bed_single_pink",
        displayName: "Pink Single Bed",
        cost: 260,
        skin: "BedSingle_Pink",
        restPoseAsset: "SingleBed3",
        rarity: "uncommon",
        tags: ["cute", "cheerful"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
    ]
  },

  storage: {
    id: "storage",
    skeleton: "Storage",
    footprints: [{ w: 1, h: 1, allowedRot: [0, 90, 180, 270] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid"],
    occlusion: "none",
    variants: [
      {
        id: "storage_cabinet",
        displayName: "Wood Cabinet",
        cost: 180,
        skin: "Cabinet_Wood",
        restPoseAsset: "1x1_CabinetteBottomOverDoors",
        layers: [{ assetName: "1x1_CabinetteBottomOverDoors" }],
        rarity: "common",
        tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "storage_chest",
        displayName: "Mysterious Chest",
        cost: 380,
        skin: "Chest_Animated",
        restPoseAsset: "Animation_Chest_Layer1",
        layers: [
          { assetName: "Animation_Chest_Layer1" },
          { assetName: "Animation_Chest_Layer2" },
          { assetName: "Animation_Chest_Layer3", frameCount: 7, fps: 6 },
        ],
        rarity: "rare",
        tags: ["mysterious"],
        shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
      },
      // Static-atlas migration (ShadedFurniture.atlas) -- see the chair
      // entry above for how staticAtlas differs from restPoseAsset/layers,
      // and for what recolorable/palettes do.
      {
        id: "apothecary_cabinet", displayName: "Apothecary Cabinet", cost: 220,
        staticAtlas: { atlasRegion: "skeleton-Storage-Apothecary_0" },
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "uncommon", tags: ["mysterious"],
        shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
      },
      {
        id: "hollow_log_trunk", displayName: "Hollow Log Trunk", cost: 190,
        staticAtlas: { atlasRegion: "skeleton-Storage-Hollow Log Trunk_0" },
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "uncommon", tags: ["nature", "cozy"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "skate_locker", displayName: "Skate Locker", cost: 180,
        staticAtlas: { atlasRegion: "skeleton-Storage-Skate Locker_0" },
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "common", tags: ["casual", "fun"],
        shopStock: [{ store: "luma", weight: 5 }, { store: "sable", weight: 5 }],
      },
      {
        id: "steamer_trunk", displayName: "Steamer Trunk", cost: 200,
        staticAtlas: { atlasRegion: "skeleton-Storage-Steamer Trunk_0" },
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
    ]
  },

  rug: {
    id: "rug",
    skeleton: "Rug",
    footprints: [{ w: 1, h: 1, allowedRot: [0, 90] }],
    anchors: { dx: 0, dy: 0 },
    // Slot footprint is 2x2 (roomSlots.ts) at Tiers 1/2 -- double the shared
    // default (FURNITURE_DESIRED_TILE_HEIGHT = 0.9) so the same art scales up
    // uniformly with the footprint's doubled width instead of stretching.
    desiredTileHeight: 1.8,
    // A rug is a floor covering, not furniture with volume -- it must always
    // render behind everything else in the room. See FurnitureDef.floorDecal.
    floorDecal: true,
    supportsLayers: ["under"],
    occlusion: "none",
    variants: [
      {
        id: "rug_brown", displayName: "Brown Square Rug", cost: 130, skin: "SquareCarpet_Brown", restPoseAsset: "1x1_SquareCarpet_Brown",
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "rug_blue", displayName: "Blue Square Rug", cost: 130, skin: "SquareCarpet_Blue", restPoseAsset: "1x1_SquareCarpet_Blue",
        rarity: "common", tags: ["calm"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
    ]
  },

  wallDecor: {
    id: "wallDecor",
    skeleton: "WallDecor",
    footprints: [{ w: 1, h: 1, allowedRot: [0] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid"],
    occlusion: "none",
    variants: [
      {
        id: "wall_painting", displayName: "Framed Painting", cost: 140, skin: "Painting1Frame1_Wood", restPoseAsset: "WallDecor_Painting1Frame1_Wood",
        rarity: "common", tags: ["artsy"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "wall_clock", displayName: "Round Clock", cost: 140, skin: "RoundClock_Brown", restPoseAsset: "WallDecor_RoundClock_Brown",
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
    ]
  },

  tableDesk: {
    id: "tableDesk",
    skeleton: "Table",
    footprints: [{ w: 1, h: 1, allowedRot: [0, 90, 180, 270] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid"],
    occlusion: "none",
    variants: [
      {
        id: "table_square", displayName: "Square Wood Table", cost: 160, skin: "TableSquareWood_Wood", restPoseAsset: "1x1_TableSquareWood_Wood",
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "table_round", displayName: "Round Wood Table", cost: 160, skin: "TableRound_Wood", restPoseAsset: "1x1_TableRound_Wood",
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
    ]
  },

  lighting: {
    id: "lighting",
    skeleton: "Lamp",
    footprints: [{ w: 1, h: 1, allowedRot: [0] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid"],
    occlusion: "none",
    variants: [
      {
        id: "lamp_table", displayName: "Table Lamp", cost: 140, skin: "TableLamp_On", restPoseAsset: "1x1_TableLamp_On",
        rarity: "common", tags: ["cozy", "cheerful"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
      {
        id: "lamp_classic", displayName: "Classic Floor Lamp", cost: 140, skin: "ClassicLamp_On", restPoseAsset: "1x1_ClassicLamp_On",
        rarity: "common", tags: ["moody"],
        shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
      },
      // Static-atlas migration (ShadedFurniture.atlas) -- see the chair
      // entry above for how staticAtlas differs from restPoseAsset/layers,
      // and for what recolorable/palettes do.
      {
        id: "traffic_cone_lamp", displayName: "Traffic Cone Lamp", cost: 180,
        // lightSocket: measured off an un-rotated, upright crop of this
        // region (bounds:2,870,170,289 rotate:90 in ShadedFurniture.atlas) --
        // the red bulb/reflector inside the shade sits at (53, 62) in that
        // 170x289, top-left-origin/y-down frame. Recrop and re-measure by eye
        // if this art is ever replaced (see StaticFurnitureVisual.lightSocket).
        staticAtlas: { atlasRegion: "skeleton-Lighting-Traffic Cone Lamp_0", lightSocket: { x: 53, y: 62 } },
        recolorable: true, palettes: FURNITURE_RECOLOR_PALETTES,
        rarity: "uncommon", tags: ["fun", "cheerful"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
    ]
  },

  hobby: {
    id: "hobby",
    skeleton: "Hobby",
    footprints: [{ w: 1, h: 1, allowedRot: [0] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid"],
    occlusion: "tall",
    // Both starter variants (record player, piano) map to 'dance' for now --
    // 'dance' is a placeholder composite (no dedicated clip yet). A variant
    // can override this later (e.g. an easel -> 'paint').
    interaction: { behavior: "dance", animation: "dance", interactionSide: "front" },
    variants: [
      {
        id: "hobby_piano", displayName: "Piano", cost: 200, skin: "Piano_Brown", restPoseAsset: "1x1_Piano_Brown",
        rarity: "uncommon", tags: ["artsy", "moody"],
        shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
      },
      {
        id: "hobby_record_player", displayName: "Record Player", cost: 200, skin: "RecordPlayerOff_Brown", restPoseAsset: "1x1_RecordPlayerOff_Brown",
        rarity: "uncommon", tags: ["fun", "nostalgic", "cheerful"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
    ]
  },

  feature: {
    id: "feature",
    skeleton: "Feature",
    footprints: [{ w: 1, h: 1, allowedRot: [0] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid"],
    occlusion: "tall",
    // 'campfire' isn't a supported behavior yet -- the byFire character slot
    // stays a plain idle position until a campfire idle clip exists.
    interaction: { behavior: "campfire", animation: "campfireIdle", interactionSide: "front" },
    variants: [
      {
        id: "feature_fireplace",
        displayName: "Fireplace",
        cost: 220,
        skin: "Fireplace_Brown",
        restPoseAsset: "1x1_FireplaceUnder_Brown",
        layers: [
          { assetName: "1x1_FireplaceUnder_Brown" },
          { assetName: "1x1_FireplaceOver_Brown" },
        ],
        rarity: "uncommon",
        tags: ["cozy", "warm", "cheerful"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
      {
        id: "feature_campfire",
        displayName: "Campfire",
        cost: 380,
        skin: "Campfire_Animated",
        restPoseAsset: "Animation_Campfire_Layer1",
        layers: [
          { assetName: "Animation_Campfire_Layer1" },
          { assetName: "Animation_Campfire_Layer2", frameCount: 5, fps: 8 },
        ],
        rarity: "rare",
        tags: ["night", "cozy"],
        shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
      },
    ]
  },
};

// Maps each catalog furnitureId to the room-slot type it fills (the "chair"
// catalog entry predates the slot system and keeps its historical id rather
// than being renamed to "seating"). Used by the shop to resolve which
// physical slot(s) a purchased item is eligible for -- most slot types have
// exactly one physical slot, but wallDecor has two (wallDecor1/2); the shop
// applies to the first empty match, or the first slot of that type if both
// are already filled.
export const SLOT_TYPE_FOR_FURNITURE_ID: Record<string, SlotType> = {
  chair: 'seating',
  bed: 'bed',
  storage: 'storage',
  rug: 'rug',
  wallDecor: 'wallDecor',
  tableDesk: 'tableDesk',
  lighting: 'lighting',
  hobby: 'hobby',
  feature: 'feature',
};

export interface FurnitureShopItem {
  id: string;
  furnitureId: string;
  variantId: string;
  slotType: SlotType;
  name: string;
  cost: number;
  previewAsset: string;
  rarity?: Rarity;
  tags?: string[];
  shopStock?: ShopStockConfig[];
}

export const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  bed: 'Bed',
  seating: 'Seating',
  storage: 'Storage',
  rug: 'Rug',
  wallDecor: 'Wall Décor',
  tableDesk: 'Table/Desk',
  lighting: 'Lighting',
  hobby: 'Hobby',
  feature: 'Feature',
};

// One emoji per slot type -- shared by the Furnish Nest 3D slot markers and
// the furniture inventory panel header, so the two surfaces never drift.
export const SLOT_TYPE_ICONS: Record<SlotType, string> = {
  bed: '🛏',
  seating: '🪑',
  storage: '🗄',
  rug: '🧺',
  wallDecor: '🖼',
  tableDesk: '🪵',
  lighting: '💡',
  hobby: '🎵',
  feature: '🔥',
};

// Inverse of SLOT_TYPE_FOR_FURNITURE_ID, returning every catalog furnitureId
// compatible with a given slot type. Always length 1 today (the catalog
// happens to have exactly one furnitureId per SlotType), but deliberately
// plural -- Furnish Nest's inventory filtering iterates every id this
// returns rather than assuming a single match, so adding a second catalog
// entry for an existing slot type (e.g. a second seating set) needs no
// change on the Furnish side.
export function getFurnitureIdsForSlotType(type: SlotType): string[] {
  return Object.keys(SLOT_TYPE_FOR_FURNITURE_ID).filter(
    (furnitureId) => SLOT_TYPE_FOR_FURNITURE_ID[furnitureId] === type
  );
}

export const FURNITURE_SHOP_CATALOG: FurnitureShopItem[] = Object.values(FURNITURE_CATALOG).flatMap((def) =>
  def.variants.map((variant) => ({
    id: `${def.id}_${variant.id}`,
    furnitureId: def.id,
    variantId: variant.id,
    slotType: SLOT_TYPE_FOR_FURNITURE_ID[def.id],
    name: `${SLOT_TYPE_LABELS[SLOT_TYPE_FOR_FURNITURE_ID[def.id]]} – ${variant.displayName}`,
    cost: variant.cost,
    previewAsset: variant.restPoseAsset ?? variant.layers?.[0]?.assetName ?? '',
    rarity: variant.rarity,
    tags: variant.tags,
    shopStock: variant.shopStock,
  }))
);

// Helper function to get furniture definition by ID
export function getFurnitureDef(furnitureId: string): FurnitureDef | undefined {
  return FURNITURE_CATALOG[furnitureId];
}

/**
 * Resolves the effective interaction metadata for a furniture item: the
 * FurnitureDef's `interaction` shallow-merged with the variant's own
 * `interaction` (variant wins per-key, so a variant can override just the
 * `interactionAnchor` while inheriting `behavior`). Returns undefined when
 * neither declares one -- callers treat that as "not interactable".
 */
export function getFurnitureInteraction(
  furnitureId: string,
  variantId: string
): FurnitureInteractionDef | undefined {
  const def = getFurnitureDef(furnitureId);
  if (!def) return undefined;
  const variant = def.variants.find((v) => v.id === variantId);
  const base = def.interaction;
  const override = variant?.interaction;
  if (!base && !override) return undefined;
  return { ...(base ?? {}), ...(override ?? {}) } as FurnitureInteractionDef;
}

// Helper function to get all available variants for a furniture type
export function getFurnitureVariants(furnitureId: string): string[] {
  const def = getFurnitureDef(furnitureId);
  return def ? def.variants.map(v => v.id) : [];
}

// Helper function to validate if a rotation is allowed for furniture
export function isRotationAllowed(furnitureId: string, rotation: number, footprintIndex: number = 0): boolean {
  const def = getFurnitureDef(furnitureId);
  if (!def || !def.footprints[footprintIndex]) return false;
  return def.footprints[footprintIndex].allowedRot.includes(rotation);
}

// Helper function to get footprint for furniture at given rotation
export function getFurnitureFootprint(furnitureId: string, rotation: number) {
  const def = getFurnitureDef(furnitureId);
  if (!def) return null;

  // Find the first footprint that allows this rotation
  const footprint = def.footprints.find(fp => fp.allowedRot.includes(rotation));
  if (!footprint) return null;

  // Adjust dimensions based on rotation
  if (rotation === 90 || rotation === 270) {
    return { w: footprint.h, h: footprint.w };
  }
  return { w: footprint.w, h: footprint.h };
}

// Helper function to check if furniture supports facing direction
export function supportsFacing(furnitureId: string): boolean {
  const def = getFurnitureDef(furnitureId);
  return def?.supportsFacing ?? false;
}

// Helper function to get default facing direction
export function getDefaultFacing(furnitureId: string): "left" | "right" {
  const def = getFurnitureDef(furnitureId);
  return def?.defaultFacing ?? "left";
}

// Helper function to determine if FlipX animation should be applied
export function shouldApplyFlipX(furnitureId: string, facing?: "left" | "right"): boolean {
  if (!supportsFacing(furnitureId)) return false;

  const actualFacing = facing ?? getDefaultFacing(furnitureId);
  // Apply FlipX when facing right (since default Chair.json faces left)
  return actualFacing === "right";
}
