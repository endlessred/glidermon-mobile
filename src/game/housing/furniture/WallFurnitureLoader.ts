import * as THREE from 'three';
import { Physics } from '@esotericsoftware/spine-core';
import { loadSpineFromExpoAssets } from '../../../spine/loaders';
import { WallFurnitureConfig } from '../types/RoomConfig';
import { getWallFurnitureDef, getWallFurnitureVariant, shouldFlipWallFurniture } from '../types/wallFurnitureCatalog';
import { WallAnchor } from '../utils/wallAnchors';
import { applyPainterlyState } from '../painterly/Painterly';
import { getFurnitureColorScheme, getDefaultFurnitureColorScheme } from './FurnitureColors';
import { makeHueIndexedRecolorMaterial } from '../../../spine/HueIndexedRecolor';

export type LoadedWallFurniture = {
  skeleton: import('@esotericsoftware/spine-core').Skeleton;
  state: import('@esotericsoftware/spine-core').AnimationState;
  mesh: any;
  config: WallFurnitureConfig;
  definition: any;
  variant: any;
};

/**
 * Load wall furniture skeleton (WallFurnAndArt.json)
 */
export async function loadWallFurnitureSkeleton(): Promise<{
  skeleton: import('@esotericsoftware/spine-core').Skeleton;
  state: import('@esotericsoftware/spine-core').AnimationState;
  resolveTexture: any;
} | null> {
  try {
    const atlasModule = require('../../../assets/Apartment/WallFurnAndArt/FurnAndArt.atlas');
    const jsonModule = require('../../../assets/Apartment/WallFurnAndArt/FurnAndArt.json');
    const textureModule = require('../../../assets/Apartment/WallFurnAndArt/FurnAndArt.png');

    const result = await loadSpineFromExpoAssets({
      atlasModule,
      jsonModule,
      textureModules: [textureModule],
      defaultMix: 0,
    });

    return result;
  } catch (error) {
    // Silently handle skeleton loading errors
    return null;
  }
}

/**
 * Create a wall furniture instance
 */
export async function createWallFurnitureInstance(
  furnitureConfig: WallFurnitureConfig,
  wallAnchor: WallAnchor
): Promise<LoadedWallFurniture | null> {
  const furnitureDef = getWallFurnitureDef(furnitureConfig.id);
  if (!furnitureDef) {
    return null;
  }

  // Find the variant
  const variant = getWallFurnitureVariant(furnitureConfig.id, furnitureConfig.variantId);
  if (!variant) {
    return null;
  }

  // Load the wall furniture skeleton
  const skeletonResult = await loadWallFurnitureSkeleton();
  if (!skeletonResult) {
    return null;
  }

  const { skeleton, state, resolveTexture } = skeletonResult;

  // Set up the skeleton for this specific variant
  setupWallFurnitureVariant(skeleton, state, furnitureConfig, variant, wallAnchor);

  // Set the default animation
  try {
    const defaultAnim = skeleton.data.findAnimation('animation');
    if (defaultAnim) {
      state.setAnimation(0, 'animation', true);
    }
  } catch (error) {
    // Silently handle animation errors
  }

  // Apply positioning
  positionWallFurniture(skeleton, wallAnchor, furnitureDef);

  // Update world transform BEFORE creating mesh
  const PHYSICS: any = Physics as any;
  skeleton.updateWorldTransform(PHYSICS.update);

  // Create the mesh
  const { SkeletonMesh } = require('../../../spine/SpineThree');
  const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
  mesh.frustumCulled = false;

  // Calculate render order (wall furniture should be between room and regular furniture)
  const baseRenderOrder = calculateWallFurnitureRenderOrder(furnitureConfig, wallAnchor);
  mesh.userData.basePainterlyOrder = baseRenderOrder;

  // Apply color recoloring if variant has a color scheme
  if (variant.colorScheme) {
    const colorScheme = getFurnitureColorScheme(variant.colorScheme) || getDefaultFurnitureColorScheme();
    applyColorRecoloringToMesh(mesh, colorScheme.colors);

    if (__DEV__) {
      console.log(`WallFurnitureLoader: Applied color scheme "${colorScheme.name}" to wall furniture`);
    }
  }

  // Apply painterly state
  applyPainterlyState(mesh, baseRenderOrder);

  // Set up persistent painterly updates
  mesh.onBeforeRender = () => {
    applyPainterlyState(mesh, mesh.userData.basePainterlyOrder);
  };

  // Sync mesh position with skeleton
  mesh.position.set(skeleton.x, skeleton.y, 0);
  mesh.refreshMeshes();


  return {
    skeleton,
    state,
    mesh,
    config: furnitureConfig,
    definition: furnitureDef,
    variant
  };
}

/**
 * Set up wall furniture variant (set appropriate slot attachments)
 */
function setupWallFurnitureVariant(
  skeleton: import('@esotericsoftware/spine-core').Skeleton,
  state: import('@esotericsoftware/spine-core').AnimationState,
  config: WallFurnitureConfig,
  variant: any,
  wallAnchor: WallAnchor
): void {
  // Set up slot attachments based on variant configuration
  const slots = variant.slots;

  // First, clear ALL slots to remove any default attachments
  const allSlotNames = ['Wall', 'WallFurn1', 'WallFurnFront', 'Art'];
  allSlotNames.forEach(slotName => {
    const slot = skeleton.findSlot(slotName);
    if (slot) {
      slot.setAttachment(null); // Clear any default attachment
    }
  });

  // Set background furniture slot if specified
  if (slots.wallFurn1) {
    const wallFurn1Slot = skeleton.findSlot('WallFurn1');
    if (wallFurn1Slot) {
      setSlotAttachment(skeleton, wallFurn1Slot, slots.wallFurn1);
    }
  }

  // Set foreground furniture slot if specified
  if (slots.wallFurnFront) {
    const wallFurnFrontSlot = skeleton.findSlot('WallFurnFront');
    if (wallFurnFrontSlot) {
      setSlotAttachment(skeleton, wallFurnFrontSlot, slots.wallFurnFront);
    }
  }

  // Set art slot if specified
  if (slots.art) {
    const artSlot = skeleton.findSlot('Art');
    if (artSlot) {
      setSlotAttachment(skeleton, artSlot, slots.art);
    }
  }

  // Apply FlipX animation if wall needs flipping
  if (wallAnchor.needsFlip) {
    try {
      const flipXAnim = skeleton.data.findAnimation('FlipX');
      if (flipXAnim) {
        // Clear any existing animations on track 1 first
        state.clearTrack(1);

        // Apply FlipX animation and immediately set to end state
        const entry = state.setAnimation(1, 'FlipX', false); // Don't loop
        if (entry) {
          entry.trackTime = flipXAnim.duration; // Jump to end of animation
          entry.timeScale = 0; // Freeze at the flipped state
        }

        // Force immediate application
        state.apply(skeleton);

      }
    } catch (error) {
      // Silently handle FlipX animation errors
    }
  }
}

/**
 * Set slot attachment by name
 */
function setSlotAttachment(
  skeleton: import('@esotericsoftware/spine-core').Skeleton,
  slot: any,
  attachmentName: string
): void {
  const skin = skeleton.data.defaultSkin || skeleton.data.skins[0];
  if (!skin) {
    return;
  }

  const attachments = (skin as any).attachments;
  if (!attachments || !attachments[slot.data.index]) {
    return;
  }

  const slotAttachments = attachments[slot.data.index];
  const attachment = slotAttachments[attachmentName];

  if (attachment) {
    slot.setAttachment(attachment);
  }
}

/**
 * Position wall furniture at the wall anchor
 */
function positionWallFurniture(
  skeleton: import('@esotericsoftware/spine-core').Skeleton,
  wallAnchor: WallAnchor,
  furnitureDef: any
): void {
  // Position at the wall anchor point with offsets
  // The WallFurnAndArt skeleton is designed with root at wall base/center

  // Estimate wall dimensions for offset calculations
  const wallWidth = 200; // Approximate wall segment width
  const wallHeight = 600; // Approximate wall segment height
  const tileWidth = 200; // Approximate tile width for precise offsets

  // Base offsets
  let offsetX = wallWidth * 0.5; // Start with half wall width right
  let offsetY = -wallHeight / 24; // Start with quarter of 1/6 down

  // Apply item-specific adjustments based on furniture type
  if (furnitureDef.id === 'bookshelf') {
    // Bookshelf: move right by 1/6 tile, up by 1/6 tile, then down by 1/8 panel
    offsetX += tileWidth / 6; // Additional right offset
    offsetY += wallHeight / 6; // Move up (positive Y)
    offsetY -= wallHeight / 8; // Then move down by 1/8 panel
  } else if (furnitureDef.id === 'wallArt') {
    // Wall art (like MapPoster): move down by 1/6 tile, left by 1/8 panel
    offsetY -= wallHeight / 6; // Move down (negative Y)
    offsetX -= wallWidth / 8; // Move left by 1/8 panel
  }

  skeleton.x = wallAnchor.spineX + offsetX;
  skeleton.y = wallAnchor.spineY + offsetY;

  // Apply scale if needed
  const furnitureScale = 1.0; // Keep original scale for wall furniture
  skeleton.scaleX = furnitureScale;
  skeleton.scaleY = furnitureScale;

  // Update world transform
  const PHYSICS: any = Physics as any;
  skeleton.updateWorldTransform(PHYSICS.update);

}

/**
 * Calculate render order for wall furniture
 */
function calculateWallFurnitureRenderOrder(
  config: WallFurnitureConfig,
  wallAnchor: WallAnchor
): number {
  // Wall furniture should render between room (0) and regular furniture (1500+)
  const layerBases = {
    background: 800,   // Behind most things but above room
    foreground: 1200,  // In front of background furniture but behind regular furniture
  };

  const baseOrder = layerBases[config.layer] || layerBases.foreground;

  // Add small offset based on wall position for depth sorting
  return baseOrder + wallAnchor.wallNumber;
}

/**
 * Apply color recoloring to wall furniture mesh using materialOverride like character system
 */
function applyColorRecoloringToMesh(mesh: any, colors: import('../../../spine/MaskRecolor').MaskRecolorColors): void {
  try {
    // Create material override function like the character system
    mesh.materialOverride = (slot: any, baseTex: THREE.Texture) => {
      const slotName = slot?.data?.name ?? "";
      const attachment = slot.getAttachment?.();
      const attachmentName = attachment && (attachment as any).name ? String((attachment as any).name) : "";


      // Only apply recoloring to shader attachments in WallFurn1 slot
      if (slotName === 'WallFurn1' && attachmentName.endsWith('_Shader')) {
        const mainColor = new THREE.Color(colors.r as any);

        // Use hue-indexed recoloring like the character system
        const recolorMaterial = makeHueIndexedRecolorMaterial(baseTex, {
          colors: {
            red: mainColor,
            green: mainColor.clone().multiplyScalar(0.6), // Darker for shadows
          },
          alphaTest: 0.0015,
          strength: 1.0,
          shadeMode: true,
        });


        return recolorMaterial;
      }

      // Return null to use default material for other slots
      return null;
    };

    // Refresh meshes to apply the override
    mesh.refreshMeshes();

  } catch (error) {
    // Silently handle recoloring errors
  }
}

/**
 * Clean up wall furniture instances
 */
export function disposeWallFurniture(wallFurniture: LoadedWallFurniture): void {
  try {
    if (wallFurniture.mesh && typeof wallFurniture.mesh.dispose === 'function') {
      wallFurniture.mesh.dispose();
    }
  } catch (error) {
    // Silently handle disposal errors
  }
}