// game/housing/render/furnishSurfaceHighlight3D.ts
//
// Builds the single "this surface is selected" highlight plane shown while
// Furnish Nest has a room surface (floor/leftWall/rightWall) selected --
// never more than one at a time, and never shown for furniture slots (those
// keep the existing marker system in furnishSlotMarkers3D.ts).
//
// Visual: a thin muted-green rounded-rect stroke with a fully transparent
// fill (via the same Skia-offscreen -> THREE.DataTexture pipeline
// furnishMarkerTexture.ts already established), so the real wall/floor
// texture underneath stays completely readable -- req: "extremely subtle
// tint, never flood the whole surface."
//
// Positioning is derived directly from sceneBuilder3D.ts's own mesh math
// (halfWidth/halfDepth/WALL_HEIGHT), NOT from furnitureBillboard3D.ts's
// similarly-named wall-decor-slot quaternions -- that's a different
// subsystem (roomSlots.ts's `wall: 'leftBack'|'rightBack'` decor slots) with
// its own, separately-confusing left/right convention. Ground truth here:
// backWallZ (normal +X) is the visible LEFT screen wall; backWallX (normal
// +Z) is the visible RIGHT screen wall.
import * as THREE from 'three';
import { Skia, ColorType, AlphaType, PaintStyle } from '@shopify/react-native-skia';
import { WALL_HEIGHT } from './sceneBuilder3D';

export type FurnishSurface = 'floor' | 'leftWall' | 'rightWall';

const INK_MUTED_GREEN = '#2E4B29';
const FELT_GREEN = '#8FBF82';
// Fixed texture resolution per world unit -- keeps the drawn stroke a
// constant WORLD-space thickness regardless of a surface's aspect ratio
// (a wide wall and a square floor both read the same border thickness),
// rather than a fixed-size square texture stretched non-uniformly onto a
// non-square plane.
const PIXELS_PER_WORLD_UNIT = 64;
const MAX_TEXTURE_EDGE = 1024;
const STROKE_PX = 7;
const CORNER_RADIUS_PX = 14;
// Small nudge off the shell's exact surface plane so it doesn't z-fight.
const SURFACE_INSET = 0.02;

const textureCache = new Map<string, THREE.DataTexture>();

function buildOutlineTexture(worldWidth: number, worldHeight: number): THREE.DataTexture | null {
  const key = `${worldWidth.toFixed(3)}x${worldHeight.toFixed(3)}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const w = Math.min(MAX_TEXTURE_EDGE, Math.max(8, Math.round(worldWidth * PIXELS_PER_WORLD_UNIT)));
  const h = Math.min(MAX_TEXTURE_EDGE, Math.max(8, Math.round(worldHeight * PIXELS_PER_WORLD_UNIT)));

  const surface = Skia.Surface.MakeOffscreen(w, h);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('rgba(0,0,0,0)'));

  const inset = STROKE_PX / 2 + 2;
  const rect = Skia.XYWHRect(inset, inset, w - inset * 2, h - inset * 2);
  const rr = Skia.RRectXY(rect, CORNER_RADIUS_PX, CORNER_RADIUS_PX);
  const strokePaint = Skia.Paint();
  strokePaint.setAntiAlias(true);
  strokePaint.setStyle(PaintStyle.Stroke);
  strokePaint.setStrokeWidth(STROKE_PX);
  strokePaint.setColor(Skia.Color(FELT_GREEN));
  canvas.drawRRect(rr, strokePaint);
  // Thin inner shadow line for a touch more definition against light
  // surfaces, still fully transparent everywhere else.
  const innerPaint = Skia.Paint();
  innerPaint.setAntiAlias(true);
  innerPaint.setStyle(PaintStyle.Stroke);
  innerPaint.setStrokeWidth(1.5);
  innerPaint.setColor(Skia.Color(INK_MUTED_GREEN));
  canvas.drawRRect(rr, innerPaint);
  surface.flush();

  const image = surface.makeImageSnapshot();
  const raw = image.readPixels(0, 0, { width: w, height: h, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul });
  if (!raw) return null;
  const src = raw instanceof Uint8Array ? raw : new Uint8Array(raw.buffer);
  const rowBytes = w * 4;
  const flipped = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    flipped.set(src.subarray(y * rowBytes, (y + 1) * rowBytes), (h - 1 - y) * rowBytes);
  }

  const texture = new THREE.DataTexture(flipped, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Builds the one highlight plane for `surface`, or null if the texture
 * couldn't be built. Depth/occlusion: opaque-cutout (alphaTest discards the
 * transparent center before it ever reaches the depth buffer; the visible
 * stroke pixels are real opaque-queue, depthTest+depthWrite true) -- the
 * same treatment furnitureBillboard3D.ts uses for anything that must
 * reliably lose to GliderMon's depthTest:false skin. A flat
 * `transparent:true, depthWrite:false` material would NOT reliably do
 * that for this codebase's specific character-skin quirk (see
 * renderLayers.ts's commentary) -- reusing the proven opaque-cutout queue
 * avoids reintroducing that failure mode for the one case that matters
 * (GliderMon or furniture standing in front of the selected wall/floor).
 */
export function buildFurnishSurfaceHighlight3D(
  surface: FurnishSurface,
  halfWidth: number,
  halfDepth: number
): THREE.Mesh | null {
  let worldWidth: number;
  let worldHeight: number;
  let position: THREE.Vector3;
  let quaternion: THREE.Quaternion;

  if (surface === 'floor') {
    worldWidth = halfWidth * 2;
    worldHeight = halfDepth * 2;
    position = new THREE.Vector3(0, SURFACE_INSET, 0);
    quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  } else if (surface === 'leftWall') {
    // backWallZ, normal +X.
    worldWidth = halfDepth * 2;
    worldHeight = WALL_HEIGHT;
    position = new THREE.Vector3(-halfWidth + SURFACE_INSET, WALL_HEIGHT / 2, 0);
    quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  } else {
    // rightWall -- backWallX, normal +Z (default plane orientation).
    worldWidth = halfWidth * 2;
    worldHeight = WALL_HEIGHT;
    position = new THREE.Vector3(0, WALL_HEIGHT / 2, -halfDepth + SURFACE_INSET);
    quaternion = new THREE.Quaternion();
  }

  const texture = buildOutlineTexture(worldWidth, worldHeight);
  if (!texture) return null;

  const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: false,
    depthTest: true,
    depthWrite: true,
    alphaTest: 0.5,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.quaternion.copy(quaternion);
  // Low/background renderOrder -- real depth-testing (opaque queue) against
  // furniture/GliderMon resolves correct per-pixel occlusion on its own;
  // this only needs to not compete with other room-shell-adjacent content.
  mesh.renderOrder = -0.5;
  return mesh;
}
