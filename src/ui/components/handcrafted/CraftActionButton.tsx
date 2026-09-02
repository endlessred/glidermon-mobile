// components/handcrafted/CraftActionButton.tsx
import React, { useRef } from "react";
import { Pressable, Text, Image, Animated, View, StyleProp, ViewStyle } from "react-native";
import { INK, INK_MUTED, CREAM, FELT_GREEN, KRAFT_TAN, GOLD, WOBBLE_RADIUS_SM } from "./tokens";

const felt = require("../../../assets/UI Assets/Textures/Felt.png");

export type CraftActionButtonTone = "gold" | "green" | "cream";

type Props = {
  label: string;
  /** Small caption under the label, e.g. "1 free today". */
  caption?: string;
  icon?: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: CraftActionButtonTone;
  /** "lg" gives a taller button with a larger label -- for a screen's single
   * primary CTA (e.g. the check-in flow). Default "md". */
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const FILL_BY_TONE: Record<CraftActionButtonTone, string> = {
  gold: GOLD,
  green: FELT_GREEN,
  cream: CREAM,
};

// Primary crafted CTA: felt/gold-grain fill, ink outline, physical
// press-scale feedback -- originally built inline for CraftCelebrationModal,
// extracted here so any screen needing a "real button" (not a tab) gets the
// same hand-made feel instead of a flat digital button.
export default function CraftActionButton({ label, caption, icon, onPress, disabled, tone = "gold", size = "md", style, accessibilityLabel }: Props) {
  const lg = size === "lg";
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressTranslateY = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.timing(pressScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(pressTranslateY, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start();
  };
  const handlePressOut = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.timing(pressScale, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.timing(pressTranslateY, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[{ alignSelf: "stretch" }, style]}
    >
      <Animated.View
        style={[
          styles.button,
          lg && styles.buttonLg,
          { backgroundColor: FILL_BY_TONE[tone] },
          disabled && styles.disabled,
          { transform: [{ scale: pressScale }, { translateY: pressTranslateY }] },
        ]}
      >
        {!disabled && <Image source={felt} resizeMode="cover" style={styles.grain} />}
        <View style={styles.labelRow}>
          {icon ? <Text style={[styles.icon, disabled && styles.labelDisabled]}>{icon}</Text> : null}
          <Text style={[styles.label, lg && styles.labelLg, disabled && styles.labelDisabled]}>{label}</Text>
        </View>
        {caption ? <Text style={[styles.caption, disabled && styles.captionDisabled]}>{caption}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = {
  button: {
    position: "relative" as const,
    overflow: "hidden" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2.5,
    borderColor: INK,
    ...WOBBLE_RADIUS_SM,
    shadowColor: "#2A1C16",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonLg: {
    paddingVertical: 15,
    minHeight: 54,
  },
  disabled: {
    backgroundColor: KRAFT_TAN,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  grain: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.18,
  },
  labelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  icon: {
    fontSize: 15,
    color: INK,
  },
  label: {
    color: INK,
    fontWeight: "800" as const,
    fontSize: 15,
  },
  labelLg: {
    fontSize: 17,
  },
  labelDisabled: {
    color: INK_MUTED,
  },
  caption: {
    color: INK,
    opacity: 0.7,
    fontWeight: "600" as const,
    fontSize: 11,
    marginTop: 1,
  },
  captionDisabled: {
    color: INK_MUTED,
  },
};
