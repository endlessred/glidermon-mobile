// ui/components/CharacterPreview.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Image, Platform } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { OutfitSlot, CosmeticSocket } from "../../data/types/outfitTypes";
import { AssetMap } from "../../assets/assetMap";
import { glidermonIdleAnchors, cosmeticDefinitions } from "../../game/cosmetics/cosmeticDefinitions";
import PaletteSwappedSprite from "../../game/view/PaletteSwappedSprite";

// Import the sprite frame data
const idle8FrameData = require("../../assets/glidermonnew/idle8_new.json");

interface CharacterPreviewProps {
  outfit: OutfitSlot;
  highlightSocket?: CosmeticSocket | null;
  size?: "small" | "medium" | "large";
  // For now, we'll note that this uses the new palette-aware sprites
  // but renders them without palette swapping (React Native Image limitation)
  // Full palette swapping would require Skia integration
}

function resolveForSkia(mod: any): any {
  if (Platform.OS === "web") {
    const { Asset } = require("expo-asset");
    return Asset.fromModule(mod).uri;
  }
  return mod;
}

export default function CharacterPreview({
  outfit,
  highlightSocket,
  size = "medium"
}: CharacterPreviewProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [animationFrame, setAnimationFrame] = useState(0);

  // Skia initialization (same pattern as GameCanvas)
  const [ckReady, setCkReady] = useState(Platform.OS !== "web");
  const [Skia, setSkia] = useState<any>(null);

  // Web: wait for CanvasKit (safe bootstrap)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const ready = () => {
      const ck = (globalThis as any).CanvasKit;
      return !!(ck && ck.MakeImageFromEncoded && ck.PictureRecorder);
    };
    if (ready()) { setCkReady(true); return; }
    const id = setInterval(() => { if (ready()) { clearInterval(id); setCkReady(true); } }, 30);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && !ckReady) return;
    const mod = require("@shopify/react-native-skia");
    setSkia(mod);
  }, [ckReady]);

  // Simple idle animation - cycles through frames
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(frame => (frame + 1) % 8); // 8 frame idle animation
    }, 200); // Change frame every 200ms

    return () => clearInterval(interval);
  }, []);

  const sizeConfig = {
    small: { width: 80, height: 100, charWidth: 40, charHeight: 60 },
    medium: { width: 120, height: 150, charWidth: 60, charHeight: 90 },
    large: { width: 200, height: 250, charWidth: 100, charHeight: 150 }
  };

  const config = sizeConfig[size];

  const renderCosmeticLayer = (socket: CosmeticSocket) => {
    const equippedItem = outfit.cosmetics[socket];
    if (!equippedItem?.itemId) return null;

    const customization = equippedItem.customization;
    const isHighlighted = highlightSocket === socket;

    // Apply adjustments
    const offset = customization?.adjustments.offset || { x: 0, y: 0 };
    const rotation = customization?.adjustments.rotation || 0;
    const scale = customization?.adjustments.scale || 1;
    const layer = customization?.adjustments.layer || 0;

    // Character scale factor - all measurements should scale with this
    const characterScale = config.charWidth / 64; // Scale factor relative to original 64px sprite

    // Base position using actual glidermon anchor positions
    const getSocketPosition = (socket: CosmeticSocket) => {
      // Skip palette and pose sockets - they don't have physical positions
      if (["skinVariation", "eyeColor", "shoeVariation", "pose"].includes(socket)) {
        return { x: 0, y: 0, rotation: 0 };
      }

      const anchor = glidermonIdleAnchors.anchors[socket];

      if (!anchor) {
        return { x: 0, y: 0 };
      }

      // Convert from sprite coordinates (32,32 center) to our coordinate system
      const spriteCenter = 32;
      const scaledX = (anchor.x - spriteCenter) * characterScale;
      const scaledY = (anchor.y - spriteCenter) * characterScale;

      return { x: scaledX, y: scaledY };
    };

    const basePos = getSocketPosition(socket);

    // Find the cosmetic definition for this item
    const cosmeticDef = cosmeticDefinitions.find(def => def.id === equippedItem.itemId);

    if (!cosmeticDef) {
      // Hide placeholder for now - no cosmetic definition found
      return null;
    }

    // Check if this is a hat_pack_1 item that needs sprite sheet cropping
    const HAT_PACK_CONFIGS: Record<string, { frameIndex: number }> = {
      frog_hat: { frameIndex: 0 },
      black_headphones: { frameIndex: 1 },
      white_headphones: { frameIndex: 2 },
      pink_headphones: { frameIndex: 3 },
      pink_aniphones: { frameIndex: 4 },
      feather_cap: { frameIndex: 5 },
      viking_hat: { frameIndex: 6 },
      adventurer_fedora: { frameIndex: 7 },
    };

    const isHatPackItem = HAT_PACK_CONFIGS[equippedItem.itemId];

    // Adjusted offsets for our anchor-based positioning system
    const getGameCanvasOffset = (itemId: string) => {
      const gameCanvasOffsets: Record<string, { dx?: number; dy?: number }> = {
        // Adjusted default offset for most hats (moved right to center better)
        leaf_hat: { dx: -2, dy: 5 },
        greater_hat: { dx: -2, dy: 5 },
        // Hat pack specific offsets (adjusted)
        frog_hat: { dx: -2, dy: 8 },
        black_headphones: { dx: -2, dy: 5 },
        white_headphones: { dx: -2, dy: 5 },
        pink_headphones: { dx: -2, dy: 5 },
        pink_aniphones: { dx: -2, dy: 5 },
        feather_cap: { dx: -2, dy: 5 },
        viking_hat: { dx: -2, dy: 5 },
        adventurer_fedora: { dx: -2, dy: 5 },
      };
      return gameCanvasOffsets[itemId] || { dx: -2, dy: 5 }; // Default adjusted
    };

    const gameCanvasOffset = getGameCanvasOffset(equippedItem.itemId);

    // Apply idle animation offset - sync with character bouncing, scaled with character size
    const idleOffset = {
      x: Math.sin(animationFrame * 0.4) * (1 * characterScale), // Match character sway, scaled
      y: Math.sin(animationFrame * 0.8) * (2 * characterScale) // Match character bounce, scaled
    };

    // Apply GameCanvas hatOffset scaled to our character size
    const scaledHatOffset = {
      x: (gameCanvasOffset.dx || 0) * characterScale,
      y: (gameCanvasOffset.dy || 0) * characterScale
    };

    // Scale user adjustments with character size
    const scaledUserOffset = {
      x: offset.x * characterScale,
      y: offset.y * characterScale
    };

    // Combine all transforms with proper scaling
    const transform = [
      { translateX: basePos.x + scaledUserOffset.x + idleOffset.x + scaledHatOffset.x },
      { translateY: basePos.y + scaledUserOffset.y + idleOffset.y + scaledHatOffset.y },
      { rotate: `${rotation}deg` },
      { scale: scale } // User scale adjustment is independent of character scale
    ];

    // Match GameCanvas scaling - cosmetics should be same size as character sprite
    const cosmeticSize = config.charWidth; // Same size as the character sprite

    // Render actual cosmetic sprite
    const assetSource = AssetMap[cosmeticDef.texKey as keyof typeof AssetMap];
    if (!assetSource) {
      return null; // No asset available
    }

    // For hat pack items, implement sprite sheet cropping using exact JSON coordinates
    if (isHatPackItem) {
      const frameIndex = isHatPackItem.frameIndex;

      // From hat_pack_1.json: each frame is 64x64, positioned at frameIndex * 64 horizontally
      const frameData = {
        x: frameIndex * 64,  // Frame X position in sprite sheet
        y: 0,                // All frames are on the same row (y=0)
        w: 64,               // Frame width
        h: 64                // Frame height
      };

      const spriteSheetWidth = 512;  // Total sprite sheet width
      const spriteSheetHeight = 64;  // Total sprite sheet height

      // Calculate scale to fit frame into our cosmetic size (already character-scaled)
      const frameScale = cosmeticSize / frameData.w;

      // Calculate position to show only the specific frame
      const frameOffsetX = -frameData.x * frameScale;
      const frameOffsetY = -frameData.y * frameScale;

      return (
        <View
          key={socket}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginTop: -cosmeticSize / 2,
            marginLeft: -cosmeticSize / 2,
            transform,
            zIndex: 10 + layer,
            opacity: socket === "background" ? 0.7 : 1
          }}
        >
          <View style={{
            width: cosmeticSize,
            height: cosmeticSize,
            overflow: "hidden",
            borderRadius: borderRadius.sm
          }}>
            <Image
              source={assetSource}
              style={{
                width: spriteSheetWidth * frameScale,
                height: spriteSheetHeight * frameScale,
                marginLeft: frameOffsetX,
                marginTop: frameOffsetY,
              }}
              resizeMode="stretch"
            />
            {/* Highlight indicator overlay - doesn't affect cosmetic scaling */}
            {isHighlighted && (
              <View style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderWidth: 2,
                borderColor: colors.primary[600],
                borderRadius: borderRadius.sm,
                backgroundColor: 'transparent'
              }} />
            )}
          </View>
        </View>
      );
    }

    // For non-hat-pack items, render normally
    return (
      <View
        key={socket}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          marginTop: -cosmeticSize / 2,
          marginLeft: -cosmeticSize / 2,
          transform,
          zIndex: 10 + layer,
          opacity: socket === "background" ? 0.7 : 1
        }}
      >
        <View style={{
          width: cosmeticSize,
          height: cosmeticSize,
          borderRadius: borderRadius.sm,
          overflow: "hidden"
        }}>
          <Image
            source={assetSource}
            style={{
              width: cosmeticSize,
              height: cosmeticSize,
            }}
            resizeMode="contain"
          />
          {/* Highlight indicator overlay - doesn't affect cosmetic scaling */}
          {isHighlighted && (
            <View style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: 2,
              borderColor: colors.primary[600],
              borderRadius: borderRadius.sm,
              backgroundColor: 'transparent'
            }} />
          )}
        </View>
      </View>
    );
  };

  const getCosmeticColor = (socket: CosmeticSocket): string => {
    const colorMap: Record<string, string> = {
      headTop: colors.status.error,
      headFront: colors.primary[500],
      headBack: colors.primary[300],
      earL: colors.accent.lavender,
      earR: colors.accent.lavender,
      bodyFront: colors.health[500],
      bodyBack: colors.health[300],
      hand: colors.accent.peach,
      waist: colors.accent.butter,
      background: colors.gray[400],
      foreground: colors.gray[600],
      fullBody: colors.accent.coral,
      pose: colors.accent.mint
    };
    return colorMap[socket] || colors.gray[500];
  };

  // Get the current frame data from the JSON
  const getCurrentFrameData = () => {
    const frameIndex = animationFrame % 8;
    const frameKeys = Object.keys(idle8FrameData.frames);
    const frameKey = frameKeys[frameIndex];
    if (frameKey && idle8FrameData.frames[frameKey]) {
      return idle8FrameData.frames[frameKey].frame;
    }
    // Fallback to manual calculation if JSON is missing
    return {
      x: frameIndex * 64,
      y: 0,
      w: 64,
      h: 64
    };
  };

  const currentFrame = getCurrentFrameData();

  // Character idle animation transforms for Skia
  const characterSkiaTransform = [
    { translateY: Math.sin(animationFrame * 0.8) * 2 }, // Gentle bounce
    { rotate: Math.sin(animationFrame * 0.4) * 0.017453 } // Slight sway in radians
  ];

  return (
    <View style={{
      width: config.width,
      height: config.height,
      backgroundColor: colors.background.secondary,
      borderRadius: borderRadius.lg,
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.gray[200]
    }}>
      {/* Background cosmetics */}
      {Object.keys(outfit.cosmetics)
        .filter(socket => socket === "background")
        .map(socket => renderCosmeticLayer(socket as CosmeticSocket))}

      {/* Character Sprite - using React Native Image for now, Skia palette later */}
      <View style={{
        transform: [
          { translateY: Math.sin(animationFrame * 0.8) * 2 }, // Gentle bounce
          { rotate: `${Math.sin(animationFrame * 0.4) * 1}deg` } // Slight sway
        ],
        alignItems: "center",
        justifyContent: "center"
      }}>
        <View style={{
          width: config.charWidth, // Scale to desired size
          height: config.charHeight, // Scale to desired size
          overflow: "hidden" // Clip to show only one frame
        }}>
          <Image
            source={AssetMap.idle8}
            style={{
              width: (64 * 8) * (config.charWidth / 64), // Scale sprite sheet proportionally (1x8 layout)
              height: (64 * 1) * (config.charHeight / 64), // Scale sprite sheet proportionally (1x8 layout)
              position: "absolute",
              left: -(animationFrame % 8) * (config.charWidth), // Move based on scaled frame size (8 frames in row)
              top: 0 // No vertical movement needed for 1x8 layout
            }}
            resizeMode="stretch"
          />
        </View>
      </View>

      {/* Body cosmetics */}
      {Object.keys(outfit.cosmetics)
        .filter(socket => !["background", "foreground", "pose"].includes(socket))
        .map(socket => renderCosmeticLayer(socket as CosmeticSocket))}

      {/* Foreground cosmetics */}
      {Object.keys(outfit.cosmetics)
        .filter(socket => socket === "foreground")
        .map(socket => renderCosmeticLayer(socket as CosmeticSocket))}

      {/* Animation indicator */}
      <View style={{
        position: "absolute",
        bottom: spacing.xs,
        right: spacing.xs,
        width: 6,
        height: 6,
        backgroundColor: colors.health[500],
        borderRadius: 3,
        opacity: 0.6 + Math.sin(animationFrame) * 0.4
      }} />

      {/* Highlight indicator */}
      {highlightSocket && (
        <View style={{
          position: "absolute",
          top: spacing.sm,
          right: spacing.sm,
          backgroundColor: colors.primary[100],
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
          borderRadius: borderRadius.sm,
          borderWidth: 1,
          borderColor: colors.primary[300]
        }}>
          <Text style={{
            fontSize: size === "small" ? 8 : 10,
            color: colors.primary[700],
            fontWeight: typography.weight.medium as any
          }}>
            {highlightSocket}
          </Text>
        </View>
      )}
    </View>
  );
}