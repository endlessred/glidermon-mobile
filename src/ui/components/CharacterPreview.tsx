// ui/components/CharacterPreview.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Image } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { OutfitSlot, CosmeticSocket } from "../../data/types/outfitTypes";
import { AssetMap } from "../../assets/assetMap";
import { glidermonIdleAnchors, cosmeticDefinitions } from "../../game/cosmetics/cosmeticDefinitions";

interface CharacterPreviewProps {
  outfit: OutfitSlot;
  highlightSocket?: CosmeticSocket | null;
  size?: "small" | "medium" | "large";
}

export default function CharacterPreview({
  outfit,
  highlightSocket,
  size = "medium"
}: CharacterPreviewProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [animationFrame, setAnimationFrame] = useState(0);

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

    // Base position using actual glidermon anchor positions
    const getSocketPosition = (socket: CosmeticSocket) => {
      const scale = config.charWidth / 64; // Scale factor relative to original 64px sprite
      const anchor = glidermonIdleAnchors.anchors[socket];

      if (!anchor) {
        return { x: 0, y: 0 };
      }

      // Convert from sprite coordinates (32,32 center) to our coordinate system
      const spriteCenter = 32;
      const scaledX = (anchor.x - spriteCenter) * scale;
      const scaledY = (anchor.y - spriteCenter) * scale;

      return { x: scaledX, y: scaledY };
    };

    const basePos = getSocketPosition(socket);

    // Find the cosmetic definition for this item
    const cosmeticDef = cosmeticDefinitions.find(def => def.id === equippedItem.itemId);

    if (!cosmeticDef) {
      // Hide placeholder for now - no cosmetic definition found
      return null;
    }

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

    // Apply idle animation offset - sync with character bouncing
    const idleOffset = {
      x: Math.sin(animationFrame * 0.4) * 1, // Match character sway
      y: Math.sin(animationFrame * 0.8) * 2 // Match character bounce
    };

    // Apply GameCanvas hatOffset scaled to our character size
    const gameCanvasScale = config.charWidth / 64; // Our scale factor relative to 64px sprite
    const scaledHatOffset = {
      x: (gameCanvasOffset.dx || 0) * gameCanvasScale,
      y: (gameCanvasOffset.dy || 0) * gameCanvasScale
    };

    const transform = [
      { translateX: basePos.x + offset.x + idleOffset.x + scaledHatOffset.x },
      { translateY: basePos.y + offset.y + idleOffset.y + scaledHatOffset.y },
      { rotate: `${rotation}deg` },
      { scale: scale }
    ];

    // Match GameCanvas scaling - cosmetics should be same size as character sprite
    const cosmeticSize = config.charWidth; // Same size as the character sprite

    // Render actual cosmetic sprite
    const assetSource = AssetMap[cosmeticDef.texKey as keyof typeof AssetMap];
    if (!assetSource) {
      return null; // No asset available
    }

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
        <Image
          source={assetSource}
          style={{
            width: cosmeticSize,
            height: cosmeticSize,
            borderWidth: isHighlighted ? 2 : 0,
            borderColor: isHighlighted ? colors.primary[600] : "transparent",
            borderRadius: borderRadius.sm
          }}
          resizeMode="contain"
        />
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

  // Character idle animation - simple bounce and sway
  const characterTransform = [
    { translateY: Math.sin(animationFrame * 0.8) * 2 }, // Gentle bounce
    { rotate: `${Math.sin(animationFrame * 0.4) * 1}deg` } // Slight sway
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

      {/* Character Sprite with idle animation */}
      <View style={{
        transform: characterTransform,
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
              width: (64 * 4) * (config.charWidth / 64), // Scale sprite sheet proportionally
              height: (64 * 2) * (config.charHeight / 64), // Scale sprite sheet proportionally
              position: "absolute",
              left: -(animationFrame % 4) * (config.charWidth), // Move based on scaled frame size
              top: -Math.floor(animationFrame / 4) * (config.charHeight) // Move based on scaled frame size
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