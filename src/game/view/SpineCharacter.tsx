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
import { LifelikeIdleNoMix } from './lifelikeIdle_noMix';
import { makeMaskRecolorMaterial } from '../../spine/MaskRecolor';
import { makeHueIndexedRecolorMaterial } from '../../spine/HueIndexedRecolor';
import { normalizeMaterialForSlot } from '../../spine/SpineThree';
import { OutfitSlot } from '../../data/types/outfitTypes';
import { useCosmeticsStore } from '../../data/stores/cosmeticsStore';

// Find an attachment by (slotName, attachmentName) across default skin and all named skins.
function getAttachmentFromAnySkin(
  skeletonData: any,
  slotName: string,
  attachmentName: string
) {
  // Find slot index by searching through slots array
  let slotIndex = -1;
  for (let i = 0; i < skeletonData.slots.length; i++) {
    if (skeletonData.slots[i].name === slotName) {
      slotIndex = i;
      break;
    }
  }
  if (slotIndex < 0) return null;

  // 1) Try the special default skin first (JSON "default")
  const defSkin = skeletonData.defaultSkin;
  if (defSkin) {
    const a = defSkin.getAttachment(slotIndex, attachmentName);
    if (a) return a;
  }

  // 2) Try all named skins
  const skins: any[] = skeletonData.skins || [];
  for (const s of skins) {
    const a = s.getAttachment(slotIndex, attachmentName);
    if (a) return a;
  }

  return null;
}

interface SpineCharacterProps {
  x?: number;
  y?: number;
  scale?: number;
  animation?: string;
  skin?: string;
  outfit?: OutfitSlot; // Optional outfit to apply cosmetics
}

export default function SpineCharacter({
  x = 100,
  y = 100,
  scale = 1,
  animation = "idle",
  skin,
  outfit
}: SpineCharacterProps) {
  const rafRef = useRef<number>(0);
  const { catalog } = useCosmeticsStore();

  // Cache for recolor materials
  const RECOLOR_CACHE = useRef(new Map<string, THREE.ShaderMaterial>()).current;

  // Regex to detect shader slots (consistent with SpineThree.ts)
  const SHADER_SLOT_REGEX = /Shader$/i;

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

      // Hue-indexed recolor system doesn't need mask textures

      console.log('🏗️ Building Spine objects...');
      const atlas = new TextureAtlas(atlasText, (pageName: string) => {
        console.log('Atlas requesting page:', pageName);
        return pageTextures[pageName] || pageTextures[Object.keys(pageTextures)[0]];
      });

      const attachmentLoader = new AtlasAttachmentLoader(atlas);
      const skeletonJson = new SkeletonJson(attachmentLoader);
      const skeletonData = skeletonJson.readSkeletonData(skeletonJsonData);

      const skeleton = new Skeleton(skeletonData);

      console.log('🎬 Setting up lifelike idle animation system...');
      const stateData = new AnimationStateData(skeletonData);
      const idleDriver = new LifelikeIdleNoMix(stateData);

      // Optional: customize timing ranges (uncomment to adjust)
      // idleDriver.setBlinkRange(1.5, 4); // faster blinking
      // idleDriver.setLookRange(2, 6);    // more frequent looks
      // idleDriver.snapToIdleBoundary = false; // immediate start vs synced

      const state = idleDriver.animationState;
      console.log('Lifelike idle system initialized with random eye movements and blinking');

      skeleton.setToSetupPose();

      // Apply skin from outfit if provided
      if (outfit && outfit.cosmetics.headTop?.itemId) {
        const equippedHat = outfit.cosmetics.headTop;
        const cosmeticItem = catalog.find(item => item.id === equippedHat.itemId);
        if (cosmeticItem?.spineSkin) {
          const skin = skeletonData.findSkin(cosmeticItem.spineSkin);
          if (skin) {
            skeleton.setSkin(skin);
            skeleton.setToSetupPose();
            skeleton.updateWorldTransform(Physics.update);
            console.log(`✅ Applied HUD character skin: ${cosmeticItem.spineSkin}`);
          }
        }
      }

      const resolveTexture = (pageOrFileName: string): THREE.Texture | undefined => {
        if (pageTextures[pageOrFileName]) return pageTextures[pageOrFileName];
        const short = pageOrFileName.split("/").pop()!;
        return pageTextures[short];
      };

      // Use Spine's own transform system instead of Three.js transforms
      const finalScale = scale * 0.30; // Double the size for better visibility
      const posX = width * 0.5; // Center horizontally
      const posY = height * 0.25; // Move down to show full character including hats (lower Y values = down with flipped Y)
      console.log(`🎯 SPINE TRANSFORMS [${new Date().toISOString()}]: scale=${finalScale}, pos=(${posX}, ${posY}), canvas=(${width}x${height})`);

      // Apply transforms to the Spine skeleton (not the Three.js mesh)
      skeleton.scaleX = finalScale;
      skeleton.scaleY = finalScale;
      skeleton.x = posX;
      skeleton.y = posY;

      console.log('🎭 Creating SkeletonMesh with new adapter...');
      const mesh = new SkeletonMesh(skeleton, state, resolveTexture);

      // Set up material override for recoloring if outfit has cosmetics
      if (outfit && (outfit.cosmetics.headTop?.itemId || outfit.cosmetics.skin?.itemId)) {
        console.log('🎨 Processing outfit cosmetics for recoloring...');
        console.log('Outfit:', JSON.stringify(outfit, null, 2));

        // Get hat recolor
        const equippedHat = outfit.cosmetics.headTop;
        const hatCosmeticItem = equippedHat?.itemId ? catalog.find(item => item.id === equippedHat.itemId) : null;
        const hatRecolor = hatCosmeticItem?.maskRecolor;
        console.log('Hat recolor data:', hatRecolor);

        // Get skin recolor
        const equippedSkin = outfit.cosmetics.skin;
        const skinCosmeticItem = equippedSkin?.itemId ? catalog.find(item => item.id === equippedSkin.itemId) : null;
        const skinRecolor = skinCosmeticItem?.maskRecolor;
        console.log('Skin recolor data:', skinRecolor);

        if (hatRecolor || skinRecolor) {
          // Body part slots that should be recolored with skin cosmetics (excluding shoes - they're separate)
          const skinSlots = ["Tail", "R_Wing", "L_Wing", "L_Leg", "L_Arm", "R_Leg", "R_Arm", "L_Ear", "Head", "R_Ear", "Cheeks", "Nose", "Torso"];

          // Switch skin slots to their shader variants when skin recoloring is enabled
          if (skinRecolor) {
            const slotToShaderMap: Record<string, string> = {
              "Tail": "NewTailShader",
              "R_Wing": "R_WingShader",
              "L_Wing": "L_WingShader",
              "L_Leg": "L_LegShader",
              "L_Arm": "L_ArmShader",
              "R_Leg": "R_LegShader",
              "R_Arm": "R_ArmShader",
              "L_Ear": "L_EarShader",
              "Head": "HeadShader",
              "R_Ear": "R_EarShader",
              "Cheeks": "CheeksShader",
              "Nose": "NoseShader",
              "Torso": "TorsoShader"
              // Note: L_Shoe and R_Shoe excluded - they'll be separate recolorable pieces
            };

            console.log('🔄 Starting shader attachment switching for skin recoloring...');

            for (const baseSlotName of skinSlots) {
              const shaderAttachmentName = slotToShaderMap[baseSlotName];
              if (shaderAttachmentName) {
                const slot = skeleton.findSlot(baseSlotName);
                if (slot) {
                  console.log(`🔍 Switch "${baseSlotName}" -> "${shaderAttachmentName}"`);

                  // ✅ IMPORTANT: use defaultSkin + all skins, not findSkin("default")
                  const shaderAttachment = getAttachmentFromAnySkin(skeletonData, baseSlotName, shaderAttachmentName);

                  if (shaderAttachment) {
                    slot.setAttachment(shaderAttachment);
                    console.log(`✅ Switched ${baseSlotName} to ${shaderAttachmentName}`);
                  } else {
                    console.error(`❌ Not found: ${shaderAttachmentName} @ slot "${baseSlotName}"`);

                    // Helpful debug: list all attachments we can see for this slot
                    const slotIndex = skeletonData.findSlotIndex(baseSlotName);
                    const names: string[] = [];
                    if (skeletonData.defaultSkin) {
                      const entries = skeletonData.defaultSkin.getAttachments();
                      for (const e of entries) if (e.slotIndex === slotIndex) names.push(e.name);
                    }
                    for (const s of skeletonData.skins || []) {
                      const entries = s.getAttachments();
                      for (const e of entries) if (e.slotIndex === slotIndex) names.push(e.name);
                    }
                    console.log(`📋 Attachments at "${baseSlotName}":`, Array.from(new Set(names)));
                  }
                } else {
                  console.error(`❌ Slot not found: ${baseSlotName}`);
                  console.log(`📋 Available slots:`, skeleton.slots.map(s => s.data.name));
                }
              } else {
                console.warn(`⚠️ No shader mapping for slot: ${baseSlotName}`);
              }
            }

            // Keep our attachment switches; just recompute world transforms
            skeleton.updateWorldTransform(Physics.update);

            // Verify the switches stuck
            console.log('🔎 Verifying attachment switches:');
            for (const baseSlotName of skinSlots) {
              const slot = skeleton.findSlot(baseSlotName);
              if (slot) {
                console.log(`🔎 ${baseSlotName} now has attachment:`, slot.getAttachment()?.name || 'none');
              }
            }
          }

          mesh.materialOverride = (slot: any, baseTex: THREE.Texture) => {
            const slotName: string = slot?.data?.name ?? "";
            const attachment = slot.getAttachment?.();
            const attName = (attachment && attachment.name) ? String(attachment.name) : "";
            const isShaderAttachment = SHADER_SLOT_REGEX.test(attName); // Check attachment name, not slot name

            // Determine which recolor to apply
            let recolorData = null;

            // Hat example (unchanged)
            if (slotName === "Hat_Base" && hatRecolor) {
              recolorData = hatRecolor;
            }
            // Skin via shader variant
            else if (isShaderAttachment && skinRecolor) {
              const baseSlotName = slotName; // shader is on the attachment, slot name stays the same
              if (skinSlots.includes(baseSlotName)) {
                recolorData = skinRecolor;
              }
            }
            // Legacy fallback (non-shader attachment) - show info message for debugging
            else if (skinSlots.includes(slotName) && skinRecolor) {
              console.log(`ℹ️ Non-shader slot "${slotName}" (attachment: "${attName}") found - no recoloring applied (consider updating to shader variant)`);
              return null;
            }

            if (!recolorData) return null;

            // Check if this slot should use special alphaTest handling (like pupils)
            const isPupil = /Pupil/i.test(slotName);
            const alphaTest = isPupil ? 0.0 : 0.0015;

            // Hue-indexed recolor for shader attachments
            if (isShaderAttachment) {
              try {
                const key = `hue|${(baseTex as any).uuid}|${recolorData.r}|${recolorData.g}|${recolorData.b}|${recolorData.a}|${slotName}|${attName}|${alphaTest}`;
                let mat = RECOLOR_CACHE.get(key);
                if (!mat) {
                  console.log(`Creating hue-indexed material for ${slotName} (${attName}) with colors:`, recolorData);

                  mat = makeHueIndexedRecolorMaterial(baseTex, {
                    alphaTest,
                    strength: 1,
                    shadeMode: true,
                    satMin: 0.1,        // Lower threshold to catch more pixels
                    hueCosMin: 0.75,    // More lenient angle matching (was 0.90)
                    useYellow: true,    // Enable yellow detection
                    preserveDarkThreshold: 0.15,
                    colors: {
                      red: recolorData.r ?? "#ff0000",
                      green: recolorData.g ?? "#00ff00",
                      blue: recolorData.b ?? recolorData.r ?? "#ff0000",
                      yellow: recolorData.a ?? "#ffff00",
                    }
                  });

                  console.log(`Material created successfully for ${slotName}, caching...`);
                  RECOLOR_CACHE.set(key, mat);
                  console.log(`✅ Applied hue-indexed recolor to ${slotName} (${attName}): R=${recolorData.r}, G=${recolorData.g}, B=${recolorData.b}, Y=${recolorData.a}`);
                }

                console.log(`About to normalize material for ${slotName}...`);
                // Apply material normalization for proper render pass
                normalizeMaterialForSlot(slot, mat);
                console.log(`Material normalized successfully for ${slotName}`);
                return mat;
              } catch (error) {
                console.error(`❌ Error creating hue-indexed material for ${slotName} (${attName}):`, error);
                console.error('Stack trace:', error.stack);
                return null;
              }
            }

            return null;
          };
        }
      }

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

          // Update lifelike idle system (handles eye movements, blinking, and base idle)
          idleDriver.update(delta);
          skeleton.update(delta);                 // Essential for physics simulation
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