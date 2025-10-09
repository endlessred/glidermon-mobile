import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
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


const ROOM_NODE_NAME = 'APARTMENT_ROOM';
const CHARACTER_RENDER_ORDER_BASE = 2000;
const DEFAULT_CHARACTER_SCALE = 1; // scale multiplier (1 == fits default tile height)
const FLOOR_ROWS = 8;
const FLOOR_COLS = 8;
const CHARACTER_DESIRED_TILE_HEIGHT = 1.5; // how many tile heights tall the character should be
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

type ApartmentBuild = {
  room: LoadedRoom;
  roomScale: number;
  getAnchor: (id: string) => Anchor | null;
};




async function buildApartmentScene(
  scene: THREE.Scene,
  w: number,
  h: number
): Promise<ApartmentBuild> {
  if (__DEV__) {
    console.log('buildApartmentScene: Starting', { w, h });
  }

  const old = scene.getObjectByName(ROOM_NODE_NAME);
  if (old) scene.remove(old);

  // Load room skeleton
  const room = await loadRoomSkeleton();
  room.mesh.name = ROOM_NODE_NAME;
  scene.add(room.mesh);

  // Compute room scale to fit - use reasonable scale
  const roomW = 3292.51; // from skeleton.json width
  const roomH = 2584.54; // from skeleton.json height
  const roomScale = Math.min((w * 0.6) / roomW, (h * 0.6) / roomH, 0.8); // Better scale for apartment
  room.mesh.scale.set(roomScale, roomScale, 1);

  // Center the room mesh (the skeleton origin might be offset)
  const roomCenterX = -1667.59 + (roomW / 2); // skeleton x + half width
  const roomCenterY = -182.05 + (roomH / 2);  // skeleton y + half height
  room.mesh.position.set(-roomCenterX * roomScale, -roomCenterY * roomScale, 0);

  if (__DEV__) {
    // Check room mesh bounds and position
    room.mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(room.mesh);
    console.log('buildApartmentScene: Room loaded', {
      roomScale,
      roomW,
      roomH,
      canvasW: w,
      canvasH: h,
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

  return { room, roomScale, getAnchor };
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
  const missingLogRef = useRef(false);
  const frameLogRef = useRef(false);
  const invalidTransformLogRef = useRef(false);
  const lastLoggedTileRef = useRef<{ x: number; y: number; gridColumn?: number | null; gridRow?: number | null } | null>(null);

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

  const scaleRef = useRef(characterScale);
  useEffect(() => {
    scaleRef.current = characterScale;
  }, [characterScale]);

  const animationRef = useRef(animation);
  useEffect(() => {
    animationRef.current = animation;
    if (spineRef.current) {
      spineRef.current.setAnimation(animation, true);
    }
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

      // Convert grid coordinates directly to tile ID using skeleton bone naming
      let tileId: string;
      if (gridColumn != null && gridRow != null) {
        // Grid coordinates: gridRow 0-7 maps to rows A-H, gridColumn 0-7 maps to columns 1-8
        const tileRow = String.fromCharCode(65 + gridRow); // A, B, C, etc.
        const tileCol = gridColumn + 1; // 1, 2, 3, etc.
        tileId = `${tileRow}${tileCol}`;

        // Revert to original F2 target
        console.log('Using original tileId:', tileId);
      } else {
        // Fallback to old conversion for characterX/characterY props
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

        // Debug: Show detailed anchor coordinate information
        const getAnchorFn = getAnchorRef.current;
        if (getAnchorFn) {
          console.log('Target anchor F2:', getAnchorFn('F2'));
          console.log('All tile anchors A1-H8:', {
            'Row F': {
              F1: getAnchorFn('F1'),
              F2: getAnchorFn('F2'),
              F3: getAnchorFn('F3'),
              F4: getAnchorFn('F4')
            },
            'Column 2': {
              E2: getAnchorFn('E2'),
              F2: getAnchorFn('F2'),
              G2: getAnchorFn('G2'),
              H2: getAnchorFn('H2')
            },
            'Problem Area G3-G4': {
              G3: getAnchorFn('G3'),
              G4: getAnchorFn('G4')
            }
          });
        }
      }

      const anchor = getAnchor(tileId);
      if (!anchor) {
        if (__DEV__) {
          console.warn('Housing no anchor found for tile', {
            tileId, gridColumn, gridRow,
            availableAnchors: getAnchorRef.current ? 'function available' : 'no function'
          });
        }
        // Try fallback position at center
        const sk = controller.skeleton;
        sk.x = 0;
        sk.y = 0;
        sk.scaleX = 0.5;
        sk.scaleY = 0.5;
        sk.updateWorldTransform({ update(){}, reset(){}, pose(){} } as any);
        controller.mesh.refreshMeshes();
        return;
      }

      if (__DEV__) {
        const last = lastLoggedTileRef.current;
        const gridDebug = gridColumn != null && gridRow != null ? { column: gridColumn, row: gridRow } : undefined;
        const hasGridChanged = gridDebug
          ? !last || last.gridColumn !== gridDebug.column || last.gridRow !== gridDebug.row
          : false;

        // For direct grid mode, use grid coordinates; for fallback, use iso coordinates
        const currentCoords = gridColumn != null && gridRow != null
          ? { x: gridColumn, y: gridRow }
          : characterPosRef.current;

        if (!last || last.x !== currentCoords.x || last.y !== currentCoords.y || hasGridChanged) {
          console.log('Housing target anchor', { coords: currentCoords, tileId, anchor, grid: gridDebug });
          lastLoggedTileRef.current = {
            x: currentCoords.x,
            y: currentCoords.y,
            gridColumn: gridDebug?.column ?? null,
            gridRow: gridDebug?.row ?? null,
          };
        }
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

      if (__DEV__) {
        console.log('Raw feet position from controller:', feet);
      }

      if (!Number.isFinite(appliedLocalScale)) {
        if (__DEV__ && !invalidTransformLogRef.current) {
          console.warn('Housing character scale invalid', {
            nativeHeight,
            desiredTileHeight,
            desiredWorldHeight,
            desiredWorldScale,
            roomScale,
            appliedLocalScale,
          });
          invalidTransformLogRef.current = true;
        }
        return;
      }

      // Position character using the Character bone (feet position)
      const sk = controller.skeleton;

      // Validate all values before applying
      if (!Number.isFinite(anchor.spineX) || !Number.isFinite(anchor.spineY) ||
          !Number.isFinite(feet.x) || !Number.isFinite(feet.y) ||
          !Number.isFinite(appliedLocalScale) || appliedLocalScale <= 0) {
        if (__DEV__) {
          console.error('Housing: Invalid values detected', {
            anchor: anchor,
            feet: feet,
            appliedLocalScale: appliedLocalScale
          });
        }
        return;
      }

      // Make character much smaller
      const finalScale = appliedLocalScale * 0.4; // Reduce character size
      sk.scaleX = finalScale;
      sk.scaleY = finalScale;

      // The anchor coordinates are already in the room skeleton's local space
      // Since character is a child of room mesh, we can use anchor.spineX/Y directly
      const roomMesh = roomRef.current;
      if (!roomMesh) {
        if (__DEV__) {
          console.error('Housing: Room mesh not available');
        }
        return;
      }

      // Position character at anchor, adjusted by feet offset
      // Add offset to center character on tile instead of at bottom vertex
      // Scale the offset based on room scale to maintain proper proportions
      const baseTileCenterOffsetX = 0; // Adjust this value to center horizontally
      const baseTileCenterOffsetY = 500; // Move up from bottom vertex to tile center (increased for visibility)

      const scaledOffsetX = baseTileCenterOffsetX * roomScale;
      const scaledOffsetY = baseTileCenterOffsetY * roomScale;

      const calculatedX = anchor.spineX - feet.x * finalScale + scaledOffsetX;
      const calculatedY = anchor.spineY - feet.y * finalScale + scaledOffsetY;

      sk.x = calculatedX;
      sk.y = calculatedY;

      if (__DEV__) {
        console.log('Character positioning calculation:', {
          tileId,
          anchor: { id: anchor.id, spineX: anchor.spineX, spineY: anchor.spineY },
          feet: { x: feet.x, y: feet.y },
          finalScale,
          feetOffset: { x: feet.x * finalScale, y: feet.y * finalScale },
          calculation: {
            x: `${anchor.spineX} - ${feet.x * finalScale} + ${scaledOffsetX} = ${calculatedX}`,
            y: `${anchor.spineY} - ${feet.y * finalScale} + ${scaledOffsetY} = ${calculatedY}`
          },
          tileOffset: { baseX: baseTileCenterOffsetX, baseY: baseTileCenterOffsetY, scaledX: scaledOffsetX, scaledY: scaledOffsetY },
          result: { x: calculatedX, y: calculatedY }
        });
      }

      // Validate final position before applying
      if (!Number.isFinite(sk.x) || !Number.isFinite(sk.y)) {
        if (__DEV__ && !invalidTransformLogRef.current) {
          console.warn('Housing character position invalid', {
            anchor,
            feet,
            appliedLocalScale,
            skX: sk.x,
            skY: sk.y,
          });
          invalidTransformLogRef.current = true;
        }
        return;
      }

      // Update skeleton and refresh meshes
      try {
        sk.updateWorldTransform({ update(){}, reset(){}, pose(){} } as any);
        controller.mesh.refreshMeshes();
      } catch (error) {
        if (__DEV__) {
          console.error('Housing: Error updating skeleton transform', error);
        }
        return;
      }

      const mesh = controller.mesh;

      if (invalidTransformLogRef.current) {
        invalidTransformLogRef.current = false;
      }

      const sortFeetY = anchor.sceneY;
      const roomChildren = room.children;
      const maxRoomOrder = roomChildren.reduce((max, child) => {
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
          const materials = Array.isArray(object3D.material)
            ? object3D.material
            : [object3D.material];
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

      if (__DEV__ && !frameLogRef.current) {
        // Check if Character bone exists and its position
        const characterBone = controller.characterBone;
        console.log('Housing character placement', {
          anchor,
          tileId,
          roomScale,
          appliedLocalScale,
          finalScale,
          skeletonX: sk.x,
          skeletonY: sk.y,
          feet: feet,
          renderOrder: mesh.renderOrder,
          anchorSpineX: anchor.spineX,
          anchorSpineY: anchor.spineY,
          directSpineCoords: true
        });
        frameLogRef.current = true;
      }

      if (__DEV__) {
        // console.log('Housing character renderOrder', {
        //   meshOrder,
        //   desiredOrder,
        //   maxRoomOrder,
        //   sortFeetY,
        // });
      }
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

      // Zoom out the camera to show more of the apartment
      const zoomFactor = 4; // Zoom out by this factor
      const camera = new THREE.OrthographicCamera(
        (-w / 2) * zoomFactor,
        (w / 2) * zoomFactor,
        (h / 2) * zoomFactor,
        (-h / 2) * zoomFactor,
        0.1,
        2000
      );
      // Move camera up to show the full apartment
      camera.position.set(0, 1400, 10); // Move camera up by 100 units
      camera.lookAt(0, 1400, 0); // Look at a point higher up as well
      camera.updateProjectionMatrix();

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
    </View>
  );
}

















































