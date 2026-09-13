// ui/components/furnish/FurnishEmptyState.tsx
//
// The "nothing selected yet" prompt shown right after entering Furnish Nest,
// before the player has tapped anything. Extracted out of
// FurnitureInventoryPanel.tsx (which used to own this inline) now that
// FurnishInventoryArea branches slot/surface/empty explicitly.
import React from "react";
import { Text, StyleSheet } from "react-native";
import CraftPanel from "../handcrafted/CraftPanel";
import { INK, INK_MUTED } from "../handcrafted/tokens";

export default function FurnishEmptyState() {
  return (
    <CraftPanel texture="paper" stitched shadow="none" style={styles.promptPanel} contentStyle={styles.promptContent}>
      <Text style={styles.promptIcon}>🪑</Text>
      <Text style={styles.promptTitle}>Choose something in your Nest</Text>
      <Text style={styles.promptSubtitle}>{"Tap furniture, an empty spot,\na wall, or the floor to start decorating."}</Text>
    </CraftPanel>
  );
}

const styles = StyleSheet.create({
  promptPanel: {
    minHeight: 130,
    justifyContent: "center",
  },
  promptContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  promptIcon: {
    fontSize: 22,
    opacity: 0.55,
    marginBottom: 2,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: INK,
    textAlign: "center",
  },
  promptSubtitle: {
    fontSize: 13,
    color: INK_MUTED,
    textAlign: "center",
    lineHeight: 18,
  },
});
