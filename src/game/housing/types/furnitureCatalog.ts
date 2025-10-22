import { FurnitureCatalog, FurnitureDef } from './RoomConfig';

// Furniture catalog defining all available furniture items
export const FURNITURE_CATALOG: FurnitureCatalog = {
  chair: {
    id: "chair",
    skeleton: "Chair", // References Chair.json
    footprints: [
      {
        w: 1,
        h: 1,
        allowedRot: [0, 90, 180, 270]
      }
    ],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["under", "mid", "over"],
    occlusion: "none",
    supportsFacing: true, // Chairs support FlipX animation
    defaultFacing: "left", // Default orientation faces left
    variants: [
      { id: "beanbag_brown", skin: "Beanbag_Brown" },
      { id: "beanbag_beige", skin: "Beanbag_Beige" },
      { id: "office_chair_green", skin: "OfficeChair_Green" },
      { id: "office_chair_beige", skin: "OfficeChair_Beige" },
      { id: "wood_chair_beige", skin: "WoodChair_Beige" },
      { id: "wood_chair_black", skin: "WoodChair_Black" },
      { id: "wood_chair_blue", skin: "WoodChair_Blue" },
      { id: "wood_chair_brown", skin: "WoodChair_Brown" },
      { id: "wood_chair_green", skin: "WoodChair_Green" }
    ]
  },

  // Example of a larger furniture piece (bed)
  bed_classic: {
    id: "bed_classic",
    skeleton: "BedClassic", // Would reference BedClassic.json when available
    footprints: [
      {
        w: 2,
        h: 1,
        allowedRot: [0, 90, 180, 270]
      },
      {
        w: 1,
        h: 2,
        allowedRot: [0, 90, 180, 270]
      }
    ],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid", "over"], // Bed body in mid, pillows/covers in over
    occlusion: "footboard", // Has footboard that can cover other objects
    variants: [
      { id: "oak_a", skin: "oak_variant_a" },
      { id: "oak_b", skin: "oak_variant_b" },
      { id: "pine", skin: "pine_variant" }
    ]
  },

  // Example of decorative furniture
  plant_tall: {
    id: "plant_tall",
    skeleton: "PlantTall", // Would reference PlantTall.json when available
    footprints: [
      {
        w: 1,
        h: 1,
        allowedRot: [0] // Plants typically don't rotate
      }
    ],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["mid", "over"], // Plant base in mid, leaves in over
    occlusion: "tall", // Tall object that can occlude things behind it
    variants: [
      { id: "green_a", skin: "pothos_green" },
      { id: "green_b", skin: "ficus_green" },
      { id: "variegated", skin: "pothos_variegated" }
    ]
  },

  // Example of under-layer furniture (rug)
  rug_small: {
    id: "rug_small",
    skeleton: "RugSmall", // Would reference RugSmall.json when available
    footprints: [
      {
        w: 2,
        h: 2,
        allowedRot: [0, 90]
      }
    ],
    anchors: { dx: 0, dy: 0 },
    supportsLayers: ["under"], // Rugs go under other furniture
    occlusion: "none", // Rugs don't occlude anything
    variants: [
      { id: "persian_red", skin: "persian_red_pattern" },
      { id: "persian_blue", skin: "persian_blue_pattern" },
      { id: "modern_geometric", skin: "modern_geo_pattern" }
    ]
  }
};

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