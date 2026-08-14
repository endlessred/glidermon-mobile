// components/handcrafted/CosmeticCategoryTab.tsx
import React from "react";
import { Pressable, View, Text, Image, ImageSourcePropType, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { INK, INK_MUTED, CREAM, FELT_GREEN, SHADOW_CARD, SHADOW_CARD_RAISED } from "./tokens";

type CosmeticCategoryTabProps = {
  icon: ImageSourcePropType;
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// One category tab in the Hats/Hair/Shoes/Outfit/Skin row: icon stacked
// above its label, rounded-top "attached to the corkboard" shape. The
// single reusable component for all five categories -- only `selected`
// changes the treatment (green felt + stronger shadow + a slight pop up),
// everything else (icon-dominant sizing, shape, spacing) stays identical.
export default function CosmeticCategoryTab({ icon, label, selected, onPress, style }: CosmeticCategoryTabProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!selected }}
      style={[styles.wrap, selected ? styles.selected : styles.idle, selected && styles.selectedLift, style]}
    >
      {selected && <View style={styles.stitch} pointerEvents="none" />}
      <Image source={icon} style={styles.icon} resizeMode="contain" />
      <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 2,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    ...SHADOW_CARD,
  },
  idle: {
    backgroundColor: CREAM,
    borderColor: INK_MUTED,
    opacity: 0.88,
  },
  selected: {
    backgroundColor: FELT_GREEN,
    borderColor: INK,
    borderWidth: 2.5,
  },
  // Pops the selected tab up a touch above its neighbors and gives it a
  // stronger shadow, so it reads as physically raised/in-front -- the
  // corkboard sliding up behind the whole row (see CorkInventoryPanel) is
  // what actually welds the tabs to the panel, this is just the accent.
  selectedLift: {
    marginTop: -3,
    zIndex: 3,
    ...SHADOW_CARD_RAISED,
  },
  stitch: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 2,
    borderWidth: 1.5,
    borderColor: INK,
    borderStyle: "dashed",
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    opacity: 0.3,
  },
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: INK,
  },
  labelSelected: {
    fontWeight: "700",
  },
});
