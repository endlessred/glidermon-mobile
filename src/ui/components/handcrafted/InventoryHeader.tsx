// components/handcrafted/InventoryHeader.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { INK } from "./tokens";

type InventoryHeaderProps = {
  label: string;
  owned: number;
  total: number;
};

// "Hats                 11 / 33 owned" -- sits at the top of a
// CorkInventoryPanel, above the grid.
export default function InventoryHeader({ label, owned, total }: InventoryHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {owned} / {total} owned
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: "800",
    color: INK,
  },
  value: {
    fontSize: 12,
    fontWeight: "600",
    color: INK,
    opacity: 0.65,
  },
});
