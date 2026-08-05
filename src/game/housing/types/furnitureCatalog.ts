import { FurnitureCatalog, FurnitureDef } from './RoomConfig';
import { SlotType } from './roomSlots';

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
    variants: [
      { id: "wood_chair_green", cost: 150, skin: "WoodChair_Green", restPoseAsset: "1x1_WoodChair_Front_Green" },
      { id: "wood_chair_brown", cost: 150, skin: "WoodChair_Brown", restPoseAsset: "1x1_WoodChair_Front_Brown" },
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
    variants: [
      {
        id: "bed_single_wood",
        cost: 260,
        skin: "BedSingle_Wood",
        restPoseAsset: "SingleBed1",
      },
      {
        id: "bed_single_pink",
        cost: 260,
        skin: "BedSingle_Pink",
        restPoseAsset: "SingleBed3",
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
        cost: 180,
        skin: "Cabinet_Wood",
        restPoseAsset: "1x1_CabinetteBottomOverDoors",
        layers: [{ assetName: "1x1_CabinetteBottomOverDoors" }],
      },
      {
        id: "storage_chest",
        cost: 380,
        skin: "Chest_Animated",
        restPoseAsset: "Animation_Chest_Layer1",
        layers: [
          { assetName: "Animation_Chest_Layer1" },
          { assetName: "Animation_Chest_Layer2" },
          { assetName: "Animation_Chest_Layer3", frameCount: 7, fps: 6 },
        ],
      },
    ]
  },

  rug: {
    id: "rug",
    skeleton: "Rug",
    footprints: [{ w: 1, h: 1, allowedRot: [0, 90] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["under"],
    occlusion: "none",
    variants: [
      { id: "rug_brown", cost: 130, skin: "SquareCarpet_Brown", restPoseAsset: "1x1_SquareCarpet_Brown" },
      { id: "rug_blue", cost: 130, skin: "SquareCarpet_Blue", restPoseAsset: "1x1_SquareCarpet_Blue" },
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
      { id: "wall_painting", cost: 140, skin: "Painting1Frame1_Wood", restPoseAsset: "WallDecor_Painting1Frame1_Wood" },
      { id: "wall_clock", cost: 140, skin: "RoundClock_Brown", restPoseAsset: "WallDecor_RoundClock_Brown" },
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
      { id: "table_square", cost: 160, skin: "TableSquareWood_Wood", restPoseAsset: "1x1_TableSquareWood_Wood" },
      { id: "table_round", cost: 160, skin: "TableRound_Wood", restPoseAsset: "1x1_TableRound_Wood" },
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
      { id: "lamp_table", cost: 140, skin: "TableLamp_On", restPoseAsset: "1x1_TableLamp_On" },
      { id: "lamp_classic", cost: 140, skin: "ClassicLamp_On", restPoseAsset: "1x1_ClassicLamp_On" },
    ]
  },

  hobby: {
    id: "hobby",
    skeleton: "Hobby",
    footprints: [{ w: 1, h: 1, allowedRot: [0] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid"],
    occlusion: "tall",
    variants: [
      { id: "hobby_piano", cost: 200, skin: "Piano_Brown", restPoseAsset: "1x1_Piano_Brown" },
      { id: "hobby_record_player", cost: 200, skin: "RecordPlayerOff_Brown", restPoseAsset: "1x1_RecordPlayerOff_Brown" },
    ]
  },

  feature: {
    id: "feature",
    skeleton: "Feature",
    footprints: [{ w: 1, h: 1, allowedRot: [0] }],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid"],
    occlusion: "tall",
    variants: [
      {
        id: "feature_fireplace",
        cost: 220,
        skin: "Fireplace_Brown",
        restPoseAsset: "1x1_FireplaceUnder_Brown",
        layers: [
          { assetName: "1x1_FireplaceUnder_Brown" },
          { assetName: "1x1_FireplaceOver_Brown" },
        ],
      },
      {
        id: "feature_campfire",
        cost: 380,
        skin: "Campfire_Animated",
        restPoseAsset: "Animation_Campfire_Layer1",
        layers: [
          { assetName: "Animation_Campfire_Layer1" },
          { assetName: "Animation_Campfire_Layer2", frameCount: 5, fps: 8 },
        ],
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
}

const SLOT_TYPE_LABELS: Record<SlotType, string> = {
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

export const FURNITURE_SHOP_CATALOG: FurnitureShopItem[] = Object.values(FURNITURE_CATALOG).flatMap((def) =>
  def.variants.map((variant) => ({
    id: `${def.id}_${variant.id}`,
    furnitureId: def.id,
    variantId: variant.id,
    slotType: SLOT_TYPE_FOR_FURNITURE_ID[def.id],
    name: `${SLOT_TYPE_LABELS[SLOT_TYPE_FOR_FURNITURE_ID[def.id]]} – ${variant.skin ?? variant.id}`,
    cost: variant.cost,
    previewAsset: variant.restPoseAsset ?? variant.layers?.[0]?.assetName ?? '',
  }))
);

// Helper function to get furniture definition by ID
export function getFurnitureDef(furnitureId: string): FurnitureDef | undefined {
  return FURNITURE_CATALOG[furnitureId];
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
