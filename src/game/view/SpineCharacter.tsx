import React, { useEffect, useRef, useState } from 'react';
import { Platform, View, Text } from 'react-native';
import { Canvas, useImage, Circle, Group, Fill, Image, Rect } from '@shopify/react-native-skia';

// Import JSON directly, use dynamic imports for others
import skeletonJson from '../../assets/GliderMonIdle/skeleton.json';

// Platform-specific Spine imports
let spine: any;
try {
  if (Platform.OS === 'web') {
    // Web platform - will use spine-player
    spine = null;
  } else {
    // Native platforms - use spine-core
    spine = require('@esotericsoftware/spine-core');
  }
} catch (e) {
  console.warn('Spine import failed:', e);
  spine = null;
}

interface SpineCharacterProps {
  Skia?: any;
  x?: number;
  y?: number;
  scale?: number;
}

declare global {
  interface Window {
    spine: any;
  }
}

export default function SpineCharacter({ Skia, x = 100, y = 100, scale = 1 }: SpineCharacterProps) {
  if (Platform.OS === 'web') {
    return <SpinePlayerWeb />;
  } else {
    return <SpineCharacterNative Skia={Skia} x={x} y={y} scale={scale} />;
  }
}

// Official Spine Web Player implementation
const SpinePlayerWeb = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playerLoaded, setPlayerLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const loadSpineWebPlayer = async () => {
      try {
        console.log('Loading official Spine Web Player...');

        // Clear any existing content
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Load Spine Web Player CSS and JS if not already loaded
        if (!document.querySelector('link[href*="spine-player.css"]')) {
          const css = document.createElement('link');
          css.rel = 'stylesheet';
          css.href = 'https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/spine-player.css';
          document.head.appendChild(css);
        }

        if (!window.spine) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/iife/spine-player.js';

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Wait a bit for the script to fully initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!window.spine) {
          throw new Error('Spine Web Player failed to load');
        }

        // Create container div for spine player
        const playerDiv = document.createElement('div');
        playerDiv.id = 'spine-player-' + Math.random().toString(36).substr(2, 9);
        playerDiv.style.width = '100%';
        playerDiv.style.height = '100%';
        containerRef.current.appendChild(playerDiv);

        console.log('Creating Spine Web Player instance...');

        // Use imported JSON directly
        const skeletonData = skeletonJson;

        // Use dynamic imports to get proper URLs from Metro
        const [atlasModule, pngModule] = await Promise.all([
          import('../../assets/GliderMonIdle/skeleton.atlas'),
          import('../../assets/GliderMonIdle/skeleton.png')
        ]);

        console.log('Dynamic imports:', { atlasModule, pngModule });

        // Get atlas text
        let atlasText;
        const atlasUrl = atlasModule.default || atlasModule;
        try {
          const atlasResponse = await fetch(atlasUrl);
          atlasText = await atlasResponse.text();
        } catch (error) {
          throw new Error(`Failed to load atlas: ${error}`);
        }

        // Get PNG URL - extract URI from Metro asset object
        const pngAsset = pngModule.default || pngModule;
        const pngUrl = typeof pngAsset === 'string' ? pngAsset : pngAsset.uri;

        console.log('Final PNG URL:', pngUrl, typeof pngUrl);

        if (!pngUrl || typeof pngUrl !== 'string') {
          throw new Error(`PNG URL is not a string: ${JSON.stringify(pngAsset)}`);
        }

        console.log('Asset data loaded:', {
          skeletonDataType: typeof skeletonData,
          atlasTextLength: atlasText.length,
          pngUrl,
          pngUrlType: typeof pngUrl
        });

        // Initialize the official Spine Web Player using rawDataURIs
        new window.spine.SpinePlayer(playerDiv.id, {
          skeleton: 'skeleton.json',
          atlas: 'skeleton.atlas',
          rawDataURIs: {
            'skeleton.json': `data:application/json;base64,${btoa(JSON.stringify(skeletonData))}`,
            'skeleton.atlas': `data:text/plain;base64,${btoa(atlasText)}`,
            'skeleton.png': pngUrl
          },
          animation: 'animation', // Default animation name
          scale: 0.3, // Scale down to fit nicely in the container
          showControls: false, // Hide controls for clean display
          backgroundColor: '#00000000', // Transparent background
          premultipliedAlpha: true, // Recommended setting
          success: function (player: any) {
            console.log('✅ Spine Web Player loaded successfully');
            setPlayerLoaded(true);

            // Set the animation to loop
            try {
              player.setAnimation('animation', true);
            } catch (e) {
              console.log('Using default animation');
            }
          },
          error: function (player: any, reason: string) {
            console.error('❌ Spine Web Player error:', reason);
            setPlayerError(reason);
          }
        });

      } catch (error) {
        console.error('Failed to load Spine Web Player:', error);
        setPlayerError(`Failed to load player: ${error}`);
      }
    };

    loadSpineWebPlayer();
  }, []);

  if (playerError) {
    return (
      <View style={{ padding: 20, backgroundColor: '#ff6b6b', borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Player Error: {playerError}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#1a1a2e'
        }}
      />
      {!playerLoaded && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(26, 26, 46, 0.8)'
        }}>
          <Text style={{ color: 'white', textAlign: 'center' }}>
            Loading Spine Web Player...
          </Text>
        </View>
      )}
    </View>
  );
};

// Native implementation using Skia
const SpineCharacterNative = ({ Skia, x, y, scale }: SpineCharacterProps) => {
  const [skeleton, setSkeleton] = useState<any>(null);
  const [animationState, setAnimationState] = useState<any>(null);
  const [hasSkia, setHasSkia] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Skia image for texture
  const image = useImage(require('../../assets/GliderMonIdle/skeleton.png'));

  useEffect(() => {
    if (!Skia || !spine) {
      setError('Skia or Spine not available');
      setIsLoading(false);
      return;
    }

    setHasSkia(true);

    const loadSpineData = async () => {
      try {
        console.log('Loading Spine assets for native...');

        // Load skeleton data
        const skeletonJson = require('../../assets/GliderMonIdle/skeleton.json');
        const atlasText = require('../../assets/GliderMonIdle/skeleton.atlas');

        // Create atlas
        const atlas = new spine.TextureAtlas(atlasText, (path: string) => {
          // Return a simple texture object
          return {
            width: 1969,
            height: 777,
            setFilters: () => {},
            setWraps: () => {},
          };
        });

        // Create skeleton
        const skeletonData = new spine.SkeletonJson(atlas).readSkeletonData(skeletonJson);
        const newSkeleton = new spine.Skeleton(skeletonData);
        newSkeleton.setToSetupPose();

        // Create animation state
        const stateData = new spine.AnimationStateData(skeletonData);
        const newAnimationState = new spine.AnimationState(stateData);

        // Set the idle animation
        if (skeletonData.animations.length > 0) {
          const animationName = skeletonData.animations[0].name;
          newAnimationState.setAnimation(0, animationName, true);
        }

        setSkeleton(newSkeleton);
        setAnimationState(newAnimationState);
        setIsLoading(false);

        console.log('✅ Spine assets loaded successfully for native');
      } catch (err) {
        console.error('Failed to load Spine assets:', err);
        setError(`Failed to load: ${err}`);
        setIsLoading(false);
      }
    };

    loadSpineData();
  }, [Skia]);

  // Animation update loop
  useEffect(() => {
    if (!skeleton || !animationState) return;

    const interval = setInterval(() => {
      try {
        animationState.update(1/60);
        animationState.apply(skeleton);
        skeleton.updateWorldTransform();
      } catch (e) {
        console.warn('Animation update error:', e);
      }
    }, 1000/60);

    return () => clearInterval(interval);
  }, [skeleton, animationState]);

  if (error) {
    return (
      <View style={{ padding: 20, backgroundColor: '#ff6b6b', borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ padding: 20, backgroundColor: '#1a1a2e', borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Loading Spine animation...
        </Text>
      </View>
    );
  }

  // Render state debug info
  console.log('SpineCharacter render state:', {
    hasSkia,
    hasSkeleton: !!skeleton,
    hasAnimationState: !!animationState,
    isLoading,
    error
  });

  const renderElements: React.ReactElement[] = [];

  if (!hasSkia || !skeleton || !image) {
    // Fallback rendering
    renderElements.push(
      <Fill key="background" color="#1a1a2e" />,
      <Circle key="fallback" cx={x} cy={y} r={20} color="white" />
    );
  } else {
    // Background
    renderElements.push(
      <Fill key="background" color="#1a1a2e" />
    );

    // Debug: Show skeleton bounds
    renderElements.push(
      <Rect key="debug-bounds" x={50} y={50} width={100} height={100} color="rgba(255,255,255,0.1)" />
    );

    // Test: Render a large piece of the texture to verify image rendering works
    if (image) {
      renderElements.push(
        <Image
          key="test-texture"
          image={image}
          src={{ x: 1133, y: 409, width: 366, height: 305 }} // Tail region
          dst={{ x: 20, y: 20, width: 60, height: 50 }}
        />
      );
    }

    // Render skeleton slots with actual textures
    console.log('Rendering skeleton with', skeleton.drawOrder?.length || 0, 'slots, image loaded:', !!image);
    if (skeleton.drawOrder && image) {
      skeleton.drawOrder.forEach((slot: any, index: number) => {
        if (slot && slot.attachment && slot.bone) {
          const bone = slot.bone;
          const attachment = slot.attachment;

          // Get actual region data from the attachment
          const attachment_ = attachment as any;

          // Debug attachment structure for first few
          if (index < 3) {
            console.log(`Attachment ${index} (${attachment.name}):`, {
              type: attachment.type,
              region: attachment_.region,
              regionAttachment: attachment_,
              hasRegion: !!attachment_.region,
              x: attachment_.x,
              y: attachment_.y,
              width: attachment_.width,
              height: attachment_.height,
              regionU: attachment_.regionU,
              regionV: attachment_.regionV,
              regionU2: attachment_.regionU2,
              regionV2: attachment_.regionV2
            });
          }

          // Try multiple position sources
          const boneX = bone.worldX ?? bone.x ?? 0;
          const boneY = bone.worldY ?? bone.y ?? 0;

          // Position scaling and centering
          const renderScale = 0.1; // Smaller scale for the texture pieces
          let x, y;

          if (boneX === 0 && boneY === 0) {
            // If all bones are at origin, arrange them in a circle pattern for now
            const angle = (index / skeleton.drawOrder.length) * 2 * Math.PI;
            const radius = 80; // Bigger radius to spread them out more
            x = 100 + Math.cos(angle) * radius;
            y = 100 + Math.sin(angle) * radius;
          } else {
            x = 100 + boneX * renderScale;
            y = 100 - boneY * renderScale; // Flip Y axis for proper orientation
          }

          // Get texture region coordinates from the attachment
          // These should come from the region UVs
          let srcX, srcY, srcWidth, srcHeight;

          if (attachment_.region) {
            // Get data from TextureAtlasRegion
            const region = attachment_.region;
            srcX = region.x || 0;
            srcY = region.y || 0;
            srcWidth = region.width || 50;
            srcHeight = region.height || 50;

            // Debug region data for first few
            if (index < 3) {
              console.log(`Region data for ${attachment.name}:`, {
                x: region.x,
                y: region.y,
                width: region.width,
                height: region.height,
                u: region.u,
                v: region.v,
                u2: region.u2,
                v2: region.v2,
                rotate: region.rotate
              });
            }
          } else if (attachment_.regionU !== undefined) {
            // Use UV coordinates if available
            const textureWidth = 1969;
            const textureHeight = 777;
            srcX = attachment_.regionU * textureWidth;
            srcY = attachment_.regionV * textureHeight;
            srcWidth = (attachment_.regionU2 - attachment_.regionU) * textureWidth;
            srcHeight = (attachment_.regionV2 - attachment_.regionV) * textureHeight;
          } else {
            // Fallback to simple colored circles
            renderElements.push(
              <Circle
                key={`slot-${index}`}
                cx={x}
                cy={y}
                r={8}
                color={`hsl(${(index * 25) % 360}, 70%, 60%)`}
              />
            );
            return;
          }

          // Render the texture region
          try {
            renderElements.push(
              <Image
                key={`slot-${index}`}
                image={image}
                src={{ x: srcX, y: srcY, width: srcWidth, height: srcHeight }}
                dst={{ x: x - 15, y: y - 15, width: 30, height: 30 }}
              />
            );
          } catch (imageError) {
            // Fallback to colored circle if image rendering fails
            renderElements.push(
              <Circle
                key={`slot-fallback-${index}`}
                cx={x}
                cy={y}
                r={8}
                color={`hsl(${(index * 25) % 360}, 70%, 60%)`}
              />
            );
          }
        }
      });
    }
  }

  return (
    <Canvas style={{ width: 200, height: 200 }}>
      <Group>
        {renderElements}
      </Group>
    </Canvas>
  );
};