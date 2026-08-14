// ui/components/BadgeChip.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { INK, INK_MUTED, CREAM, KRAFT_TAN, SHADOW_CARD } from "./handcrafted/tokens";

type Props = {
  text: string;
  width?: number;
  height?: number;
  tone?: "accent" | "muted";
  LeftIcon?: React.ReactNode;
  onPress?: () => void; // optional interactive
  disabled?: boolean;
};

// A small paper badge attached to the crafted header -- plain cream/kraft
// card with an ink outline and a soft contact shadow, matching the rest of
// the handmade kit instead of the old glossy Skia chip. Used for both the
// acorn count and the streak count, so it stays legible at a glance.
export const BadgeChip: React.FC<Props> = ({
  text,
  width = 84,
  height = 32,
  tone = "accent",
  LeftIcon,
  onPress,
  disabled,
}) => {
  const content = (
    <View
      style={[
        styles.wrap,
        { width, height, borderRadius: height / 2 },
        tone === "muted" && styles.muted,
      ]}
    >
      {LeftIcon ? <View style={styles.icon}>{LeftIcon}</View> : null}
      <Text style={styles.text} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: INK,
    paddingHorizontal: 8,
    ...SHADOW_CARD,
  },
  muted: {
    backgroundColor: KRAFT_TAN,
    borderColor: INK_MUTED,
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontWeight: "800",
    color: INK,
    fontSize: 13,
  },
});
