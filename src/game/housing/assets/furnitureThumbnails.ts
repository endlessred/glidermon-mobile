// Static-atlas furniture (staticFurnitureBillboard3D.ts) has no
// restPoseAsset/layers PNG of its own -- it's a trimmed region of the shared
// ShadedFurniture.atlas, recolored at render time. UI surfaces that need a
// plain RN <Image> preview (Shop cards, Furnish Nest inventory cards --
// getFurnitureImageSource in quadTextures.ts) can't do that GPU recolor, so
// each recolorable static-atlas variant gets a pre-rendered PNG here instead:
// the atlas region cropped, un-rotated, and recolored with that variant's own
// "Original" palette (furnitureOriginalPalette() in FurnitureColors.ts) using
// the exact same math as HueIndexedRecolor.ts's shader (see the offline
// generation script noted below), then trimmed to its opaque bounds.
//
// Regenerate a thumbnail after either the atlas art or a variant's Original
// palette changes -- there's no build-time hook for this yet, it's a manual
// offline step (crop the atlas region per scripts/buildFurnitureAtlasMetadata.ts's
// bounds/rotate convention, replicate the shader's un-premultiply ->
// SRGBToLinear -> hue-classify -> recolor -> LinearToSRGB pipeline, trim to
// getbbox()). Keyed by variant id, not atlas region name, since a few
// variants share underlying art concepts but always have distinct ids.
const FURNITURE_THUMBNAILS: Record<string, any> = {
  leaf_chair: require('./generated/furnitureThumbnails/leaf_chair.png'),
  crescent_moon_chair: require('./generated/furnitureThumbnails/crescent_moon_chair.png'),
  gamer_chair: require('./generated/furnitureThumbnails/gamer_chair.png'),
  half_pipe_chair: require('./generated/furnitureThumbnails/half_pipe_chair.png'),
  carved_wood_chair: require('./generated/furnitureThumbnails/carved_wood_chair.png'),
  barstool: require('./generated/furnitureThumbnails/barstool.png'),
  leaf_hammock_bed: require('./generated/furnitureThumbnails/leaf_hammock_bed.png'),
  skater_bed: require('./generated/furnitureThumbnails/skater_bed.png'),
  ornate_bed: require('./generated/furnitureThumbnails/ornate_bed.png'),
  celestial_canopy_bed: require('./generated/furnitureThumbnails/celestial_canopy_bed.png'),
  apothecary_cabinet: require('./generated/furnitureThumbnails/apothecary_cabinet.png'),
  hollow_log_trunk: require('./generated/furnitureThumbnails/hollow_log_trunk.png'),
  skate_locker: require('./generated/furnitureThumbnails/skate_locker.png'),
  steamer_trunk: require('./generated/furnitureThumbnails/steamer_trunk.png'),
  striped_carpet: require('./generated/furnitureThumbnails/striped_carpet.png'),
  rope_rug: require('./generated/furnitureThumbnails/rope_rug.png'),
  shag_carpet: require('./generated/furnitureThumbnails/shag_carpet.png'),
  fuzzy_rug: require('./generated/furnitureThumbnails/fuzzy_rug.png'),
  patchwork_rug: require('./generated/furnitureThumbnails/patchwork_rug.png'),
  woven_leaves_rug: require('./generated/furnitureThumbnails/woven_leaves_rug.png'),
  embroidered_rug: require('./generated/furnitureThumbnails/embroidered_rug.png'),
  art_deco_rug: require('./generated/furnitureThumbnails/art_deco_rug.png'),
  celestial_rug: require('./generated/furnitureThumbnails/celestial_rug.png'),
  stump_table: require('./generated/furnitureThumbnails/stump_table.png'),
  skateboard_table: require('./generated/furnitureThumbnails/skateboard_table.png'),
  spellbook_table: require('./generated/furnitureThumbnails/spellbook_table.png'),
  traffic_cone_lamp: require('./generated/furnitureThumbnails/traffic_cone_lamp.png'),
  modern_lamp: require('./generated/furnitureThumbnails/modern_lamp.png'),
  wood_lamp: require('./generated/furnitureThumbnails/wood_lamp.png'),
  cute_lamp: require('./generated/furnitureThumbnails/cute_lamp.png'),
  rice_paper_lamp: require('./generated/furnitureThumbnails/rice_paper_lamp.png'),
  duo_lamp: require('./generated/furnitureThumbnails/duo_lamp.png'),
};

/** Looks up a pre-rendered thumbnail by variant id. Returns null for any
 * variant that isn't static-atlas art (callers fall back to the
 * restPoseAsset-based manifest lookup in quadTextures.ts). */
export function getStaticFurnitureThumbnail(variantId: string): any | null {
  return FURNITURE_THUMBNAILS[variantId] ?? null;
}
