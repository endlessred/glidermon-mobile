import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import * as THREE from 'three';
import { Physics } from '@esotericsoftware/spine-core';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import {
  DEFAULT_HOUSING_ROOM_ID,
  HousingRoomId,
} from '../../game/housing/assets/textureAtlas';
import { TILE_H, zFromFeetScreenY } from '../../game/housing/coords';
import { loadRoomSkeleton, LoadedRoom } from '../../game/housing/rooms/RoomLoader';
import { AnchorMap, Anchor, renderOrderFromFeetY } from '../../game/housing/anchors';
import {
  createSpineCharacterController,
  SpineCharacterController,
} from '../../spine/createSpineCharacterController';
import { useCosmeticsStore } from '../../data/stores/cosmeticsStore';
import { OutfitSlot } from '../../data/types/outfitTypes';
import {
  RoomBuilder,
  useRoomBuilder,
  createCustomRoom,
  RoomLayoutConfig
} from '../../game/housing';

interface RoomBuilderHousingViewProps {
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

const ROOM_NODE_NAME = 'ROOM_FOUR_BY_FOUR';
const CHARACTER_RENDER_ORDER_BASE = 2000;
const DEFAULT_CHARACTER_SCALE = 1;
const FLOOR_ROWS = 4; // 4x4 room
const FLOOR_COLS = 4; // 4x4 room
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
    if (Number.isFinite(height) && height > 0) {
      return height;
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to compute character height', error);
    }
  }
  return null;
}

type IsoFeetToSceneFn = (x: number, y: number) => { x: number; y: number; feetY: number };

type RoomBuild = {
  room: LoadedRoom;
  roomScale: number;
  getAnchor: (id: string) => Anchor | null;
  roomBuilder: RoomBuilder;
};

// Create a cozy 4x4 room configuration
const create4x4CozyRoom = (): RoomLayoutConfig => ({
  name: 'Cozy 4x4 Room',
  dimensions: { width: 4, height: 4 },
  defaultFloor: {
    set: 'YellowCarpet',
    variant: 'Sides2'
  },
  defaultWall: {
    set: 'Brown1WoodPaneling',
    variant: 'Sides1'
  },
  floors: [
    // Add a small decorative pattern in the center
    { tileId: 'B2', floor: { set: 'RedCarpet', variant: 'Sides2' } },
    { tileId: 'C2', floor: { set: 'RedCarpet', variant: 'Sides2' } },
    { tileId: 'B3', floor: { set: 'RedCarpet', variant: 'Sides2' } },
    { tileId: 'C3', floor: { set: 'RedCarpet', variant: 'Sides2' } },
  ],
  walls: [],
  furniture: []
});

async function buildRoomScene(
  scene: THREE.Scene,
  w: number,
  h: number
): Promise<RoomBuild> {
  if (__DEV__) {
    console.log('buildRoomScene: Starting 4x4 room', { w, h });
  }

  const old = scene.getObjectByName(ROOM_NODE_NAME);
  if (old) scene.remove(old);

  // Load room skeleton
  const room = await loadRoomSkeleton();
  room.mesh.name = ROOM_NODE_NAME;
  scene.add(room.mesh);

  // Create room builder and apply 4x4 configuration
  const roomBuilder = new RoomBuilder(room.skeleton);
  const roomConfig = create4x4CozyRoom();
  roomBuilder.applyRoomLayout(roomConfig);

  // Compute room scale to fit - use reasonable scale from Room.json
  const roomW = 4202.88; // from Room.json width
  const roomH = 5628.89; // from Room.json height
  const roomScale = Math.min((w * 0.6) / roomW, (h * 0.6) / roomH, 0.8);
  room.mesh.scale.set(roomScale, roomScale, 1);

  // Center the room mesh (the skeleton origin might be offset)
  const roomCenterX = -2281.42 + (roomW / 2); // Room.json x + half width
  const roomCenterY = -1000.42 + (roomH / 2);  // Room.json y + half height
  room.mesh.position.set(-roomCenterX * roomScale, -roomCenterY * roomScale, 0);

  if (__DEV__) {
    // Check room mesh bounds and position
    room.mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(room.mesh);
    console.log('buildRoomScene: 4x4 Room loaded', {
      roomScale,
      roomW,
      roomH,
      canvasW: w,
      canvasH: h,
      meshVisible: room.mesh.visible,
      anchorsCount: room.anchors.size,
      roomConfig: roomConfig.name,
      meshPosition: { x: room.mesh.position.x, y: room.mesh.position.y, z: room.mesh.position.z },
      meshScale: { x: room.mesh.scale.x, y: room.mesh.scale.y, z: room.mesh.scale.z },
      meshBounds: {
        min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
        max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }
      }
    });
  }

  // Function to read a tile id → anchor in SCENE space (after scale)
  const getAnchor = (id: string): Anchor | null => {
    const a = room.anchors.get(id);
    if (!a) return null;
    // apply same scale as mesh
    return {
      ...a,
      sceneX: a.sceneX * roomScale,
      sceneY: a.sceneY * roomScale,
    };
  };

  if (DEBUG_HIDE_ENVIRONMENT) {
    room.mesh.visible = false;
  }

  // Make sure room is visible and set render order
  room.mesh.visible = true;
  room.mesh.renderOrder = 0;

  // Force room mesh materials to be visible
  room.mesh.traverse((child: THREE.Object3D) => {
    if ((child as any).isMesh && (child as any).material) {
      child.visible = true;
      child.renderOrder = 0;
      // Ensure materials are opaque and visible
      const material = (child as any).material;
      if (material.transparent !== undefined) {
        material.transparent = true;
        material.opacity = 1.0;
      }
      if (material.depthTest !== undefined) {
        material.depthTest = false;
      }
      if (material.depthWrite !== undefined) {
        material.depthWrite = false;
      }
      material.needsUpdate = true;
    }
  });

  return { room, roomScale, getAnchor, roomBuilder };
}

export function RoomBuilderHousingView({
  width = 300,
  height = 250,
  characterX = 7,
  characterY = 1,
  gridColumn = 1, // B3 position (column 1, row 1 in 0-indexed)
  gridRow = 1,    // B3 position
  characterScale = DEFAULT_CHARACTER_SCALE,
  animation = 'idle',
  outfit = null,
  roomId = DEFAULT_HOUSING_ROOM_ID,
}: RoomBuilderHousingViewProps) {
  const [gl, setGl] = useState<any>(null);
  const [roomBuild, setRoomBuild] = useState<RoomBuild | null>(null);
  const [character, setCharacter] = useState<SpineCharacterController | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const frameId = useRef<number | null>(null);

  const cosmeticsEquipped = useCosmeticsStore(s => s.equipped);

  // Character positioning - B3 is column 1 (B), row 1 (3 in 4x4 grid, 0-indexed row 1)
  const { x: isoX, y: isoY } = gridToIso(gridColumn, gridRow);

  const initScene = useCallback(async (gl: any) => {
    if (__DEV__) {
      console.log('RoomBuilderHousingView: Initializing scene', { width, height, isoX, isoY });
    }

    try {
      // Create renderer
      const renderer = new Renderer({ gl, antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;

      // Create orthographic camera
      const camera = new THREE.OrthographicCamera(
        -width / 2, width / 2,
        height / 2, -height / 2,
        0.1, 1000
      );
      camera.position.set(0, 0, 10);
      cameraRef.current = camera;

      // Create scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Build room
      const roomBuild = await buildRoomScene(scene, width, height);
      setRoomBuild(roomBuild);

      if (__DEV__) {
        console.log('RoomBuilderHousingView: Room build complete', {
          roomScale: roomBuild.roomScale,
          anchorsCount: roomBuild.room.anchors.size,
          characterPosition: { isoX, isoY }
        });
      }

    } catch (error) {
      console.error('RoomBuilderHousingView: Failed to initialize scene', error);
    }
  }, [width, height, isoX, isoY]);

  const loadCharacter = useCallback(async () => {
    if (!roomBuild || !sceneRef.current) return;

    if (__DEV__) {
      console.log('RoomBuilderHousingView: Loading character at B3', { isoX, isoY });
    }

    try {
      // Get anchor for character position (B3)
      const anchorId = `${String.fromCharCode(65 + isoY)}${isoX + 1}`; // Convert to tile ID (B3)
      const anchor = roomBuild.getAnchor(anchorId);

      if (!anchor) {
        console.warn(`RoomBuilderHousingView: No anchor found for tile ${anchorId}`);
        return;
      }

      if (__DEV__) {
        console.log(`RoomBuilderHousingView: Character anchor ${anchorId}`, {
          sceneX: anchor.sceneX,
          sceneY: anchor.sceneY,
          feetY: anchor.sceneY
        });
      }

      const characterController = await createSpineCharacterController({
        scene: sceneRef.current,
        x: anchor.sceneX,
        y: anchor.sceneY,
        z: zFromFeetScreenY(anchor.sceneY),
        renderOrder: renderOrderFromFeetY(anchor.sceneY) + CHARACTER_RENDER_ORDER_BASE,
        scale: characterScale,
        defaultAnimation: animation,
        outfit: outfit || undefined,
        equipped: cosmeticsEquipped,
      });

      // Compute and apply character scale
      const nativeHeight = computeNativeCharacterHeight(characterController.mesh);
      if (nativeHeight) {
        const targetHeight = TILE_H * CHARACTER_DESIRED_TILE_HEIGHT * roomBuild.roomScale;
        const scaleForHeight = targetHeight / nativeHeight;
        const finalScale = characterScale * scaleForHeight;
        characterController.mesh.scale.set(finalScale, finalScale, finalScale);

        if (__DEV__) {
          console.log('RoomBuilderHousingView: Character scaling', {
            nativeHeight,
            targetHeight,
            scaleForHeight,
            finalScale
          });
        }
      }

      characterController.mesh.frustumCulled = false;
      setCharacter(characterController);

    } catch (error) {
      console.error('RoomBuilderHousingView: Failed to load character', error);
    }
  }, [roomBuild, isoX, isoY, characterScale, animation, outfit, cosmeticsEquipped]);

  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    // Update character animation
    if (character) {
      character.update(0.016); // ~60fps
    }

    // Render scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    frameId.current = requestAnimationFrame(animate);
  }, [character]);

  // Initialize scene when GL context is ready
  useEffect(() => {
    if (gl) {
      initScene(gl);
    }
  }, [gl, initScene]);

  // Load character when room is ready
  useEffect(() => {
    if (roomBuild) {
      loadCharacter();
    }
  }, [roomBuild, loadCharacter]);

  // Start animation loop when character is loaded
  useEffect(() => {
    if (character && rendererRef.current) {
      animate();
    }

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
    };
  }, [character, animate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
      if (character) {
        character.dispose();
      }
    };
  }, [character]);

  return (
    <GLView
      style={{ flex: 1 }}
      onContextCreate={setGl}
    />
  );
}