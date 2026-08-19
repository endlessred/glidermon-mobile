// components/shop/ShopHeader.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { INK, INK_MUTED, CREAM_LIGHT, LUMA_PEACH, SABLE_DUSTY_PURPLE } from "../handcrafted/tokens";
import { formatRestockCountdown } from "./shopTimeFormat";
import type { ShopTone } from "./ShopStockCard";

type Props = {
  shopkeeperName: string;
  tone: ShopTone;
  msUntilRestock: number;
  onClose?: () => void;
};

const NAME_PILL_COLOR: Record<ShopTone, string> = {
  luma: LUMA_PEACH,
  sable: SABLE_DUSTY_PURPLE,
};

// Clear shopkeeper name + a subtle secondary countdown -- the timer is
// deliberately small/muted so it doesn't compete with "whose shop is this."
export default function ShopHeader({ shopkeeperName, tone, msUntilRestock, onClose }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <View style={[styles.namePill, { backgroundColor: NAME_PILL_COLOR[tone] }]}>
          <Text style={[styles.name, tone === "sable" && styles.nameOnDark]}>{shopkeeperName}'s Shop</Text>
        </View>
        <Text style={styles.countdown}>{formatRestockCountdown(msUntilRestock)}</Text>
      </View>
      {onClose ? (
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close shop" hitSlop={8} style={styles.closeButton}>
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    flexShrink: 1,
  },
  namePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: INK,
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    color: INK,
  },
  nameOnDark: {
    color: CREAM_LIGHT,
  },
  countdown: {
    fontSize: 11.5,
    fontWeight: "600",
    color: INK_MUTED,
    flexShrink: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  closeGlyph: {
    fontSize: 17,
    fontWeight: "800",
    color: INK,
    marginTop: -2,
  },
});
