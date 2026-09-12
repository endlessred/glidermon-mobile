// Soft additive light-glow effect for lamp furniture on the static-atlas
// billboard path (staticFurnitureBillboard3D.ts). The newer shaded-atlas
// lamps are painted with flat #ff0000/#00ff00/#0000ff masks for hue-indexed
// recoloring (see RoomConfig.ts's StaticFurnitureVisual doc comment) and so
// can't bake a soft translucent halo into the art itself the way the older
// restPoseAsset lamps do (their PNG's alpha channel fades out around the
// shade, confirmed by sampling 1x1_TableLamp_On.png) -- a semi-transparent
// gradient in the source art would get misread as part of the recolor mask.
// This adds the same idea back as a separate, non-recolored overlay instead.
import * as THREE from 'three';
import { StaticFurnitureRegion } from '../assets/shadedFurnitureAtlas';
import { RENDER_ORDER_LIGHT_GLOW } from './slotWorldPlacement3D';

export interface LightSocket {
  /** Local pixel position of the light-emission point, in the same
   * top-left-origin/y-down, un-rotated pixel space as the atlas region's
   * anchorX/anchorY (see StaticFurnitureVisual.lightSocket's doc comment). */
  x: number;
  y: number;
  radius?: number;
  color?: string;
}

export const DEFAULT_LIGHT_GLOW_RADIUS = 2;
const DEFAULT_LIGHT_GLOW_COLOR = '#fff3c4';
// Uniformly scales the glow texture's baked-in alpha falloff (additive, so
// this reads as overall brightness) -- dropped to half from the initial 1.0
// after on-device review found the full-strength glow overpowering.
const DEFAULT_LIGHT_GLOW_OPACITY = 0.5;
// Nudge the glow slightly toward the camera along the billboard's own local Z
// so it never coincides exactly with the lamp art's plane -- purely
// defensive, since depthTest:false already makes draw order the only thing
// that matters, matching the small per-layer nudge furnitureBillboard3D.ts
// uses for stacked layers.
const GLOW_LOCAL_Z_OFFSET = 0.05;

const GRADIENT_TEX_SIZE = 64;

// White RGB (tinted per-instance via material.color) with an alpha falloff
// from opaque at the center to fully transparent at the inscribed circle's
// edge -- same THREE.DataTexture approach as proceduralTextures.ts, cached
// once and shared by every lamp instance since the gradient shape itself
// never varies, only the material's color/plane scale do.
let glowTexture: THREE.DataTexture | null = null;
function getGlowTexture(): THREE.DataTexture {
  if (glowTexture) return glowTexture;

  const size = GRADIENT_TEX_SIZE;
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / center);
      // Eased falloff (1-t)^2 -- brighter, tighter core with a long soft
      // tail, rather than a linear ramp that reads as a flat-ish disc.
      const alpha = Math.round(255 * (1 - t) * (1 - t));
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = alpha;
    }
  }

  glowTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  glowTexture.wrapS = THREE.ClampToEdgeWrapping;
  glowTexture.wrapT = THREE.ClampToEdgeWrapping;
  glowTexture.minFilter = THREE.LinearFilter;
  glowTexture.magFilter = THREE.LinearFilter;
  glowTexture.generateMipmaps = false;
  glowTexture.needsUpdate = true;
  return glowTexture;
}

/**
 * Builds a camera-facing glow disc for a lamp's light socket, in the same
 * local space as the lamp's own billboard mesh (i.e. add the result as a
 * sibling of that mesh, inside the same slot group) -- see
 * buildStaticFurnitureSlotBillboard for the pixel->local-unit conversion
 * this mirrors (`px - anchorX`, `anchorY - py`), scaled from pixels to world
 * units by the same STATIC_FURNITURE_WORLD_UNITS_PER_PIXEL passed in here.
 */
export function buildLightGlow(
  socket: LightSocket,
  region: StaticFurnitureRegion,
  worldUnitsPerPixel: number,
  mirrorX: boolean
): THREE.Mesh {
  const radius = socket.radius ?? DEFAULT_LIGHT_GLOW_RADIUS;
  const localX = (socket.x - region.anchorX) * worldUnitsPerPixel;
  const localY = (region.anchorY - socket.y) * worldUnitsPerPixel;

  const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const material = new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color: new THREE.Color(socket.color ?? DEFAULT_LIGHT_GLOW_COLOR),
    opacity: DEFAULT_LIGHT_GLOW_OPACITY,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(mirrorX ? -localX : localX, localY, GLOW_LOCAL_Z_OFFSET);
  mesh.renderOrder = RENDER_ORDER_LIGHT_GLOW;
  return mesh;
}
