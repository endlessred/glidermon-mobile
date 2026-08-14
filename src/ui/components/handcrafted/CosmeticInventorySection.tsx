// components/handcrafted/CosmeticInventorySection.tsx
import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";

type CosmeticInventorySectionProps = {
  /** A <CategoryTabRow />. */
  tabs: React.ReactNode;
  /** A <CorkInventoryPanel>...</CorkInventoryPanel>. */
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Owns the interlock between the tab row and the cork panel beneath it: the
// tabs paint above the panel (zIndex) and the panel slides up behind them,
// so the two read as one continuous handmade object rather than a row of
// buttons floating over a separate rounded card.
export default function CosmeticInventorySection({ tabs, children, style }: CosmeticInventorySectionProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.tabRow}>{tabs}</View>
      <View style={styles.panelWrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  tabRow: {
    zIndex: 2,
  },
  panelWrap: {
    flex: 1,
    marginTop: -10,
  },
});
