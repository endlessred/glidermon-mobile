import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import * as THREE from 'three';
import * as spine from '@esotericsoftware/spine-core';
import { Physics } from '@esotericsoftware/spine-core';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { loadSpineFromExpoAssets } from '../../spine/loaders';
import { SkeletonMesh } from '../../spine/SpineThree';

interface ShadedShopViewportProps {
  width?: number;
  height?: number;
  onSableTap?: () => void;
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


export default function ShadedShopViewport({
  width = 300,
  height = 250,
  onSableTap,
}: ShadedShopViewportProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const skeletonMeshRef = useRef<SkeletonMesh | null>(null);
  const sableMeshRef = useRef<SkeletonMesh | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const sablePositionRef = useRef<{ x: number; y: number; scale: number } | null>(null);

  const handleTouch = useCallback((event: any) => {
    console.log('Touch event received:', {
      hasOnSableTap: !!onSableTap,
      hasCamera: !!cameraRef.current,
      hasSablePos: !!sablePositionRef.current,
      eventType: event.nativeEvent?.type,
    });

    if (!onSableTap || !cameraRef.current || !sablePositionRef.current) return;

    const touch = event.nativeEvent.touches?.[0] || event.nativeEvent;
    if (!touch) {
      console.log('No touch data found');
      return;
    }

    // Get touch coordinates relative to the GLView
    const touchX = touch.locationX || touch.pageX;
    const touchY = touch.locationY || touch.pageY;

    console.log('Touch coordinates:', { touchX, touchY, width, height });

    // Convert screen coordinates to world coordinates
    const camera = cameraRef.current;
    const sablePos = sablePositionRef.current;

    // Calculate world position from screen coordinates
    // The camera is positioned at (0, 1000, 10) looking at (0, 1000, 0)
    // We need to account for the scene scaling and positioning
    const normalizedX = (touchX / width - 0.5) * 2; // -1 to 1
    const normalizedY = (touchY / height - 0.5) * 2; // -1 to 1 (inverted)

    // Convert to world coordinates using camera's orthographic bounds
    const cameraWidth = camera.right - camera.left;
    const cameraHeight = camera.top - camera.bottom;

    const worldX = normalizedX * (cameraWidth / 2);
    const worldY = -normalizedY * (cameraHeight / 2) + 1000; // Add camera's Y offset

    // Check if touch is within Sable's bounds (square tappable area)
    const characterSize = sablePos.characterSize || (200 * sablePos.scale); // Use stored size or fallback
    const distance = Math.sqrt(
      Math.pow(worldX - sablePos.x, 2) +
      Math.pow(worldY - sablePos.y, 2)
    );

    console.log('Touch detection:', {
      worldX, worldY,
      sableX: sablePos.x, sableY: sablePos.y,
      distance, characterSize,
      isHit: distance < characterSize
    });

    if (distance < characterSize) {
      console.log('Sable tapped! Opening store...');
      onSableTap();
    }
  }, [onSableTap, width, height]);

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

      // Load ShadedShop spine scene
      const { skeleton, state, resolveTexture } = await loadShadedShopSpine();

      // Setup skeleton pose
      skeleton.setToSetupPose();
      for (let i = 0; i < skeleton.slots.length; i++) {
        skeleton.slots[i].setToSetupPose();
      }

      // Create the skeleton mesh using the existing SkeletonMesh
      const skeletonMesh = new SkeletonMesh(skeleton, state, resolveTexture);
      skeletonMesh.frustumCulled = false;

      // Load Sable character
      const sableResult = await loadSableCharacter();

      // Setup Sable pose
      sableResult.skeleton.setToSetupPose();
      for (let i = 0; i < sableResult.skeleton.slots.length; i++) {
        sableResult.skeleton.slots[i].setToSetupPose();
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

      // Store Sable's position info for touch detection
      // Find the Sable bone in the ShadedShop skeleton to get its world position
      const sableBone = skeleton.findBone('Sable');
      if (sableBone) {
        // Update world transforms to get accurate bone positions
        skeleton.updateWorldTransform(Physics.update);

        // Get the world position of the Sable bone in the shop skeleton
        const sableBoneWorldX = sableBone.worldX;
        const sableBoneWorldY = sableBone.worldY;

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
            console.log('Triggered blink animation on track 3');

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
      sableSkeleton.updateWorldTransform();

      // Set mesh to higher render order to appear in front
      sableMesh.renderOrder = 1000;

      scene.add(skeletonMesh);
      scene.add(sableMesh);

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
      lastTimeRef.current = null;

      const render = () => {
        try {
          const now = performance.now();
          const last = lastTimeRef.current ?? now;
          const deltaSeconds = Math.min((now - last) / 1000, 1 / 15);
          lastTimeRef.current = now;

          if (skeletonMeshRef.current) {
            skeletonMeshRef.current.update(deltaSeconds);
          }

          if (sableMeshRef.current) {
            sableMeshRef.current.update(deltaSeconds);
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