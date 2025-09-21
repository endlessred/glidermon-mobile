// components/HatPreview.tsx
import React from "react";
import { View, Image, Text, ImageStyle, ViewStyle } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";

type HatPreviewProps = {
  hatId: string;
  size?: number;
  style?: ViewStyle;
};

export default function HatPreview({ hatId, size = 48, style }: HatPreviewProps) {
  const { colors, borderRadius } = useTheme();

  // Hat configurations to match GameCanvas
  const HAT_CONFIGS: Record<string, {
    tex: any;
    frameIndex?: number;
    showFullSheet?: boolean;
  }> = {
    // Original full sprite sheet hats - show full sheet
    leaf_hat: { tex: require("../../assets/GliderMonLeafHat.png"), showFullSheet: true },
    greater_hat: { tex: require("../../assets/GliderMonGreaterHat.png"), showFullSheet: true },

    // Hat pack hats - show specific frame
    frog_hat: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 0 },
    black_headphones: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 1 },
    white_headphones: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 2 },
    pink_headphones: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 3 },
    pink_aniphones: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 4 },
    feather_cap: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 5 },
    viking_hat: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 6 },
    adventurer_fedora: { tex: require("../../assets/hats/hat_pack_1.png"), frameIndex: 7 },
  };

  const hatConfig = HAT_CONFIGS[hatId];
  if (!hatConfig) {
    // Fallback for unknown hats
    return (
      <View style={[{
        width: size,
        height: size,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.gray[200],
      }, style]}>
        <Text style={{ fontSize: 24 }}>👑</Text>
      </View>
    );
  }

  // For original hats (full sprite sheets), show the entire image
  if (hatConfig.showFullSheet) {
    return (
      <View style={[{
        width: size,
        height: size,
        backgroundColor: colors.primary[50],
        borderRadius: borderRadius.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.primary[200],
        overflow: "hidden",
      }, style]}>
        <Image
          source={hatConfig.tex}
          style={{
            width: size * 0.8,
            height: size * 0.8,
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // For hat pack items, we need to show just the specific frame
  // Since React Native doesn't support sprite cropping natively,
  // we'll use a container with overflow hidden and position the image
  const frameIndex = hatConfig.frameIndex ?? 0;
  const totalFrames = 8; // hat_pack_1 has 8 frames horizontally
  const spriteSheetWidth = 512; // Based on the JSON: 8 frames × 64px = 512px
  const frameWidth = 64; // Each frame is 64px wide

  // Calculate the offset to show the correct frame
  const offsetX = -(frameIndex * frameWidth);

  // Scale factor to fit the frame in our preview size
  const scaleFactor = (size * 0.8) / frameWidth;

  return (
    <View style={[{
      width: size,
      height: size,
      backgroundColor: colors.primary[50],
      borderRadius: borderRadius.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.primary[200],
      overflow: "hidden",
    }, style]}>
      <View style={{
        width: size * 0.8,
        height: size * 0.8,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Image
          source={hatConfig.tex}
          style={{
            width: spriteSheetWidth * scaleFactor,
            height: 64 * scaleFactor, // Frame height
            marginLeft: offsetX * scaleFactor,
          }}
          resizeMode="stretch"
        />
      </View>
    </View>
  );
}