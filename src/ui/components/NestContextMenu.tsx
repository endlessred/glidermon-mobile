// ui/components/NestContextMenu.tsx
//
// A small anchored popover for a tab's contextual actions -- built generic
// (any tab, any action list) rather than hardcoded to Furnish Nest, per the
// reusable-contextual-tab-action goal. No anchored-popover pattern existed
// in this codebase before this (ColorwaySheet/CraftConfirmModal/
// CraftCelebrationModal are all full-viewport-centered, not anchored), so
// this measures the anchor via `measureInWindow` and renders inside a
// transparent Modal -- the same overlay primitive ColorwaySheet already
// uses, just without the slide/page-sheet presentation.
import React, { useEffect, useState } from "react";
import { Modal, Pressable, View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CraftPanel from "./handcrafted/CraftPanel";
import { INK, CREAM } from "./handcrafted/tokens";

export type NestContextAction = {
  id: string;
  label: string;
  icon?: string;
  onPress: () => void;
};

type Anchor = { x: number; y: number; width: number; height: number };

type Props = {
  visible: boolean;
  /** Ref to the anchor element (a plain View wrapper works fine -- doesn't
   * need to be the tab itself). Measured fresh each time the menu opens. */
  anchorRef: React.RefObject<View | null>;
  actions: NestContextAction[];
  onClose: () => void;
};

const MENU_WIDTH = 186;
// ~12% shorter than the original 44 -- the popover only ever holds a
// handful of short action rows, so it doesn't need Outfit-tab-sized rows.
const ROW_HEIGHT = 38;
const PANEL_INSET = 6;
const SCREEN_MARGIN = 12;
const GAP_FROM_ANCHOR = 10;

export default function NestContextMenu({ visible, anchorRef, actions, onClose }: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    if (!visible) {
      setAnchor(null);
      return;
    }
    const handle = anchorRef.current;
    if (!handle) return;
    handle.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  }, [visible, anchorRef, windowWidth, windowHeight]);

  if (!visible || !anchor) return null;

  const menuHeight = actions.length * ROW_HEIGHT + PANEL_INSET * 2;
  const anchorCenterX = anchor.x + anchor.width / 2;

  // Horizontal clamp against the viewport, independent of safe-area (the
  // menu never sits under a notch/status bar horizontally).
  const left = Math.max(
    SCREEN_MARGIN,
    Math.min(anchorCenterX - MENU_WIDTH / 2, windowWidth - MENU_WIDTH - SCREEN_MARGIN)
  );

  // Prefer above the anchor; fall back to below if there isn't enough room
  // (e.g. the anchor sits near the top of the screen), clamped against the
  // safe-area insets rather than raw 0/windowHeight.
  const spaceAbove = anchor.y - insets.top;
  const placeBelow = spaceAbove < menuHeight + GAP_FROM_ANCHOR;
  const top = placeBelow
    ? Math.min(anchor.y + anchor.height + GAP_FROM_ANCHOR, windowHeight - insets.bottom - menuHeight - SCREEN_MARGIN)
    : Math.max(insets.top + SCREEN_MARGIN, anchor.y - menuHeight - GAP_FROM_ANCHOR);

  // Pointer triangle position, clamped so it never renders outside the
  // menu's own horizontal bounds even when the menu itself got clamped away
  // from directly under/over the anchor.
  const pointerLeft = Math.max(14, Math.min(anchorCenterX - left - 7, MENU_WIDTH - 28));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="none" />
      <View style={[styles.wrap, { left, top, width: MENU_WIDTH }]} pointerEvents="box-none">
        {!placeBelow && <View style={[styles.pointerDown, { left: pointerLeft }]} />}
        <CraftPanel texture="paper" stitched shadow="card" inset={PANEL_INSET} contentStyle={styles.content}>
          {actions.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              {action.icon ? <Text style={styles.icon}>{action.icon}</Text> : null}
              <Text style={styles.label}>{action.label}</Text>
            </Pressable>
          ))}
        </CraftPanel>
        {placeBelow && <View style={[styles.pointerUp, { left: pointerLeft }]} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
  },
  content: {
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: ROW_HEIGHT - PANEL_INSET,
    paddingHorizontal: 5,
  },
  icon: {
    fontSize: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: INK,
  },
  pointerDown: {
    position: "absolute",
    bottom: -7,
    width: 14,
    height: 14,
    backgroundColor: CREAM,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: INK,
    transform: [{ rotate: "45deg" }],
    zIndex: -1,
  },
  pointerUp: {
    position: "absolute",
    top: -7,
    width: 14,
    height: 14,
    backgroundColor: CREAM,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: INK,
    transform: [{ rotate: "45deg" }],
    zIndex: -1,
  },
});
