// ui/components/CameraPresetTabs.tsx
import React, { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { CraftTab } from "./handcrafted";
import { SHADOW_CARD_RAISED } from "./handcrafted/tokens";
import NestContextMenu, { NestContextAction } from "./NestContextMenu";

export type CameraMode = "nest" | "glidermon" | "goals";

type Props = {
  mode: CameraMode;
  onSelectNest: () => void;
  onSelectGlidermon: () => void;
  onSelectGoals: () => void;
  /** Contextual actions exposed only while the Nest tab is already active
   * (e.g. "Furnish Nest") -- tapping/long-pressing the active Nest tab opens
   * a small anchored menu instead of doing nothing. Glidermon/Goals have no
   * contextual actions today; this stays generic (not Furnish-specific) so
   * future per-tab actions don't need a new mechanism. */
  nestContextualActions?: NestContextAction[];
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
  nestContextualActions,
}: Props) {
  const hasNestMenu = mode === "nest" && !!nestContextualActions && nestContextualActions.length > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const nestAnchorRef = useRef<View>(null);
  // Pressable can fire a trailing onPress right after onLongPress completes
  // (same touch satisfies both once the long-press threshold passes) --
  // without this guard that would open the menu via onLongPress and then
  // immediately re-toggle/reopen it via the trailing onPress.
  const justLongPressedRef = useRef(false);

  const openNestMenu = () => setMenuOpen(true);

  const handleNestPress = () => {
    if (justLongPressedRef.current) {
      justLongPressedRef.current = false;
      return;
    }
    if (hasNestMenu) openNestMenu();
    else onSelectNest();
  };

  const handleNestLongPress = () => {
    if (!hasNestMenu) return;
    justLongPressedRef.current = true;
    openNestMenu();
  };

  return (
    <View style={styles.row}>
      <View ref={nestAnchorRef} collapsable={false}>
        <CraftTab
          label="Nest"
          icon="🪺"
          iconSize={17}
          labelSize={13}
          selected={mode === "nest"}
          showCaret={hasNestMenu}
          onPress={handleNestPress}
          onLongPress={hasNestMenu ? handleNestLongPress : undefined}
          style={[styles.tab, mode === "nest" && styles.selectedShadow]}
        />
      </View>
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
      {hasNestMenu && (
        <NestContextMenu
          visible={menuOpen}
          anchorRef={nestAnchorRef}
          actions={nestContextualActions!}
          onClose={() => setMenuOpen(false)}
        />
      )}
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
