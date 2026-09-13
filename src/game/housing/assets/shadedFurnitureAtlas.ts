// Runtime loader for the static-atlas furniture path (chair/storage/lighting
// -- see render/staticFurnitureBillboard3D.ts). Unlike quadTextures.ts (one
// PNG per furniture item), every item here is a trimmed region of a single
// shared ShadedFurniture.atlas + .png pair, loaded and decoded exactly once
// and reused for every placed item and every re-render.
//
// The matching ShadedFurnitureMarker.atlas/.png are authoring-only -- they
// are never required from here or anywhere else in runtime code. Only the
// anchors they produced (via scripts/buildFurnitureAtlasMetadata.ts, baked
// into shadedFurnitureMetadata.json) are consumed at runtime.
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { loadAsync } from 'expo-three';
import { TextureAtlas } from '@esotericsoftware/spine-core';

const shadedFurnitureMetadata: Record<string, { anchorX: number; anchorY: number }> = require('./generated/shadedFurnitureMetadata.json');

// Calibrated correction applied uniformly to every generated anchorY --
// on-device comparison of carved_wood_chair (this atlas's WoodChair region)
// against wood_chair_green (the legacy quad-renderer's *same* chair geometry,
// restPoseAsset "1x1_WoodChair_Front_Green") found the marker-derived anchor
// landing ~72px too far up the art: the legacy renderer's bottom-center pivot
// plants a chair's feet exactly on the slot origin, but the raw marker anchor
// was landing mid-seat, so every static-atlas item floated/sank relative to
// where the equivalent legacy-rendered item would sit. Measured via a
// temporary debug dot on both renderers (see git history for the calibration
// script) at the shared "seating" slot: legacy chair's screen height 140px
// (top 725 -> foot/anchor 865) vs this atlas's WoodChair at the old 1/240
// scale, 120px (top 792 -> bottom 912, anchor dot at 864) -- a 47px screen
// gap, ~72 source px at that scale. Confirmed sane: WoodChair's declared
// height is 183px, and anchorY 111 + 72 = 183 lands exactly on the trimmed
// image's own bottom edge, i.e. this reduces to the same "feet at the very
// bottom of the trimmed art" rule the legacy renderer already uses. A single
// pixel constant (not a percentage) because the drift measured as a fixed
// pixel amount, not proportional to each item's own height.
const STATIC_FURNITURE_ANCHOR_Y_CORRECTION_PX = 72;

const atlasModule = require('../../../assets/Apartment/ShadedFurniture/ShadedFurniture.atlas');
const textureModule = require('../../../assets/Apartment/ShadedFurniture/ShadedFurniture.png');

export interface StaticFurnitureRegion {
  /** Shared atlas page texture -- same THREE.Texture instance for every
   * region, so placing more static furniture never allocates another GPU
   * texture. */
  texture: THREE.Texture;
  /** Declared (un-rotated, "as authored") pixel size of the trimmed art --
   * NOT swapped for a packing rotation. Use this to build geometry / compute
   * a uniform world scale. */
  width: number;
  height: number;
  /** Pixel anchor within this region's own un-rotated local space (top-left
   * origin, y-down), from ShadedFurniture.metadata.json -- the point that
   * must land on the furniture slot's world origin. */
  anchorX: number;
  anchorY: number;
  /** True if the packer stored this region rotated 90deg on the page. */
  rotated: boolean;
  /** Region's packed position/size on the atlas page (top-left origin,
   * pixels; width/height already page-space, i.e. swapped vs `width`/
   * `height` above when `rotated`) plus the full page size -- everything
   * buildStaticFurnitureGeometry() needs to compute rotation-aware UVs. */
  page: { x: number; y: number; width: number; height: number; pageWidth: number; pageHeight: number };
}

async function readAtlasText(): Promise<string> {
  const asset = Asset.fromModule(atlasModule);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return FileSystem.readAsStringAsync(uri);
}

let loadPromise: Promise<{ atlas: TextureAtlas; texture: THREE.Texture }> | null = null;

function load(): Promise<{ atlas: TextureAtlas; texture: THREE.Texture }> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const [atlasText, texture] = await Promise.all([readAtlasText(), loadAsync(textureModule)]);

      // Deliberately leave flipY at THREE's default (true) -- this atlas is
      // sampled by plain PlaneGeometry quads with hand-built UVs (see
      // buildStaticFurnitureGeometry below), same convention as
      // quadTextures.ts/tileSprite.ts, NOT the flipY:false convention the
      // Spine skeleton loaders use for their own UV math (spine/loaders.ts).
      // Mixing the two up renders the art upside down.
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      texture.needsUpdate = true;

      const atlas = new TextureAtlas(atlasText);
      return { atlas, texture };
    })();
  }
  return loadPromise;
}

const regionCache = new Map<string, StaticFurnitureRegion | null>();

/** Resolves an atlas region by name (e.g. "skeleton-Chair-LeafChair_0") to
 * its shared texture + geometry inputs + anchor. Returns null (after a
 * __DEV__ warning) if the region or its anchor metadata is missing --
 * callers should just skip rendering that slot rather than throw, matching
 * how buildFurnitureSlotBillboard already handles an unknown
 * furniture/variant. */
export async function getStaticFurnitureRegion(regionName: string): Promise<StaticFurnitureRegion | null> {
  if (regionCache.has(regionName)) return regionCache.get(regionName)!;

  const { atlas, texture } = await load();
  const region = atlas.findRegion(regionName);
  if (!region) {
    if (__DEV__) console.warn(`[shadedFurnitureAtlas] no atlas region named "${regionName}"`);
    regionCache.set(regionName, null);
    return null;
  }

  const anchor = shadedFurnitureMetadata[regionName];
  if (!anchor) {
    if (__DEV__) {
      console.warn(
        `[shadedFurnitureAtlas] no generated anchor for "${regionName}" -- ` +
          `run "pnpm run furniture:build-atlas-metadata" after adding/renaming atlas regions`
      );
    }
    regionCache.set(regionName, null);
    return null;
  }

  const rotated = region.degrees === 90;
  const resolved: StaticFurnitureRegion = {
    texture,
    width: region.width,
    height: region.height,
    anchorX: anchor.anchorX,
    anchorY: anchor.anchorY + STATIC_FURNITURE_ANCHOR_Y_CORRECTION_PX,
    rotated,
    page: {
      x: region.x,
      y: region.y,
      // Page-space footprint -- swapped vs region.width/height when rotated,
      // since the packer laid the region on its side (see
      // buildFurnitureAtlasMetadata.ts's pageRect()).
      width: rotated ? region.height : region.width,
      height: rotated ? region.width : region.height,
      pageWidth: region.page.width,
      pageHeight: region.page.height,
    },
  };
  regionCache.set(regionName, resolved);
  return resolved;
}

/**
 * Builds a PlaneGeometry (in raw pixel units -- scale it via mesh.scale, same
 * convention as makeSpritePlane/tileSprite.ts) for one resolved atlas
 * region, pivoted so the region's anchor pixel sits at local (0,0), and
 * UV-mapped to that region's own sub-rect of the shared atlas page
 * (rotation-aware).
 *
 * The `rotated` UV mapping was derived from -- and matches -- the same
 * empirically-verified rotation direction used in
 * scripts/buildFurnitureAtlasMetadata.ts (toDisplayedLocal): un-rotating a
 * packed region clockwise reproduces the upright, correctly-oriented art.
 */
export function buildStaticFurnitureGeometry(region: StaticFurnitureRegion): THREE.PlaneGeometry {
  const geom = new THREE.PlaneGeometry(region.width, region.height);
  // Pivot correction generalizing the bottom-center pivot used elsewhere
  // (tileSprite.ts's makeSpritePlane) to an arbitrary per-item anchor pixel.
  geom.translate(region.width / 2 - region.anchorX, region.anchorY - region.height / 2, 0);

  const { x, y, width: pw, height: ph, pageWidth, pageHeight } = region.page;
  const pxToU = (px: number) => px / pageWidth;
  const pyToV = (py: number) => 1 - py / pageHeight;

  let tl: [number, number], tr: [number, number], bl: [number, number], br: [number, number];
  if (region.rotated) {
    tl = [pxToU(x), pyToV(y + ph)];
    tr = [pxToU(x), pyToV(y)];
    bl = [pxToU(x + pw), pyToV(y + ph)];
    br = [pxToU(x + pw), pyToV(y)];
  } else {
    tl = [pxToU(x), pyToV(y)];
    tr = [pxToU(x + pw), pyToV(y)];
    bl = [pxToU(x), pyToV(y + ph)];
    br = [pxToU(x + pw), pyToV(y + ph)];
  }

  const uv = geom.getAttribute('uv');
  // Default PlaneGeometry (1x1 segments) vertex order: 0=TL, 1=TR, 2=BL, 3=BR.
  uv.setXY(0, tl[0], tl[1]);
  uv.setXY(1, tr[0], tr[1]);
  uv.setXY(2, bl[0], bl[1]);
  uv.setXY(3, br[0], br[1]);
  uv.needsUpdate = true;
  return geom;
}
