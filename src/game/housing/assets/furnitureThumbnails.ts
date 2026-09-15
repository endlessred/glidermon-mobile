// Static-atlas furniture (staticFurnitureBillboard3D.ts) and the
// interactive hobby Spine items (render/interactiveHobbyItem3D.ts) both
// have no restPoseAsset/layers PNG of their own -- one is a trimmed region
// of the shared ShadedFurniture.atlas, the other an attachment on the
// shared Hobby Spine skeleton's HobbyItem slot, both recolored at render
// time. UI surfaces that need a plain RN <Image> preview (Shop cards,
// Furnish Nest inventory cards -- getFurnitureImageSource in
// quadTextures.ts) can't do that GPU recolor, so each recolorable variant
// of either kind gets a pre-rendered PNG here instead: the source region
// cropped, un-rotated, and recolored with that variant's own "Original"
// palette (furnitureOriginalPalette() in FurnitureColors.ts) using the
// exact same math as HueIndexedRecolor.ts's shader (see the offline
// generation script noted below), then trimmed to its opaque bounds.
//
// Regenerate a thumbnail after either the source art or a variant's
// Original palette changes -- there's no build-time hook for this yet,
// it's a manual offline step (crop the region -- ShadedFurniture.atlas per
// scripts/buildFurnitureAtlasMetadata.ts's bounds/rotate convention, or the
// Hobby Spine atlas's own bounds -- replicate the shader's un-premultiply
// -> SRGBToLinear -> hue-classify -> recolor -> LinearToSRGB pipeline, trim
// to getbbox()). Keyed by variant id, not atlas region name, since a few
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
  // Interactive hobby-slot Spine items (render/interactiveHobbyItem3D.ts) --
  // not static-atlas art, but the same "no restPoseAsset/layers" gap applies
  // (see getFurnitureImageSource in quadTextures.ts): these are attachments
  // on the shared HobbyItem slot's MeshAttachments, not simple atlas
  // regions, so their thumbnails are cropped straight from the Hobby Spine
  // atlas's source pages (hobby.png/hobby_4.png/hobby_5.png) instead of
  // ShadedFurniture.atlas, recolored with the same Original palette each
  // variant uses in furnitureCatalog.ts (furnitureOriginalPalette() calls
  // on the hobby_* variants).
  hobby_boombox: require('./generated/furnitureThumbnails/hobby_boombox.png'),
  hobby_mushroom_record_player: require('./generated/furnitureThumbnails/hobby_mushroom_record_player.png'),
  hobby_tarot_table: require('./generated/furnitureThumbnails/hobby_tarot_table.png'),
  hobby_witchy_potion_station: require('./generated/furnitureThumbnails/hobby_witchy_potion_station.png'),
};

/** Looks up a pre-rendered thumbnail by variant id. Returns null for any
 * variant that isn't static-atlas art (callers fall back to the
 * restPoseAsset-based manifest lookup in quadTextures.ts). */
export function getStaticFurnitureThumbnail(variantId: string): any | null {
  return FURNITURE_THUMBNAILS[variantId] ?? null;
}
