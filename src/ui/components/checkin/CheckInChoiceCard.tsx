// components/checkin/CheckInChoiceCard.tsx
import React, { useEffect, useRef } from "react";
import { Pressable, Animated, Text, Image, View, StyleSheet } from "react-native";
import { useTheme } from "../../../data/hooks/useTheme";
import {
  INK,
  INK_MUTED,
  CREAM_LIGHT,
  PALE_GREEN,
  FELT_GREEN,
  FELT_GREEN_DARK,
  CREAM,
  WOBBLE_RADIUS_SM,
  SHADOW_CARD,
  SHADOW_CARD_RAISED,
  PAPER_GRAIN,
} from "./tokens";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Small trailing note, e.g. a target value. */
  hint?: string;
  /** Hide the radio control -- for immediate-answer rows (e.g. Yes/Partly/No)
   * where there is no persistent selection to show. */
  hideControl?: boolean;
};

// One reusable goal option. The whole row is the touch target (not just the
// control): warm cream cardstock with a wobbly hand-cut edge and a thinner
// dark outline than the surrounding panels; on selection it takes a
// pale-green felt tint, a green check, a green outline, and a slightly
// stronger contact shadow. Selection is obvious but calm -- no digital blue.
// Pressing runs a small push-in; selecting runs a quick 1.015 pop.
export default function CheckInChoiceCard({ label, selected, onPress, disabled, hint, hideControl }: Props) {
  const { reduceMotion } = useTheme();
  const press = useRef(new Animated.Value(0)).current;
  const pick = useRef(new Animated.Value(0)).current;
  const firstRun = useRef(true);

  const animateTo = (to: number, duration: number) =>
    Animated.timing(press, { toValue: to, duration, useNativeDriver: true }).start();

  // Quick tactile pop the moment this row becomes selected (1 -> 1.015 -> 1).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (!selected || reduceMotion) return;
    pick.setValue(0);
    Animated.sequence([
      Animated.timing(pick, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(pick, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start();
  }, [selected, reduceMotion, pick]);

  const scale = Animated.multiply(
    press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }),
    pick.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }),
  );
  const translateY = press.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && animateTo(1, 90)}
      onPressOut={() => !disabled && animateTo(0, 130)}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.card,
          selected ? styles.cardSelected : styles.cardIdle,
          selected ? SHADOW_CARD_RAISED : SHADOW_CARD,
          disabled && styles.cardDisabled,
          { transform: [{ scale }, { translateY }] },
        ]}
      >
        <Image source={PAPER_GRAIN} resizeMode="cover" style={styles.grain} />
        <View style={styles.textCol}>
          <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        {hideControl ? null : (
          <View style={[styles.radio, selected ? styles.radioSelected : styles.radioIdle]}>
            {selected ? <Text style={styles.check}>✓</Text> : null}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    ...WOBBLE_RADIUS_SM,
  },
  cardIdle: {
    backgroundColor: CREAM_LIGHT,
    borderColor: INK,
  },
  cardSelected: {
    backgroundColor: PALE_GREEN,
    borderColor: FELT_GREEN_DARK,
    borderWidth: 2.5,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.07,
  },
  textCol: {
    flex: 1,
  },
  label: {
    color: INK,
    fontSize: 16.5,
    fontWeight: "600",
  },
  labelSelected: {
    fontWeight: "800",
  },
  hint: {
    color: INK_MUTED,
    fontSize: 12.5,
    marginTop: 2,
  },
  radio: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  radioIdle: {
    borderColor: INK_MUTED,
    backgroundColor: CREAM,
  },
  radioSelected: {
    borderColor: INK,
    backgroundColor: FELT_GREEN,
  },
  check: {
    color: CREAM_LIGHT,
    fontSize: 15,
    fontWeight: "800",
  },
});
