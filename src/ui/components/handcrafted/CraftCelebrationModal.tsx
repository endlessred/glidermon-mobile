// components/handcrafted/CraftCelebrationModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, Animated, Easing, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../../data/hooks/useTheme";
import CraftPanel from "./CraftPanel";
import { INK, INK_MUTED, GOLD, WOBBLE_RADIUS_SM } from "./tokens";

const felt = require("../../../assets/UI Assets/Textures/Felt.png");

export type CelebrationVariant = "celebration" | "confirmation" | "information" | "warning";

type SparkPos = { top?: number; bottom?: number; left?: number; right?: number; delay: number };

// Three small stitched accents around the hero -- deliberately sparse (see
// CraftCelebrationModal's `sparks` prop) so the hero animation stays the
// thing that provides most of the personality.
const SPARKS: SparkPos[] = [
  { top: 4, left: 18, delay: 0 },
  { top: 20, right: 10, delay: 260 },
  { bottom: 8, left: 6, delay: 520 },
];

type Props = {
  visible: boolean;
  /** Called once the exit animation finishes -- wire this to whatever
   * dismissal/state logic already exists (e.g. a store action); the modal
   * itself owns only the animation timing, not app state. */
  onDismiss: () => void;
  variant?: CelebrationVariant;
  /** The animated/illustrated graphic that leads the card -- swappable per
   * call site (felt flame, felt heart, stitched star, ...). Never hardcode
   * flame-specific assumptions here. */
  hero: React.ReactNode;
  title: string;
  /** Large focal number, e.g. a streak count. Omit for copy that doesn't
   * center on a number (e.g. a "streak lost" card). */
  value?: string;
  /** Small label under `value`, e.g. "day". */
  unit?: string;
  message: string;
  /** Ref attached to the message's wrapping View -- lets a caller fly a
   * reward (e.g. acorns) from this element, matching useAcornSource's
   * sourceRef contract. */
  messageRef?: React.RefObject<View | null>;
  actionLabel: string;
  /** Small static/stitched accents around the hero -- off by default; see
   * CraftCelebrationModal's spec for when to use this. */
  sparks?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Reusable celebration/confirmation card shell: a hand-cut cream paper card
// (CraftPanel) with a swappable hero graphic, title/value/unit hierarchy,
// message, and a single crafted action button -- floated over a soft dim
// backdrop. Owns its own entrance/exit animation and press feedback so every
// call site (streak popups today, other reward popups later) gets the same
// physical-card feel for free.
export default function CraftCelebrationModal({
  visible,
  onDismiss,
  variant = "celebration",
  hero,
  title,
  value,
  unit,
  message,
  messageRef,
  actionLabel,
  sparks = false,
  style,
}: Props) {
  const { reduceMotion } = useTheme();
  const [mounted, setMounted] = useState(visible);
  const closingRef = useRef(false);

  const bgA = useRef(new Animated.Value(0)).current;
  const cardS = useRef(new Animated.Value(0.94)).current;
  const cardA = useRef(new Animated.Value(0)).current;
  const valueS = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (!visible) return;
    setMounted(true);
    closingRef.current = false;
    bgA.setValue(0);
    cardS.setValue(0.94);
    cardA.setValue(0);
    valueS.setValue(0.95);

    if (reduceMotion) {
      bgA.setValue(1);
      cardS.setValue(1);
      cardA.setValue(1);
      valueS.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.timing(bgA, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardS, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(cardA, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() => {
      Animated.timing(valueS, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const handleDismiss = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (reduceMotion) {
      setMounted(false);
      onDismiss();
      return;
    }

    Animated.parallel([
      Animated.timing(cardS, { toValue: 0.97, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(cardA, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(bgA, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setMounted(false);
      onDismiss();
    });
  };

  if (!mounted) return null;

  const isCelebration = variant === "celebration";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: bgA }]} />

      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={{ opacity: cardA, transform: [{ scale: cardS }] }}>
          <CraftPanel
            texture="paper"
            stitched
            shadow="card"
            inset={26}
            style={[styles.card, style]}
            contentStyle={styles.content}
          >
            <View style={styles.heroWrap}>
              {hero}
              {sparks && isCelebration && SPARKS.map((s, i) => <Spark key={i} pos={s} reduceMotion={reduceMotion} />)}
            </View>

            <Text style={styles.title}>{title}</Text>

            {value != null && (
              <Animated.View style={[styles.valueBlock, { transform: [{ scale: valueS }] }]}>
                <Text style={[styles.value, !isCelebration && styles.valueCalm]}>{value}</Text>
                {unit ? <Text style={styles.unit}>{unit}</Text> : null}
              </Animated.View>
            )}

            <View ref={messageRef} style={styles.messageWrap}>
              <Text style={styles.message}>{message}</Text>
            </View>

            <CraftActionButton label={actionLabel} onPress={handleDismiss} />
          </CraftPanel>
        </Animated.View>
      </View>
    </View>
  );
}

function Spark({ pos, reduceMotion }: { pos: SparkPos; reduceMotion: boolean }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 900, delay: pos.delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  return (
    <Animated.Text
      style={[
        styles.spark,
        { top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right, opacity: reduceMotion ? 0.6 : pulse },
      ]}
    >
      ✦
    </Animated.Text>
  );
}

function CraftActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressTranslateY = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(pressScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(pressTranslateY, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start();
  };
  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(pressScale, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.timing(pressTranslateY, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={styles.buttonTouch}
    >
      <Animated.View style={[styles.button, { transform: [{ scale: pressScale }, { translateY: pressTranslateY }] }]}>
        <Image source={felt} resizeMode="cover" style={styles.buttonGrain} />
        <Text style={styles.buttonLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
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
    width: 272,
  },
  content: {
    // CraftPanel's own content wrapper defaults to flex:1, which is fine
    // when it's a row inside a width-bound card (its usual use), but inside
    // this vertical card -- with no explicit height -- flex:1 has nothing
    // to flex against and collapses to zero. Override back to auto height.
    flex: 0,
    alignItems: "center",
  },
  heroWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  spark: {
    position: "absolute",
    fontSize: 13,
    color: GOLD,
  },
  title: {
    color: INK,
    fontWeight: "700",
    fontSize: 19,
    marginBottom: 6,
    textAlign: "center",
  },
  valueBlock: {
    alignItems: "center",
    marginBottom: 10,
  },
  value: {
    color: INK,
    fontWeight: "800",
    fontSize: 52,
    lineHeight: 56,
  },
  valueCalm: {
    fontSize: 40,
    lineHeight: 44,
  },
  unit: {
    color: INK_MUTED,
    fontWeight: "700",
    fontSize: 14,
    marginTop: -2,
  },
  messageWrap: {
    marginBottom: 20,
  },
  message: {
    color: INK_MUTED,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 19,
  },
  buttonTouch: {
    alignSelf: "stretch",
  },
  button: {
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 24,
    backgroundColor: GOLD,
    borderWidth: 2.5,
    borderColor: INK,
    ...WOBBLE_RADIUS_SM,
    shadowColor: "#2A1C16",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonGrain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  buttonLabel: {
    color: INK,
    fontWeight: "800",
    fontSize: 16,
  },
});
