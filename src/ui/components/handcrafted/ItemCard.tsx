// components/handcrafted/ItemCard.tsx
import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import StitchedBorder from "./StitchedBorder";
import { INK, CREAM, FELT_GREEN, WOBBLE_RADIUS_SM } from "./tokens";

type ItemCardProps = {
  name: string;
  equipped?: boolean;
  onPress?: () => void;
  children?: React.ReactNode; // thumbnail
};

// A single item in the equip grid: cream paper swatch, hand-drawn outline,
// green "EQUIPPED" tag + checkmark border when it's the active pick.
export default function ItemCard({ name, equipped, onPress, children }: ItemCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityState={{ selected: !!equipped }}
    >
      <View style={[styles.fill, equipped && styles.fillEquipped]} />
      <StitchedBorder variant={equipped ? "equipped" : "dashed"} />
      {equipped && (
        <View style={styles.tag}>
          <Text style={styles.tagText}>EQUIPPED</Text>
        </View>
      )}
      <View style={styles.thumbWrap}>{children}</View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 0.86,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CREAM,
    ...WOBBLE_RADIUS_SM,
  },
  fillEquipped: {
    backgroundColor: "#EAF4DB",
  },
  tag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: FELT_GREEN,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
  },
  tagText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFDF7",
    letterSpacing: 0.3,
  },
  thumbWrap: {
    width: "62%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 11,
    fontWeight: "700",
    color: INK,
    textAlign: "center",
  },
});
