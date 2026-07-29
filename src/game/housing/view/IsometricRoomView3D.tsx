// Room shell rendered from real 3D primitives (see sceneBuilder3D.ts) with
// procedurally textured floor/walls, furniture billboards, and Glidermon
// himself. Only the character animates per frame -- the room shell and
// furniture are built once and never touched again, same principle as the
// `quad` renderer (see sceneBuilder.ts).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import * as THREE from 'three';
import { Physics } from '@esotericsoftware/spine-core';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { useHousingStore, ROOM_SIZE_TIERS } from '../../../data/stores/housingStore';
import { useCosmeticsStore } from '../../../data/stores/cosmeticsStore';
import { OutfitSlot } from '../../../data/types/outfitTypes';
import { createSpineCharacterController, SpineCharacterController } from '../../../spine/createSpineCharacterController';
import { buildRoomScene3D, WALL_HEIGHT } from '../render/sceneBuilder3D';
import { buildFurnitureBillboard3D } from '../render/furnitureBillboard3D';
import { computeBillboardQuaternion } from '../render/billboard3D';
import { computeNativeCharacterHeight } from '../render/characterScale';
import { gridToWorld, TILE_SIZE } from '../render/grid3D';
import { createSkyTexture, getSkyPalette, paintSky, rgbToHex } from '../render/sky3D';
import { createTreetopBackdrop3D } from '../render/treetopBackdrop3D';

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
// NOTE: this constant is NOT comparable to the same-named constant in
// IsometricRoomView.tsx (quad renderer) or IsometricHousingThreeJS.tsx
// (legacy). Those renderers divide by a separate `roomScale` (fit-to-view)
// factor and apply extra empirically-tuned fudge multipliers on top, so
// their constants only make sense inside their own pixel-space chains. This
// renderer computes world-unit height directly with no such chain, so the
// constant here is tuned fresh against the `characterScale` value actually
// passed in from HudScreen.tsx (0.3) to land at a sensible size relative to
// TILE_SIZE/WALL_HEIGHT/furniture.
const CHARACTER_DESIRED_TILE_HEIGHT = 4.5;
const PHYSICS: any = Physics as any;

// Fixed camera offset from whatever point it's looking at -- the isometric
// *direction* never changes, only the look-at point does (overview: room
// origin; zoomed in: Glidermon). Translating position+target together by
// the same offset keeps the viewing angle identical in both modes.
const CAMERA_OFFSET = new THREE.Vector3(10, 10, 10);
// Fraction of extra breathing room added around the room's exact projected
// bounding box in overview mode -- big enough that walls don't touch the
// frame edge, small enough that the room still fills nearly all of it.
const OVERVIEW_MARGIN_RATIO = 0.06;
const ZOOMED_IN_HALF_EXTENT = 2;

// How often the sky/lighting palette is re-sampled from the clock. Time of
// day drifts slowly, so there's no need to recompute every frame.
const SKY_UPDATE_INTERVAL_MS = 30000;

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
  const activeFloorPatternId = useHousingStore((s) => s.activeFloorPatternId);
  const activeWallPatternId = useHousingStore((s) => s.activeWallPatternId);
  const furniturePlacements = useHousingStore((s) => s.furniturePlacements);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const initializedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const spineRef = useRef<SpineCharacterController | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const glSizeRef = useRef({ w: width, h: height });
  const roomBoundsRef = useRef({ halfWidth: 2, halfDepth: 2, wallHeight: WALL_HEIGHT });
  const characterTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const skyTextureRef = useRef<THREE.DataTexture | null>(null);
  const skyDataRef = useRef<Uint8Array | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const lastSkyUpdateRef = useRef<number | null>(null);
  const treetopGroupRef = useRef<THREE.Group | null>(null);

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

  const updateCameraForZoom = useCallback((camera: THREE.OrthographicCamera, zoomedIn: boolean) => {
    const { w: glW, h: glH } = glSizeRef.current;
    const aspect = glW / glH;

    const target = zoomedIn ? characterTargetRef.current : new THREE.Vector3(0, 0, 0);
    camera.position.copy(target).add(CAMERA_OFFSET);
    camera.lookAt(target);

    if (zoomedIn) {
      const halfExtent = ZOOMED_IN_HALF_EXTENT;
      camera.left = -halfExtent * aspect;
      camera.right = halfExtent * aspect;
      camera.top = halfExtent;
      camera.bottom = -halfExtent;
      camera.updateProjectionMatrix();
      return;
    }

    // Overview mode: fit the frustum to the room's exact projected bounding
    // box instead of a fixed/guessed extent. The isometric angle foreshortens
    // the floor footprint (X/Z) and the wall height (Y) by different amounts,
    // so a fixed extent either clips the walls or leaves a lot of dead space
    // -- projecting the actual room corners into camera space and fitting to
    // that gets the tightest frame that still shows the whole room. Camera
    // space is used directly (not world space) since OrthographicCamera's
    // left/right/top/bottom are defined in that space.
    camera.updateMatrixWorld(true);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const { halfWidth, halfDepth, wallHeight } = roomBoundsRef.current;

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    const corner = new THREE.Vector3();
    for (const x of [-halfWidth, halfWidth]) {
      for (const y of [0, wallHeight]) {
        for (const z of [-halfDepth, halfDepth]) {
          corner.set(x, y, z).sub(camera.position);
          const u = corner.dot(right);
          const v = corner.dot(up);
          minU = Math.min(minU, u);
          maxU = Math.max(maxU, u);
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
        }
      }
    }

    const contentWidth = (maxU - minU) * (1 + OVERVIEW_MARGIN_RATIO);
    const contentHeight = (maxV - minV) * (1 + OVERVIEW_MARGIN_RATIO);
    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;

    // Whichever dimension is aspect-starved dictates the final span, so the
    // frustum keeps the viewport's aspect ratio (otherwise the room would
    // render stretched) while still fully containing the other dimension.
    const finalHeight = Math.max(contentHeight, contentWidth / aspect);
    const finalWidth = finalHeight * aspect;

    camera.left = centerU - finalWidth / 2;
    camera.right = centerU + finalWidth / 2;
    camera.bottom = centerV - finalHeight / 2;
    camera.top = centerV + finalHeight / 2;
    camera.updateProjectionMatrix();
  }, []);

  useEffect(() => {
    const camera = cameraRef.current;
    if (camera) updateCameraForZoom(camera, isZoomedIn);
  }, [isZoomedIn, updateCameraForZoom]);

  useEffect(
    () => () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      rendererRef.current?.dispose();
      skyTextureRef.current?.dispose();
      const treetopMesh = treetopGroupRef.current?.children[0] as THREE.Mesh | undefined;
      if (treetopMesh) {
        treetopMesh.geometry.dispose();
        (treetopMesh.material as THREE.MeshBasicMaterial).map?.dispose();
        (treetopMesh.material as THREE.MeshBasicMaterial).dispose();
      }
    },
    []
  );

  const handleContextCreate = useCallback(async (gl: any) => {
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
      renderer.setClearColor(0x1a1c2c, 1);

      const scene = new THREE.Scene();
      const initialSkyPalette = getSkyPalette();
      const { texture: skyTexture, data: skyData } = createSkyTexture();
      scene.background = skyTexture;
      skyTextureRef.current = skyTexture;
      skyDataRef.current = skyData;
      lastSkyUpdateRef.current = performance.now();

      const dims = ROOM_SIZE_TIERS[roomSizeTier] ?? ROOM_SIZE_TIERS[0];
      const grid = {
        width: dims.width,
        height: dims.height,
        floorPatternId: activeFloorPatternId,
        wallPatternId: activeWallPatternId,
      };
      const built = buildRoomScene3D(grid);
      scene.add(built.group);
      roomBoundsRef.current = { halfWidth: built.halfWidth, halfDepth: built.halfDepth, wallHeight: built.wallHeight };

      const ambient = new THREE.AmbientLight(
        rgbToHex(initialSkyPalette.ambientColor),
        initialSkyPalette.ambientIntensity
      );
      scene.add(ambient);
      ambientLightRef.current = ambient;

      const sun = new THREE.DirectionalLight(rgbToHex(initialSkyPalette.sunColor), initialSkyPalette.sunIntensity);
      sun.position.set(3, 5, 2);
      scene.add(sun);
      sunLightRef.current = sun;

      // True isometric camera: equal offset on all three axes + lookAt the
      // origin. No hand-derived projection math -- Three.js's own camera
      // matrix does the isometric projection for us. Bounds are placeholder
      // here -- updateCameraForZoom sets the real framing once the room and
      // character are both built below.
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      cameraRef.current = camera;

      // Every billboard (furniture, character, treetop) shares this one
      // fixed rotation instead of each computing its own lookAt -- see
      // billboard3D.ts for why that matters under an orthographic camera.
      // Uses the fixed CAMERA_OFFSET direction rather than the live
      // camera.position, since that position now pans during zoom -- the
      // viewing *direction* (and therefore correct billboard facing) never
      // changes, only where it's centered.
      const billboardQuaternion = computeBillboardQuaternion(CAMERA_OFFSET);
      const treetopPromise = createTreetopBackdrop3D(built.halfWidth, built.halfDepth, billboardQuaternion);

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

      let characterWorldHeight = TILE_SIZE * CHARACTER_DESIRED_TILE_HEIGHT * DEFAULT_CHARACTER_SCALE;
      const nativeHeight = computeNativeCharacterHeight(controller.mesh);
      if (nativeHeight && nativeHeight > 0) {
        const scaleMultiplier = scaleRef.current > 0 ? scaleRef.current : DEFAULT_CHARACTER_SCALE;
        const desiredWorldHeight = TILE_SIZE * CHARACTER_DESIRED_TILE_HEIGHT * scaleMultiplier;
        characterWorldHeight = desiredWorldHeight;
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

      // Zoomed-in framing centers on the character's mid-height, not their
      // feet, so the camera doesn't look like it's aimed at the floor.
      characterTargetRef.current.set(charX, characterWorldHeight / 2, charZ);

      // Real world-space billboard (not screen-locked), so it naturally
      // pans/scales with the room when the camera zooms in on the character
      // -- same depth-tested approach as furniture (treetopBackdrop3D.ts).
      const treetopGroup = await treetopPromise;
      built.group.add(treetopGroup);
      treetopGroupRef.current = treetopGroup;

      updateCameraForZoom(camera, isZoomedIn);

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

          if (now - (lastSkyUpdateRef.current ?? 0) > SKY_UPDATE_INTERVAL_MS) {
            lastSkyUpdateRef.current = now;
            const palette = getSkyPalette();
            if (skyDataRef.current && skyTextureRef.current) {
              paintSky(skyDataRef.current, palette);
              skyTextureRef.current.needsUpdate = true;
            }
            if (ambientLightRef.current) {
              ambientLightRef.current.color.setHex(rgbToHex(palette.ambientColor));
              ambientLightRef.current.intensity = palette.ambientIntensity;
            }
            if (sunLightRef.current) {
              sunLightRef.current.color.setHex(rgbToHex(palette.sunColor));
              sunLightRef.current.intensity = palette.sunIntensity;
            }
          }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSizeTier, activeFloorPatternId, activeWallPatternId, furniturePlacements, catalog, gridColumn, gridRow]);

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
