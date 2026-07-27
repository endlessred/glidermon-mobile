// Plain-quad room renderer (Phase 1 of the housing rewrite). Floor, walls,
// and static furniture are built once as plain Three.js meshes (see
// render/sceneBuilder.ts) instead of a per-frame-refreshed Spine skeleton --
// Glidermon is the only thing in the scene that still animates every frame.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import * as THREE from 'three';
import { Physics } from '@esotericsoftware/spine-core';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { TILE_H, TILE_SKIRT, isoToScreen } from '../coords';
import { renderOrderFromFeetY } from '../anchors';
import { applyPainterlyState } from '../painterly/Painterly';
import { createSpineCharacterController, SpineCharacterController } from '../../../spine/createSpineCharacterController';
import { useCosmeticsStore } from '../../../data/stores/cosmeticsStore';
import { OutfitSlot } from '../../../data/types/outfitTypes';
import { useHousingStore, ROOM_SIZE_TIERS } from '../../../data/stores/housingStore';
import { buildRoomScene } from './../render/sceneBuilder';
import { computeNativeCharacterHeight } from '../render/characterScale';
import { RoomGridConfig } from '../types/RoomConfig';

interface IsometricRoomViewProps {
  width?: number;
  height?: number;
  gridColumn?: number;
  gridRow?: number;
  characterScale?: number;
  animation?: string;
  outfit?: OutfitSlot | null;
}

const DEFAULT_CHARACTER_SCALE = 1;
const CHARACTER_DESIRED_TILE_HEIGHT = 1.5;

export default function IsometricRoomView({
  width = 300,
  height = 250,
  gridColumn = 1,
  gridRow = 0,
  characterScale = DEFAULT_CHARACTER_SCALE,
  animation = 'idle',
  outfit,
}: IsometricRoomViewProps) {
  const catalog = useCosmeticsStore((state) => state.catalog);
  const roomSizeTier = useHousingStore((s) => s.roomSizeTier);
  const activeFloorSet = useHousingStore((s) => s.activeFloorSet);
  const activeWallSet = useHousingStore((s) => s.activeWallSet);
  const furniturePlacements = useHousingStore((s) => s.furniturePlacements);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const initializedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const roomScaleRef = useRef(1);
  const nativeCharacterHeightRef = useRef<number | null>(null);
  const spineRef = useRef<SpineCharacterController | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const characterPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // GL drawing-buffer size (device pixels) -- NOT the same as the width/height
  // props (CSS/logical pixels). Room scale is computed against the buffer
  // size, so the camera frustum must use the same units or the room renders
  // at the wrong size relative to the view.
  const glSizeRef = useRef({ w: width, h: height });

  const scaleRef = useRef(characterScale);
  useEffect(() => {
    scaleRef.current = characterScale;
  }, [characterScale]);

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

  useEffect(
    () => () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      rendererRef.current?.dispose();
    },
    []
  );

  const updateCameraForZoom = useCallback(
    (camera: THREE.OrthographicCamera, zoomedIn: boolean, charPos: { x: number; y: number }) => {
      const { w: glW, h: glH } = glSizeRef.current;
      if (zoomedIn) {
        camera.position.set(charPos.x, charPos.y + 200, 10);
        camera.lookAt(charPos.x, charPos.y + 200, 0);
        const aspect = glW / glH;
        const baseSize = 300;
        camera.left = -baseSize * aspect;
        camera.right = baseSize * aspect;
        camera.top = baseSize;
        camera.bottom = -baseSize;
      } else {
        // Unlike the legacy Spine room (an uncentered, thousands-of-units
        // skeleton), the new room group is explicitly centered at the
        // world origin, so the overview camera looks at (0,0) here.
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        // roomScale (see handleContextCreate) already targets the room
        // filling 60% of the buffer width/height, so the frustum should
        // match the buffer size directly (zoomFactor ~= 1), not the legacy
        // value of 9 -- that was tuned against the old Spine asset's much
        // larger, decoration-inflated bounding box, which doesn't apply here.
        const zoomFactor = 1.05;
        camera.left = (-glW / 2) * zoomFactor;
        camera.right = (glW / 2) * zoomFactor;
        camera.top = (glH / 2) * zoomFactor;
        camera.bottom = (-glH / 2) * zoomFactor;
      }
      camera.updateProjectionMatrix();
    },
    []
  );

  useEffect(() => {
    const camera = cameraRef.current;
    if (camera) updateCameraForZoom(camera, isZoomedIn, characterPositionRef.current);
  }, [isZoomedIn, updateCameraForZoom]);

  const handleContextCreate = async (gl: any) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      glSizeRef.current = { w, h };
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

      const dims = ROOM_SIZE_TIERS[roomSizeTier] ?? ROOM_SIZE_TIERS[0];
      const grid: RoomGridConfig = {
        width: dims.width,
        height: dims.height,
        defaultFloor: { set: activeFloorSet },
        defaultWall: { set: activeWallSet },
      };

      const built = await buildRoomScene({ grid, furniture: furniturePlacements });

      // Center + scale the room group to fit the view, same approach as the
      // legacy renderer (measured bounds instead of hardcoded asset sizes).
      // Force matrixWorld to be current -- bbox would otherwise measure
      // stale (identity) transforms since nothing has rendered yet.
      built.group.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(built.group);
      const center = bbox.getCenter(new THREE.Vector3());
      const roomWorldWidth = Math.max(bbox.max.x - bbox.min.x, 1);
      const roomWorldHeight = Math.max(bbox.max.y - bbox.min.y, 1);
      const roomScale = Math.min((w * 0.6) / roomWorldWidth, (h * 0.6) / roomWorldHeight, 0.8);
      roomScaleRef.current = roomScale;

      built.group.scale.set(roomScale, roomScale, 1);
      built.group.position.set(-center.x * roomScale, -center.y * roomScale, 0);
      scene.add(built.group);

      const controller = await createSpineCharacterController({
        animation: animationRef.current,
        outfit: outfitRef.current,
        catalog,
      });
      controller.mesh.frustumCulled = false;
      nativeCharacterHeightRef.current = computeNativeCharacterHeight(controller.mesh);
      built.group.add(controller.mesh);

      // Character doesn't move during this phase (no walk animation yet), so
      // position/scale are set once here rather than recomputed per frame.
      const nativeHeight = nativeCharacterHeightRef.current;
      if (nativeHeight && nativeHeight > 0) {
        const scaleMultiplier = scaleRef.current > 0 ? scaleRef.current : DEFAULT_CHARACTER_SCALE;
        const desiredWorldHeight = TILE_H * CHARACTER_DESIRED_TILE_HEIGHT * scaleMultiplier;
        const desiredWorldScale = desiredWorldHeight / nativeHeight;
        const finalScale = (desiredWorldScale / roomScale) * 0.4;

        if (Number.isFinite(finalScale)) {
          const sk = controller.skeleton;
          sk.scaleX = finalScale;
          sk.scaleY = finalScale;

          const feet = controller.getFeetLocalPosition();
          const p = isoToScreen(gridColumn, gridRow);
          const posX = p.x - feet.x * finalScale;
          const posY = p.y - feet.y * finalScale;
          sk.x = posX;
          sk.y = posY;
          characterPositionRef.current = { x: posX, y: posY };

          const PHYSICS: any = Physics as any;
          sk.updateWorldTransform(PHYSICS.update);
          controller.mesh.refreshMeshes();
        }
      }

      // Same depth key as floor tiles/furniture (feetY - TILE_SKIRT, sign
      // inverted -- see sceneBuilder.ts / furnitureSprite.ts). Bias is large
      // (not the furniture "+1" nudge) because Glidermon is the focal point
      // and should reliably win against any floor tile he's near, not just
      // the one he's standing on.
      const baseRenderOrder = renderOrderFromFeetY(0, -(characterPositionRef.current.y - TILE_SKIRT), 4000);

      rendererRef.current = renderer;
      spineRef.current = controller;
      lastTimeRef.current = null;

      const render = () => {
        try {
          const now = performance.now();
          const last = lastTimeRef.current ?? now;
          const deltaSeconds = Math.min((now - last) / 1000, 1 / 15);
          lastTimeRef.current = now;

          // Only the character skeleton updates/refreshes per frame now --
          // floor, walls, and furniture were built once above and never
          // touched again.
          controller.update(deltaSeconds);
          applyPainterlyState(controller.mesh, baseRenderOrder);

          renderer.render(scene, camera);
          gl.endFrameEXP();
          rafRef.current = requestAnimationFrame(render);
        } catch (err) {
          console.error('IsometricRoomView render error', err);
        }
      };

      render();
    } catch (error) {
      console.error('Failed to initialize isometric room view:', error);
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
