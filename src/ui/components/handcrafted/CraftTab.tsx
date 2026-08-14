// components/handcrafted/CraftTab.tsx
import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { INK, CREAM, FELT_GREEN, FELT_GREEN_DARK, INK_MUTED, KRAFT_TAN } from "./tokens";

type CraftTabProps = {
  label: string;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** "pill" (default) is a fully-rounded standalone button. "flushTop" is a
   * folder-tab shape -- rounded top only, open bottom -- meant to sit
   * directly on top of a panel with a small negative margin so it reads as
   * attached rather than floating above it. */
  shape?: "pill" | "flushTop";
};

// Category tab (Hats / Face / Clothes / Skin row): cream paper base with an
// ink outline, tinted felt-green when selected. Native styling (not a
// stretched SVG) so it never warps.
export default function CraftTab({ label, icon, selected, disabled, onPress, style, shape = "pill" }: CraftTabProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={[
        styles.wrap,
        shape === "flushTop" ? styles.flushTop : styles.pill,
        selected ? styles.selected : disabled ? styles.disabled : styles.idle,
        style,
      ]}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text
        numberOfLines={1}
        style={[styles.label, selected && styles.labelSelected, disabled && !selected && styles.labelDisabled]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2.5,
    borderColor: INK,
  },
  pill: {
    borderRadius: 999,
  },
  flushTop: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  idle: {
    backgroundColor: CREAM,
  },
  selected: {
    backgroundColor: FELT_GREEN,
  },
  disabled: {
    backgroundColor: KRAFT_TAN,
    opacity: 0.6,
  },
  icon: {
    fontSize: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: INK,
  },
  labelSelected: {
    color: FELT_GREEN_DARK,
  },
  labelDisabled: {
    color: INK_MUTED,
  },
});
