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

// Character display objects (either cube placeholder, Spine mesh, or spritesheet)
interface CharacterDisplay {
  object: THREE.Object3D; // Could be THREE.Mesh (cube/spritesheet) or SkeletonMesh (Spine)
  combatantId: string;
  characterName: string; // Name for animation lookup
  targetPosition: THREE.Vector3;
  homePosition: THREE.Vector3; // Original battlefield position
  isMovingToAttack?: boolean;
  isReturningFromAttack?: boolean;
  isAttacking?: boolean; // Currently playing attack animation
  attackTargetSlot?: number; // Which enemy slot they're attacking (for mid position calculation)
  moveSpeed?: number; // Speed of movement interpolation
  isSpine?: boolean;
  isSpritesheet?: boolean; // New: indicates this is a spritesheet animation
  animationState?: AnimationState;
  skeleton?: Skeleton;
  // Spritesheet animation properties
  spritesheetData?: {
    texture: THREE.Texture;
    frameWidth: number;
    frameHeight: number;
    totalFrames: number;
    columns: number;
    rows: number;
    currentFrame: number;
    frameTime: number; // Time per frame in seconds
    elapsedTime: number; // Time since last frame change
  };
}

interface SpineBattleSceneProps {
  allies: Combatant[];
  enemies: Combatant[];
  animatingCombatants: Set<string>;
  onSceneReady?: () => void;
  onAttackMovementReady?: (startAttack: (combatantId: string, targetSlot: number) => void) => void;
  onAttackAnimationComplete?: (combatantId: string) => void;
}

export function SpineBattleScene({
  allies,
  enemies,
  animatingCombatants,
  onSceneReady,
  onAttackMovementReady,
  onAttackAnimationComplete
}: SpineBattleSceneProps) {
  const { colors } = useTheme();
  const rafRef = useRef<number>(0);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);

  const characterDisplaysRef = useRef<Map<string, CharacterDisplay>>(new Map());
  const battleFieldRef = useRef<THREE.Mesh | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initStep, setInitStep] = useState<string>('Starting...');

  // Keep live references to props used inside RAF loop
  const animatingCombatantsRef = useRef<Set<string>>(new Set());
  const alliesRef = useRef<Combatant[]>([]);
  const enemiesRef = useRef<Combatant[]>([]);

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

  // Keep refs in sync with props for RAF loop
  useEffect(() => { animatingCombatantsRef.current = animatingCombatants; }, [animatingCombatants]);
  useEffect(() => { alliesRef.current = allies; }, [allies]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);

  // Load beetle spritesheet for enemy animations
  const loadBeetleSpritesheet = async (): Promise<THREE.Texture | null> => {
    try {
      console.log('🪲 Loading beetle spritesheet...');

      const textureAsset = require('../../../assets/AcornHunt/EnemySprites/Beetle/BeetleIdle256x25615margin.png');
      console.log('📦 Loading beetle texture with expo-three loadAsync...');

      const texture = await loadAsync(textureAsset);

      // Apply texture settings for spritesheets
      texture.flipY = false; // Important for spritesheets
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.NearestFilter; // Crisp pixel art
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;

      console.log('✅ Beetle spritesheet loaded successfully');
      console.log('🎨 Texture dimensions:', texture.image?.width, 'x', texture.image?.height);

      return texture;
    } catch (error) {
      console.error('❌ Failed to load beetle spritesheet:', error);
      return null;
    }
  };

  // Load forest battle background using simple texture (Spine loading has issues)
  const loadForestBackground = async (): Promise<{ texture: THREE.Texture; imageWidth: number; imageHeight: number } | null> => {
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

  // Load Spine character assets
  const loadSpineCharacter = async (characterName: string) => {
    try {
      console.log(`🦎 Loading Spine character: ${characterName}`);

      // Map character names to asset paths
      const assetMap: Record<string, { atlas: any; json: any; texture: any; texture2?: any }> = {
        'Glider': {
          atlas: require('../../../assets/GliderMonSpine/skeleton.atlas'),
          json: require('../../../assets/GliderMonSpine/skeleton.json'),
          texture: require('../../../assets/GliderMonSpine/skeleton.png'),
          texture2: require('../../../assets/GliderMonSpine/skeleton_2.png')
        },
        'Luma': {
          atlas: require('../../../assets/Luma/Luma.atlas'),
          json: require('../../../assets/Luma/Luma.json'),
          texture: require('../../../assets/Luma/Luma.png')
        },
        'Sable': {
          atlas: require('../../../assets/Sable/Sable.atlas'),
          json: require('../../../assets/Sable/Sable.json'),
          texture: require('../../../assets/Sable/Sable.png')
        }
      };

      const assets = assetMap[characterName];
      if (!assets) {
        console.error(`❌ No assets found for character: ${characterName}`);
        return null;
      }

      // Build texture modules array (include texture2 if it exists for multi-page atlases)
      const textureModules = [assets.texture];
      if (assets.texture2) {
        textureModules.push(assets.texture2);
      }

      const result = await loadSpineFromExpoAssets({
        atlasModule: assets.atlas,
        jsonModule: assets.json,
        textureModules: textureModules,
        defaultMix: 0,
      });

      console.log(`✅ ${characterName} Spine character loaded successfully`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to load Spine character ${characterName}:`, error);
      return null;
    }
  };

  // Create Spine character display
  const createSpineCharacterDisplay = async (combatant: Combatant, position: THREE.Vector3, isAlly: boolean): Promise<CharacterDisplay | null> => {
    try {
      const spineResult = await loadSpineCharacter(combatant.character.name);

      if (!spineResult) {
        // Fallback to cube placeholder
        return createCubeCharacterDisplay(combatant, position, isAlly);
      }

      const { skeleton, state: animationState, resolveTexture } = spineResult;

      // Setup skeleton pose
      skeleton.setToSetupPose();
      for (let i = 0; i < skeleton.slots.length; i++) {
        skeleton.slots[i].setToSetupPose();
      }

      // Create the SkeletonMesh with real texture resolver
      const skeletonMesh = new SkeletonMesh(skeleton, animationState, resolveTexture);
      skeletonMesh.frustumCulled = false;
      skeletonMesh.renderOrder = 10; // draw on top while debugging

      // CRITICAL 1: Put something on track 0 (required for Spine to render)
      try {
        console.log(`🔍 AnimationState structure for ${combatant.character.name}:`, Object.keys(animationState));

        // Try different paths to access skeleton data
        const sData = animationState.data?.skeletonData || skeleton.data || skeleton;
        console.log(`🔍 Skeleton data found:`, !!sData);
        console.log(`🔍 Animations available:`, sData.animations?.length || 'none');

        if (sData.animations && sData.animations.length > 0) {
          // Use the proper idle animation for this character
          const idleAnimation = getIdleAnimation(combatant.character.name);
          const hasIdleAnimation = sData.animations.find((a: any) => a.name === idleAnimation);

          if (hasIdleAnimation) {
            console.log(`🎭 Setting idle animation "${idleAnimation}" for ${combatant.character.name}`);
            setCharacterAnimation(animationState, idleAnimation, true);
          } else {
            // Fallback to first animation
            const fallback = sData.animations[0]?.name;
            console.log(`⚠️ Idle animation "${idleAnimation}" not found for ${combatant.character.name}, using fallback: ${fallback}`);
            if (fallback) {
              setCharacterAnimation(animationState, fallback, true);
            }
          }
        } else {
          console.log(`⚠️ No animations found for ${combatant.character.name}`);
        }
      } catch (animError) {
        console.error(`❌ Animation setup error for ${combatant.character.name}:`, animError);
      }

      // CRITICAL 2: Make materials impossible to fail while debugging
      skeletonMesh.frustumCulled = false;
      skeletonMesh.renderOrder = 999;

      skeletonMesh.traverse((o: any) => {
        if (o.isMesh && o.material) {
          const m = o.material as any;
          m.transparent = true;
          m.depthWrite = false;      // avoid self-occlusion in alpha stacks
          m.alphaTest = 0.0;         // disable cutout while debugging
          m.needsUpdate = true;
        }
      });

      // CRITICAL 3: Position on skeleton (not mesh) - many adapters ignore Object3D transforms
      const characterScale = 0.125; // Appropriately sized for battlefield
      skeleton.scaleX = characterScale;
      skeleton.scaleY = characterScale;

      // Position skeleton at battlefield position (revert to original working approach)
      skeleton.x = position.x;
      skeleton.y = position.y;

      // Keep the THREE object at origin
      skeletonMesh.position.set(0, 0, 0);

      // Important any time you change skeleton transforms:
      skeleton.updateWorldTransform(Physics.update);

      console.log(`✅ Created Spine character for ${combatant.character.name} at skeleton position (${skeleton.x}, ${skeleton.y})`);
      console.log(`🔍 Skeleton scale: (${skeleton.scaleX}, ${skeleton.scaleY})`);
      console.log(`🔍 SkeletonMesh children count:`, skeletonMesh.children.length);
      console.log(`🔍 SkeletonMesh visible:`, skeletonMesh.visible);

      // CRITICAL 4: One-frame sanity: attachments and drawables
      console.log(`🔍 Attachments for ${combatant.character.name}:`,
        skeleton.slots.map(s => s.attachment?.name ?? null)
      );

      console.log(`🔍 Mesh children count for ${combatant.character.name}:`,
        skeletonMesh.children?.length ?? 0
      );

      // Force one update cycle to ensure meshes are built
      animationState.update(0);
      animationState.apply(skeleton);
      skeleton.updateWorldTransform(Physics.update);
      if ((skeletonMesh as any).update) (skeletonMesh as any).update(0);

      return {
        object: skeletonMesh,
        combatantId: combatant.id,
        characterName: combatant.character.name,
        targetPosition: position.clone(),
        homePosition: position.clone(),
        moveSpeed: 0.05, // Movement interpolation speed
        isSpine: true,
        animationState,
        skeleton
      };

    } catch (error) {
      console.error(`❌ Failed to create Spine character for ${combatant.character.name}:`, error);
      // Fallback to cube placeholder
      return createCubeCharacterDisplay(combatant, position, isAlly);
    }
  };

  // Create beetle spritesheet character display
  const createBeetleSpritesheetDisplay = (combatant: Combatant, position: THREE.Vector3, beetleTexture: THREE.Texture): CharacterDisplay => {
    console.log(`🪲 Creating beetle spritesheet for ${combatant.character.name}`);

    // Spritesheet specs: 6x6 grid, 36 frames, 256x256 per frame, 15px margin
    const frameWidth = 256;
    const frameHeight = 256;
    const columns = 6;
    const rows = 6;
    const totalFrames = 36;
    const frameDuration = 1.5 / totalFrames; // 1.5 seconds total animation (2x speed)

    // Create plane geometry for the sprite (1.5x scale requested)
    const geometry = new THREE.PlaneGeometry(frameWidth * 0.45, frameHeight * 0.45); // 0.3 * 1.5 = 0.45

    // Create material with the spritesheet texture
    const material = new THREE.MeshBasicMaterial({
      map: beetleTexture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    });

    // Set initial UV coordinates for first frame (0,0)
    const uvAttribute = geometry.getAttribute('uv');
    const uvs = uvAttribute.array as Float32Array;

    // Calculate UV coordinates for frame 0 (top-left)
    const frameU = 0 / columns;
    const frameV = 0 / rows;
    const frameUWidth = 1 / columns;
    const frameVHeight = 1 / rows;

    // Set UV coordinates for the quad (flipped V to fix upside-down rendering)
    uvs[0] = frameU;                 // bottom-left U
    uvs[1] = frameV;                 // bottom-left V (flipped)
    uvs[2] = frameU + frameUWidth;   // bottom-right U
    uvs[3] = frameV;                 // bottom-right V (flipped)
    uvs[4] = frameU;                 // top-left U
    uvs[5] = frameV + frameVHeight;  // top-left V (flipped)
    uvs[6] = frameU + frameUWidth;   // top-right U
    uvs[7] = frameV + frameVHeight;  // top-right V (flipped)

    uvAttribute.needsUpdate = true;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    console.log(`✅ Created beetle spritesheet for ${combatant.character.name} at position`, position);

    return {
      object: mesh,
      combatantId: combatant.id,
      characterName: combatant.character.name,
      targetPosition: position.clone(),
      homePosition: position.clone(),
      moveSpeed: 0.05,
      isSpritesheet: true,
      spritesheetData: {
        texture: beetleTexture,
        frameWidth,
        frameHeight,
        totalFrames,
        columns,
        rows,
        currentFrame: 0,
        frameTime: frameDuration,
        elapsedTime: 0
      }
    };
  };

  // Create simple cube placeholder (fallback)
  const createCubeCharacterDisplay = (combatant: Combatant, position: THREE.Vector3, isAlly: boolean): CharacterDisplay => {
    const geometry = new THREE.BoxGeometry(50, 50, 50);
    const material = new THREE.MeshBasicMaterial({
      color: isAlly ? 0x00ff00 : 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    console.log(`Created cube placeholder for ${combatant.character.name} at position`, position);

    return {
      object: mesh,
      combatantId: combatant.id,
      characterName: combatant.character.name,
      targetPosition: position.clone(),
      homePosition: position.clone(),
      moveSpeed: 0.05, // Movement interpolation speed
      isSpine: false
    };
  };

  // Store texture result for later mesh creation
  const forestTextureRef = useRef<{ texture: THREE.Texture; imageWidth: number; imageHeight: number } | null>(null);
  const forestScaleRef = useRef<number>(0.1);
  const beetleTextureRef = useRef<THREE.Texture | null>(null);

  // Bone positions from AcornHuntFightScene.json
  const SPINE_BONE_POSITIONS = {
    // Player positions (left side in Spine coordinates)
    PlayerFront: { x: -484.15, y: 109.79 },
    PlayerMid: { x: -388.73, y: 297.06 },
    PlayerBack: { x: -276.73, y: 468.49 },
    // Enemy positions (right side in Spine coordinates, moved closer to center)
    EnemyFront: { x: 350.0, y: 117.88 },   // moved from 483.01 to 350.0 (closer to center)
    EnemyMid: { x: 250.0, y: 300.95 },     // moved from 350.37 to 250.0 (closer to center)
    EnemyBack: { x: 180.0, y: 471.9 },     // moved from 268.81 to 180.0 (closer to center)
    // Mid positions (center, for attack movements)
    MidFront: { x: 1.9, y: 114.98 },
    MidMid: { x: -0.34, y: 294.85 },
    MidBack: { x: -1.52, y: 466.48 }
  };

  // Convert Spine bone position to Three.js world position
  const spineToThreePosition = (spineBone: { x: number; y: number }, scale: number, viewportHeight: number = 0): THREE.Vector3 => {
    // Apply the same scale that was applied to the background mesh
    // Let's try a simpler approach first - just flip Y axis
    const yOffset = viewportHeight * 0.125; // 1/8th of viewport height down
    const position = new THREE.Vector3(
      spineBone.x * scale, // X coordinate stays the same
      -spineBone.y * scale - yOffset, // Simply flip Y coordinate and add downward offset
      5 // Much closer to camera (was 1, now 5)
    );

    console.log(`🎯 Spine bone (${spineBone.x}, ${spineBone.y}) -> Three.js (${position.x}, ${position.y}, ${position.z}) with scale ${scale}, yOffset ${yOffset}`);

    return position;
  };

  // Position definitions for battle layout using Spine bone positions
  const getPositionForSlot = (slotIndex: number, isAlly: boolean, backgroundScale: number = 0.1, viewportHeight: number = 0): THREE.Vector3 => {
    if (isAlly) {
      // Player positions (left side)
      switch (slotIndex) {
        case 0: return spineToThreePosition(SPINE_BONE_POSITIONS.PlayerFront, backgroundScale, viewportHeight);
        case 1: return spineToThreePosition(SPINE_BONE_POSITIONS.PlayerMid, backgroundScale, viewportHeight);
        case 2: return spineToThreePosition(SPINE_BONE_POSITIONS.PlayerBack, backgroundScale, viewportHeight);
        default: return spineToThreePosition(SPINE_BONE_POSITIONS.PlayerFront, backgroundScale, viewportHeight);
      }
    } else {
      // Enemy positions (right side)
      switch (slotIndex) {
        case 0: return spineToThreePosition(SPINE_BONE_POSITIONS.EnemyFront, backgroundScale, viewportHeight);
        case 1: return spineToThreePosition(SPINE_BONE_POSITIONS.EnemyMid, backgroundScale, viewportHeight);
        case 2: return spineToThreePosition(SPINE_BONE_POSITIONS.EnemyBack, backgroundScale, viewportHeight);
        default: return spineToThreePosition(SPINE_BONE_POSITIONS.EnemyFront, backgroundScale, viewportHeight);
      }
    }
  };

  // Get mid position for attack movement based on target slot
  const getMidPositionForTargetSlot = (targetSlot: number, backgroundScale: number = 0.1, viewportHeight: number = 0): THREE.Vector3 => {
    switch (targetSlot) {
      case 0: return spineToThreePosition(SPINE_BONE_POSITIONS.MidFront, backgroundScale, viewportHeight);
      case 1: return spineToThreePosition(SPINE_BONE_POSITIONS.MidMid, backgroundScale, viewportHeight);
      case 2: return spineToThreePosition(SPINE_BONE_POSITIONS.MidBack, backgroundScale, viewportHeight);
      default: return spineToThreePosition(SPINE_BONE_POSITIONS.MidFront, backgroundScale, viewportHeight);
    }
  };

  // Store viewport dimensions for movement calculations
  const viewportRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Animation mappings for different characters
  const getIdleAnimation = (characterName: string): string => {
    switch (characterName) {
      case 'Glider': return 'Idle/Idle';
      case 'Sable': return 'Idle';
      case 'Luma': return 'Idle';
      default: return 'Idle';
    }
  };

  const getAttackAnimation = (characterName: string): string | null => {
    switch (characterName) {
      case 'Glider': return 'AcornHunt/StretchPunch';
      case 'Sable': return 'AcornHunt/CounterSmash';
      case 'Luma': return null; // No attack animation yet
      default: return null;
    }
  };

  // Update spritesheet UV coordinates for animation
  const updateSpritesheetFrame = (characterDisplay: CharacterDisplay, newFrame: number) => {
    if (!characterDisplay.isSpritesheet || !characterDisplay.spritesheetData) return;

    const { columns, rows } = characterDisplay.spritesheetData;
    const geometry = (characterDisplay.object as THREE.Mesh).geometry;
    const uvAttribute = geometry.getAttribute('uv');
    const uvs = uvAttribute.array as Float32Array;

    // Calculate which row and column this frame is in
    const col = newFrame % columns;
    const row = Math.floor(newFrame / columns);

    // Calculate UV coordinates
    const frameU = col / columns;
    const frameV = row / rows;
    const frameUWidth = 1 / columns;
    const frameVHeight = 1 / rows;

    // Update UV coordinates for the quad (flipped V to fix upside-down rendering)
    uvs[0] = frameU;                 // bottom-left U
    uvs[1] = frameV;                 // bottom-left V (flipped)
    uvs[2] = frameU + frameUWidth;   // bottom-right U
    uvs[3] = frameV;                 // bottom-right V (flipped)
    uvs[4] = frameU;                 // top-left U
    uvs[5] = frameV + frameVHeight;  // top-left V (flipped)
    uvs[6] = frameU + frameUWidth;   // top-right U
    uvs[7] = frameV + frameVHeight;  // top-right V (flipped)

    uvAttribute.needsUpdate = true;
    characterDisplay.spritesheetData.currentFrame = newFrame;
  };

  // Helper to set animation safely
  const setCharacterAnimation = (animationState: AnimationState, animationName: string, loop: boolean = true) => {
    try {
      console.log(`🎭 Setting animation: ${animationName} (loop: ${loop})`);
      animationState.setAnimation(0, animationName, loop);
    } catch (error) {
      console.error(`❌ Failed to set animation ${animationName}:`, error);
    }
  };

  // Start attack movement for a character
  const startAttackMovement = (combatantId: string, targetSlot: number) => {
    console.log(`🎯 startAttackMovement called for ${combatantId} to slot ${targetSlot}`);

    const characterDisplay = characterDisplaysRef.current.get(combatantId);
    if (!characterDisplay) {
      console.log(`❌ No character display found for ${combatantId}`);
      console.log(`📋 Available characters:`, Array.from(characterDisplaysRef.current.keys()));
      return;
    }

    const midPosition = getMidPositionForTargetSlot(
      targetSlot,
      forestScaleRef.current,
      viewportRef.current.height
    );

    console.log(`📍 Current skeleton position: (${characterDisplay.skeleton?.x || 'N/A'}, ${characterDisplay.skeleton?.y || 'N/A'})`);
    console.log(`📍 Target position:`, midPosition);
    console.log(`📐 Forest scale: ${forestScaleRef.current}, Viewport height: ${viewportRef.current.height}`);

    characterDisplay.isMovingToAttack = true;
    characterDisplay.isReturningFromAttack = false;
    characterDisplay.attackTargetSlot = targetSlot;
    characterDisplay.targetPosition = midPosition;

    console.log(`✅ Movement flags set: isMovingToAttack=${characterDisplay.isMovingToAttack}`);
  };

  // Start return movement for a character
  const startReturnMovement = (combatantId: string) => {
    const characterDisplay = characterDisplaysRef.current.get(combatantId);
    if (!characterDisplay) return;

    characterDisplay.isMovingToAttack = false;
    characterDisplay.isReturningFromAttack = true;
    characterDisplay.targetPosition = characterDisplay.homePosition.clone();

    console.log(`🏠 ${combatantId} starting return movement to home position`, characterDisplay.homePosition);
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

      // Load beetle spritesheet for enemies
      console.log('🪲 Attempting to load beetle spritesheet...');
      try {
        const beetleTexture = await loadBeetleSpritesheet();
        if (beetleTexture) {
          beetleTextureRef.current = beetleTexture;
          console.log('✅ Beetle spritesheet loaded');
        } else {
          console.log('⚠️ Beetle spritesheet returned null');
        }
      } catch (beetleError) {
        console.error('❌ Beetle spritesheet loading failed:', beetleError);
        console.log('🔄 Continuing without beetle sprites');
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

      // Debug log animating combatants every 3 seconds
      if (Math.floor(Date.now() / 3000) !== Math.floor((Date.now() - 16) / 3000)) {
        const ids = Array.from(animatingCombatantsRef.current);
        console.log('🎬 animatingCombatants status:', ids.length ? ids : 'EMPTY');
      }

      // Update character animations
      try {
        characterDisplaysRef.current.forEach((characterDisplay) => {
          if (characterDisplay && characterDisplay.object) {
            // Update Spine characters
            if (characterDisplay.isSpine && characterDisplay.animationState && characterDisplay.skeleton) {
              try {
                const { skeleton, animationState } = characterDisplay;
                animationState.update(deltaSeconds);
                animationState.apply(skeleton);

                // CRITICAL: ALWAYS update world transform every frame for animations to work
                skeleton.updateWorldTransform(Physics.update);

                // Also update SkeletonMesh if available
                const skeletonMesh = characterDisplay.object as any;
                if (skeletonMesh.update && typeof skeletonMesh.update === 'function') {
                  skeletonMesh.update(deltaSeconds);
                }

                // Debug current animation occasionally
                if (Math.random() < 0.005) { // ~0.5% of frames
                  const currentTrack = animationState.tracks[0];
                  const currentAnimation = currentTrack?.animation?.name || 'none';
                  console.log(`🎭 ${characterDisplay.combatantId} current animation: ${currentAnimation}, attacking: ${characterDisplay.isAttacking}, moving: ${characterDisplay.isMovingToAttack}, returning: ${characterDisplay.isReturningFromAttack}`);
                }

                // Check for attack animation completion
                if (characterDisplay.isAttacking) {
                  const currentTrack = animationState.tracks[0];
                  if (currentTrack && currentTrack.isComplete()) {
                    console.log(`🎭 ${characterDisplay.combatantId} attack animation completed, starting return movement`);
                    characterDisplay.isAttacking = false;
                    startReturnMovement(characterDisplay.combatantId);
                  }
                }
              } catch (spineError) {
                console.error('❌ Spine character animation error:', spineError);
              }
            } else if (characterDisplay.isSpritesheet && characterDisplay.spritesheetData) {
              // Update spritesheet animation
              const spritesheetData = characterDisplay.spritesheetData;
              spritesheetData.elapsedTime += deltaSeconds;

              // Check if it's time for the next frame
              if (spritesheetData.elapsedTime >= spritesheetData.frameTime) {
                spritesheetData.elapsedTime = 0;
                const nextFrame = (spritesheetData.currentFrame + 1) % spritesheetData.totalFrames;
                updateSpritesheetFrame(characterDisplay, nextFrame);
              }
            } else {
              // Simple rotation for cube placeholders
              characterDisplay.object.rotation.y += 0.01;
            }

            // Auto-trigger attack movement when combatant starts animating
            const isCurrentlyAnimating = animatingCombatantsRef.current.has(characterDisplay.combatantId);

            // Debug occasionally
            if (Math.random() < 0.01) {
              console.log(`🔍 Auto-trigger check for ${characterDisplay.combatantId}:`);
              console.log(`  - isCurrentlyAnimating: ${isCurrentlyAnimating}`);
              console.log(`  - isMovingToAttack: ${characterDisplay.isMovingToAttack}`);
              console.log(`  - isReturningFromAttack: ${characterDisplay.isReturningFromAttack}`);
              console.log(`  - isAttacking: ${characterDisplay.isAttacking}`);
              console.log(`  - animatingCombatants:`, Array.from(animatingCombatantsRef.current));
            }

            if (isCurrentlyAnimating && !characterDisplay.isMovingToAttack && !characterDisplay.isReturningFromAttack && !characterDisplay.isAttacking) {
              // Character just started attacking - trigger movement to a random enemy slot for demo
              const enemyCount = Math.max(1, enemiesRef.current.length);
              const randomTargetSlot = Math.floor(Math.random() * enemyCount);
              console.log(`🎯 BATTLE: Auto-triggering attack movement for ${characterDisplay.combatantId} to slot ${randomTargetSlot}`);
              console.log(`🎬 BATTLE: animatingCombatants contains:`, Array.from(animatingCombatantsRef.current));
              startAttackMovement(characterDisplay.combatantId, randomTargetSlot);
            }

            // Handle position movement for attacks
            if (characterDisplay.isMovingToAttack || characterDisplay.isReturningFromAttack) {
              const moveSpeed = characterDisplay.moveSpeed || 0.05;

              // Log movement state occasionally
              if (Math.random() < 0.01) { // ~1% of frames
                console.log(`🚶 ${characterDisplay.combatantId} moving: attack=${characterDisplay.isMovingToAttack}, return=${characterDisplay.isReturningFromAttack}`);
              }

              if (characterDisplay.isSpine && characterDisplay.skeleton) {
                // For Spine characters, interpolate skeleton position
                const currentX = characterDisplay.skeleton.x;
                const currentY = characterDisplay.skeleton.y;
                const targetX = characterDisplay.targetPosition.x;
                const targetY = characterDisplay.targetPosition.y;

                const newX = THREE.MathUtils.lerp(currentX, targetX, moveSpeed);
                const newY = THREE.MathUtils.lerp(currentY, targetY, moveSpeed);

                // Log position changes occasionally
                if (Math.random() < 0.01) {
                  console.log(`🚶 ${characterDisplay.combatantId} position: (${currentX.toFixed(1)}, ${currentY.toFixed(1)}) → (${newX.toFixed(1)}, ${newY.toFixed(1)}) target:(${targetX.toFixed(1)}, ${targetY.toFixed(1)})`);
                }

                characterDisplay.skeleton.x = newX;
                characterDisplay.skeleton.y = newY;

                // Note: updateWorldTransform is now called every frame above

                // Check if movement is complete
                const distance = Math.sqrt(
                  Math.pow(characterDisplay.skeleton.x - targetX, 2) +
                  Math.pow(characterDisplay.skeleton.y - targetY, 2)
                );

                // Debug distance occasionally
                if (Math.random() < 0.01) {
                  console.log(`📏 ${characterDisplay.combatantId} distance to target: ${distance.toFixed(1)}, isMovingToAttack: ${characterDisplay.isMovingToAttack}, isReturning: ${characterDisplay.isReturningFromAttack}`);
                }

                if (distance < 5) { // Close enough to target
                  console.log(`🎯 ${characterDisplay.combatantId} reached target! Distance: ${distance.toFixed(1)}`);
                  characterDisplay.skeleton.x = targetX;
                  characterDisplay.skeleton.y = targetY;

                  // Note: updateWorldTransform is now called every frame above

                  if (characterDisplay.isMovingToAttack) {
                    // Start attack animation
                    const attackAnimation = getAttackAnimation(characterDisplay.characterName);
                    console.log(`🎯 ${characterDisplay.combatantId} reached attack position. Attack animation: ${attackAnimation}`);

                    if (attackAnimation && characterDisplay.animationState) {
                      console.log(`🎭 ${characterDisplay.combatantId} starting attack animation: ${attackAnimation}`);
                      setCharacterAnimation(characterDisplay.animationState, attackAnimation, false); // Don't loop attack
                      characterDisplay.isAttacking = true;
                    } else {
                      console.log(`⚠️ No attack animation for ${characterDisplay.characterName}, using delay`);
                      // No attack animation, just wait and return
                      setTimeout(() => startReturnMovement(characterDisplay.combatantId), 1000);
                    }
                  } else if (characterDisplay.isReturningFromAttack) {
                    // Returned home - go back to idle animation
                    const idleAnimation = getIdleAnimation(characterDisplay.characterName);
                    if (characterDisplay.animationState) {
                      console.log(`🏠 ${characterDisplay.combatantId} returned home, setting idle animation: ${idleAnimation}`);
                      setCharacterAnimation(characterDisplay.animationState, idleAnimation, true);
                    }

                    // Notify parent that this character's attack animation is complete
                    console.log(`✅ ${characterDisplay.combatantId} attack animation sequence complete, notifying parent`);
                    onAttackAnimationComplete?.(characterDisplay.combatantId);
                  }

                  characterDisplay.isMovingToAttack = false;
                  characterDisplay.isReturningFromAttack = false;
                }
              } else {
                // For cube placeholders and spritesheet characters, interpolate mesh position
                characterDisplay.object.position.lerp(characterDisplay.targetPosition, moveSpeed);

                // Check if movement is complete
                const distance = characterDisplay.object.position.distanceTo(characterDisplay.targetPosition);
                if (distance < 5) {
                  characterDisplay.object.position.copy(characterDisplay.targetPosition);

                  if (characterDisplay.isMovingToAttack) {
                    // Attack position reached, start return after a brief delay
                    setTimeout(() => startReturnMovement(characterDisplay.combatantId), 1000);
                  } else if (characterDisplay.isReturningFromAttack) {
                    // Character returned home - notify completion
                    const displayType = characterDisplay.isSpritesheet ? 'spritesheet' : 'cube placeholder';
                    console.log(`✅ ${characterDisplay.combatantId} ${displayType} attack complete, notifying parent`);
                    onAttackAnimationComplete?.(characterDisplay.combatantId);
                  }

                  characterDisplay.isMovingToAttack = false;
                  characterDisplay.isReturningFromAttack = false;
                }
              }
            }

            // Handle attack animation scaling
            if (characterDisplay.isSpine && characterDisplay.skeleton) {
              // For Spine characters, apply scaling to skeleton
              const baseScale = 0.125; // Use the correct current scale
              const attackScale = animatingCombatantsRef.current.has(characterDisplay.combatantId) ? baseScale * 1.2 : baseScale;
              characterDisplay.skeleton.scaleX = attackScale;
              characterDisplay.skeleton.scaleY = attackScale;
            } else {
              // For cube placeholders and spritesheet characters, apply to mesh
              if (animatingCombatantsRef.current.has(characterDisplay.combatantId)) {
                characterDisplay.object.scale.setScalar(1.2);
              } else {
                characterDisplay.object.scale.setScalar(1.0);
              }
            }
          }
        });
      } catch (characterError) {
        console.error('❌ Character animation error:', characterError);
      }

      // Render the scene
      try {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      } catch (renderError) {
        console.error('❌ Render error:', renderError);
        // Try to continue
      }

      // CRITICAL: This was missing - needed for Expo GLView!
      (gl as any).endFrameEXP();

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

      // Store viewport dimensions for movement calculations
      viewportRef.current = { width: w, height: h };

      // Create renderer with proper settings
      console.log('📱 Creating Three.js renderer...');
      const renderer = new Renderer({ gl });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.setViewport(0, 0, w, h);
      renderer.autoClear = true;
      renderer.setClearColor(0x4a5d23, 1); // Forest green background

      // Fix color space for proper Spine rendering
      const rAny = renderer as any;
      if ('outputColorSpace' in rAny) {
        rAny.outputColorSpace = (THREE as any).SRGBColorSpace;
      } else {
        rAny.outputEncoding = (THREE as any).sRGBEncoding;
      }
      renderer.sortObjects = false;        // avoid depth weirdness with alpha stacks

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

      // Axes helper removed for clean visual display

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

        // Create ally characters using Spine assets with all fixes applied
        console.log('🤝 Creating', allies.length, 'ally Spine characters');
        for (const [index, ally] of allies.entries()) {
          const position = getPositionForSlot(index, true, forestScaleRef.current, h);
          const characterDisplay = await createSpineCharacterDisplay(ally, position, true);
          if (characterDisplay) {
            characterDisplaysRef.current.set(ally.id, characterDisplay);
            console.log(`✅ Created ally character for ${ally.character.name} at Spine position`, position);
          }
        }

        // Create enemies using beetle sprites if available
        console.log('👹 Creating', enemies.length, 'enemy characters');
        enemies.forEach((enemy, index) => {
          const position = getPositionForSlot(index, false, forestScaleRef.current, h);

          let enemyDisplay: CharacterDisplay;
          if (beetleTextureRef.current) {
            // Use beetle spritesheet
            enemyDisplay = createBeetleSpritesheetDisplay(enemy, position, beetleTextureRef.current);
            console.log(`✅ Created beetle sprite for ${enemy.character.name} at position`, position);
          } else {
            // Fallback to cube placeholder
            enemyDisplay = createCubeCharacterDisplay(enemy, position, false);
            console.log(`✅ Created enemy cube placeholder for ${enemy.character.name} at position`, position);
          }

          characterDisplaysRef.current.set(enemy.id, enemyDisplay);
        });
      }

      // Add forest background to scene
      if (battleFieldRef.current) {
        try {
          console.log('🌲 Adding forest background to scene...');
          scene.add(battleFieldRef.current);
          console.log('✅ Forest background added to scene');
        } catch (sceneError) {
          console.error('❌ Failed to add forest background to scene:', sceneError);
        }
      } else {
        console.log('ℹ️ No forest background to add to scene');
      }

      // Add character displays to scene
      console.log('🎬 Adding', characterDisplaysRef.current.size, 'characters to scene...');
      characterDisplaysRef.current.forEach((characterDisplay) => {
        console.log(`🎬 Adding ${characterDisplay.isSpine ? 'Spine' : 'cube'} character:`, characterDisplay.combatantId);
        console.log(`🎬 Position:`, characterDisplay.object.position);
        console.log(`🎬 Scale:`, characterDisplay.object.scale);
        console.log(`🎬 Visible:`, characterDisplay.object.visible);

        // Set material properties for proper rendering
        if (characterDisplay.isSpine) {
          // For Spine characters, materials are already set up during creation
          console.log(`🎬 Spine character - materials already configured for debugging`);
        } else {
          // Only modify cube placeholder materials
          characterDisplay.object.traverse((child: THREE.Object3D) => {
            const anyChild = child as any;
            if (anyChild.isMesh && anyChild.material) {
              const material = anyChild.material;
              if (material.transparent !== undefined) material.transparent = true;
              if (material.depthTest !== undefined) material.depthTest = false;
              if (material.depthWrite !== undefined) material.depthWrite = false;
              material.needsUpdate = true;
              console.log(`🎬 Updated cube material:`, material.type);
            }
          });
        }
        scene.add(characterDisplay.object);
        console.log(`✅ Added character to scene:`, characterDisplay.combatantId);
      });
      console.log('✅ All characters added to scene');

      console.log('🎉 GL context setup complete - starting animation');
      setInitStep('Starting animation...');

      // Start animation loop with gl parameter
      animate(gl);

      // Provide attack movement function to parent component
      onAttackMovementReady?.(startAttackMovement);

      // TEST: Auto-trigger attack movement after 3 seconds for demonstration
      setTimeout(() => {
        console.log('🧪 TEST: 3-second timer fired');
        const allCharacters = Array.from(characterDisplaysRef.current.keys());
        const allyCombatants = allCharacters.filter(id =>
          allies.some(ally => ally.id === id)
        );

        console.log('🧪 TEST: All characters:', allCharacters);
        console.log('🧪 TEST: Ally combatants:', allyCombatants);
        console.log('🧪 TEST: Allies array:', allies.map(a => a.id));

        if (allyCombatants.length > 0) {
          const firstAlly = allyCombatants[0];
          console.log('🧪 TEST: Triggering attack movement for', firstAlly, 'to slot 0');
          startAttackMovement(firstAlly, 0);
        } else {
          console.log('🧪 TEST: No ally combatants found to move');
        }
      }, 3000);

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