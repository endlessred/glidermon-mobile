import React, { useRef } from 'react';
import { View, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as THREE from 'three';
import { Renderer } from 'expo-three';
import {
  Skeleton,
  AnimationState,
  AnimationStateData,
  AtlasAttachmentLoader,
  SkeletonJson,
  TextureAtlas,
  Physics
} from '@esotericsoftware/spine-core';
import { SkeletonMesh } from '../../spine/SpineThree';

interface SpineCharacterProps {
  x?: number;
  y?: number;
  scale?: number;
  animation?: string;
  skin?: string;
}

export default function SpineCharacter({
  x = 100,
  y = 100,
  scale = 1,
  animation = "idle",
  skin
}: SpineCharacterProps) {
  const rafRef = useRef<number>(0);

  const onContextCreate = async (gl: any) => {
    try {
      console.log('🎮 Initializing Spine with new adapter...');

      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      console.log(`Canvas size: ${width}x${height}`);

      // Create Three.js scene with flipped Y coordinate system
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000); // Flipped Y coordinates
      camera.position.z = 1;

      const renderer = new Renderer({ gl });
      renderer.setSize(width, height);
      renderer.setClearColor(0x0a0a12, 0); // Dark blue background to match theme

      console.log('📦 Loading Spine assets with complete Metro bypass...');

      // Handle Metro's auto-parsing of JSON files by working entirely with assets
      const atlasRequire = require('../../assets/GliderMonSpine/skeleton.atlas');
      const jsonRequire = require('../../assets/GliderMonSpine/skeleton.json');
      const textureRequire = require('../../assets/GliderMonSpine/skeleton.png');

      console.log('Asset types:', {
        atlas: typeof atlasRequire,
        json: typeof jsonRequire,
        texture: typeof textureRequire
      });

      // Since Metro auto-parsed JSON, use it directly
      const skeletonJsonData = jsonRequire;
      console.log('Using Metro-parsed JSON directly');

      // Load atlas file (always needs to be read as text)
      const atlasAsset = Asset.fromModule(atlasRequire);
      await atlasAsset.downloadAsync();
      const atlasText = await FileSystem.readAsStringAsync(atlasAsset.localUri ?? atlasAsset.uri);

      console.log('🖼️ Loading actual Spine texture using expo-three...');

      const pageTextures: Record<string, THREE.Texture> = {};
      const filename = 'skeleton.png';

      // Use expo-three's loadAsync for more reliable texture loading
      try {
        const { loadAsync } = require('expo-three');
        const texture = await loadAsync(textureRequire);

        // Configure for Spine
        texture.flipY = false; // Important for Spine textures
        texture.generateMipmaps = true;
        texture.needsUpdate = true;

        pageTextures[filename] = texture;
        console.log('✅ Real Spine texture loaded successfully with expo-three');
      } catch (error) {
        console.error('❌ Failed to load texture with expo-three:', error);
        console.log('🔴 Using colored debug texture as fallback');

        // Create a more visible debug texture - green square
        const size = 64;
        const data = new Uint8Array(size * size * 4);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 0;     // Red
          data[i + 1] = 255; // Green
          data[i + 2] = 0;   // Blue
          data[i + 3] = 255; // Alpha
        }

        const debugTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        debugTexture.flipY = false;
        debugTexture.needsUpdate = true;
        pageTextures[filename] = debugTexture;
      }

      console.log('🏗️ Building Spine objects...');
      const atlas = new TextureAtlas(atlasText, (pageName: string) => {
        console.log('Atlas requesting page:', pageName);
        return pageTextures[pageName] || pageTextures[Object.keys(pageTextures)[0]];
      });

      const attachmentLoader = new AtlasAttachmentLoader(atlas);
      const skeletonJson = new SkeletonJson(attachmentLoader);
      const skeletonData = skeletonJson.readSkeletonData(skeletonJsonData);

      const skeleton = new Skeleton(skeletonData);
      const stateData = new AnimationStateData(skeletonData);
      stateData.defaultMix = 0.08;
      const state = new AnimationState(stateData);

      console.log('🎬 Setting up animation...');
      if (skeletonData.animations.length > 0) {
        const animName = animation && skeletonData.animations.find(a => a.name === animation)
          ? animation
          : skeletonData.animations[0].name;
        console.log('Setting animation:', animName);
        state.setAnimation(0, animName, true);
      }

      skeleton.setToSetupPose();

      const resolveTexture = (pageOrFileName: string): THREE.Texture | undefined => {
        if (pageTextures[pageOrFileName]) return pageTextures[pageOrFileName];
        const short = pageOrFileName.split("/").pop()!;
        return pageTextures[short];
      };

      // Use Spine's own transform system instead of Three.js transforms
      const finalScale = scale * 0.30; // Double the size for better visibility
      const posX = width * 0.5; // Center horizontally
      const posY = height * 0.4; // Move down to show full character (lower values = down with flipped Y)
      console.log(`🎯 SPINE TRANSFORMS [${new Date().toISOString()}]: scale=${finalScale}, pos=(${posX}, ${posY}), canvas=(${width}x${height})`);

      // Apply transforms to the Spine skeleton (not the Three.js mesh)
      skeleton.scaleX = finalScale;
      skeleton.scaleY = finalScale;
      skeleton.x = posX;
      skeleton.y = posY;

      console.log('🎭 Creating SkeletonMesh with new adapter...');
      const mesh = new SkeletonMesh(skeleton, state, resolveTexture);

      // Keep Three.js mesh at identity - let Spine handle the transforms
      mesh.position.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      scene.add(mesh);

      console.log('📋 Character added to scene, mesh children:', mesh.children.length);

      console.log('✅ Spine setup complete, starting render loop...');

      let lastTime = Date.now() / 1000;
      let frameCount = 0;

      const renderLoop = () => {
        try {
          const now = Date.now() / 1000;
          const delta = now - lastTime;
          lastTime = now;
          frameCount++;

          if (frameCount % 60 === 0) {
            console.log(`Frame ${frameCount}, delta: ${delta.toFixed(3)}s`);
          }

          // Update Spine animation and refresh geometry
          state.update(delta);
          state.apply(skeleton);
          skeleton.updateWorldTransform(Physics.update);
          mesh.refreshMeshes();

          renderer.render(scene, camera);
          gl.endFrameEXP();

          rafRef.current = requestAnimationFrame(renderLoop);
        } catch (renderError) {
          console.error('❌ Error in render loop:', renderError);
          console.error('Render error stack:', renderError.stack);
        }
      };

      renderLoop();
      console.log('🎮 Spine character initialized successfully with new adapter');

    } catch (err) {
      console.error('❌ Error initializing Spine:', err);
      console.error('Error stack:', err.stack);
    }
  };

  return (
    <View style={{ width: 200, height: 200, overflow: 'hidden', borderRadius: 8 }}>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}