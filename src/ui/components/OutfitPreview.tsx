// ui/components/OutfitPreview.tsx
import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { OutfitSlot, CosmeticSocket } from "../../data/types/outfitTypes";
import CharacterPreview from "./CharacterPreview";

interface OutfitPreviewProps {
  outfit: OutfitSlot;
  highlightSocket?: CosmeticSocket | null;
}

export default function OutfitPreview({ outfit, highlightSocket }: OutfitPreviewProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.sm
    }}>
      <CharacterPreview
        outfit={outfit}
        highlightSocket={highlightSocket}
        size="large"
      />

      {/* Instructions */}
      <Text style={{
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        textAlign: "center"
      }}>
        Live Preview
      </Text>
    </View>
  );
}