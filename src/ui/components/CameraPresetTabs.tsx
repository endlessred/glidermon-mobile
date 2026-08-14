// ui/components/CameraPresetTabs.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { CraftTab } from "./handcrafted";
import { SHADOW_CARD_RAISED } from "./handcrafted/tokens";

export type CameraMode = "nest" | "glidermon";

type Props = {
  mode: CameraMode;
  onSelectNest: () => void;
  onSelectGlidermon: () => void;
};

// Two small tabs physically attached to the bottom of the Nest frame --
// meaningful viewing-mode presets (not numeric zoom controls). "Nest" is
// the standard wide room composition; "Glidermon" activates the existing
// close/follow character camera. Reuses CraftTab (same tab language as
// Equip) with a smaller footprint since these sit under a scene, not a
// full inventory panel.
export default function CameraPresetTabs({ mode, onSelectNest, onSelectGlidermon }: Props) {
  return (
    <View style={styles.row}>
      <CraftTab
        label="Nest"
        icon="🪺"
        iconSize={18}
        labelSize={14}
        selected={mode === "nest"}
        onPress={onSelectNest}
        style={[styles.tab, mode === "nest" && styles.selectedShadow]}
      />
      <CraftTab
        label="Glidermon"
        icon="🐿️"
        iconSize={18}
        labelSize={14}
        selected={mode === "glidermon"}
        onPress={onSelectGlidermon}
        style={[styles.tab, mode === "glidermon" && styles.selectedShadow]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: -19,
  },
  tab: {
    minHeight: 46,
    minWidth: 110,
    paddingVertical: 10,
  },
  selectedShadow: {
    ...SHADOW_CARD_RAISED,
  },
});
