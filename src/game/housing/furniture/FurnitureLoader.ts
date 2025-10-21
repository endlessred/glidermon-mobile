import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { Physics } from '@esotericsoftware/spine-core';
import { loadSpineFromExpoAssets } from '../../../spine/loaders';
import { RoomFurnitureConfig } from '../types/RoomConfig';
import { FURNITURE_CATALOG, shouldApplyFlipX } from '../types/furnitureCatalog';
import { Anchor } from '../anchors';
import { renderOrderFromFeetY } from '../anchors';
import { applyPainterlyState } from '../painterly/Painterly';

export type LoadedFurniture = {
  skeleton: import('@esotericsoftware/spine-core').Skeleton;
  state: import('@esotericsoftware/spine-core').AnimationState;
  mesh: any;
  config: RoomFurnitureConfig;
  definition: any;
  variant: any;
};

export async function loadFurnitureSkeleton(furnitureId: string): Promise<{
  skeleton: import('@esotericsoftware/spine-core').Skeleton;
  state: import('@esotericsoftware/spine-core').AnimationState;
  resolveTexture: any;
} | null> {
  try {
    // For now, we only support Chair furniture - expand this as more furniture is added
    if (furnitureId === 'chair') {
      const atlasModule = require('../../../assets/Apartment/Chair/Chair.atlas');
      const jsonModule = require('../../../assets/Apartment/Chair/Chair.json');
      const textureModule = require('../../../assets/Apartment/Chair/Chair.png');

      const result = await loadSpineFromExpoAssets({
        atlasModule,
        jsonModule,
        textureModules: [textureModule],
        defaultMix: 0,
      });

      return result;
    }

    if (__DEV__) {
      console.warn(`FurnitureLoader: No skeleton loader implemented for furniture type: ${furnitureId}`);
    }
    return null;
  } catch (error) {
    if (__DEV__) {
      console.error(`FurnitureLoader: Failed to load skeleton for ${furnitureId}:`, error);
    }
    return null;
  }
}

export async function createFurnitureInstance(
  furnitureConfig: RoomFurnitureConfig,
  anchor: Anchor,
  roomScale: number
): Promise<LoadedFurniture | null> {
  const furnitureDef = FURNITURE_CATALOG[furnitureConfig.id];
  if (!furnitureDef) {
    if (__DEV__) {
      console.warn(`FurnitureLoader: Furniture definition not found for ${furnitureConfig.id}`);
    }
    return null;
  }

  // Find the variant
  const variant = furnitureDef.variants.find(v => v.id === furnitureConfig.variantId);
  if (!variant) {
    if (__DEV__) {
      console.warn(`FurnitureLoader: Variant ${furnitureConfig.variantId} not found for furniture ${furnitureConfig.id}`);
    }
    return null;
  }

  // Load the furniture skeleton
  const skeletonResult = await loadFurnitureSkeleton(furnitureConfig.id);
  if (!skeletonResult) {
    return null;
  }

  const { skeleton, state, resolveTexture } = skeletonResult;

  // Set up the skeleton for this specific variant
  setupFurnitureVariant(skeleton, state, furnitureConfig, variant);

  // Set the default animation to make the furniture visible
  try {
    const defaultAnim = skeleton.data.findAnimation('animation');
    if (defaultAnim) {
      state.setAnimation(0, 'animation', true);
      if (__DEV__) {
        console.log('FurnitureLoader: Set default animation for furniture');
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('FurnitureLoader: Failed to set default animation:', error);
    }
  }

  // Apply positioning and rotation
  positionFurniture(skeleton, furnitureConfig, anchor, roomScale, furnitureDef);

  // Store calculated position for debug logging
  const calculatedSkeletonX = skeleton.x;
  const calculatedSkeletonY = skeleton.y;

  // IMPORTANT: Update world transform BEFORE creating mesh
  const PHYSICS: any = Physics as any;
  skeleton.updateWorldTransform(PHYSICS.update);

  // Create the mesh
  const { SkeletonMesh } = require('../../../spine/SpineThree');
  const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
  mesh.frustumCulled = false;

  // Apply layer-based render ordering
  const baseRenderOrder = calculateRenderOrder(furnitureConfig, anchor);
  mesh.userData.basePainterlyOrder = baseRenderOrder;

  // 1) Apply painterly state once now
  applyPainterlyState(mesh, baseRenderOrder);

  // 2) Keep it applied forever (refreshMeshes can rebuild children)
  mesh.onBeforeRender = () => {
    applyPainterlyState(mesh, mesh.userData.basePainterlyOrder);
  };

  // Hybrid approach: Position skeleton correctly, then sync mesh

  // Update world transform to apply the skeleton position
  skeleton.updateWorldTransform(PHYSICS.update);

  // CRITICAL: Explicitly set mesh position to match skeleton position
  mesh.position.set(skeleton.x, skeleton.y, 0);

  // Update mesh to reflect the positioning
  mesh.refreshMeshes();

  if (__DEV__) {
    console.log(`FurnitureLoader: Synced positions`, {
      skeletonPos: { x: skeleton.x, y: skeleton.y },
      meshPos: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }
    });
  }

  if (__DEV__) {
    console.log(`FurnitureLoader: Created furniture instance`, {
      id: furnitureConfig.id,
      variant: furnitureConfig.variantId,
      tileId: furnitureConfig.tileId,
      facing: furnitureConfig.facing,
      renderOrder: baseRenderOrder,
      useFlipX: shouldApplyFlipX(furnitureConfig.id, furnitureConfig.facing),
      skeletonPosition: { x: skeleton.x, y: skeleton.y },
      anchorPosition: { x: anchor.spineX, y: anchor.spineY },
      meshVisible: mesh.visible,
      meshChildren: mesh.children.length,
      meshPosition: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
      skeletonScale: { x: skeleton.scaleX, y: skeleton.scaleY },
      // Debug the positioning calculation
      roomScale: roomScale,
      baseTileOffset: { x: 0, y: 500 },
      scaledOffset: { x: 0 * roomScale, y: 500 * roomScale },
      calculatedSkeletonPos: { x: calculatedSkeletonX, y: calculatedSkeletonY },
      finalSkeletonPos: { x: skeleton.x, y: skeleton.y }
    });

    // Log attachment info
    const chairBaseSlot = skeleton.findSlot('ChairBase');
    if (chairBaseSlot) {
      const attachment = chairBaseSlot.getAttachment();
      console.log(`FurnitureLoader: ChairBase slot attachment:`, {
        hasAttachment: !!attachment,
        attachmentName: attachment?.name || 'none'
      });
    }
  }

  return {
    skeleton,
    state,
    mesh,
    config: furnitureConfig,
    definition: furnitureDef,
    variant
  };
}

function setupFurnitureVariant(
  skeleton: import('@esotericsoftware/spine-core').Skeleton,
  state: import('@esotericsoftware/spine-core').AnimationState,
  config: RoomFurnitureConfig,
  variant: any
): void {
  // Set the appropriate attachment for the variant
  const chairBaseSlot = skeleton.findSlot('ChairBase');
  if (chairBaseSlot && variant.skin) {
    // Find the attachment by skin name
    const skin = skeleton.data.defaultSkin || skeleton.data.skins[0];
    if (skin) {
      const attachments = (skin as any).attachments;
      if (attachments && attachments[chairBaseSlot.data.index]) {
        const slotAttachments = attachments[chairBaseSlot.data.index];
        const attachment = slotAttachments[variant.skin];
        if (attachment) {
          chairBaseSlot.setAttachment(attachment);
          if (__DEV__) {
            console.log(`FurnitureLoader: Set chair variant to ${variant.skin}`);
          }
        } else {
          if (__DEV__) {
            console.warn(`FurnitureLoader: Attachment ${variant.skin} not found for chair`);
          }
        }
      }
    }
  }

  // Apply FlipX animation if needed (on track 1, so it doesn't interfere with default animation on track 0)
  if (shouldApplyFlipX(config.id, config.facing)) {
    try {
      const flipXAnim = skeleton.data.findAnimation('FlipX');
      if (flipXAnim) {
        // Set FlipX animation and freeze it at the end to maintain the flip
        const entry = state.setAnimation(1, 'FlipX', false);
        if (entry) {
          entry.trackTime = flipXAnim.duration; // Jump to end of animation
          entry.timeScale = 0; // Freeze the animation
        }
        if (__DEV__) {
          console.log(`FurnitureLoader: Applied FlipX animation for right-facing chair`);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(`FurnitureLoader: Failed to apply FlipX animation:`, error);
      }
    }
  }
}

function positionFurniture(
  skeleton: import('@esotericsoftware/spine-core').Skeleton,
  config: RoomFurnitureConfig,
  anchor: Anchor,
  roomScale: number,
  furnitureDef: any
): void {
  // Use the EXACT same positioning logic as the character controller

  // Base tile center offsets (same as character)
  const baseTileCenterOffsetX = 0;
  const baseTileCenterOffsetY = 500;
  const scaledOffsetX = baseTileCenterOffsetX * roomScale;
  const scaledOffsetY = baseTileCenterOffsetY * roomScale;

  // Furniture doesn't have "feet" like character, so we assume feet at origin
  const furnitureFeetX = 0;
  const furnitureFeetY = 0;

  // Scale furniture to be appropriate for the room
  const furnitureScale = 1.2; // Make furniture clearly visible for testing
  skeleton.scaleX = furnitureScale;
  skeleton.scaleY = furnitureScale;

  // Use anchor coordinates directly (same approach as character)
  const localX = anchor.spineX;
  const localY = anchor.spineY;

  skeleton.x = localX;
  skeleton.y = localY;

  // Apply any rotation (for future use)
  if (config.rotation && config.rotation !== 0) {
    // Spine rotations are already in degrees
    skeleton.rootBone.rotation = config.rotation;
  }

  // Update world transform
  const PHYSICS: any = Physics as any;
  skeleton.updateWorldTransform(PHYSICS.update);
}

function calculateRenderOrder(config: RoomFurnitureConfig, anchor: Anchor): number {
  // TEMP: Use extremely high renderOrder to test if ordering is the issue
  const layerBases = {
    under: 5000,   // rugs, under character
    mid:   6000,   // beds/sofas, default
    over:  7000,   // tall plants/lamps/overlays
  };

  const base = layerBases[config.layer] ?? layerBases.mid;
  // Use existing helper; the anchor.sceneY is fine
  return renderOrderFromFeetY(base, anchor.sceneY, 5);
}

// Utility function to clean up furniture instances
export function disposeFurniture(furniture: LoadedFurniture): void {
  try {
    if (furniture.mesh && typeof furniture.mesh.dispose === 'function') {
      furniture.mesh.dispose();
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('FurnitureLoader: Error disposing furniture:', error);
    }
  }
}