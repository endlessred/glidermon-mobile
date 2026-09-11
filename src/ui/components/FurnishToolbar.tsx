// ui/components/FurnishToolbar.tsx
//
// Replaces CameraPresetTabs in the exact same layout slot while Furnish Nest
// is active -- same row treatment (marginTop: -19) so it stays visually
// attached to the Nest frame the same way the camera tabs do.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import CraftActionButton from "./handcrafted/CraftActionButton";
import { INK } from "./handcrafted/tokens";

type Props = {
  onCancel: () => void;
  onDone: () => void;
  /** Whether the draft session differs from the original placements.
   * `Done` is visually subdued (still tappable) when false, so the toolbar
   * gives a passive "nothing to save yet" signal without an extra badge. */
  dirty: boolean;
};

export default function FurnishToolbar({ onCancel, onDone, dirty }: Props) {
  return (
    <View style={styles.row}>
      <CraftActionButton label="Cancel" tone="cream" onPress={onCancel} style={styles.button} />
      <Text style={styles.label} numberOfLines={1}>
        Furnish Nest
      </Text>
      <CraftActionButton label="Done" tone="green" dim={!dirty} onPress={onDone} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: -19,
  },
  button: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: INK,
    flexShrink: 0,
  },
});
