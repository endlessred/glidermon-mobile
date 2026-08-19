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

// Folder-tab pair meant to sit welded to the top of NpcStorePanel (see its
// negative-margin overlap) -- same "attached to the panel below" language
// as CategoryTabRow/CosmeticCategoryTab on Outfit, just two merchants
// instead of five categories.
export default function ShopTabs({ activeShopId, onSelect }: Props) {
  return (
    <View style={styles.row}>
      <CraftTab
        label="Luma"
        shape="flushTop"
        selected={activeShopId === "luma"}
        selectedColor={SELECTED_COLOR.luma}
        onPress={() => onSelect("luma")}
        style={styles.tab}
        labelSize={13}
      />
      <CraftTab
        label="Sable"
        shape="flushTop"
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
    gap: 6,
    paddingLeft: 6,
  },
  tab: {
    minWidth: 82,
    minHeight: 40,
    paddingVertical: 8,
  },
});
