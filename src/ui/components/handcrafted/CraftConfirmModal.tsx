// components/handcrafted/CraftConfirmModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { useTheme } from "../../../data/hooks/useTheme";
import CraftPanel from "./CraftPanel";
import CraftActionButton from "./CraftActionButton";
import { INK, INK_MUTED } from "./tokens";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Lightweight two-button confirmation card -- same CraftPanel shell/backdrop
// as CraftCelebrationModal, but for a plain "are you sure" moment (no hero
// graphic, no value/unit) rather than a reward celebration. Kept as a
// sibling rather than folded into CraftCelebrationModal since that
// component's hero/value hierarchy doesn't apply here.
export default function CraftConfirmModal({ visible, title, message, confirmLabel, cancelLabel = "Cancel", onConfirm, onCancel }: Props) {
  const { reduceMotion } = useTheme();
  const [mounted, setMounted] = useState(visible);

  const bgA = useRef(new Animated.Value(0)).current;
  const cardS = useRef(new Animated.Value(0.94)).current;
  const cardA = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setMounted(true);
    bgA.setValue(0);
    cardS.setValue(0.94);
    cardA.setValue(0);

    if (reduceMotion) {
      bgA.setValue(1);
      cardS.setValue(1);
      cardA.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.timing(bgA, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardS, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(cardA, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const closeThen = (action: () => void) => {
    if (reduceMotion) {
      setMounted(false);
      action();
      return;
    }
    Animated.parallel([
      Animated.timing(cardS, { toValue: 0.97, duration: 100, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(cardA, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(bgA, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setMounted(false);
      action();
    });
  };

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: bgA }]} />
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={{ opacity: cardA, transform: [{ scale: cardS }] }}>
          <CraftPanel texture="paper" stitched shadow="card" inset={22} style={styles.card} contentStyle={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <View style={styles.buttonRow}>
              <CraftActionButton
                label={cancelLabel}
                tone="cream"
                onPress={() => closeThen(onCancel)}
                style={styles.buttonFlex}
              />
              <CraftActionButton
                label={confirmLabel}
                tone="gold"
                onPress={() => closeThen(onConfirm)}
                style={styles.buttonFlex}
              />
            </View>
          </CraftPanel>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#2A1C16",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: 280,
  },
  content: {
    flex: 0,
    alignItems: "center",
  },
  title: {
    color: INK,
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 6,
    textAlign: "center",
  },
  message: {
    color: INK_MUTED,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
  },
  buttonFlex: {
    flex: 1,
  },
});
