// ui/components/CameraPresetTabs.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { CraftTab } from "./handcrafted";
import { SHADOW_CARD_RAISED } from "./handcrafted/tokens";

export type CameraMode = "nest" | "glidermon" | "goals";

type Props = {
  mode: CameraMode;
  onSelectNest: () => void;
  onSelectGlidermon: () => void;
  onSelectGoals: () => void;
};

// Small tabs physically attached to the bottom of the Nest frame --
// meaningful viewing-mode presets (not numeric zoom controls). "Nest" is the
// standard wide room composition; "Glidermon" activates the close/follow
// character camera; "Goals" frames the Daily Adventure Board so today's plan
// reads as a physical object in the room. Reuses CraftTab (same tab language
// as Equip) with a smaller footprint since these sit under a scene.
export default function CameraPresetTabs({
  mode,
  onSelectNest,
  onSelectGlidermon,
  onSelectGoals,
}: Props) {
  return (
    <View style={styles.row}>
      <CraftTab
        label="Nest"
        icon="🪺"
        iconSize={17}
        labelSize={13}
        selected={mode === "nest"}
        onPress={onSelectNest}
        style={[styles.tab, mode === "nest" && styles.selectedShadow]}
      />
      <CraftTab
        label="Glidermon"
        icon="🐿️"
        iconSize={17}
        labelSize={13}
        selected={mode === "glidermon"}
        onPress={onSelectGlidermon}
        style={[styles.tab, mode === "glidermon" && styles.selectedShadow]}
      />
      <CraftTab
        label="Goals"
        icon="📋"
        iconSize={17}
        labelSize={13}
        selected={mode === "goals"}
        onPress={onSelectGoals}
        style={[styles.tab, mode === "goals" && styles.selectedShadow]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: -19,
  },
  tab: {
    minHeight: 46,
    minWidth: 96,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  selectedShadow: {
    ...SHADOW_CARD_RAISED,
  },
});
