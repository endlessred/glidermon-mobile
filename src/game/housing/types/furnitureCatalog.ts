import { FurnitureCatalog, FurnitureDef, FurnitureInteractionDef, HOBBY_ANIM } from './RoomConfig';
import { SlotType } from './roomSlots';
import type { Rarity, ShopStockConfig } from '../../../data/shop/shopTypes';
import { furnitureOriginalPalette } from '../furniture/FurnitureColors';

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
      // see FurnitureColors.ts' furnitureOriginalPalette() for why each
      // item's "Original" entry is a hand-picked default rather than the
      // raw #ff0000/#00ff00/#0000ff classification-mask colors, and
      // FURNITURE_RECOLOR_PALETTES for the shared alternate colorways.
      {
        id: "leaf_chair", displayName: "Leaf Chair", cost: 170,
        staticAtlas: { atlasRegion: "skeleton-Chair-LeafChair_0" },
        // Original: green leaf (red ch, dominant), a warm coral cushion/bud
        // (green ch), small brown root-feet (blue ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#4a7c3a', g: '#e8734a', b: '#5c4a2e' }),
        rarity: "uncommon", tags: ["nature", "cozy"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "crescent_moon_chair", displayName: "Crescent Moon Chair", cost: 210,
        staticAtlas: { atlasRegion: "skeleton-Chair-Crescent Moon Chair_0" },
        // Original: deep plum outer frame (red ch), midnight-navy cushion
        // (blue ch), pale gold dangling stars (green ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#3d2a5c', b: '#1a2340', g: '#f0d878' }),
        rarity: "uncommon", tags: ["mysterious", "night"],
        shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
      },
      {
        id: "gamer_chair", displayName: "Gamer Chair", cost: 190,
        staticAtlas: { atlasRegion: "skeleton-Chair-GamerChair_0" },
        // Original: charcoal-black body (red ch, dominant), steel-blue
        // bolsters/base (blue ch), racing-red logo accent (green ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#26262b', g: '#c92a2a', b: '#3a6ea5' }),
        rarity: "uncommon", tags: ["casual", "fun"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "half_pipe_chair", displayName: "Half-Pipe Chair", cost: 190,
        staticAtlas: { atlasRegion: "skeleton-Chair-HalfPipeChair_0" },
        // Original: teal ramp shell (blue ch, dominant), punchy red cushion
        // (red ch), lime sticker graphics (green ch).
        recolorable: true, palettes: furnitureOriginalPalette({ b: '#2a8fae', r: '#d9342b', g: '#7dcf3f' }),
        rarity: "uncommon", tags: ["fun", "casual"],
        shopStock: [{ store: "luma", weight: 5 }, { store: "sable", weight: 5 }],
      },
      {
        id: "carved_wood_chair", displayName: "Carved Wood Chair", cost: 160,
        staticAtlas: { atlasRegion: "skeleton-Chair-WoodChair_0" },
        // WoodChair only paints its red channel (confirmed by channel-usage
        // sampling) -- palette swaps just act as a stain-color change here.
        // Original: warm wood brown.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#8a5a2e' }),
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "barstool", displayName: "Barstool", cost: 150,
        staticAtlas: { atlasRegion: "skeleton-Chair-Barstool_0" },
        // Original: classic diner red (the base/pedestal isn't part of the
        // recolor mask -- it's a fixed neutral lavender-gray in the source art).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#c92a2a' }),
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
      // Static-atlas migration (ShadedFurniture.atlas) -- see the chair
      // entry above for how staticAtlas differs from restPoseAsset/layers,
      // and for what recolorable/palettes do.
      {
        id: "leaf_hammock_bed", displayName: "Leaf Hammock", cost: 250,
        staticAtlas: { atlasRegion: "skeleton-Beds-Leaf Hammock_0" },
        // Original: green leaf sling (green ch, dominant), coral flower
        // accent (red ch), brown post caps (blue ch).
        recolorable: true, palettes: furnitureOriginalPalette({ g: '#5a8f3d', r: '#e8734a', b: '#6b4226' }),
        rarity: "uncommon", tags: ["nature", "cozy"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "skater_bed", displayName: "Skater Bed", cost: 270,
        staticAtlas: { atlasRegion: "skeleton-Beds-Skater Bed_0" },
        // Original: skate-park blue deck (blue ch), lime sticker graphics
        // (green ch), orange ramp wedge (red ch).
        recolorable: true, palettes: furnitureOriginalPalette({ b: '#2a6fb0', g: '#8fd94a', r: '#e8630c' }),
        rarity: "uncommon", tags: ["fun", "casual"],
        shopStock: [{ store: "luma", weight: 5 }, { store: "sable", weight: 5 }],
      },
      {
        id: "ornate_bed", displayName: "Ornate Bed", cost: 280,
        staticAtlas: { atlasRegion: "skeleton-Beds-Ornate Bed_0" },
        // Original: burgundy scalloped frame (red ch, dominant), navy
        // bedding (blue ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#7a2035', b: '#2a3d6b' }),
        rarity: "uncommon", tags: ["cheerful", "cute"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "celestial_canopy_bed", displayName: "Celestial Canopy Bed", cost: 340,
        staticAtlas: { atlasRegion: "skeleton-Beds-Celestial Bed_0" },
        // Original: navy posts/frame (red ch), rich red canopy drape (blue
        // ch, dominant), gold star pattern (green ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#2a3d7a', b: '#c9342b', g: '#f0d878' }),
        rarity: "rare", tags: ["mysterious", "night"],
        shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
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
        // Original: dark walnut cabinet frame (red ch, dominant), fresh
        // vine leaves (green ch), bottle-glass green jars (blue ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#4a2f1f', b: '#2f6b4f', g: '#5a8f3d' }),
        rarity: "uncommon", tags: ["mysterious"],
        shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
      },
      {
        id: "hollow_log_trunk", displayName: "Hollow Log Trunk", cost: 190,
        staticAtlas: { atlasRegion: "skeleton-Storage-Hollow Log Trunk_0" },
        // Original: warm bark brown (red ch, dominant), fresh vine leaves
        // (green ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#7a5230', g: '#5a8f3d' }),
        rarity: "uncommon", tags: ["nature", "cozy"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "skate_locker", displayName: "Skate Locker", cost: 180,
        staticAtlas: { atlasRegion: "skeleton-Storage-Skate Locker_0" },
        // Original: cobalt-blue locker body (red ch), charcoal gear icons
        // (blue ch), lime sticker accents (green ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#2a5f9e', b: '#2c2c30', g: '#8fd94a' }),
        rarity: "common", tags: ["casual", "fun"],
        shopStock: [{ store: "luma", weight: 5 }, { store: "sable", weight: 5 }],
      },
      {
        id: "steamer_trunk", displayName: "Steamer Trunk", cost: 200,
        staticAtlas: { atlasRegion: "skeleton-Storage-Steamer Trunk_0" },
        // Original: leather-brown trunk body (red ch, dominant), aged-brass
        // hardware (blue ch), muted teal travel stickers (green ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#6b4226', b: '#a8862f', g: '#4a7c6b' }),
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
      // Static-atlas migration (ShadedFurniture.atlas) -- see the chair
      // entry above for how staticAtlas differs from restPoseAsset/layers,
      // and for what recolorable/palettes do. floorDecal (declared once on
      // this FurnitureDef, above) applies to these the same as the plain
      // variants -- see staticFurnitureBillboard3D.ts's floorDecal handling.
      {
        id: "striped_carpet", displayName: "Striped Carpet", cost: 140,
        staticAtlas: { atlasRegion: "skeleton-Rugs-Striped Carpet_0" },
        // Original: terracotta -- single channel (the ribbed stripe look
        // comes from the art's own shading bands, not multiple hues).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#b0583a' }),
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "rope_rug", displayName: "Rope Rug", cost: 150,
        staticAtlas: { atlasRegion: "skeleton-Rugs-Rope Rug_0" },
        // Original: natural jute tan -- single channel.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#c9a876' }),
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "shag_carpet", displayName: "Shag Carpet", cost: 150,
        staticAtlas: { atlasRegion: "skeleton-Rugs-Shag Carpet_0" },
        // Original: retro mustard-gold shag -- single channel.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#d9a83d' }),
        rarity: "common", tags: ["cozy"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
      {
        id: "fuzzy_rug", displayName: "Fuzzy Rug", cost: 150,
        staticAtlas: { atlasRegion: "skeleton-Rugs-Fuzzy Rug_0" },
        // Original: soft blush pink -- single channel.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#e79ab5' }),
        rarity: "common", tags: ["cozy", "cute"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
      {
        id: "patchwork_rug", displayName: "Patchwork Rug", cost: 170,
        staticAtlas: { atlasRegion: "skeleton-Rugs-Patchwork_0" },
        // Original: a coordinated quilt palette -- brick red, sage green,
        // denim blue -- instead of the raw primary red/green/blue mask.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#b0433a', b: '#4a6f9e', g: '#7a9c5c' }),
        rarity: "uncommon", tags: ["fun", "cheerful"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "woven_leaves_rug", displayName: "Woven Leaves Rug", cost: 170,
        staticAtlas: { atlasRegion: "skeleton-Rugs-Woven Leaves_0" },
        // Original: autumn leaf weave -- coral (red ch), green (green ch,
        // dominant), brown (blue ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#e8734a', g: '#4a7c3a', b: '#8a4a2e' }),
        rarity: "uncommon", tags: ["nature"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "embroidered_rug", displayName: "Embroidered Rug", cost: 170,
        staticAtlas: { atlasRegion: "skeleton-Rugs-Embroidered_0" },
        // Original: deep rose -- single channel.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#a83d5c' }),
        rarity: "uncommon", tags: ["cozy", "cheerful"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
      {
        id: "art_deco_rug", displayName: "Art Deco Rug", cost: 180,
        staticAtlas: { atlasRegion: "skeleton-Rugs-Art Deco Rug_0" },
        // Original: teal / gold / deep plum fan pattern.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#2a8f8a', g: '#c9a24a', b: '#3d2a5c' }),
        rarity: "uncommon", tags: ["moody", "artsy"],
        shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
      },
      {
        id: "celestial_rug", displayName: "Celestial Rug", cost: 190,
        staticAtlas: { atlasRegion: "skeleton-Rugs-Celestial Rug_0" },
        // Original: midnight-navy field (blue ch, dominant), gold sun/moon
        // medallion (red ch), pale gold border dots (green ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#d9b354', g: '#f0d878', b: '#1a2350' }),
        rarity: "uncommon", tags: ["mysterious", "night"],
        shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
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
      // Static-atlas migration (ShadedFurniture.atlas) -- see the chair
      // entry above for how staticAtlas differs from restPoseAsset/layers,
      // and for what recolorable/palettes do.
      {
        id: "stump_table", displayName: "Stump Table", cost: 180,
        staticAtlas: { atlasRegion: "skeleton-Tables-Stump Table_0" },
        // Original: bark-brown trunk (red ch, dominant), mossy green top
        // (green ch), small blue flowers (blue ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#7a5230', g: '#5a8f3d', b: '#4a6fd9' }),
        rarity: "uncommon", tags: ["nature", "cozy"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "skateboard_table", displayName: "Skateboard Table", cost: 200,
        staticAtlas: { atlasRegion: "skeleton-Tables-Skateboard Table_0" },
        // Original: stacked skate decks -- blue, lime, red.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#2a5f9e', g: '#8fd94a', b: '#c9342b' }),
        rarity: "uncommon", tags: ["fun", "casual"],
        shopStock: [{ store: "luma", weight: 5 }, { store: "sable", weight: 5 }],
      },
      {
        id: "spellbook_table", displayName: "Spellbook Table", cost: 260,
        staticAtlas: { atlasRegion: "skeleton-Tables-Spellbook Table_0" },
        // Original: stacked spellbooks -- deep maroon, forest green, navy.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#8a1f2b', g: '#4a7c3a', b: '#2a3d7a' }),
        rarity: "rare", tags: ["mysterious", "artsy"],
        shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
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
        // Original: safety-orange cone (red ch), cream reflective stripe
        // (green ch), cheerful teal dome/shade (blue ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#e8630c', g: '#f0ead6', b: '#2a8fae' }),
        rarity: "uncommon", tags: ["fun", "cheerful"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "modern_lamp", displayName: "Modern Lamp", cost: 150,
        // lightSocket: this shade only paints its red channel across the
        // whole drum, no distinct bulb -- measured as the centroid of the
        // red-classified pixels (a script sampling ShadedFurniture.png,
        // matching r>100/b<60/r>g+20 on an opaque pixel), same convention as
        // the other new lamps below. Recrop and re-measure if this art changes.
        staticAtlas: { atlasRegion: "skeleton-Lighting-Modern Lamp_0", lightSocket: { x: 48, y: 86 } },
        // Original: cream drum shade -- single channel.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#e8ded0' }),
        rarity: "common", tags: ["casual"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "wood_lamp", displayName: "Wood Lamp", cost: 160,
        staticAtlas: { atlasRegion: "skeleton-Lighting-Wood Lamp_0", lightSocket: { x: 53, y: 52 } },
        // Original: warm brass/ochre bowl shade -- single channel (the
        // tripod stem below isn't part of the mask, it's already a fixed
        // tan in the source art).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#b8895a' }),
        rarity: "common", tags: ["nature", "casual"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
      {
        id: "cute_lamp", displayName: "Cute Lamp", cost: 190,
        staticAtlas: { atlasRegion: "skeleton-Lighting-Cute Lamp_0", lightSocket: { x: 65, y: 84 } },
        // Original: cheerful golden yellow -- single channel.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#f2b705' }),
        rarity: "uncommon", tags: ["cute", "cheerful"],
        shopStock: [{ store: "luma", weight: 8 }, { store: "sable", weight: 2 }],
      },
      {
        id: "rice_paper_lamp", displayName: "Rice Paper Lamp", cost: 210,
        staticAtlas: { atlasRegion: "skeleton-Lighting-Rice Paper Lamp_0", lightSocket: { x: 72, y: 109 } },
        // Original: cream paper lantern -- single channel.
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#e8ded0' }),
        rarity: "uncommon", tags: ["calm", "artsy"],
        shopStock: [{ store: "sable", weight: 5 }, { store: "luma", weight: 5 }],
      },
      {
        id: "duo_lamp", displayName: "Duo Lamp", cost: 200,
        // lightSocket: two separate shade openings -- a single socket only
        // supports one glow disc, so this is the midpoint between them
        // (centroid of all red-classified pixels combined). At the default
        // 2-world-unit glow radius (lightGlow3D.ts) a single centered disc
        // comfortably covers both shades instead of favoring one.
        staticAtlas: { atlasRegion: "skeleton-Lighting-Duo Lamp_0", lightSocket: { x: 62, y: 47 } },
        // Original: warm cream shades -- single channel (the stem isn't
        // part of the mask, it's already a fixed plum-gray in the source art).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#f0e6d2' }),
        rarity: "uncommon", tags: ["moody"],
        shopStock: [{ store: "sable", weight: 6 }, { store: "luma", weight: 4 }],
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
    // characterFlipX: the 'home' character slot sits one tile toward +col
    // from 'hobby' (roomSlots.ts) -- without the flip GliderMon faces the
    // camera generically instead of turning toward the furniture he's
    // supposedly using. Declared at the def level (not per-variant) so every
    // hobby interaction inherits it via getFurnitureInteraction's shallow
    // merge, including TarotTable's variant-level override below (which
    // replaces behavior/animation but not this).
    interaction: { behavior: "dance", animation: "dance", interactionSide: "front", characterFlipX: true },
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
      // Interactive hobby-slot Spine items (render/interactiveHobbyItem3D.ts)
      // -- one shared skeleton, one `HobbyItem` slot, four selectable
      // attachments. Unlike every other variant above (a static billboard),
      // these coordinate a GliderMon behavior with the furniture's own Spine
      // animation when the hobby interaction is chosen. `interaction` here
      // still drives the generic character-slot eligibility/behavior system
      // (walkableTiles.ts) exactly like the legacy variants above;
      // `interactiveHobbySpine` is the renderer's own registry of which
      // attachment + coordinated sequence each variant maps to -- see
      // RoomConfig.ts's InteractiveHobbySpineDescriptor doc comment for why
      // this is kept separate rather than inferred from displayName/id.
      {
        id: "hobby_boombox", displayName: "Boombox", cost: 220,
        interactiveHobbySpine: { attachment: "BoomBox", interactionKind: "dance", itemAnimation: HOBBY_ANIM.boomBoxDance },
        // Inherits the FurnitureDef's default `interaction` (behavior:
        // "dance") below -- same as hobby_piano/hobby_record_player above.
        // Original: rad red case (red ch, dominant), lime-green speaker/knob
        // accents (green ch), cobalt-blue handle/trim (blue ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#d9342b', g: '#3ba53b', b: '#2a5f9e' }),
        rarity: "uncommon", tags: ["fun", "loud", "energetic"],
        shopStock: [{ store: "luma", weight: 6 }, { store: "sable", weight: 4 }],
      },
      {
        id: "hobby_mushroom_record_player", displayName: "Mushroom Record Player", cost: 230,
        interactiveHobbySpine: { attachment: "MushroomRecordPlayer", interactionKind: "dance", itemAnimation: HOBBY_ANIM.mushroomRecordPlayerDance },
        // Inherits the FurnitureDef's default `interaction` (behavior:
        // "dance") below.
        // Original: wood record-player base (red ch), toadstool-green cap
        // (green ch, dominant), blueberry/spot blue (blue ch).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#6b4226', g: '#5a8f3d', b: '#3a4fae' }),
        rarity: "uncommon", tags: ["nature", "fun", "whimsical"],
        shopStock: [{ store: "luma", weight: 7 }, { store: "sable", weight: 3 }],
      },
      {
        id: "hobby_tarot_table", displayName: "Tarot Table", cost: 260,
        interactiveHobbySpine: { attachment: "TarotTable", interactionKind: "tarot" },
        // 'tarotThink' -- the two-phase shuffle/reveal sequence -- see
        // lifelikeIdle_noMix.ts's INTERACTION_BEHAVIORS and
        // IsometricRoomView3D.tsx's tarot orchestration.
        interaction: { behavior: "tarotThink", animation: "tarotThink", interactionSide: "front" },
        // Original: burgundy wood rim/candle wax (red ch), gold celestial
        // stars/moons/candle flame (green ch), midnight-indigo cloth (blue
        // ch, dominant).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#7a1f2b', g: '#e0c060', b: '#1a2350' }),
        rarity: "rare", tags: ["mysterious", "night"],
        shopStock: [{ store: "sable", weight: 7 }, { store: "luma", weight: 3 }],
      },
      {
        id: "hobby_witchy_potion_station", displayName: "Witchy Potion Station", cost: 250,
        interactiveHobbySpine: { attachment: "WitchyPotionStation", interactionKind: "none" },
        // No interaction animation exists yet -- 'none' isn't a key in
        // SUPPORTED_INTERACTION_BEHAVIORS, so the hobby character slot simply
        // stays a plain idle position when this is equipped (see
        // walkableTiles.ts's resolveSlotInteractions / SUPPORTED_INTERACTION_BEHAVIORS).
        // TODO: add Witchy Potion Station hobby interaction once Spine animation is authored.
        interaction: { behavior: "none" },
        // Original: wood platform/bottle caps (red ch), bubbling potion +
        // plants (green ch), cauldron/glass bottles (blue ch, dominant).
        recolorable: true, palettes: furnitureOriginalPalette({ r: '#6b4226', g: '#5aa83f', b: '#3a2f6b' }),
        rarity: "uncommon", tags: ["mysterious", "spooky"],
        shopStock: [{ store: "sable", weight: 8 }, { store: "luma", weight: 2 }],
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
    // A staticAtlas variant has neither -- falls back to its own id, which
    // getFurnitureImageSource (quadTextures.ts) resolves against the
    // pre-rendered thumbnails in furnitureThumbnails.ts instead of the
    // restPoseAsset manifest.
    previewAsset: variant.restPoseAsset ?? variant.layers?.[0]?.assetName ?? variant.id,
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
