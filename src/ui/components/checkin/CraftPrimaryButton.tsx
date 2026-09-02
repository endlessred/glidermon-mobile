// components/checkin/CraftPrimaryButton.tsx
import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import CraftActionButton from "../handcrafted/CraftActionButton";

export type CraftPrimaryAccent = "sunrise" | "green" | "cream";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** sunrise = warm gold felt (opening CTA), green = muted felt
   * (continue / done), cream = quiet secondary. */
  accent?: CraftPrimaryAccent;
  caption?: string;
  /** "lg" for a step's single primary CTA. Default "md". */
  size?: "md" | "lg";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

// The one primary CTA for every check-in step. A thin semantic wrapper over
// the shared CraftActionButton so the ritual never grows its own button:
// same felt/paper fill, ink outline, and tactile press (scale 1→0.96→1,
// translateY 0→1→0, ~100–130ms) used across Shop / Outfit / celebration
// modals.
export default function CraftPrimaryButton({
  label,
  onPress,
  disabled,
  accent = "green",
  caption,
  size = "md",
  style,
  accessibilityLabel,
}: Props) {
  const tone = accent === "sunrise" ? "gold" : accent === "cream" ? "cream" : "green";
  return (
    <CraftActionButton
      label={label}
      caption={caption}
      onPress={onPress}
      disabled={disabled}
      tone={tone}
      size={size}
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
