import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import * as THREE from 'three';
import * as spine from '@esotericsoftware/spine-core';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import {
  DEFAULT_HOUSING_ROOM_ID,
  HousingRoomId,
} from '../assets/textureAtlas';
import { TILE_H, zFromFeetScreenY } from '../coords';
import { loadRoomSkeleton, LoadedRoom } from '../rooms/RoomLoader';
import { AnchorMap, Anchor, renderOrderFromFeetY } from '../anchors';
import {
  createSpineCharacterController,
  SpineCharacterController,
} from '../../../spine/createSpineCharacterController';
import { useCosmeticsStore } from '../../../data/stores/cosmeticsStore';
import { OutfitSlot } from '../../../data/types/outfitTypes';
import { RoomBuilder } from '../builders/RoomBuilder';
import { RoomLayoutConfig } from '../types/RoomConfig';
import { Physics } from '@esotericsoftware/spine-core'; 

interface IsometricHousingThreeJSProps {
  width?: number;
  height?: number;
  characterX?: number;
  characterY?: number;
  gridColumn?: number;
  gridRow?: number;
  characterScale?: number;
  animation?: string;
  outfit?: OutfitSlot | null;
  roomId?: HousingRoomId;
}

const ROOM_NODE_NAME = 'COZY_4X4_ROOM';
const CHARACTER_RENDER_ORDER_BASE = 2000;
const DEFAULT_CHARACTER_SCALE = 1;
const FLOOR_ROWS = 4;
const FLOOR_COLS = 4;
const CHARACTER_DESIRED_TILE_HEIGHT = 1.5;
const DEBUG_HIDE_ENVIRONMENT = false;

const clampTileIndex = (value: number, max: number) => Math.min(Math.max(value, 0), max);

function gridToIso(column: number, row: number) {
  const clampedColumn = clampTileIndex(column, FLOOR_COLS - 1);
  const clampedRow = clampTileIndex(row, FLOOR_ROWS - 1);
  return {
    x: clampedColumn,
    y: (FLOOR_ROWS - 1) - clampedRow,
  };
}

function computeNativeCharacterHeight(mesh: THREE.Object3D): number | null {
  try {
    mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh);
    const height = bounds.max.y - bounds.min.y;
    if (Number.isFinite(height) && height > 0) return height;
  } catch (error) {
    if (__DEV__) console.warn('Failed to compute character height', error);
  }
  return null;
}

type IsoFeetToSceneFn = (x: number, y: number) => { x: number; y: number; feetY: number };

type ApartmentBuild = {
  room: LoadedRoom;
  roomScale: number;
  getAnchor: (id: string) => Anchor | null;
  roomBuilder: RoomBuilder;
};

// Create a cozy 4x4 room configuration for the HUD
const create4x4CozyRoom = (): RoomLayoutConfig => ({
  name: 'Cozy 4x4 Room',
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
});

async function buildApartmentScene(
  scene: THREE.Scene,
  w: number,
  h: number
): Promise<ApartmentBuild> {
  if (__DEV__) console.log('buildApartmentScene: Starting 4x4 cozy room', { w, h });

  const old = scene.getObjectByName(ROOM_NODE_NAME);
  if (old) scene.remove(old);

  // Load room skeleton (+state)
  const room = await loadRoomSkeleton();
  room.mesh.name = ROOM_NODE_NAME;
  scene.add(room.mesh);

  // Create room builder and apply 4x4 configuration
  const roomBuilder = new RoomBuilder(room.skeleton);
  const roomConfig = create4x4CozyRoom();
  roomBuilder.applyRoomLayout(roomConfig);

  // Scale & position room
  const roomW = 4202.88; // from Room.json width
  const roomH = 5628.89; // from Room.json height
  const roomScale = Math.min((w * 0.6) / roomW, (h * 0.6) / roomH, 0.8);
  room.mesh.scale.set(roomScale, roomScale, 1);

  const roomCenterX = -2281.42 + (roomW / 2); // Room.json x + half width
  const roomCenterY = -1000.42 + (roomH / 2);  // Room.json y + half height
  room.mesh.position.set(-roomCenterX * roomScale, -roomCenterY * roomScale, 0);

  if (__DEV__) {
    room.mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(room.mesh);
    console.log('buildApartmentScene: Room loaded', {
      roomScale, roomW, roomH, canvasW: w, canvasH: h,
      meshVisible: room.mesh.visible,
      anchorsCount: room.anchors.size,
      meshPosition: { x: room.mesh.position.x, y: room.mesh.position.y, z: room.mesh.position.z },
      meshScale: { x: room.mesh.scale.x, y: room.mesh.scale.y, z: room.mesh.scale.z },
      meshBounds: {
        min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
        max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }
      }
    });
  }

  const getAnchor = (id: string): Anchor | null => {
    const a = room.anchors.get(id);
    if (!a) return null;
    return { ...a, sceneX: a.sceneX * roomScale, sceneY: a.sceneY * roomScale };
  };

  if (DEBUG_HIDE_ENVIRONMENT) room.mesh.visible = false;

  room.mesh.visible = true;
  room.mesh.renderOrder = 0;

  room.mesh.traverse((child: THREE.Object3D) => {
    const anyChild = child as any;
    if (anyChild.isMesh && anyChild.material) {
      child.visible = true;
      child.renderOrder = 0;
      const material = anyChild.material;
      if (material.transparent !== undefined) material.transparent = true;
      if (material.opacity !== undefined) material.opacity = 1.0;
      if (material.depthTest !== undefined) material.depthTest = false;
      if (material.depthWrite !== undefined) material.depthWrite = false;
      material.needsUpdate = true;
    }
  });

  return { room, roomScale, getAnchor, roomBuilder };
}

export default function IsometricHousingThreeJS({
  width = 300,
  height = 250,
  characterX = 7,
  characterY = 1,
  gridColumn,
  gridRow,
  characterScale = DEFAULT_CHARACTER_SCALE,
  animation = 'idle',
  outfit,
  roomId = DEFAULT_HOUSING_ROOM_ID,
}: IsometricHousingThreeJSProps) {
  const catalog = useCosmeticsStore((state) => state.catalog);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const initializedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const isoFeetToSceneRef = useRef<IsoFeetToSceneFn | null>(null);
  const roomRef = useRef<THREE.Group | null>(null);
  const roomScaleRef = useRef(1);
  const getAnchorRef = useRef<((id: string) => Anchor | null) | null>(null);
  const nativeCharacterHeightRef = useRef<number | null>(null);
  const spineRef = useRef<SpineCharacterController | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const characterPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const missingLogRef = useRef(false);
  const frameLogRef = useRef(false);
  const invalidTransformLogRef = useRef(false);
  const lastLoggedTileRef = useRef<{ x: number; y: number; gridColumn?: number | null; gridRow?: number | null } | null>(null);

  // NEW: keep room skeleton + state so we can tick physics each frame
  const roomSkeletonRef = useRef<spine.Skeleton | null>(null);
  const roomStateRef = useRef<spine.AnimationState | null>(null);

  const resolveIsoPosition = useCallback(() => {
    if (gridColumn != null && gridRow != null) {
      return gridToIso(gridColumn, gridRow);
    }
    return { x: characterX, y: characterY };
  }, [characterX, characterY, gridColumn, gridRow]);

  const characterPosRef = useRef(resolveIsoPosition());
  useEffect(() => {
    characterPosRef.current = resolveIsoPosition();
    lastLoggedTileRef.current = null;
  }, [resolveIsoPosition]);

  const updateCameraForZoom = useCallback((camera: THREE.OrthographicCamera, zoomedIn: boolean, charPos: { x: number; y: number }) => {
    if (zoomedIn) {
      camera.position.set(charPos.x, charPos.y + 200, 10);
      camera.lookAt(charPos.x, charPos.y + 200, 0);
      const aspect = width / height;
      const baseSize = 300;
      camera.left = -baseSize * aspect;
      camera.right = baseSize * aspect;
      camera.top = baseSize;
      camera.bottom = -baseSize;
    } else {
      camera.position.set(0, 1200, 10);
      camera.lookAt(0, 1200, 0);
      const zoomFactor = 12;
      const aspect = width / height;
      const w = width;
      const h = height;
      camera.left = (-w / 2) * zoomFactor;
      camera.right = (w / 2) * zoomFactor;
      camera.top = (h / 2) * zoomFactor;
      camera.bottom = (-h / 2) * zoomFactor;
    }
    camera.updateProjectionMatrix();
  }, [width, height]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (camera) updateCameraForZoom(camera, isZoomedIn, characterPositionRef.current);
  }, [isZoomedIn, updateCameraForZoom]);

  const scaleRef = useRef(characterScale);
  useEffect(() => { scaleRef.current = characterScale; }, [characterScale]);

  const animationRef = useRef(animation);
  useEffect(() => {
    animationRef.current = animation;
    if (spineRef.current) spineRef.current.setAnimation(animation, true);
  }, [animation]);

  const outfitRef = useRef<OutfitSlot | undefined>(outfit ?? undefined);
  useEffect(() => {
    outfitRef.current = outfit ?? undefined;
    if (spineRef.current) {
      spineRef.current.applyOutfit(outfitRef.current);
      nativeCharacterHeightRef.current = computeNativeCharacterHeight(spineRef.current.mesh);
    }
  }, [outfit]);

  useEffect(() => () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    rendererRef.current?.dispose();
  }, []);

  const updateCharacterForFrame = (deltaSeconds: number) => {
    try {
      // FIRST: advance room animation + physics every frame
      const roomSk = roomSkeletonRef.current;
const roomSt = roomStateRef.current;
if (roomSk && roomSt) {
  roomSt.update(deltaSeconds);
roomSt.apply(roomSk);
const PHYSICS: any = Physics as any;       // ← object, not .update
roomSk.updateWorldTransform(PHYSICS);
}

      // THEN: character controller
      const controller = spineRef.current;
      const getAnchor = getAnchorRef.current;
      const room = roomRef.current;
      if (!controller || !getAnchor || !room) {
        if (__DEV__ && !missingLogRef.current) {
          console.log('Housing update missing deps', {
            hasController: !!controller,
            hasGetAnchor: !!getAnchor,
            hasRoom: !!room,
          });
          missingLogRef.current = true;
        }
        return;
      }

      controller.update(deltaSeconds);

      // compute tile id
      let tileId: string;
      if (gridColumn != null && gridRow != null) {
        const tileRow = String.fromCharCode(65 + gridRow);
        const tileCol = gridColumn + 1;
        tileId = `${tileRow}${tileCol}`;
      } else {
        const currentIsoTile = characterPosRef.current;
        const tileRow = String.fromCharCode(65 + currentIsoTile.y);
        const tileCol = currentIsoTile.x + 1;
        tileId = `${tileRow}${tileCol}`;
      }

      if (__DEV__ && !frameLogRef.current) {
        console.log('Housing character position lookup', {
          gridColumn, gridRow, tileId,
          method: gridColumn != null && gridRow != null ? 'direct-grid' : 'iso-conversion'
        });
      }

      const anchor = getAnchor(tileId);
      if (!anchor) {
        if (__DEV__) {
          console.warn('Housing no anchor found for tile', {
            tileId, gridColumn, gridRow,
            availableAnchors: getAnchorRef.current ? 'function available' : 'no function'
          });
        }
        const sk = controller.skeleton;
        sk.x = 0; sk.y = 0;
        sk.scaleX = 0.5; sk.scaleY = 0.5;
        const physicsMaybe: any = (spine as any)?.Physics;     // ← object, not .update
const PHYSICS: any = Physics as any;       // ← object, not .update
sk.updateWorldTransform(PHYSICS);
controller.mesh.refreshMeshes();
        
        return;
      }

      const roomScale = roomScaleRef.current || 1;
      let nativeHeight = nativeCharacterHeightRef.current;
      if ((!nativeHeight || nativeHeight <= 0) && spineRef.current) {
        nativeHeight = computeNativeCharacterHeight(spineRef.current.mesh);
        nativeCharacterHeightRef.current = nativeHeight;
      }
      if (!nativeHeight || nativeHeight <= 0) {
        if (__DEV__ && !invalidTransformLogRef.current) {
          console.warn('Housing character missing native height', { nativeHeight });
          invalidTransformLogRef.current = true;
        }
        return;
      }

      const scaleMultiplier = scaleRef.current > 0 ? scaleRef.current : DEFAULT_CHARACTER_SCALE;
      const desiredTileHeight = CHARACTER_DESIRED_TILE_HEIGHT * scaleMultiplier;
      const desiredWorldHeight = TILE_H * desiredTileHeight;
      const desiredWorldScale = desiredWorldHeight / nativeHeight;
      const appliedLocalScale = desiredWorldScale / roomScale;
      const feet = controller.getFeetLocalPosition();

      if (!Number.isFinite(appliedLocalScale)) {
        if (__DEV__ && !invalidTransformLogRef.current) {
          console.warn('Housing character scale invalid', {
            nativeHeight, desiredTileHeight, desiredWorldHeight, desiredWorldScale,
            roomScale, appliedLocalScale,
          });
          invalidTransformLogRef.current = true;
        }
        return;
      }

      const sk = controller.skeleton;
      const finalScale = appliedLocalScale * 0.4; // smaller character
      sk.scaleX = finalScale;
      sk.scaleY = finalScale;

      const roomMesh = roomRef.current;
      if (!roomMesh) {
        if (__DEV__) console.error('Housing: Room mesh not available');
        return;
      }

      const baseTileCenterOffsetX = 0;
      const baseTileCenterOffsetY = 500;
      const scaledOffsetX = baseTileCenterOffsetX * roomScale;
      const scaledOffsetY = baseTileCenterOffsetY * roomScale;

      const calculatedX = anchor.spineX - feet.x * finalScale + scaledOffsetX;
      const calculatedY = anchor.spineY - feet.y * finalScale + scaledOffsetY;

      sk.x = calculatedX;
      sk.y = calculatedY;

      characterPositionRef.current = { x: calculatedX, y: calculatedY };
      if (isZoomedIn && cameraRef.current) {
        updateCameraForZoom(cameraRef.current, true, { x: calculatedX, y: calculatedY });
      }

      if (!Number.isFinite(sk.x) || !Number.isFinite(sk.y)) {
        if (__DEV__ && !invalidTransformLogRef.current) {
          console.warn('Housing character position invalid', {
            anchor, feet, appliedLocalScale, skX: sk.x, skY: sk.y,
          });
          invalidTransformLogRef.current = true;
        }
        return;
      }

      try {
        const physicsUpdate = (spine as any)?.Physics?.update;
        sk.updateWorldTransform(typeof physicsUpdate === "function" ? physicsUpdate : undefined);
        controller.mesh.refreshMeshes();
      } catch (error) {
        if (__DEV__) console.error('Housing: Error updating skeleton transform', error);
        return;
      }

      const mesh = controller.mesh;
      const sortFeetY = anchor.sceneY;
      const roomChildren = (roomRef.current as any)?.children ?? [];
      const maxRoomOrder = roomChildren.reduce((max: number, child: any) => {
        if (child === mesh) return max;
        const order = child.renderOrder ?? 0;
        return order > max ? order : max;
      }, 0);
      mesh.renderOrder = renderOrderFromFeetY(CHARACTER_RENDER_ORDER_BASE, sortFeetY, 5);

      const baseOrder = mesh.renderOrder;
      mesh.traverse((obj) => {
        if (obj === mesh) return;
        const object3D = obj as THREE.Object3D & { isMesh?: boolean; material?: any };
        const baseSlotOrder = object3D.userData?.baseRenderOrder ?? object3D.renderOrder ?? 0;
        object3D.userData.baseRenderOrder = baseSlotOrder;
        object3D.renderOrder = baseOrder + baseSlotOrder * 0.01;

        if (object3D.isMesh) {
          const materials = Array.isArray(object3D.material) ? object3D.material : [object3D.material];
          materials.forEach((material: THREE.Material | null | undefined) => {
            if (!material) return;
            const m: any = material;
            if (typeof m.depthTest === 'boolean') m.depthTest = false;
            if (typeof m.depthWrite === 'boolean') m.depthWrite = false;
            if (typeof m.transparent === 'boolean') m.transparent = true;
            if (typeof m.needsUpdate === 'boolean') m.needsUpdate = true;
          });
        }
      });

      if (invalidTransformLogRef.current) invalidTransformLogRef.current = false;
    } catch (err) {
      console.error('Housing update error', err);
    }
  };

  const handleContextCreate = async (gl: any) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      gl.viewport(0, 0, w, h);

      const renderer = new Renderer({ gl });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.setViewport(0, 0, w, h);
      renderer.autoClear = true;
      renderer.setClearColor(0x1a1c2c, 1);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1c2c);

      const zoomFactor = 4;
      const camera = new THREE.OrthographicCamera(
        (-w / 2) * zoomFactor,
        (w / 2) * zoomFactor,
        (h / 2) * zoomFactor,
        (-h / 2) * zoomFactor,
        0.1,
        2000
      );
      cameraRef.current = camera;
      updateCameraForZoom(camera, false, { x: 0, y: 0 });

      console.log('Housing: About to build apartment scene');
      let room, roomScale, getAnchor;
      try {
        const result = await buildApartmentScene(scene, w, h);
        room = result.room;
        roomScale = result.roomScale;
        getAnchor = result.getAnchor;
        console.log('Housing room loaded with', room.anchors.size, 'anchors');
      } catch (error) {
        console.error('Housing: Failed to build apartment scene', error);
        throw error;
      }

      roomRef.current = room.mesh;
      roomScaleRef.current = roomScale;
      getAnchorRef.current = getAnchor;

      // NEW: save room skeleton & state for per-frame physics/animation ticking
      roomSkeletonRef.current = room.skeleton;
      roomStateRef.current = room.state;

      const controller = await createSpineCharacterController({
        animation: animationRef.current,
        outfit: outfitRef.current,
        catalog,
      });

      controller.mesh.frustumCulled = false;
      nativeCharacterHeightRef.current = computeNativeCharacterHeight(controller.mesh);
      room.mesh.add(controller.mesh);

      rendererRef.current = renderer;
      spineRef.current = controller;
      lastTimeRef.current = null;

      const render = () => {
        try {
          const now = performance.now();
          const last = lastTimeRef.current ?? now;
          const deltaSeconds = Math.min((now - last) / 1000, 1 / 15);
          lastTimeRef.current = now;

          updateCharacterForFrame(deltaSeconds);

          renderer.render(scene, camera);
          gl.endFrameEXP();
          rafRef.current = requestAnimationFrame(render);
        } catch (err) {
          console.error('Housing render error', err);
        }
      };

      render();
    } catch (error) {
      console.error('Failed to initialize isometric housing:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  return (
    <View style={{ width, height, backgroundColor: 'transparent' }}>
      <GLView style={{ flex: 1 }} onContextCreate={handleContextCreate} />
      {!isLoaded && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(26, 28, 44, 0.4)',
          }}
        />
      )}
      {isLoaded && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
          }}
          onPress={() => setIsZoomedIn(!isZoomedIn)}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            {isZoomedIn ? '🏠 Overview' : '🔍 Zoom In'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
