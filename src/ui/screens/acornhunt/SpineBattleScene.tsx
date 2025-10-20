import React, { useRef, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { Renderer, loadAsync } from 'expo-three';
import { SkeletonMesh, normalizeMaterialForSlot } from '../../../spine/SpineThree';
import { loadSpineFromExpoAssets } from '../../../spine/loaders';
import { Physics, AnimationState, Skeleton } from '@esotericsoftware/spine-core';
import { useTheme } from '../../../data/hooks/useTheme';
import { Combatant } from '../../../game/acornhunt/types';

// Simple cube placeholders for now
interface CharacterPlaceholder {
  mesh: THREE.Mesh;
  combatantId: string;
  targetPosition: THREE.Vector3;
  isMovingToAttack?: boolean;
}

interface SpineBattleSceneProps {
  allies: Combatant[];
  enemies: Combatant[];
  animatingCombatants: Set<string>;
  onSceneReady?: () => void;
}

export function SpineBattleScene({
  allies,
  enemies,
  animatingCombatants,
  onSceneReady
}: SpineBattleSceneProps) {
  const { colors } = useTheme();
  const rafRef = useRef<number>(0);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);

  const characterPlaceholdersRef = useRef<Map<string, CharacterPlaceholder>>(new Map());
  const battleFieldRef = useRef<THREE.Mesh | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initStep, setInitStep] = useState<string>('Starting...');

  // Add detailed logging
  useEffect(() => {
    console.log('🎬 SpineBattleScene mounted');
    console.log('📊 Allies:', allies.length);
    console.log('👹 Enemies:', enemies.length);

    // Simple timeout to move past loading after 3 seconds regardless
    const timeout = setTimeout(() => {
      console.log('⏰ Force completing loading after timeout');
      setIsLoading(false);
      setInitStep('Force completed');
      onSceneReady?.();
    }, 3000);

    return () => {
      console.log('🧹 SpineBattleScene unmounting');
      clearTimeout(timeout);
    };
  }, [allies.length, enemies.length, onSceneReady]);

  // Load forest battle background using simple texture (Spine loading has issues)
  const loadForestBackground = async (): Promise<THREE.Mesh | null> => {
    try {
      console.log('🌲 Loading forest background as textured plane (Spine fallback)...');

      // Use loadAsync from expo-three like the spine loaders do
      const textureAsset = require('../../../assets/AcornHunt/Scene/AcornHuntFightScene.png');
      console.log('📦 Loading texture with expo-three loadAsync...');

      const texture = await loadAsync(textureAsset);

      // Apply the same texture settings as the spine loaders but keep flipY true for regular images
      texture.flipY = true; // Keep true for regular images (not Spine atlases)
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      // mark as sRGB so sampling is linearized correctly in shader
      (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      texture.needsUpdate = true;

      console.log('✅ Forest texture loaded with expo-three loadAsync');
      console.log('🎨 Texture dimensions:', texture.image?.width, 'x', texture.image?.height);

      return { texture, imageWidth: texture.image?.width || 1654, imageHeight: texture.image?.height || 1279 };

    } catch (error) {
      console.error('❌ Failed to load forest background:', error);
      return null;
    }
  };

  // Create forest background mesh with proper viewport scaling
  const createForestMesh = (texture: THREE.Texture, imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number): THREE.Mesh => {
    console.log('📐 Calculating forest background scale...');
    console.log('📐 Viewport dimensions:', viewportWidth, 'x', viewportHeight);
    console.log('📐 Image dimensions:', imageWidth, 'x', imageHeight);

    // Calculate scale to fit image within viewport while maintaining aspect ratio
    const viewportAspect = viewportWidth / viewportHeight;
    const imageAspect = imageWidth / imageHeight;

    let scale: number;
    if (imageAspect > viewportAspect) {
      // Image is wider than viewport - scale based on width
      scale = viewportWidth / imageWidth;
    } else {
      // Image is taller than viewport - scale based on height
      scale = viewportHeight / imageHeight;
    }

    // Add some padding (fill ~90% of viewport)
    scale *= 0.9;

    console.log('📐 Calculated scale:', scale);

    // Store the scale for character positioning
    forestScaleRef.current = scale;

    // Create plane geometry with actual image dimensions
    const geometry = new THREE.PlaneGeometry(imageWidth, imageHeight);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: false,
      side: THREE.DoubleSide
    });
    material.needsUpdate = true;

    const mesh = new THREE.Mesh(geometry, material);
    console.log('🎯 Material created with calculated scaling');

    // Apply calculated scale
    mesh.scale.set(scale, scale, scale);
    mesh.position.set(0, 0, -5); // Behind characters

    console.log('🎯 Forest background positioned at:', mesh.position);
    console.log('📏 Forest background scaled to:', mesh.scale);
    console.log('✅ Forest background created successfully');

    return mesh;
  };

  // Create simple cube placeholders for characters
  const createCharacterPlaceholder = (combatant: Combatant, position: THREE.Vector3, isAlly: boolean): CharacterPlaceholder => {
    const geometry = new THREE.BoxGeometry(50, 50, 50);
    const material = new THREE.MeshBasicMaterial({
      color: isAlly ? 0x00ff00 : 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    // Add text label (simplified)
    console.log(`Created placeholder for ${combatant.character.name} at position`, position);

    return {
      mesh,
      combatantId: combatant.id,
      targetPosition: position.clone(),
    };
  };

  // Store texture result for later mesh creation
  const forestTextureRef = useRef<{ texture: THREE.Texture; imageWidth: number; imageHeight: number } | null>(null);
  const forestScaleRef = useRef<number>(0.1);

  // Bone positions from AcornHuntFightScene.json
  const SPINE_BONE_POSITIONS = {
    // Player positions (left side in Spine coordinates)
    PlayerFront: { x: -484.15, y: 109.79 },
    PlayerMid: { x: -388.73, y: 297.06 },
    PlayerBack: { x: -276.73, y: 468.49 },
    // Enemy positions (right side in Spine coordinates)
    EnemyFront: { x: 483.01, y: 117.88 },
    EnemyMid: { x: 350.37, y: 300.95 },
    EnemyBack: { x: 268.81, y: 471.9 },
    // Mid positions (center, for attack movements)
    MidFront: { x: 1.9, y: 114.98 },
    MidMid: { x: -0.34, y: 294.85 },
    MidBack: { x: -1.52, y: 466.48 }
  };

  // Convert Spine bone position to Three.js world position
  const spineToThreePosition = (spineBone: { x: number; y: number }, scale: number): THREE.Vector3 => {
    // Apply the same scale that was applied to the background mesh
    // Let's try a simpler approach first - just flip Y axis
    const position = new THREE.Vector3(
      spineBone.x * scale, // X coordinate stays the same
      -spineBone.y * scale, // Simply flip Y coordinate
      1 // In front of background
    );

    console.log(`🎯 Spine bone (${spineBone.x}, ${spineBone.y}) -> Three.js (${position.x}, ${position.y}, ${position.z}) with scale ${scale}`);

    return position;
  };

  // Position definitions for battle layout using Spine bone positions
  const getPositionForSlot = (slotIndex: number, isAlly: boolean, backgroundScale: number = 0.1): THREE.Vector3 => {
    if (isAlly) {
      // Player positions (left side)
      switch (slotIndex) {
        case 0: return spineToThreePosition(SPINE_BONE_POSITIONS.PlayerFront, backgroundScale);
        case 1: return spineToThreePosition(SPINE_BONE_POSITIONS.PlayerMid, backgroundScale);
        case 2: return spineToThreePosition(SPINE_BONE_POSITIONS.PlayerBack, backgroundScale);
        default: return spineToThreePosition(SPINE_BONE_POSITIONS.PlayerFront, backgroundScale);
      }
    } else {
      // Enemy positions (right side)
      switch (slotIndex) {
        case 0: return spineToThreePosition(SPINE_BONE_POSITIONS.EnemyFront, backgroundScale);
        case 1: return spineToThreePosition(SPINE_BONE_POSITIONS.EnemyMid, backgroundScale);
        case 2: return spineToThreePosition(SPINE_BONE_POSITIONS.EnemyBack, backgroundScale);
        default: return spineToThreePosition(SPINE_BONE_POSITIONS.EnemyFront, backgroundScale);
      }
    }
  };

  // Initialize scene with forest background and placeholders
  const initializeScene = async () => {
    try {
      console.log('🎯 Initializing battle scene...');
      setInitStep('Loading forest background...');

      // Load forest background with proper viewport scaling
      console.log('🌲 Attempting to load forest background...');
      try {
        const textureResult = await loadForestBackground();
        if (textureResult) {
          // Store texture data for later mesh creation with viewport dimensions
          forestTextureRef.current = textureResult;
          console.log('✅ Forest texture loaded, will create mesh with viewport dimensions');
        } else {
          console.log('⚠️ Forest background returned null');
        }
      } catch (bgError) {
        console.error('❌ Forest background loading failed:', bgError);
        console.log('🔄 Continuing without forest background');
      }

      setInitStep('Creating placeholders...');

      // Note: Character placeholders will be created in GL context setup after forest mesh scaling is determined

      console.log('🎉 Battle scene initialized successfully');
      setInitStep('Scene ready');
      setIsLoading(false);
      onSceneReady?.();

    } catch (error) {
      console.error('❌ Failed to initialize battle scene:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setInitStep('Failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsLoading(false);
    }
  };

  // Animation loop (following ShadedShopViewport pattern)
  const animate = (gl: WebGLRenderingContext) => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    try {
      const deltaSeconds = 1/60; // Fixed 60fps for simplicity

      // No animation needed for simple textured plane background

      // Simple rotation animation for character placeholders
      try {
        characterPlaceholdersRef.current.forEach((placeholder) => {
          if (placeholder && placeholder.mesh) {
            placeholder.mesh.rotation.y += 0.01;

            // Handle attack animation
            if (animatingCombatants.has(placeholder.combatantId)) {
              placeholder.mesh.scale.setScalar(1.2);
            } else {
              placeholder.mesh.scale.setScalar(1.0);
            }
          }
        });
      } catch (placeholderError) {
        console.error('❌ Placeholder animation error:', placeholderError);
      }

      // Render the scene
      try {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      } catch (renderError) {
        console.error('❌ Render error:', renderError);
        // Try to continue
      }

      // CRITICAL: This was missing - needed for Expo GLView!
      gl.endFrameEXP();

      rafRef.current = requestAnimationFrame(() => animate(gl));
    } catch (error) {
      console.error('❌ Animation loop error:', error);
      // Try to restart animation loop after a brief delay
      setTimeout(() => {
        try {
          rafRef.current = requestAnimationFrame(() => animate(gl));
        } catch (restartError) {
          console.error('❌ Failed to restart animation loop:', restartError);
        }
      }, 100);
    }
  };

  // Setup GL context (following ShadedShopViewport pattern)
  const onContextCreate = async (gl: WebGLRenderingContext) => {
    try {
      console.log('🎮 GL context creation started');
      setInitStep('Setting up WebGL...');

      // Setup viewport (critical for proper rendering)
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      gl.viewport(0, 0, w, h);

      // Create renderer with proper settings
      console.log('📱 Creating Three.js renderer...');
      const renderer = new Renderer({ gl });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.setViewport(0, 0, w, h);
      renderer.autoClear = true;
      renderer.setClearColor(0x4a5d23, 1); // Forest green background
      rendererRef.current = renderer;
      console.log('✅ Renderer created');

      // Create scene with background
      console.log('🎭 Creating Three.js scene...');
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x4a5d23);
      sceneRef.current = scene;
      console.log('✅ Scene created');

      // Create orthographic camera (similar to working pattern)
      console.log('📷 Creating camera...');
      const zoomFactor = 1.0; // Adjust as needed
      const camera = new THREE.OrthographicCamera(
        (-w / 2) * zoomFactor,
        (w / 2) * zoomFactor,
        (h / 2) * zoomFactor,
        (-h / 2) * zoomFactor,
        0.1,
        2000
      );
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      cameraRef.current = camera;
      console.log('✅ Camera created');

      // Add lighting
      console.log('💡 Adding lighting...');
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);
      console.log('✅ Lighting added');

      // Initialize battle scene
      console.log('🚀 Initializing battle scene...');
      setInitStep('Creating battle scene...');
      await initializeScene();

      // TEMPORARILY DISABLE test plane to isolate forest background
      // try {
      //   console.log('🧪 Adding test plane...');
      //   const testGeometry = new THREE.PlaneGeometry(100, 100);
      //   const testMaterial = new THREE.MeshBasicMaterial({
      //     color: 0xff0000,
      //     transparent: false,
      //     side: THREE.DoubleSide
      //   });
      //   const testPlane = new THREE.Mesh(testGeometry, testMaterial);
      //   testPlane.position.set(300, 0, -8); // Position to the right side
      //   scene.add(testPlane);
      //   console.log('✅ Red test plane added');
      // } catch (testError) {
      //   console.error('❌ Test plane failed:', testError);
      // }

      // Create forest background mesh with proper viewport scaling
      if (forestTextureRef.current) {
        console.log('🌲 Creating forest background mesh with viewport scaling...');
        const forestMesh = createForestMesh(
          forestTextureRef.current.texture,
          forestTextureRef.current.imageWidth,
          forestTextureRef.current.imageHeight,
          w, // viewport width
          h  // viewport height
        );
        battleFieldRef.current = forestMesh;

        // Now create character placeholders with the correct scale
        console.log('🎬 Creating character placeholders with calculated scale:', forestScaleRef.current);
        console.log('🎬 Viewport dimensions:', w, 'x', h);

        // Create ally placeholders using correct Spine bone positions
        console.log('🤝 Creating', allies.length, 'ally placeholders');
        allies.forEach((ally, index) => {
          const position = getPositionForSlot(index, true, forestScaleRef.current);
          const placeholder = createCharacterPlaceholder(ally, position, true);
          characterPlaceholdersRef.current.set(ally.id, placeholder);
          console.log(`✅ Created ally placeholder for ${ally.character.name} at Spine position`, position);
        });

        // Create enemy placeholders using correct Spine bone positions
        console.log('👹 Creating', enemies.length, 'enemy placeholders');
        enemies.forEach((enemy, index) => {
          const position = getPositionForSlot(index, false, forestScaleRef.current);
          const placeholder = createCharacterPlaceholder(enemy, position, false);
          characterPlaceholdersRef.current.set(enemy.id, placeholder);
          console.log(`✅ Created enemy placeholder for ${enemy.character.name} at Spine position`, position);
        });
      }

      // Add forest background to scene first (so it renders behind)
      if (battleFieldRef.current) {
        try {
          console.log('🌲 Adding forest background to scene...');

          // Debug the forest mesh properties
          console.log('🔍 Forest mesh visible:', battleFieldRef.current.visible);
          console.log('🔍 Forest mesh children:', battleFieldRef.current.children.length);

          // Traverse and check materials
          battleFieldRef.current.traverse((child: THREE.Object3D) => {
            const anyChild = child as any;
            if (anyChild.isMesh && anyChild.material) {
              console.log('🔍 Found mesh child with material:', anyChild.material.type);
              const material = anyChild.material;
              if (material.transparent !== undefined) material.transparent = true;
              if (material.depthTest !== undefined) material.depthTest = false;
              if (material.depthWrite !== undefined) material.depthWrite = false;
              material.needsUpdate = true;
            }
          });

          scene.add(battleFieldRef.current);
          console.log('✅ Forest background added to scene');
        } catch (sceneError) {
          console.error('❌ Failed to add forest background to scene:', sceneError);
          console.log('🔄 Continuing without forest background in scene');
        }
      } else {
        console.log('ℹ️ No forest background to add to scene');
      }

      // Add character placeholders to scene
      console.log('🎬 Adding', characterPlaceholdersRef.current.size, 'placeholders to scene...');
      characterPlaceholdersRef.current.forEach((placeholder) => {
        // Set material properties for proper rendering (like ShadedShopViewport)
        placeholder.mesh.traverse((child: THREE.Object3D) => {
          const anyChild = child as any;
          if (anyChild.isMesh && anyChild.material) {
            const material = anyChild.material;
            if (material.transparent !== undefined) material.transparent = true;
            if (material.depthTest !== undefined) material.depthTest = false;
            if (material.depthWrite !== undefined) material.depthWrite = false;
            material.needsUpdate = true;
          }
        });
        scene.add(placeholder.mesh);
      });
      console.log('✅ All placeholders added to scene');

      console.log('🎉 GL context setup complete - starting animation');
      setInitStep('Starting animation...');

      // Start animation loop with gl parameter
      animate(gl);

    } catch (error) {
      console.error('❌ Failed to setup GL context:', error);
      setError(error instanceof Error ? error.message : 'GL setup failed');
      setInitStep('GL setup failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: colors.text.primary, fontSize: 16, marginBottom: 10 }}>Error loading battle scene:</Text>
        <Text style={{ color: colors.status?.error || '#ef4444', textAlign: 'center' }}>{error}</Text>
        <Text style={{ color: colors.text.secondary, marginTop: 10, fontSize: 12 }}>Step: {initStep}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: colors.text.primary, fontSize: 16, marginBottom: 10 }}>Loading battle scene...</Text>
        <Text style={{ color: colors.text.secondary, fontSize: 14 }}>Step: {initStep}</Text>
        <Text style={{ color: colors.text.secondary, fontSize: 12, marginTop: 10 }}>
          Allies: {allies.length} | Enemies: {enemies.length}
        </Text>
      </View>
    );
  }

  return (
    <GLView
      style={{ flex: 1 }}
      onContextCreate={onContextCreate}
    />
  );
}