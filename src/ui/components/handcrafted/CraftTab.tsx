// components/handcrafted/CraftTab.tsx
import React from "react";
import { Pressable, Text, Image, ImageSourcePropType, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { INK, INK_MUTED, CREAM, CREAM_LIGHT, FELT_GREEN, KRAFT_TAN, SHADOW_CARD_RAISED } from "./tokens";

type CraftTabProps = {
  label: string;
  /** An emoji/symbol string, or a require()'d PNG icon. */
  icon?: string | ImageSourcePropType;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** "pill" (default) is a fully-rounded standalone button. "flushTop" is a
   * folder-tab shape -- rounded top only, open bottom -- meant to sit
   * directly on top of a panel with a small negative margin so it reads as
   * attached rather than floating above it. */
  shape?: "pill" | "flushTop";
  /** Overrides the default emoji icon size (both idle/selected use this same
   * size, rather than the built-in 14/16 idle/selected split) -- for callers
   * that need a bigger touch target than the default category-tab sizing. */
  iconSize?: number;
  /** Overrides the default label font size (12). */
  labelSize?: number;
};

// Category tab (Hats / Hair / Shoes / Outfit / Skin row): cream paper base
// with an ink outline, tinted felt-green when selected. Native styling (not
// a stretched SVG) so it never warps. The selected tab pops forward with a
// shadow; idle tabs use a muted outline so they read as sitting slightly
// behind/recessed into the panel below.
export default function CraftTab({ label, icon, selected, disabled, onPress, style, shape = "pill", iconSize, labelSize }: CraftTabProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={[
        styles.wrap,
        shape === "flushTop" ? styles.flushTop : styles.pill,
        selected ? styles.selected : disabled ? styles.disabled : styles.idle,
        selected && shape === "flushTop" && styles.selectedLift,
        style,
      ]}
    >
      {icon ? (
        typeof icon === "string" ? (
          <Text style={[styles.icon, selected && styles.iconSelected, iconSize ? { fontSize: iconSize } : null]}>{icon}</Text>
        ) : (
          <Image source={icon} style={[styles.iconImage, selected && styles.iconImageSelected]} resizeMode="contain" />
        )
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          selected && styles.labelSelected,
          disabled && !selected && styles.labelDisabled,
          labelSize ? { fontSize: labelSize } : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 54,
    minWidth: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 2,
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
    borderColor: INK_MUTED,
    opacity: 0.88,
  },
  selected: {
    backgroundColor: FELT_GREEN,
    borderColor: INK,
    borderWidth: 3,
  },
  // Selected tab sits a touch taller than its neighbors, like a real folder
  // tab popped forward, plus a soft lift shadow for depth.
  selectedLift: {
    marginTop: -6,
    paddingBottom: 15,
    ...SHADOW_CARD_RAISED,
  },
  disabled: {
    backgroundColor: KRAFT_TAN,
    opacity: 0.6,
  },
  icon: {
    fontSize: 14,
  },
  iconSelected: {
    fontSize: 16,
  },
  iconImage: {
    width: 22,
    height: 22,
  },
  iconImageSelected: {
    width: 26,
    height: 26,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: INK,
  },
  labelSelected: {
    color: CREAM_LIGHT,
  },
  labelDisabled: {
    color: INK_MUTED,
  },
});
