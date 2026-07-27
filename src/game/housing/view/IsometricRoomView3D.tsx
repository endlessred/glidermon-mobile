// Room shell rendered from real 3D primitives (see sceneBuilder3D.ts) with
// procedurally textured floor/walls, furniture billboards, and Glidermon
// himself. Only the character animates per frame -- the room shell and
// furniture are built once and never touched again, same principle as the
// `quad` renderer (see sceneBuilder.ts).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { Physics } from '@esotericsoftware/spine-core';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { useHousingStore, ROOM_SIZE_TIERS } from '../../../data/stores/housingStore';
import { useCosmeticsStore } from '../../../data/stores/cosmeticsStore';
import { OutfitSlot } from '../../../data/types/outfitTypes';
import { createSpineCharacterController, SpineCharacterController } from '../../../spine/createSpineCharacterController';
import { buildRoomScene3D } from '../render/sceneBuilder3D';
import { buildFurnitureBillboard3D } from '../render/furnitureBillboard3D';
import { computeBillboardQuaternion } from '../render/billboard3D';
import { computeNativeCharacterHeight } from '../render/characterScale';
import { gridToWorld, TILE_SIZE } from '../render/grid3D';

interface IsometricRoomView3DProps {
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
const PHYSICS: any = Physics as any;

export default function IsometricRoomView3D({
  width = 300,
  height = 250,
  gridColumn = 1,
  gridRow = 0,
  characterScale = DEFAULT_CHARACTER_SCALE,
  animation = 'idle',
  outfit,
}: IsometricRoomView3DProps) {
  const catalog = useCosmeticsStore((state) => state.catalog);
  const roomSizeTier = useHousingStore((s) => s.roomSizeTier);
  const activeFloorSet = useHousingStore((s) => s.activeFloorSet);
  const activeWallSet = useHousingStore((s) => s.activeWallSet);
  const furniturePlacements = useHousingStore((s) => s.furniturePlacements);

  const [isLoaded, setIsLoaded] = useState(false);
  const initializedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const spineRef = useRef<SpineCharacterController | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

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
    if (spineRef.current) spineRef.current.applyOutfit(outfitRef.current);
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

  const handleContextCreate = useCallback(async (gl: any) => {
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
      renderer.setClearColor(0x1a1c2c, 1);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1c2c);

      const dims = ROOM_SIZE_TIERS[roomSizeTier] ?? ROOM_SIZE_TIERS[0];
      const grid = {
        width: dims.width,
        height: dims.height,
        defaultFloor: { set: activeFloorSet },
        defaultWall: { set: activeWallSet },
      };
      const built = buildRoomScene3D(grid);
      scene.add(built.group);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const sun = new THREE.DirectionalLight(0xffffff, 0.8);
      sun.position.set(3, 5, 2);
      scene.add(sun);

      // True isometric camera: equal offset on all three axes + lookAt the
      // origin. No hand-derived projection math -- Three.js's own camera
      // matrix does the isometric projection for us.
      const maxHalfExtent = Math.max(built.halfWidth, built.halfDepth) + 1.5;
      const aspect = w / h;
      const camera = new THREE.OrthographicCamera(
        -maxHalfExtent * aspect,
        maxHalfExtent * aspect,
        maxHalfExtent,
        -maxHalfExtent,
        0.1,
        100
      );
      camera.position.set(10, 10, 10);
      camera.lookAt(0, 0, 0);

      // Every billboard (furniture, character) shares this one fixed
      // rotation instead of each computing its own lookAt -- see
      // billboard3D.ts for why that matters under an orthographic camera.
      const billboardQuaternion = computeBillboardQuaternion(camera.position);

      for (const placement of furniturePlacements) {
        const billboard = await buildFurnitureBillboard3D(placement, dims, billboardQuaternion);
        if (billboard) built.group.add(billboard);
      }

      const controller = await createSpineCharacterController({
        animation: animationRef.current,
        outfit: outfitRef.current,
        catalog,
      });
      controller.mesh.frustumCulled = false;

      const characterGroup = new THREE.Group();
      characterGroup.quaternion.copy(billboardQuaternion);

      const nativeHeight = computeNativeCharacterHeight(controller.mesh);
      if (nativeHeight && nativeHeight > 0) {
        const scaleMultiplier = scaleRef.current > 0 ? scaleRef.current : DEFAULT_CHARACTER_SCALE;
        const desiredWorldHeight = TILE_SIZE * CHARACTER_DESIRED_TILE_HEIGHT * scaleMultiplier;
        const finalScale = desiredWorldHeight / nativeHeight;

        if (Number.isFinite(finalScale)) {
          const sk = controller.skeleton;
          sk.scaleX = finalScale;
          sk.scaleY = finalScale;

          // Feet land at the group's local origin -- world placement is
          // handled entirely by characterGroup.position below.
          const feet = controller.getFeetLocalPosition();
          sk.x = -feet.x * finalScale;
          sk.y = -feet.y * finalScale;

          sk.updateWorldTransform(PHYSICS.update);
          controller.mesh.refreshMeshes();
        }
      }

      characterGroup.add(controller.mesh);
      const { x: charX, z: charZ } = gridToWorld(gridRow, gridColumn, dims);
      characterGroup.position.set(charX, 0, charZ);
      built.group.add(characterGroup);

      rendererRef.current = renderer;
      spineRef.current = controller;
      lastTimeRef.current = null;

      const render = () => {
        try {
          const now = performance.now();
          const last = lastTimeRef.current ?? now;
          const deltaSeconds = Math.min((now - last) / 1000, 1 / 15);
          lastTimeRef.current = now;

          // Only the character skeleton updates/refreshes per frame -- the
          // room shell and furniture were built once above.
          controller.update(deltaSeconds);

          renderer.render(scene, camera);
          gl.endFrameEXP();
          rafRef.current = requestAnimationFrame(render);
        } catch (err) {
          console.error('IsometricRoomView3D render error', err);
        }
      };

      render();
    } catch (error) {
      console.error('Failed to initialize 3D room view:', error);
    } finally {
      setIsLoaded(true);
    }
  }, [roomSizeTier, activeFloorSet, activeWallSet, furniturePlacements, catalog, gridColumn, gridRow]);

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
            backgroundColor: 'rgba(26, 28, 44, 0.4)',
          }}
        />
      )}
    </View>
  );
}
