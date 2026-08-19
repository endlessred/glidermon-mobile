// components/shop/ShopHeader.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { INK, INK_MUTED, CREAM_LIGHT } from "../handcrafted/tokens";
import { formatRestockCountdown } from "./shopTimeFormat";
import type { ShopTone } from "./ShopStockCard";

type Props = {
  shopkeeperName: string;
  tone: ShopTone;
  msUntilRestock: number;
  onClose?: () => void;
};

// Plain crafted typography -- the selected merchant tab above this panel
// already communicates "whose shop is this," so no second colored pill is
// needed here. Just a clear dark-brown title and a small, quiet countdown.
export default function ShopHeader({ shopkeeperName, msUntilRestock, onClose }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        <Text style={styles.name}>{shopkeeperName}'s Shop</Text>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleGroup: {
    flexShrink: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: INK,
  },
  countdown: {
    fontSize: 12,
    fontWeight: "600",
    color: INK_MUTED,
    marginTop: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  closeGlyph: {
    fontSize: 16,
    fontWeight: "800",
    color: INK,
    marginTop: -1,
  },
});
