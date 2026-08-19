// components/shop/ShopTabs.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import CraftTab from "../handcrafted/CraftTab";
import { LUMA_PEACH, SABLE_DUSTY_PURPLE } from "../handcrafted/tokens";
import type { ShopId } from "../../../data/shop/shopTypes";

type Props = {
  activeShopId: ShopId;
  onSelect: (shopId: ShopId) => void;
};

const SELECTED_COLOR: Record<ShopId, string> = {
  luma: LUMA_PEACH,
  sable: SABLE_DUSTY_PURPLE,
};

// Compact merchant switcher sitting beside the shop header -- lets the
// player hop between Luma's and Sable's stock without closing the panel.
export default function ShopTabs({ activeShopId, onSelect }: Props) {
  return (
    <View style={styles.row}>
      <CraftTab
        label="Luma"
        selected={activeShopId === "luma"}
        selectedColor={SELECTED_COLOR.luma}
        onPress={() => onSelect("luma")}
        style={styles.tab}
        labelSize={13}
      />
      <CraftTab
        label="Sable"
        selected={activeShopId === "sable"}
        selectedColor={SELECTED_COLOR.sable}
        onPress={() => onSelect("sable")}
        style={styles.tab}
        labelSize={13}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    minHeight: 38,
    paddingVertical: 6,
  },
});
