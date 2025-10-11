import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { Physics } from '@esotericsoftware/spine-core';   // ← named import (match controller)
import { loadSpineFromExpoAssets } from '../../../spine/loaders';
import { AnchorMap, boneNameToTileId } from '../anchors';
import { placeX, placeY } from '../isoPlacement';
import { RoomLayoutConfig } from '../types/RoomConfig';

export type LoadedRoom = {
  skeleton: import('@esotericsoftware/spine-core').Skeleton;
  state: import('@esotericsoftware/spine-core').AnimationState;
  mesh: any;
  anchors: AnchorMap;
};

export async function loadRoomSkeleton(): Promise<LoadedRoom> {
  const atlasModule = require('../../../assets/Room/Room.atlas');
  const jsonModule = require('../../../assets/Room/Room.json');
  const textureModule1  = require('../../../assets/Room/Room.png');
  const textureModule2  = require('../../../assets/Room/Room_2.png');
  const textureModule3  = require('../../../assets/Room/Room_3.png');
  const textureModule4  = require('../../../assets/Room/Room_4.png');
  const textureModule5  = require('../../../assets/Room/Room_5.png');
  const textureModule6  = require('../../../assets/Room/Room_6.png');
  const textureModule7  = require('../../../assets/Room/Room_7.png');
  const textureModule8  = require('../../../assets/Room/Room_8.png');
  const textureModule9  = require('../../../assets/Room/Room_9.png');
  const textureModule10 = require('../../../assets/Room/Room_10.png');
  const textureModule11 = require('../../../assets/Room/Room_11.png');
  const textureModule12 = require('../../../assets/Room/Room_12.png');

  const result = await loadSpineFromExpoAssets({
    atlasModule,
    jsonModule,
    textureModules: [
      textureModule1, textureModule2, textureModule3, textureModule4,
      textureModule5, textureModule6, textureModule7, textureModule8,
      textureModule9, textureModule10, textureModule11, textureModule12
    ],
    defaultMix: 0,
  });

  const skeleton = result.skeleton;
  const state    = result.state;
  const resolveTexture = result.resolveTexture;

  // Setup pose
  skeleton.setToSetupPose();
  for (let i = 0; i < skeleton.slots.length; i++) {
    skeleton.slots[i].setToSetupPose();
  }

  // Set up layered wind animations on multiple tracks
  try {
    // Track 0: LeafWind animation
    const leafWindAnim = skeleton.data.findAnimation('LeafWind');
    if (leafWindAnim) {
      const leafEntry = state.setAnimation(0, 'LeafWind', true);
      // Slightly randomize timing for natural wind variation
      leafEntry.trackTime = Math.random() * leafWindAnim.duration;
      if (__DEV__ && false) {
        console.log('RoomLoader: Set LeafWind animation on track 0', {
          duration: leafWindAnim.duration,
          startTime: leafEntry.trackTime,
          loop: leafEntry.loop
        });
      }
    }

    // Track 1: TreeTopWind animation
    const treeTopWindAnim = skeleton.data.findAnimation('TreeTopWind');
    if (treeTopWindAnim) {
      const treeEntry = state.setAnimation(1, 'TreeTopWind', true);
      // Offset timing for more natural layered wind effect
      treeEntry.trackTime = Math.random() * treeTopWindAnim.duration;
      if (__DEV__ && false) {
        console.log('RoomLoader: Set TreeTopWind animation on track 1', {
          duration: treeTopWindAnim.duration,
          startTime: treeEntry.trackTime,
          loop: treeEntry.loop
        });
      }
    }

    // Track 2: VinesWind animation
    const vinesWindAnim = skeleton.data.findAnimation('VinesWind');
    if (vinesWindAnim) {
      const vinesEntry = state.setAnimation(2, 'VinesWind', true);
      // Different starting point for vine movement
      vinesEntry.trackTime = Math.random() * vinesWindAnim.duration;
      if (__DEV__ && false) {
        console.log('RoomLoader: Set VinesWind animation on track 2', {
          duration: vinesWindAnim.duration,
          startTime: vinesEntry.trackTime,
          loop: vinesEntry.loop
        });
      }
    }

    if (__DEV__ && false) {
      console.log('RoomLoader: All wind animations set up successfully on layered tracks');

      // Debug: log some skeleton structure info
      // console.log('RoomLoader: Skeleton has', skeleton.bones.length, 'bones and', skeleton.slots.length, 'slots');

      // Log first few bones to see what's available
      const boneNames = skeleton.bones.slice(0, 10).map(b => b.data.name);
      // console.log('RoomLoader: First 10 bones:', boneNames);

      // Log animation info
      const animNames = skeleton.data.animations.map(a => a.name);
      // console.log('RoomLoader: Available animations:', animNames);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('RoomLoader: Failed to set wind animations:', error);
    }
  }

  // ✅ Match controller: pass the Physics OBJECT (not .update) to satisfy TS/runtime
  const PHYSICS: any = Physics as any;
  // Physics.update is a constant, not a function - skip the pre-tick since it's not needed
  skeleton.updateWorldTransform(PHYSICS.update);

  // Build mesh
  const { SkeletonMesh } = require('../../../spine/SpineThree');
  const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
  mesh.frustumCulled = false;
  mesh.refreshMeshes();

  // Anchors from bones
  const anchors: AnchorMap = new Map();
  for (const b of skeleton.bones ?? []) {
    const id = boneNameToTileId((b as any)?.data?.name || (b as any)?.name || '');
    if (!id) continue;
    const ax = b.worldX, ay = b.worldY;
    if (!Number.isFinite(ax) || !Number.isFinite(ay)) continue;
    const sx = placeX(ax), sy = placeY(ay);
    if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
    anchors.set(id, { id, spineX: ax, spineY: ay, sceneX: sx, sceneY: sy });
  }

  return { skeleton, state, mesh, anchors };
}

export function loadRoomConfig(roomName: string): RoomLayoutConfig {
  try {
    switch (roomName) {
      case 'cozy4x4':
        return require('./cozy4x4.json');
      case 'basic3x3':
        return require('./basic3x3.json');
      default:
        console.warn(`Unknown room config: ${roomName}, falling back to cozy4x4`);
        return require('./cozy4x4.json');
    }
  } catch (error) {
    console.error(`Failed to load room config ${roomName}:`, error);
    // Fallback to hardcoded config
    return {
      name: 'Fallback 4x4 Room',
      dimensions: { width: 4, height: 4 },
      defaultFloor: { set: 'YellowCarpet', variant: 'Sides2' },
      defaultWall: { set: 'Brown1WoodPaneling', variant: 'Sides1' },
      floors: [
        { tileId: 'B2', floor: { set: 'RedCarpet', variant: 'Sides2' } },
        { tileId: 'C2', floor: { set: 'RedCarpet', variant: 'Sides2' } },
        { tileId: 'B3', floor: { set: 'RedCarpet', variant: 'Sides2' } },
        { tileId: 'C3', floor: { set: 'RedCarpet', variant: 'Sides2' } },
      ],
      walls: [],
      furniture: []
    };
  }
}
