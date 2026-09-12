// Slot-based furniture for the 3D-primitive room shell. Unlike the old
// freeform furnitureSprite.ts (still used by the `quad` renderer, untouched),
// position comes from a fixed RoomSlotDef (roomSlots.ts) rather than a
// per-placement row/col -- see the housing plan for why slots are fixed
// rather than player-movable. A variant can composite multiple billboard
// layers (e.g. bed frame + bedding) and/or include one frame-cycling
// flipbook layer (e.g. a campfire flicker, a chest opening) -- everything
// else is a single static layer, same as the original chair.
import * as THREE from 'three';
import { makeSpritePlane } from './tileSprite';
import { loadFurnitureTexture } from '../assets/quadTextures';
import { getFurnitureDef } from '../types/furnitureCatalog';
import { gridToWorld, RoomDims3D, TILE_SIZE } from './grid3D';
import { WALL_HEIGHT } from './sceneBuilder3D';
import { RoomSlotDef } from '../types/roomSlots';
import { buildStaticFurnitureSlotBillboard } from './staticFurnitureBillboard3D';
import {
  resolveSlotWorldPlacement,
  RENDER_ORDER_BEHIND_CHARACTER,
  RENDER_ORDER_IN_FRONT_OF_CHARACTER,
  RENDER_ORDER_FLOOR_DECAL,
  BuiltFurnitureBillboard,
  WALL_DECOR_HEIGHT,
} from './slotWorldPlacement3D';

// Re-exported for existing consumers (furnishSlotMarkers3D.ts) -- the actual
// definitions live in slotWorldPlacement3D.ts so staticFurnitureBillboard3D.ts
// can depend on them without importing this file (this file already imports
// *it*, for the staticAtlas delegation below).
export { resolveSlotWorldPlacement, RENDER_ORDER_BEHIND_CHARACTER, RENDER_ORDER_IN_FRONT_OF_CHARACTER };
export type { BuiltFurnitureBillboard };

// Rest-pose art comes from the asset pack in raw trimmed-pixel dimensions
// (e.g. ~100-300px), while this scene works in 1-world-unit-per-tile space --
// scale each layer down so it reads as roughly furniture-height relative to
// a tile instead of a room-engulfing quad with only its transparent padding
// inside the camera frustum.
const FURNITURE_DESIRED_TILE_HEIGHT = 0.9;

export async function buildFurnitureSlotBillboard(
  slot: RoomSlotDef,
  furnitureId: string,
  variantId: string,
  dims: RoomDims3D,
  billboardQuaternion: THREE.Quaternion,
  characterWorldPos: { x: number; z: number },
  /** Force this slot's billboard to render in front of the character
   * regardless of depth score -- used while GliderMon is sitting in it, so the
   * seat/back render over his legs instead of him overlapping the chair. */
  forceInFront = false,
  /** Selected colorway id for this slot's occupant (Furnish Nest's "Colors"
   * action) -- see StaticFurnitureVisual / FURNITURE_RECOLOR_PALETTES.
   * Ignored for variants that aren't `recolorable`. */
  paletteId?: string
): Promise<BuiltFurnitureBillboard | null> {
  const def = getFurnitureDef(furnitureId);
  const variant = def?.variants.find((v) => v.id === variantId);
  if (!def || !variant) {
    if (__DEV__) {
      console.warn(`[housing3D] unknown furniture ${furnitureId}/${variantId} for slot ${slot.slotId}`);
    }
    return null;
  }

  // Static-atlas path (chair/storage/lighting migration) -- a variant with
  // `staticAtlas` set skips the layers/restPoseAsset rendering below
  // entirely; see staticFurnitureBillboard3D.ts.
  if (variant.staticAtlas) {
    return buildStaticFurnitureSlotBillboard(
      slot,
      variant,
      paletteId,
      dims,
      billboardQuaternion,
      characterWorldPos,
      forceInFront
    );
  }

  const layers = variant.layers ?? (variant.restPoseAsset ? [{ assetName: variant.restPoseAsset }] : []);
  if (layers.length === 0) return null;

  // Slot world position, computed up front so it can drive both the
  // in-front/behind-the-character renderOrder classification below and the
  // final group placement at the end of this function.
  const { position: slotWorldPos, quaternion: slotQuaternion, mirrorX } = resolveSlotWorldPlacement(slot, dims, billboardQuaternion);

  // The camera is a fixed isometric orthographic camera looking along
  // (-1,-1,-1) (see CAMERA_OFFSET in IsometricRoomView3D.tsx), so "distance
  // toward the camera" for any point is proportional to x+y+z. Comparing
  // that scalar against the character's tells us which side of the
  // character this slot renders on.
  // A floor decal (the rug) always renders behind every other content item,
  // never just the character -- skip the depth-score comparison entirely
  // (and ignore forceInFront, which only makes sense for a seat).
  let layerRenderOrder: number;
  if (def.floorDecal) {
    layerRenderOrder = RENDER_ORDER_FLOOR_DECAL;
  } else {
    const slotDepthScore = slotWorldPos.x + slotWorldPos.y + slotWorldPos.z;
    const characterDepthScore = characterWorldPos.x + characterWorldPos.z;
    layerRenderOrder =
      forceInFront || slotDepthScore > characterDepthScore
        ? RENDER_ORDER_IN_FRONT_OF_CHARACTER
        : RENDER_ORDER_BEHIND_CHARACTER;
  }

  const group = new THREE.Group();
  const updaters: Array<(dt: number) => void> = [];

  // Layers past the first are only repositioned relative to it when their
  // source canvas size matches exactly -- i.e. they were cropped from the
  // same original composite image (e.g. a bed frame + bedding exported from
  // one PSD canvas), so a pixel offset in one is directly comparable to a
  // pixel offset in the other. When canvases don't match (e.g. a static
  // base layer paired with an unrelated animated flipbook sheet), there's no
  // reliable shared coordinate space, so that layer falls back to its own
  // independent bottom-center pivot exactly as before.
  let referenceCanvas: { width: number; height: number; offsetX: number; offsetY: number; trimmedWidth: number; trimmedHeight: number } | null = null;

  const desiredTileHeight = def.desiredTileHeight ?? FURNITURE_DESIRED_TILE_HEIGHT;
  // A wide/low-aspect texture (e.g. a rug) scaled by height alone can render
  // several tiles wide even though it occupies a 1x1 (or, for the bed, 1x2)
  // slot -- clamp to whichever scale (height- or width-based) keeps it
  // within its footprint so it can't visually overflow into a wall. Must be
  // strictly footprint.w (not the longer footprint.h for a row-elongated
  // item like the bed): the bed's slot sits flush against the corner wall,
  // and its billboard plane's local-X extent maps into a diagonal blend of
  // world X and Z once rotated to face the camera, so allowing it to render
  // wider than its actual 1-tile column made the headboard corner poke
  // through the wall.
  const footprintWidthWorld = (slot.footprint?.w ?? 1) * TILE_SIZE;
  // Wall décor is mounted at WALL_DECOR_HEIGHT with its bottom-center pivot,
  // so it only has (WALL_HEIGHT - WALL_DECOR_HEIGHT) of headroom before
  // poking above the wall's top edge into the sky -- clamp to that budget
  // the same way floor items are clamped to their footprint width.
  const wallHeightBudget = WALL_HEIGHT - WALL_DECOR_HEIGHT;

  for (const [layerIndex, layer] of layers.entries()) {
    const tex = await loadFurnitureTexture(layer.assetName);
    if (!tex) continue;

    const frameCount = layer.frameCount && layer.frameCount > 1 ? layer.frameCount : 1;
    const frameWidth = tex.width / frameCount;
    const heightScale = (TILE_SIZE * desiredTileHeight) / tex.height;
    const widthScale = footprintWidthWorld / frameWidth;
    const scaleFactor =
      slot.kind === 'wall'
        ? Math.min(heightScale, wallHeightBudget / tex.height)
        : Math.min(heightScale, widthScale);

    // Animated layers get their own texture clone so repeat/offset mutation
    // (the flipbook cycling below) doesn't leak into the shared, cached
    // texture other instances of this same asset might reuse.
    const texture = frameCount > 1 ? tex.texture.clone() : tex.texture;
    if (frameCount > 1) {
      texture.needsUpdate = true;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = 1 / frameCount;
    }

    // When mirrored, both the mesh's own scale AND every local-space X
    // offset below (pivot correction, cross-layer alignment) must flip in
    // lockstep -- flipping scale alone shifts the mirrored plane a full
    // width off its pivot instead of mirroring it in place.
    const scaleX = mirrorX ? -scaleFactor : scaleFactor;

    const mesh = makeSpritePlane(texture, frameWidth, tex.height, {
      depthTest: true,
      opaqueCutout: layerRenderOrder === RENDER_ORDER_BEHIND_CHARACTER,
      floorDecal: def.floorDecal,
    });
    mesh.renderOrder = layerRenderOrder;
    mesh.scale.set(scaleX, scaleFactor, scaleFactor);
    // Same bottom-center pivot correction as furnitureSprite.ts/tileSprite.ts:
    // the translated geometry's true bottom-center sits at local (w/2, h/2),
    // not the origin.
    let posX = -(frameWidth / 2) * scaleX;
    let posY = -(tex.height / 2) * scaleFactor;

    if (!referenceCanvas) {
      referenceCanvas = { width: tex.canvasWidth, height: tex.canvasHeight, offsetX: tex.offsetX, offsetY: tex.offsetY, trimmedWidth: tex.width, trimmedHeight: tex.height };
    } else if (tex.canvasWidth === referenceCanvas.width && tex.canvasHeight === referenceCanvas.height) {
      // Shift by the difference between this layer's trimmed-bbox
      // bottom-center and the reference layer's, in shared canvas-pixel
      // units converted to world units via the (shared) canvas height --
      // NOT each layer's own scaleFactor, which varies with trim size and
      // would distort the relative offset.
      const canvasScale = (TILE_SIZE * desiredTileHeight) / referenceCanvas.height;
      const refCenterX = referenceCanvas.offsetX + referenceCanvas.trimmedWidth / 2;
      const refBottomY = referenceCanvas.offsetY + referenceCanvas.trimmedHeight;
      const layerCenterX = tex.offsetX + tex.width / 2;
      const layerBottomY = tex.offsetY + tex.height;
      posX += (refCenterX - layerCenterX) * (mirrorX ? -canvasScale : canvasScale);
      posY += (refBottomY - layerBottomY) * canvasScale;
    }

    // Small per-layer nudge toward the camera along the billboard's own
    // facing axis -- layers of a variant are visually stacked (e.g. a flame
    // overlay on a log base) and are otherwise perfectly coplanar, which
    // with depthTest enabled causes z-fighting/flicker between them.
    mesh.position.set(posX, posY, layerIndex * 0.01);
    group.add(mesh);

    if (frameCount > 1) {
      const frameDuration = 1 / (layer.fps ?? 8);
      let frame = 0;
      let accumulated = 0;
      updaters.push((dt: number) => {
        accumulated += dt;
        while (accumulated >= frameDuration) {
          accumulated -= frameDuration;
          frame = (frame + 1) % frameCount;
          texture.offset.x = frame / frameCount;
        }
      });
    }
  }

  group.position.set(slotWorldPos.x, slotWorldPos.y, slotWorldPos.z);
  group.quaternion.copy(slotQuaternion);
  // Lets Furnish Nest's raycast (furnishSlotMarkers3D.ts / IsometricRoomView3D.tsx)
  // resolve a tap on already-placed furniture back to its housing slot.
  group.userData.slotId = slot.slotId;

  const update = updaters.length > 0 ? (dt: number) => updaters.forEach((u) => u(dt)) : undefined;
  return { group, update };
}
