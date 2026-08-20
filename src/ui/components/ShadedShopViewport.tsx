import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import * as THREE from 'three';
import * as spine from '@esotericsoftware/spine-core';
import { Physics } from '@esotericsoftware/spine-core';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { loadSpineFromExpoAssets } from '../../spine/loaders';
import { SkeletonMesh } from '../../spine/SpineThree';
import { applySubtleWindGusts } from '../../../utils/spinePhysics';

export type ShopCameraTarget = 'overview' | 'luma' | 'sable';

interface ShadedShopViewportProps {
  width?: number;
  height?: number;
  onSableTap?: () => void;
  onLumaTap?: () => void;
  /** Which framing the camera should smoothly ease toward -- 'overview' is
   * the original wide two-character shot; 'luma'/'sable' reframe/zoom
   * toward that character so they stay clearly visible above a bottom
   * merchandise panel. Defaults to 'overview'. */
  cameraTarget?: ShopCameraTarget;
}

type CameraFraming = { x: number; y: number; zoomFactor: number };

// ShopScreen's merchandise panel covers the bottom ~68% of the screen, so
// only the top ~32% of this viewport's full-height render is ever actually
// visible. Center the character+counter within THAT visible band (not the
// full screen) -- half of 0.32.
const VISIBLE_BAND_FRACTION = 0.32;
const SHOPPING_FRAME_FRACTION = VISIBLE_BAND_FRACTION / 2;
// Tighter than the 2.4 overview zoom so a single character+counter reads
// clearly within that smaller visible band, but zoomed out enough that
// both their head and their counter (below them) fit without clipping.
const SHOPPING_ZOOM_FACTOR = 2.0;
// Seconds -- exponential smoothing time-constant for camera reframes.
const CAMERA_EASE_TAU = 0.22;

// One-shot "wind gust hit the sign" animations added to the ShadedShop
// skeleton -- each moves a different part (ribbons, left/right sign board),
// so they're independent and safe to occasionally overlap, but read best
// triggered one at a time rather than all together. `Sign/Branch` (also
// present in the file) is left out of the rotation since it reads as the
// branch itself moving rather than a gust hitting the sign -- easy to add
// back to this list if that's wanted too.
const SIGN_WIND_ANIMATIONS = ['Sign/DarkRibbon', 'Sign/Ribbon', 'Sign/Sign Left', 'Sign/Sign Right'];
const SIGN_WIND_TRACK = 0; // the main ShadedShop skeleton's `state` has no other animation on any track
const SIGN_WIND_MIN_DELAY_MS = 2800; // 5x more frequent than the original 14-32s range
const SIGN_WIND_MAX_DELAY_MS = 6400;

// Given a character's resolved world anchor (same point used for tap
// detection) and the viewport's pixel height, computes the camera framing
// that places that character at SHOPPING_FRAME_FRACTION from the top of the
// full render -- i.e. centered in the band that stays visible above a
// bottom merchandise panel.
function computeShoppingFraming(pos: { x: number; y: number }, viewportHeight: number): CameraFraming {
  const cameraHeight = viewportHeight * SHOPPING_ZOOM_FACTOR;
  return {
    x: pos.x,
    y: pos.y - (0.5 - SHOPPING_FRAME_FRACTION) * cameraHeight,
    zoomFactor: SHOPPING_ZOOM_FACTOR,
  };
}

// Standalone Spine loader for ShadedShop using the existing loader
async function loadShadedShopSpine() {
  try {
    // Load the ShadedShop assets using the existing spine loader
    const atlasModule = require('../../assets/ShadedShop/ShadedShop.atlas');
    const jsonModule = require('../../assets/ShadedShop/ShadedShop.json');
    const textureModule1 = require('../../assets/ShadedShop/ShadedShop.png');
    const textureModule2 = require('../../assets/ShadedShop/ShadedShop_2.png');

    const result = await loadSpineFromExpoAssets({
      atlasModule,
      jsonModule,
      textureModules: [textureModule1, textureModule2],
      defaultMix: 0,
    });

    return result;
  } catch (error) {
    console.error('Failed to load ShadedShop spine:', error);
    throw error;
  }
}

// Load Sable character separately
async function loadSableCharacter() {
  try {
    // Load the Sable assets
    const atlasModule = require('../../assets/Sable/Sable.atlas');
    const jsonModule = require('../../assets/Sable/Sable.json');
    const textureModule = require('../../assets/Sable/Sable.png');

    const result = await loadSpineFromExpoAssets({
      atlasModule,
      jsonModule,
      textureModules: [textureModule],
      defaultMix: 0,
    });

    return result;
  } catch (error) {
    console.error('Failed to load Sable character:', error);
    throw error;
  }
}

// Load Luma character separately
async function loadLumaCharacter() {
  try {
    // Load the Luma assets
    const atlasModule = require('../../assets/Luma/Luma.atlas');
    const jsonModule = require('../../assets/Luma/Luma.json');
    const textureModule = require('../../assets/Luma/Luma.png');

    const result = await loadSpineFromExpoAssets({
      atlasModule,
      jsonModule,
      textureModules: [textureModule],
      defaultMix: 0,
    });

    return result;
  } catch (error) {
    console.error('Failed to load Luma character:', error);
    throw error;
  }
}


export default function ShadedShopViewport({
  width = 300,
  height = 250,
  onSableTap,
  onLumaTap,
  cameraTarget = 'overview',
}: ShadedShopViewportProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const skeletonMeshRef = useRef<SkeletonMesh | null>(null);
  const sableMeshRef = useRef<SkeletonMesh | null>(null);
  const lumaMeshRef = useRef<SkeletonMesh | null>(null);
  const skeletonRef = useRef<spine.Skeleton | null>(null);
  const sableSkeletonRef = useRef<spine.Skeleton | null>(null);
  const lumaSkeletonRef = useRef<spine.Skeleton | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const sablePositionRef = useRef<{ x: number; y: number; scale: number; characterSize?: number } | null>(null);
  const lumaPositionRef = useRef<{ x: number; y: number; scale: number; characterSize?: number } | null>(null);
  // Per-merchant camera framings (populated once positions are known during
  // load) and the live eased state the render loop actually applies each
  // frame -- see the render() closure below.
  const cameraPresetsRef = useRef<Partial<Record<ShopCameraTarget, CameraFraming>>>({});
  const cameraCurrentRef = useRef<CameraFraming | null>(null);
  const cameraDesiredKeyRef = useRef<ShopCameraTarget>(cameraTarget);
  const signWindTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cameraDesiredKeyRef.current = cameraTarget;
  }, [cameraTarget]);

  const handleTouch = useCallback((event: any) => {
    if ((!onSableTap && !onLumaTap) || !cameraRef.current || (!sablePositionRef.current && !lumaPositionRef.current)) return;

    const touch = event.nativeEvent.touches?.[0] || event.nativeEvent;
    if (!touch) return;

    // Get touch coordinates relative to the GLView
    const touchX = touch.locationX || touch.pageX;
    const touchY = touch.locationY || touch.pageY;

    // Convert screen coordinates to world coordinates
    const camera = cameraRef.current;

    // Calculate world position from screen coordinates
    // The camera is positioned at (0, 1000, 10) looking at (0, 1000, 0)
    // We need to account for the scene scaling and positioning
    const normalizedX = (touchX / width - 0.5) * 2; // -1 to 1
    const normalizedY = (touchY / height - 0.5) * 2; // -1 to 1 (inverted)

    // Convert to world coordinates using camera's orthographic bounds --
    // read the camera's *live* position rather than assuming the original
    // fixed (0, 1000), since it now eases toward a per-merchant framing.
    const cameraWidth = camera.right - camera.left;
    const cameraHeight = camera.top - camera.bottom;

    const worldX = normalizedX * (cameraWidth / 2) + camera.position.x;
    const worldY = -normalizedY * (cameraHeight / 2) + camera.position.y;

    // Check both characters' tappable areas, picking whichever is closer if
    // both boxes happen to overlap.
    const hits: { name: 'sable' | 'luma'; distance: number }[] = [];
    if (onSableTap && sablePositionRef.current) {
      const sablePos = sablePositionRef.current;
      const characterSize = sablePos.characterSize || (200 * sablePos.scale);
      const distance = Math.sqrt(Math.pow(worldX - sablePos.x, 2) + Math.pow(worldY - sablePos.y, 2));
      if (distance < characterSize) hits.push({ name: 'sable', distance });
    }
    if (onLumaTap && lumaPositionRef.current) {
      const lumaPos = lumaPositionRef.current;
      const characterSize = lumaPos.characterSize || (200 * lumaPos.scale);
      const distance = Math.sqrt(Math.pow(worldX - lumaPos.x, 2) + Math.pow(worldY - lumaPos.y, 2));
      if (distance < characterSize) hits.push({ name: 'luma', distance });
    }

    if (hits.length === 0) return;
    hits.sort((a, b) => a.distance - b.distance);
    const winner = hits[0].name;
    if (winner === 'sable') onSableTap?.();
    else onLumaTap?.();
  }, [onSableTap, onLumaTap, width, height]);

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

      // Setup orthographic camera for isometric view - zoomed in to center 30%
      const zoomFactor = 2.4; // Reduced from 8 to zoom in to ~30% of scene
      const camera = new THREE.OrthographicCamera(
        (-w / 2) * zoomFactor,
        (w / 2) * zoomFactor,
        (h / 2) * zoomFactor,
        (-h / 2) * zoomFactor,
        0.1,
        2000
      );

      camera.position.set(0, 1000, 10);
      camera.lookAt(0, 1000, 0);
      camera.updateProjectionMatrix();

      // Store camera reference for touch detection
      cameraRef.current = camera;

      // The wide two-character overview is the camera's resting framing --
      // matches the hardcoded position/zoom set just above.
      cameraPresetsRef.current.overview = { x: 0, y: 1000, zoomFactor };
      cameraCurrentRef.current = { x: 0, y: 1000, zoomFactor };

      // Load ShadedShop spine scene
      const { skeleton, state, resolveTexture } = await loadShadedShopSpine();

      // Store skeleton reference for physics
      skeletonRef.current = skeleton;

      // Setup skeleton pose
      skeleton.setupPose();
      for (let i = 0; i < skeleton.slots.length; i++) {
        skeleton.slots[i].setupPose();
      }

      // Create the skeleton mesh using the existing SkeletonMesh
      const skeletonMesh = new SkeletonMesh(skeleton, state, resolveTexture);
      skeletonMesh.frustumCulled = false;

      // Occasionally play a single one-shot "wind gust" animation on the
      // hanging sign, picked at random from SIGN_WIND_ANIMATIONS -- mirrors
      // Sable's self-rescheduling blink timer below, just on a much longer/
      // more occasional cadence and on the main scene skeleton's own track
      // (which nothing else animates).
      const availableSignWindAnimations = SIGN_WIND_ANIMATIONS.filter((name) => skeleton.data.findAnimation(name));
      if (availableSignWindAnimations.length === 0) {
        console.warn('None of the configured Sign wind animations were found in the ShadedShop skeleton');
      } else {
        const triggerSignWind = () => {
          const name = availableSignWindAnimations[Math.floor(Math.random() * availableSignWindAnimations.length)];
          state.setAnimation(SIGN_WIND_TRACK, name, false); // one-shot, no loop
          const nextDelay = SIGN_WIND_MIN_DELAY_MS + Math.random() * (SIGN_WIND_MAX_DELAY_MS - SIGN_WIND_MIN_DELAY_MS);
          signWindTimeoutRef.current = setTimeout(triggerSignWind, nextDelay);
        };
        const initialDelay = 800 + Math.random() * 1200;
        signWindTimeoutRef.current = setTimeout(triggerSignWind, initialDelay);
      }

      // Load Sable character
      const sableResult = await loadSableCharacter();

      // Store Sable skeleton reference for physics
      sableSkeletonRef.current = sableResult.skeleton;

      // Setup Sable pose
      sableResult.skeleton.setupPose();
      for (let i = 0; i < sableResult.skeleton.slots.length; i++) {
        sableResult.skeleton.slots[i].setupPose();
      }

      // Create Sable mesh
      const sableMesh = new SkeletonMesh(sableResult.skeleton, sableResult.state, sableResult.resolveTexture);
      sableMesh.frustumCulled = false;

      // Scale and position to fit viewport based on ShadedShop.json dimensions
      const sceneWidth = 7680; // from ShadedShop.json
      const sceneHeight = 5120; // from ShadedShop.json
      const sceneX = -3495.1; // from ShadedShop.json
      const sceneY = -1042.72; // from ShadedShop.json

      // Calculate scale to fit the scene in the viewport
      const scaleX = (w * 0.8) / sceneWidth;
      const scaleY = (h * 0.8) / sceneHeight;
      const scale = Math.min(scaleX, scaleY, 1.0);

      skeletonMesh.scale.set(scale, scale, 1);

      // Center the scene
      const centerX = sceneX + (sceneWidth / 2);
      const centerY = sceneY + (sceneHeight / 2);
      skeletonMesh.position.set(-centerX * scale, -centerY * scale, 0);

      // Position Sable using the SAME coordinate system as the ShadedShop scene
      const sableBoneX = 505.62; // from ShadedShop.json Sable bone
      const sableBoneY = 939.17; // from ShadedShop.json Sable bone

      // Use skeleton transforms instead of mesh transforms (critical for Spine!)
      const sableSkeleton = sableResult.skeleton;

      // Apply the SAME scale as the shop scene but 5x larger
      const sableScale = scale * 5; // 5 times larger
      sableSkeleton.scaleX = sableScale;
      sableSkeleton.scaleY = sableScale;

      // Position Sable at the Sable bone coordinates within the ShadedShop coordinate space
      // The ShadedShop scene skeleton coordinates are already in the right space
      sableSkeleton.x = sableBoneX;
      sableSkeleton.y = sableBoneY;

      // Camera framing anchors directly on (sableBoneX, sableBoneY) -- the
      // same values used to position her skeleton just above, so this is
      // guaranteed to line up with where she's actually rendered. (The
      // marker-bone lookup below resolves a *different* point used only
      // for tap hit-testing -- verified empirically that it does not
      // coincide with her rendered position, so it's not used for framing.)
      cameraPresetsRef.current.sable = computeShoppingFraming({ x: sableBoneX, y: sableBoneY }, h);

      // Store Sable's position info for touch detection
      // Find the Sable bone in the ShadedShop skeleton to get its world position
      const sableBone = skeleton.findBone('Sable');
      if (sableBone) {
        // Update world transforms to get accurate bone positions
        skeleton.updateWorldTransform(Physics.update);

        // Get the world position of the Sable bone in the shop skeleton
        const sableBoneWorldX = sableBone.appliedPose.worldX;
        const sableBoneWorldY = sableBone.appliedPose.worldY;

        // Transform to account for the scene mesh positioning and camera
        const sceneCenterX = sceneX + (sceneWidth / 2);
        const sceneCenterY = sceneY + (sceneHeight / 2);

        const worldSableX = sableBoneWorldX + (-sceneCenterX * scale);
        const worldSableY = sableBoneWorldY + (-sceneCenterY * scale) + 1000; // Add camera Y offset

        // Estimate Sable character size - make it a reasonable square tappable area
        const characterSize = 150 * 5 * 1.2 * 1.2; // Square tappable area in world units, scaled 5x like Sable, then 1.2x more, then 1.2x again

        // Move the touch detection area up by half the box size
        // so the bottom of the box is where the center currently is
        const adjustedSableY = worldSableY + (characterSize / 2);

        sablePositionRef.current = {
          x: worldSableX,
          y: adjustedSableY,
          scale: 1, // Use direct size instead of scale multiplier
          characterSize
        };

        console.log('Sable bone world position for touch detection:', {
          boneWorldX: sableBoneWorldX, boneWorldY: sableBoneWorldY,
          transformedX: worldSableX, transformedY: worldSableY,
          characterSize, sceneScale: scale
        });
      } else {
        console.warn('Sable bone not found in ShadedShop skeleton');
        // Fallback to old method
        const sceneCenterX = sceneX + (sceneWidth / 2);
        const sceneCenterY = sceneY + (sceneHeight / 2);

        const transformedSableX = sableBoneX + (-sceneCenterX * scale);
        const transformedSableY = sableBoneY + (-sceneCenterY * scale) + 1000;

        sablePositionRef.current = {
          x: transformedSableX,
          y: transformedSableY,
          scale: sableScale
        };
      }

      // Apply layered animations to Sable using Spine track system
      const sableState = sableResult.state;
      try {
        // Track 0: FlipX animation (1-frame animation to flip character)
        const flipXAnimation = sableSkeleton.data.findAnimation('FlipX');
        if (flipXAnimation) {
          sableState.setAnimation(0, 'FlipX', true); // Loop the animation
          console.log('Applied FlipX animation to Sable on track 0');
        } else {
          console.warn('FlipX animation not found in Sable skeleton');
        }

        // Track 1: SalesCounter animation (1-frame animation to show sales counter)
        const salesCounterAnimation = sableSkeleton.data.findAnimation('SalesCounter');
        if (salesCounterAnimation) {
          sableState.setAnimation(1, 'SalesCounter', true); // Loop the animation
          console.log('Applied SalesCounter animation to Sable on track 1');
        } else {
          console.warn('SalesCounter animation not found in Sable skeleton');
        }

        // Track 2: Idle animation (looping idle animation)
        const idleAnimation = sableSkeleton.data.findAnimation('Idle');
        if (idleAnimation) {
          sableState.setAnimation(2, 'Idle', true); // Loop the animation
          console.log('Applied Idle animation to Sable on track 2');
        } else {
          console.warn('Idle animation not found in Sable skeleton');
        }

        // Track 3: Blink animation (20-frame animation, triggered at intervals)
        const blinkAnimation = sableSkeleton.data.findAnimation('Blink');
        if (blinkAnimation) {
          // Set up interval-based blinking (2-6 seconds between blinks)
          const triggerBlink = () => {
            sableState.setAnimation(3, 'Blink', false); // Don't loop, play once

            // Schedule next blink after current animation finishes + random interval
            const blinkDuration = blinkAnimation.duration * 1000; // Convert to milliseconds
            const nextBlinkDelay = blinkDuration + (2000 + Math.random() * 4000); // 2-6 seconds
            setTimeout(triggerBlink, nextBlinkDelay);
          };

          // Start first blink after initial delay
          const initialDelay = 2000 + Math.random() * 3000; // 2-5 seconds
          setTimeout(triggerBlink, initialDelay);
          console.log('Set up blink animation system on track 3');
        } else {
          console.warn('blink animation not found in Sable skeleton');
        }

        // Debug: List all available animations if any are missing
        if (!flipXAnimation || !salesCounterAnimation || !idleAnimation || !blinkAnimation) {
          const availableAnimations = sableSkeleton.data.animations.map(anim => anim.name);
          console.log('Available Sable animations:', availableAnimations);
        }
      } catch (error) {
        console.error('Error applying Sable animations:', error);
      }

      // Update world transform after setting position/scale and animations
      sableSkeleton.updateWorldTransform(Physics.update);

      // Set mesh to higher render order to appear in front
      sableMesh.renderOrder = 1000;

      // Load Luma character
      const lumaResult = await loadLumaCharacter();

      // Store Luma skeleton reference for physics
      lumaSkeletonRef.current = lumaResult.skeleton;

      // Setup Luma pose
      lumaResult.skeleton.setupPose();
      for (let i = 0; i < lumaResult.skeleton.slots.length; i++) {
        lumaResult.skeleton.slots[i].setupPose();
      }

      // Create Luma mesh
      const lumaMesh = new SkeletonMesh(lumaResult.skeleton, lumaResult.state, lumaResult.resolveTexture);
      lumaMesh.frustumCulled = false;

      // Position Luma using the SAME coordinate system as the ShadedShop scene
      const lumaBoneX = -914.61; // from ShadedShop.json Luma bone (updated position)
      const lumaBoneY = 1035.18; // from ShadedShop.json Luma bone (updated position)

      // Use skeleton transforms instead of mesh transforms (critical for Spine!)
      const lumaSkeleton = lumaResult.skeleton;

      // Apply the SAME scale as the shop scene but 5x larger (matching Sable)
      const lumaScale = scale * 5; // 5 times larger
      lumaSkeleton.scaleX = lumaScale;
      lumaSkeleton.scaleY = lumaScale;

      // Position Luma at the Luma bone coordinates within the ShadedShop coordinate space
      lumaSkeleton.x = lumaBoneX;
      lumaSkeleton.y = lumaBoneY;

      // Camera framing anchors directly on (lumaBoneX, lumaBoneY) -- see the
      // matching Sable comment above for why this differs from the
      // marker-bone-resolved position used only for tap hit-testing below.
      cameraPresetsRef.current.luma = computeShoppingFraming({ x: lumaBoneX, y: lumaBoneY }, h);

      // Store Luma's position info for touch detection, mirroring the Sable
      // resolution above -- find the 'Luma' anchor bone in the ShadedShop
      // scene skeleton and resolve its actual world position rather than
      // trusting the hand-copied lumaBoneX/Y constants directly (those are
      // the bone's *local* coordinates, not its rendered world position).
      const lumaBone = skeleton.findBone('Luma');
      if (lumaBone) {
        skeleton.updateWorldTransform(Physics.update);

        const lumaBoneWorldX = lumaBone.appliedPose.worldX;
        const lumaBoneWorldY = lumaBone.appliedPose.worldY;

        const sceneCenterX = sceneX + (sceneWidth / 2);
        const sceneCenterY = sceneY + (sceneHeight / 2);

        const worldLumaX = lumaBoneWorldX + (-sceneCenterX * scale);
        const worldLumaY = lumaBoneWorldY + (-sceneCenterY * scale) + 1000;

        const characterSize = 150 * 5 * 1.2 * 1.2;
        const adjustedLumaY = worldLumaY + (characterSize / 2);

        lumaPositionRef.current = {
          x: worldLumaX,
          y: adjustedLumaY,
          scale: 1,
          characterSize,
        };
      } else {
        console.warn('Luma bone not found in ShadedShop skeleton');
        const sceneCenterX = sceneX + (sceneWidth / 2);
        const sceneCenterY = sceneY + (sceneHeight / 2);

        const transformedLumaX = lumaBoneX + (-sceneCenterX * scale);
        const transformedLumaY = lumaBoneY + (-sceneCenterY * scale) + 1000;

        lumaPositionRef.current = {
          x: transformedLumaX,
          y: transformedLumaY,
          scale: lumaScale,
        };
      }

      // Apply animations to Luma using Spine track system
      const lumaState = lumaResult.state;
      try {
        // Track 0: Idle animation (looping idle animation)
        const lumaIdleAnimation = lumaSkeleton.data.findAnimation('Idle');
        if (lumaIdleAnimation) {
          lumaState.setAnimation(0, 'Idle', true); // Loop the animation
          console.log('Applied Idle animation to Luma on track 0');
        } else {
          console.warn('Idle animation not found in Luma skeleton');
        }

        // Track 1: Counter animation (looping counter animation)
        const lumaCounterAnimation = lumaSkeleton.data.findAnimation('Counter');
        if (lumaCounterAnimation) {
          lumaState.setAnimation(1, 'Counter', true); // Loop the animation
          console.log('Applied Counter animation to Luma on track 1');
        } else {
          console.warn('Counter animation not found in Luma skeleton');
        }

        // Debug: List all available animations if any are missing
        if (!lumaIdleAnimation || !lumaCounterAnimation) {
          const availableLumaAnimations = lumaSkeleton.data.animations.map(anim => anim.name);
          console.log('Available Luma animations:', availableLumaAnimations);
        }
      } catch (error) {
        console.error('Error applying Luma animations:', error);
      }

      // Update world transform after setting position/scale and animations
      lumaSkeleton.updateWorldTransform(Physics.update);

      // Set mesh to higher render order to appear in front
      lumaMesh.renderOrder = 1001; // Slightly higher than Sable

      scene.add(skeletonMesh);
      scene.add(sableMesh);
      scene.add(lumaMesh);

      // Debug box removed - touch detection is working!

      // Set up material properties for proper rendering
      [skeletonMesh, sableMesh].forEach(mesh => {
        mesh.traverse((child: THREE.Object3D) => {
          const anyChild = child as any;
          if (anyChild.isMesh && anyChild.material) {
            const material = anyChild.material;
            if (material.transparent !== undefined) material.transparent = true;
            if (material.depthTest !== undefined) material.depthTest = false;
            if (material.depthWrite !== undefined) material.depthWrite = false;
            material.needsUpdate = true;
          }
        });
      });

      rendererRef.current = renderer;
      skeletonMeshRef.current = skeletonMesh;
      sableMeshRef.current = sableMesh;
      lumaMeshRef.current = lumaMesh;
      lastTimeRef.current = null;

      const render = () => {
        try {
          const now = performance.now();
          const last = lastTimeRef.current ?? now;
          const deltaSeconds = Math.min((now - last) / 1000, 1 / 15);
          lastTimeRef.current = now;

          // Apply wind effects to all shop characters
          const currentTime = now / 1000;
          if (skeletonRef.current) {
            applySubtleWindGusts(skeletonRef.current, currentTime);
          }
          if (sableSkeletonRef.current) {
            applySubtleWindGusts(sableSkeletonRef.current, currentTime);
          }
          if (lumaSkeletonRef.current) {
            applySubtleWindGusts(lumaSkeletonRef.current, currentTime);
          }

          if (skeletonMeshRef.current) {
            skeletonMeshRef.current.update(deltaSeconds);
          }

          if (sableMeshRef.current) {
            sableMeshRef.current.update(deltaSeconds);
          }

          if (lumaMeshRef.current) {
            lumaMeshRef.current.update(deltaSeconds);
          }

          // Ease the camera toward whichever framing is currently desired
          // (overview / luma / sable). Only touches the camera's frustum/
          // matrix while an actual reframe is in progress -- once settled
          // (within epsilon) this is skipped entirely, so a steady camera
          // costs nothing extra per frame beyond what it always did.
          const desiredFraming =
            cameraPresetsRef.current[cameraDesiredKeyRef.current] ?? cameraPresetsRef.current.overview;
          const currentFraming = cameraCurrentRef.current;
          if (desiredFraming && currentFraming) {
            const dx = desiredFraming.x - currentFraming.x;
            const dy = desiredFraming.y - currentFraming.y;
            const dz = desiredFraming.zoomFactor - currentFraming.zoomFactor;
            const settled = Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(dz) < 0.001;

            if (!settled) {
              const k = 1 - Math.exp(-deltaSeconds / CAMERA_EASE_TAU);
              currentFraming.x += dx * k;
              currentFraming.y += dy * k;
              currentFraming.zoomFactor += dz * k;

              camera.left = (-w / 2) * currentFraming.zoomFactor;
              camera.right = (w / 2) * currentFraming.zoomFactor;
              camera.top = (h / 2) * currentFraming.zoomFactor;
              camera.bottom = (-h / 2) * currentFraming.zoomFactor;
              camera.position.x = currentFraming.x;
              camera.position.y = currentFraming.y;
              camera.lookAt(currentFraming.x, currentFraming.y, 0);
              camera.updateProjectionMatrix();
            }
          }

          renderer.render(scene, camera);
          gl.endFrameEXP();
          rafRef.current = requestAnimationFrame(render);
        } catch (err) {
          console.error('ShadedShop render error', err);
        }
      };

      render();
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to initialize ShadedShop viewport:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (signWindTimeoutRef.current != null) {
        clearTimeout(signWindTimeoutRef.current);
        signWindTimeoutRef.current = null;
      }
      rendererRef.current?.dispose();
    };
  }, []);

  if (error) {
    return (
      <View style={{
        width,
        height,
        backgroundColor: '#e74c3c',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16
      }}>
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 8
        }}>
          ⚠️ ShadedShop Error
        </Text>
        <Text style={{
          color: '#ffcccb',
          fontSize: 12,
          textAlign: 'center'
        }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width, height, backgroundColor: 'transparent' }}>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={handleContextCreate}
        onTouchStart={handleTouch}
      />
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
            backgroundColor: 'rgba(26, 28, 44, 0.8)',
          }}
        >
          <Text style={{
            color: 'white',
            fontSize: 16,
            fontWeight: 'bold'
          }}>
            🏪 Loading ShadedShop...
          </Text>
        </View>
      )}
    </View>
  );
}