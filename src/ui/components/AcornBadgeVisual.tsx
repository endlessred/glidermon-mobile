// ui/components/AcornBadgeVisual.tsx
import React, { useEffect, useRef } from "react";
import { Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { BadgeChip } from "./BadgeChip";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useAcornFxStore } from "../../data/stores/acornFxStore";

let PhosphorIcons: any = {};
try {
  PhosphorIcons = require("phosphor-react-native");
} catch {
  // Fallback if phosphor is not installed yet
}
const { Acorn } = PhosphorIcons;

type Props = {
  width?: number;
  height?: number;
};

/**
 * The acorn balance badge, reusable across surfaces: the persistent one on
 * the Home tab, and any temporary instance AcornFlightOverlay spawns on
 * screens that don't normally show a badge. Both read the same fx store so
 * an in-flight reward animates its count-up and pulse identically either way.
 */
export default function AcornBadgeVisual({ width = 100, height = 36 }: Props) {
  const realAcorns = useProgressionStore((s) => s.acorns);
  const queueLength = useAcornFxStore((s) => s.queue.length);
  const fxDisplayed = useAcornFxStore((s) => s.displayedAcorns);
  const pulseNonce = useAcornFxStore((s) => s.pulseNonce);

  const shown = queueLength > 0 && fxDisplayed != null ? fxDisplayed : realAcorns;

  const scale = useSharedValue(1);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    scale.value = withSequence(
      withTiming(1.18, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.back(1.8)) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseNonce]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <BadgeChip
        text={`${Math.round(shown)}`}
        tone="accent"
        width={width}
        height={height}
        LeftIcon={Acorn ? <Acorn size={16} weight="fill" /> : <Text style={{ fontSize: 16 }}>🌰</Text>}
      />
    </Animated.View>
  );
}
