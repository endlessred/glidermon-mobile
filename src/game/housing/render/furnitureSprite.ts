// Static furniture rendering for the quad-based room renderer. Furniture is
// drawn as a single textured quad using its rest-pose art from the asset
// pack -- no Spine skeleton, no per-frame update. (Swapping to a live Spine
// skeleton for an active interaction is out of scope for this phase.)
import * as THREE from 'three';
import { isoToScreen, zFromFeetScreenY, TILE_SKIRT } from '../coords';
import { renderOrderFromFeetY } from '../anchors';
import { makeSpritePlane } from './tileSprite';
import { loadFurnitureTexture } from '../assets/quadTextures';
import { getFurnitureDef } from '../types/furnitureCatalog';

// "under"/"over" always render behind/in front of everything else in the
// room, regardless of their actual screen position; "mid" (the default)
// sorts naturally by feetY alongside the floor, walls, and character.
const FURNITURE_UNDER_BIAS = -5000;
const FURNITURE_OVER_BIAS = 5000;

export interface FurniturePlacement {
  furnitureId: string;
  variantId: string;
  row: number;
  col: number;
  facing?: 'left' | 'right';
  layer?: 'under' | 'mid' | 'over';
}

export async function buildFurnitureSprite(placement: FurniturePlacement): Promise<THREE.Mesh | null> {
  const def = getFurnitureDef(placement.furnitureId);
  const variant = def?.variants.find((v) => v.id === placement.variantId);
  if (!def || !variant?.restPoseAsset) {
    if (__DEV__) {
      console.warn(`[housing] no rest-pose art for ${placement.furnitureId}/${placement.variantId}`);
    }
    return null;
  }

  const tex = await loadFurnitureTexture(variant.restPoseAsset);
  if (!tex) return null;

  const mesh = makeSpritePlane(tex.texture, tex.width, tex.height);
  const p = isoToScreen(placement.col, placement.row);
  mesh.position.set(p.x, p.y, zFromFeetScreenY(p.y));

  const defaultFacing = def.defaultFacing ?? 'left';
  const effectiveFacing = placement.facing ?? defaultFacing;
  if (def.supportsFacing && effectiveFacing !== defaultFacing) {
    mesh.scale.x *= -1;
  }

  const layer = placement.layer ?? 'mid';
  const bias = layer === 'under' ? FURNITURE_UNDER_BIAS : layer === 'over' ? FURNITURE_OVER_BIAS : 0;
  // Use the same depth key (feetY = p.y - TILE_SKIRT) as floor tiles, plus a
  // small +1 nudge, so furniture reliably draws in front of the tile it's
  // standing on -- otherwise the co-located floor tile's TILE_SKIRT-free
  // comparison makes it draw after (covering) the furniture. See
  // sceneBuilder.ts for the sign-inversion rationale (larger feetY = toward
  // the top/back here).
  mesh.renderOrder = renderOrderFromFeetY(0, -(p.y - TILE_SKIRT), bias) + 1;

  return mesh;
}
