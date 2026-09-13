// Build-time tool: derives a per-region pixel anchor for the static-atlas
// furniture renderer (see src/game/housing/render/staticFurnitureBillboard3D.ts)
// from a pair of matching Spine atlases:
//
//   ShadedFurniture.atlas / .png        -- production art, shown in-game
//   ShadedFurnitureMarker.atlas / .png  -- same regions, each with a solid
//                                          magenta (#FF00FF) dot baked into
//                                          the pixels at the item's logical
//                                          floor-footprint center
//
// The marker atlas is authoring-only metadata -- it is never loaded at
// runtime. This script scans it once, at build time, and writes the derived
// anchors to ShadedFurniture.metadata.json; the renderer only ever reads that
// JSON (see "Rerunning" below for when to redo this).
//
// Run with:  pnpm exec tsx scripts/buildFurnitureAtlasMetadata.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ASSET_DIR = path.resolve(__dirname, '../src/assets/Apartment/ShadedFurniture');
const PRODUCTION_ATLAS_PATH = path.join(ASSET_DIR, 'ShadedFurniture.atlas');
const MARKER_ATLAS_PATH = path.join(ASSET_DIR, 'ShadedFurnitureMarker.atlas');
const MARKER_PNG_PATH = path.join(ASSET_DIR, 'ShadedFurnitureMarker.png');
const OUTPUT_PATH = path.resolve(
  __dirname,
  '../src/game/housing/assets/generated/shadedFurnitureMetadata.json'
);

// Magenta marker detection tolerance -- the marker is exported as pure
// #FF00FF, but the atlas page is `pma:true` (premultiplied alpha) and the
// exporter may leave a sliver of antialiasing around the dot, so match with
// slack instead of requiring an exact value. Fully-opaque marker pixels are
// what we want to cluster on; premultiplication only pulls low-alpha edge
// pixels *toward* black, so the tight r/g/b thresholds already exclude them
// without an explicit alpha check, but we keep one for clarity/robustness.
function isMagenta(r: number, g: number, b: number, a: number): boolean {
  return a > 10 && r > 245 && g < 10 && b > 245;
}

// ---------------------------------------------------------------------------
// Atlas parsing
//
// Spine's compact (4.1+) atlas text format. We only need region geometry, so
// this parses the same fields spine-core's TextureAtlas class understands
// (see node_modules/@esotericsoftware/spine-core/dist/TextureAtlas.js) and
// silently ignores everything else (e.g. a custom "origin" field some
// exports carry -- that is NOT the marker anchor, it's leftover
// attachment/bone metadata from the Spine project and is unrelated to this
// pipeline; do not be tempted to read it instead of detecting the marker).
// ---------------------------------------------------------------------------

interface AtlasRegion {
  name: string;
  /** Position of this region's packed rect on the atlas page, top-left
   * origin, pixels. */
  x: number;
  y: number;
  /** Declared (un-rotated, "as authored") pixel size of the trimmed region --
   * i.e. the size you'd see if you rotated the packed rect back upright.
   * NOT swapped for `degrees === 90` (see pageRect() below for the packed
   * on-page footprint, which *is* swapped). */
  width: number;
  height: number;
  /** Offset of the trimmed rect's origin within the untrimmed source canvas,
   * and that canvas's full size. Same un-rotated orientation as width/height.
   * Zero/absent when the exporter didn't trim this region at all. */
  offsetX: number;
  offsetY: number;
  originalWidth: number;
  originalHeight: number;
  /** 0 or 90. Only these two values are produced by our export pipeline;
   * anything else aborts the build rather than silently mis-placing art. */
  degrees: number;
}

interface ParsedAtlas {
  pageWidth: number;
  pageHeight: number;
  regionsByName: Map<string, AtlasRegion>;
  order: string[];
}

function splitField(line: string): { key: string; raw: string } {
  const colon = line.indexOf(':');
  return { key: line.slice(0, colon).trim(), raw: line.slice(colon + 1).trim() };
}

function parseAtlas(text: string, sourcePathForErrors: string): ParsedAtlas {
  const lines = text.split(/\r\n|\r|\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length) {
    throw new Error(`${sourcePathForErrors}: empty atlas file`);
  }
  i++; // page/png name line -- not needed, we load textures by our own path

  let pageWidth = 0;
  let pageHeight = 0;
  while (i < lines.length && lines[i].includes(':')) {
    const { key, raw } = splitField(lines[i]);
    if (key === 'size') {
      const [w, h] = raw.split(',').map((s) => parseInt(s.trim(), 10));
      pageWidth = w;
      pageHeight = h;
    }
    i++;
  }
  if (!pageWidth || !pageHeight) {
    throw new Error(`${sourcePathForErrors}: could not read page "size:" header`);
  }

  const regionsByName = new Map<string, AtlasRegion>();
  const order: string[] = [];

  while (i < lines.length) {
    if (lines[i].trim() === '') {
      i++;
      continue;
    }
    const name = lines[i].trim();
    i++;
    if (regionsByName.has(name)) {
      throw new Error(`${sourcePathForErrors}: duplicate region name "${name}"`);
    }

    let x = 0, y = 0, width = 0, height = 0;
    let offsetX = 0, offsetY = 0, originalWidth = 0, originalHeight = 0;
    let sawOriginal = false;
    let degrees = 0;

    while (i < lines.length && lines[i].includes(':')) {
      const { key, raw } = splitField(lines[i]);
      const nums = raw.split(',').map((s) => parseInt(s.trim(), 10));
      switch (key) {
        case 'xy':
          x = nums[0];
          y = nums[1];
          break;
        case 'size':
          width = nums[0];
          height = nums[1];
          break;
        case 'bounds':
          x = nums[0];
          y = nums[1];
          width = nums[2];
          height = nums[3];
          break;
        case 'offset':
          offsetX = nums[0];
          offsetY = nums[1];
          break;
        case 'orig':
          originalWidth = nums[0];
          originalHeight = nums[1];
          sawOriginal = true;
          break;
        case 'offsets':
          offsetX = nums[0];
          offsetY = nums[1];
          originalWidth = nums[2];
          originalHeight = nums[3];
          sawOriginal = true;
          break;
        case 'rotate':
          if (raw === 'true') degrees = 90;
          else if (raw === 'false') degrees = 0;
          else degrees = parseInt(raw, 10);
          break;
        default:
          // Ignore unknown/custom fields (e.g. "origin", "index").
          break;
      }
      i++;
    }

    if (!sawOriginal) {
      originalWidth = width;
      originalHeight = height;
    }
    if (degrees !== 0 && degrees !== 90) {
      throw new Error(
        `${sourcePathForErrors}: region "${name}" has unsupported rotate value ${degrees} ` +
          `(this pipeline only handles 0 or 90 -- our export never rotates by other amounts)`
      );
    }

    regionsByName.set(name, {
      name,
      x, y, width, height,
      offsetX, offsetY, originalWidth, originalHeight,
      degrees,
    });
    order.push(name);
  }

  return { pageWidth, pageHeight, regionsByName, order };
}

/** The rectangle this region actually occupies on the atlas page (top-left
 * origin, pixels) -- width/height swapped vs the declared un-rotated
 * dimensions when `degrees === 90`, since packing laid it on its side. */
function pageRect(region: AtlasRegion): { x0: number; y0: number; x1: number; y1: number } {
  const pw = region.degrees === 90 ? region.height : region.width;
  const ph = region.degrees === 90 ? region.width : region.height;
  return { x0: region.x, y0: region.y, x1: region.x + pw, y1: region.y + ph };
}

/**
 * Maps a point on the atlas page (top-left origin, pixels) into the region's
 * own "displayed" local pixel space -- top-left origin, un-rotated, matching
 * how the art actually looks once packing's 90-degree rotation is undone.
 * width/height below are the region's declared (un-rotated) dimensions.
 *
 * The `degrees === 90` case was derived empirically, not just from the atlas
 * spec: cropping the packed rect out of ShadedFurniture.png and rotating it
 * clockwise (this exact mapping) reliably produced an upright, correctly-
 * oriented item (feet at the bottom, right-side up) for every rotated region
 * checked (Crescent Moon Chair, Hollow Log Trunk) -- rotating the other way
 * did not. See the PR/commit description for the crops that proved this.
 */
function toDisplayedLocal(region: AtlasRegion, pageX: number, pageY: number): { x: number; y: number } {
  const pxLocal = pageX - region.x;
  const pyLocal = pageY - region.y;
  if (region.degrees === 0) {
    return { x: pxLocal, y: pyLocal };
  }
  return { x: region.width - pyLocal, y: pxLocal };
}

/**
 * Converts a "displayed local" pixel coordinate (top-left origin, y-down,
 * within `region`'s own un-rotated trimmed rect) into a position within the
 * item's full untrimmed source canvas -- also top-left origin, y-down, so it
 * can be compared 1:1 between the marker and production atlases regardless
 * of how differently each one happened to trim the art.
 *
 * The Y axis needs a flip that the X axis doesn't: Spine's own
 * RegionAttachment.computeUVs (spine-core) reconstructs the trimmed rect's
 * position inside the original canvas as
 *   boxX = offsetX .. offsetX + width          (origin: canvas left edge)
 *   boxY = offsetY .. offsetY + height          (origin: canvas BOTTOM edge)
 * i.e. offsetX/offsetY are libGDX/Spine's classic bottom-left-origin,
 * Y-up trim margins -- offsetY is measured up from the bottom of the
 * original canvas, not down from the top. Converting that into this script's
 * top-left/y-down working frame requires flipping just Y:
 *   sourceX = offsetX + localX
 *   sourceY = (originalHeight - offsetY - height) + localY
 * Every region in the current export happens to have offsetX/offsetY of
 * 0-2px, so this correction is invisible in today's data -- it only matters
 * once a future export trims the marker and production atlases differently.
 */
function toSourceFrame(region: AtlasRegion, local: { x: number; y: number }): { x: number; y: number } {
  return {
    x: region.offsetX + local.x,
    y: region.originalHeight - region.offsetY - region.height + local.y,
  };
}

/** Inverse of toSourceFrame: source-canvas coordinate -> this region's own
 * displayed-local pixel coordinate. */
function fromSourceFrame(region: AtlasRegion, source: { x: number; y: number }): { x: number; y: number } {
  return {
    x: source.x - region.offsetX,
    y: source.y - (region.originalHeight - region.offsetY - region.height),
  };
}

// ---------------------------------------------------------------------------
// Magenta marker detection
// ---------------------------------------------------------------------------

interface MagentaCluster {
  minX: number; maxX: number; minY: number; maxY: number;
  count: number;
  centerX: number;
  centerY: number;
}

const NEIGHBOR_OFFSETS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function findMagentaClusters(png: PNG): MagentaCluster[] {
  const { width: w, height: h, data } = png;
  const visited = new Uint8Array(w * h);
  const clusters: MagentaCluster[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx]) continue;
      const p = idx * 4;
      if (!isMagenta(data[p], data[p + 1], data[p + 2], data[p + 3])) continue;

      const stack: Array<[number, number]> = [[x, y]];
      visited[idx] = 1;
      let minX = x, maxX = x, minY = y, maxY = y, count = 0;
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        count++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (const [dx, dy] of NEIGHBOR_OFFSETS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const nIdx = ny * w + nx;
          if (visited[nIdx]) continue;
          const np = nIdx * 4;
          if (isMagenta(data[np], data[np + 1], data[np + 2], data[np + 3])) {
            visited[nIdx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      clusters.push({ minX, maxX, minY, maxY, count, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 });
    }
  }
  return clusters;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function fail(message: string): never {
  console.error(`\n[buildFurnitureAtlasMetadata] FAILED: ${message}\n`);
  process.exit(1);
}

function main() {
  if (!existsSync(PRODUCTION_ATLAS_PATH)) fail(`missing ${PRODUCTION_ATLAS_PATH}`);
  if (!existsSync(MARKER_ATLAS_PATH)) fail(`missing ${MARKER_ATLAS_PATH}`);
  if (!existsSync(MARKER_PNG_PATH)) fail(`missing ${MARKER_PNG_PATH}`);

  const production = parseAtlas(readFileSync(PRODUCTION_ATLAS_PATH, 'utf8'), PRODUCTION_ATLAS_PATH);
  const marker = parseAtlas(readFileSync(MARKER_ATLAS_PATH, 'utf8'), MARKER_ATLAS_PATH);

  // Every production region must have a matching marker region and vice
  // versa -- fail loudly and name exactly what's missing rather than
  // silently skipping items.
  const productionOnly = production.order.filter((n) => !marker.regionsByName.has(n));
  const markerOnly = marker.order.filter((n) => !production.regionsByName.has(n));
  if (productionOnly.length > 0) {
    fail(`production regions with no matching marker region: ${productionOnly.join(', ')}`);
  }
  if (markerOnly.length > 0) {
    fail(`marker regions with no matching production region: ${markerOnly.join(', ')}`);
  }

  const markerPng = PNG.sync.read(readFileSync(MARKER_PNG_PATH));
  const clusters = findMagentaClusters(markerPng);

  // Match each cluster to the one marker region whose packed page-rect
  // contains its center. Atlas regions never overlap on the page, so at most
  // one region should ever claim a given cluster.
  const clustersByRegion = new Map<string, MagentaCluster[]>();
  const unclaimedClusters: MagentaCluster[] = [];
  for (const cluster of clusters) {
    const owners: string[] = [];
    for (const name of marker.order) {
      const region = marker.regionsByName.get(name)!;
      const rect = pageRect(region);
      if (cluster.centerX >= rect.x0 && cluster.centerX < rect.x1 && cluster.centerY >= rect.y0 && cluster.centerY < rect.y1) {
        owners.push(name);
      }
    }
    if (owners.length === 0) {
      unclaimedClusters.push(cluster);
    } else if (owners.length === 1) {
      const list = clustersByRegion.get(owners[0]) ?? [];
      list.push(cluster);
      clustersByRegion.set(owners[0], list);
    } else {
      fail(
        `magenta cluster at page (${cluster.centerX}, ${cluster.centerY}) falls inside multiple regions' ` +
          `bounds: ${owners.join(', ')} -- atlas regions should never overlap, this indicates a parsing bug`
      );
    }
  }

  if (unclaimedClusters.length > 0) {
    const points = unclaimedClusters.map((c) => `(${c.centerX}, ${c.centerY})`).join(', ');
    fail(`found magenta pixel cluster(s) not inside any known atlas region: ${points}`);
  }

  const missingMarker: string[] = [];
  const ambiguousMarker: string[] = [];
  for (const name of marker.order) {
    const list = clustersByRegion.get(name) ?? [];
    if (list.length === 0) missingMarker.push(name);
    else if (list.length > 1) ambiguousMarker.push(`${name} (${list.length} clusters)`);
  }
  if (missingMarker.length > 0) {
    fail(`no magenta marker found for region(s): ${missingMarker.join(', ')}`);
  }
  if (ambiguousMarker.length > 0) {
    fail(`multiple ambiguous magenta clusters found for region(s): ${ambiguousMarker.join(', ')}`);
  }

  const metadata: Record<string, { anchorX: number; anchorY: number }> = {};

  for (const name of production.order) {
    const productionRegion = production.regionsByName.get(name)!;
    const markerRegion = marker.regionsByName.get(name)!;

    if (
      markerRegion.originalWidth !== productionRegion.originalWidth ||
      markerRegion.originalHeight !== productionRegion.originalHeight
    ) {
      fail(
        `region "${name}": marker and production untrimmed source-canvas sizes differ ` +
          `(marker ${markerRegion.originalWidth}x${markerRegion.originalHeight} vs ` +
          `production ${productionRegion.originalWidth}x${productionRegion.originalHeight}) -- ` +
          `cannot reliably translate the marker position into the production region's local ` +
          `coordinates. Re-export both atlases from the same source frame.`
      );
    }

    const cluster = clustersByRegion.get(name)![0];
    const markerDisplayedLocal = toDisplayedLocal(markerRegion, cluster.centerX, cluster.centerY);
    const sourceFramePoint = toSourceFrame(markerRegion, markerDisplayedLocal);
    const productionLocal = fromSourceFrame(productionRegion, sourceFramePoint);

    // Sanity check rather than hard failure: a marker that lands just
    // outside the production region's own trimmed bounds usually means the
    // two exports disagree on trim more than expected, but a few px of
    // slack from rounding/antialiasing is normal.
    const OUT_OF_BOUNDS_TOLERANCE_PX = 2;
    if (
      productionLocal.x < -OUT_OF_BOUNDS_TOLERANCE_PX ||
      productionLocal.x > productionRegion.width + OUT_OF_BOUNDS_TOLERANCE_PX ||
      productionLocal.y < -OUT_OF_BOUNDS_TOLERANCE_PX ||
      productionLocal.y > productionRegion.height + OUT_OF_BOUNDS_TOLERANCE_PX
    ) {
      console.warn(
        `[buildFurnitureAtlasMetadata] WARNING: region "${name}" anchor (${productionLocal.x.toFixed(1)}, ` +
          `${productionLocal.y.toFixed(1)}) falls outside its production bounds ` +
          `(${productionRegion.width}x${productionRegion.height}) -- double-check this item's trim.`
      );
    }

    metadata[name] = {
      anchorX: Math.round(productionLocal.x * 100) / 100,
      anchorY: Math.round(productionLocal.y * 100) / 100,
    };
  }

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(metadata, null, 2)}\n`);

  console.log(`[buildFurnitureAtlasMetadata] wrote ${Object.keys(metadata).length} anchors to ${OUTPUT_PATH}`);
  for (const name of production.order) {
    console.log(`  ${name}: ${JSON.stringify(metadata[name])}`);
  }
}

main();
