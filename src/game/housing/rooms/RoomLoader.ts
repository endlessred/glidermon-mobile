import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { Physics } from '@esotericsoftware/spine-core';
import { loadSpineFromExpoAssets } from '../../../spine/loaders';
import { AnchorMap, Anchor, boneNameToTileId } from '../anchors';
import { placeX, placeY } from '../isoPlacement';

export type LoadedRoom = {
  skeleton: import('@esotericsoftware/spine-core').Skeleton;
  mesh: any; // your SkeletonMesh type
  anchors: AnchorMap;
};

// Load a room skeleton (no physics needed; static)
export async function loadRoomSkeleton(): Promise<LoadedRoom> {
  if (__DEV__) {
    console.log('RoomLoader: Starting to load room skeleton');
  }

  const atlasModule = require('../../../assets/Apartment/skeleton.atlas');
  const jsonModule = require('../../../assets/Apartment/skeleton.json');
  const textureModule1 = require('../../../assets/Apartment/skeleton.png');
  const textureModule2 = require('../../../assets/Apartment/skeleton_2.png');

  if (__DEV__) {
    console.log('RoomLoader: Asset modules loaded', {
      hasAtlas: !!atlasModule,
      hasJson: !!jsonModule,
      hasTexture1: !!textureModule1,
      hasTexture2: !!textureModule2,
    });
  }

  let skeleton, state, resolveTexture;
  try {
    const result = await loadSpineFromExpoAssets({
      atlasModule,
      jsonModule,
      textureModules: [textureModule1, textureModule2],
      defaultMix: 0, // room is static
    });
    skeleton = result.skeleton;
    state = result.state;
    resolveTexture = result.resolveTexture;
  } catch (error) {
    console.error('RoomLoader: Failed to load spine assets', error);
    throw error;
  }

  if (__DEV__) {
    console.log('RoomLoader: Spine assets loaded', {
      skeletonBones: skeleton.bones?.length ?? 0,
      skeletonSlots: skeleton.slots?.length ?? 0,
    });
  }

  // ensure setup pose (so all bones are at authored transforms)
  skeleton.setToSetupPose();

  // Make sure all slots have their setup attachments
  for (let i = 0; i < skeleton.slots.length; i++) {
    const slot = skeleton.slots[i];
    slot.setToSetupPose();
  }

  // Use proper Spine physics for the room skeleton
  skeleton.updateWorldTransform(Physics.update);

  // Build mesh (so you can show the walls / back layer if you kept them in)
  const { SkeletonMesh } = require('../../../spine/SpineThree');
  const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
  mesh.frustumCulled = false;

  // Force refresh meshes to ensure textures are applied
  mesh.refreshMeshes();

  if (__DEV__) {
    console.log('RoomLoader: SkeletonMesh created', {
      meshChildren: mesh.children?.length ?? 0,
      meshVisible: mesh.visible,
      hasResolveTexture: !!resolveTexture,
    });

    // Check if mesh has materials and attachments
    console.log('RoomLoader: Skeleton slots with attachments:');
    for (let i = 0; i < skeleton.slots.length; i++) {
      const slot = skeleton.slots[i];
      const attachment = slot.getAttachment();
      if (attachment) {
        console.log(`  Slot ${slot.data.name}: ${attachment.name || 'unnamed'}`);
      }
    }

    mesh.traverse((child: any) => {
      if (child.isMesh && child.material) {
        console.log('RoomLoader: Found mesh child', {
          name: child.name,
          visible: child.visible,
          materialType: child.material.type,
          hasMap: !!(child.material.map),
          hasGeometry: !!(child.geometry),
          vertexCount: child.geometry?.attributes?.position?.count ?? 0,
        });
      }
    });
  }

  // Scan tile bones
  const anchors: AnchorMap = new Map();
  const bones = skeleton.bones ?? [];
  for (const b of bones) {
    const id = boneNameToTileId((b as any)?.data?.name || (b as any)?.name || '');
    if (!id) continue;

    const ax = b.worldX;
    const ay = b.worldY;

    // Validate bone world coordinates
    if (!Number.isFinite(ax) || !Number.isFinite(ay)) {
      if (__DEV__) {
        console.warn(`RoomLoader: Invalid bone coordinates for ${id}:`, { ax, ay });
      }
      continue;
    }

    const sx = placeX(ax);
    const sy = placeY(ay);

    // Validate scene coordinates
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) {
      if (__DEV__) {
        console.warn(`RoomLoader: Invalid scene coordinates for ${id}:`, { sx, sy });
      }
      continue;
    }

    anchors.set(id, { id, spineX: ax, spineY: ay, sceneX: sx, sceneY: sy });
  }

  if (__DEV__) {
    console.log('RoomLoader: Room loading complete', {
      anchorsFound: anchors.size,
      sampleAnchors: Array.from(anchors.entries()).slice(0, 3),
      meshChildren: mesh.children?.length ?? 0,
    });
  }

  return { skeleton, mesh, anchors };
}