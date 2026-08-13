// components/CosmeticThumbnail.tsx
import React from "react";
import { View, Image, Text, ViewStyle } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { cosmeticThumbnailManifest } from "../../assets/cosmeticThumbnails/generated/cosmeticThumbnailManifest";

// Emoji fallback per socket, for catalog items without a generated
// thumbnail yet (e.g. just added, before generate_thumbnails.py has been
// rerun) -- degrades gracefully instead of breaking.
const FALLBACK_EMOJI: Record<string, string> = {
  headTop: "👑",
  hair: "💇",
  jacket: "🧥",
  shoes: "👟",
  skin: "🎨",
  theme: "🎨",
};

type CosmeticThumbnailProps = {
  itemId: string;
  socket?: string;
  size?: number;
  style?: ViewStyle;
};

export default function CosmeticThumbnail({ itemId, socket, size = 48, style }: CosmeticThumbnailProps) {
  const { colors, borderRadius } = useTheme();
  const source = cosmeticThumbnailManifest[itemId];

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.md,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.gray[200],
          overflow: "hidden",
        },
        style,
      ]}
    >
      {source ? (
        <Image source={source} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{FALLBACK_EMOJI[socket ?? ""] ?? "❓"}</Text>
      )}
    </View>
  );
}
