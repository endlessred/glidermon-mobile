// components/checkin/CheckInFlowShell.tsx
import React, { useEffect, useRef } from "react";
import { View, ScrollView, Animated, Easing, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../data/hooks/useTheme";
import { OutfitSlot } from "../../../data/types/outfitTypes";
import CheckInHeader from "./CheckInHeader";
import CheckInProgress from "./CheckInProgress";
import GlidermonCheckInHero from "./GlidermonCheckInHero";
import { PAPER_SURFACE, PAPER_GRAIN } from "./tokens";

type Props = {
  title: string;
  onClose: () => void;
  /** null hides the marker (e.g. on the completion step). */
  progress?: { current: number; total: number } | null;
  /** Spine animation for the shared hero, driven by the current step. */
  heroAnimation: string;
  heroOutfit?: OutfitSlot | null;
  /** "large" on greeting/completion, "medium" on the goal picker, "small" on
   * the board-reveal step (the board is the event there). */
  heroSize?: "large" | "medium" | "small";
  /** Changes whenever the step changes -- drives the content transition. */
  stepKey: string | number;
  /** Long steps (the goal picker) scroll; short steps don't. */
  scroll?: boolean;
  /** Short steps (greeting / completion) center their content in the space
   * below the hero instead of pinning it to the top. */
  centered?: boolean;
  children: React.ReactNode;
};

// The reusable full-screen structure for every daily ritual (Morning today;
// Midday / Evening reflection later): a very light warm cream paper ground,
// a fixed header + progress marker + a GliderMon hero that stays mounted and
// stable across steps, then the step's own content with a short fade/slide
// transition between steps. Composition is kept tight -- header, progress,
// hero and content sit close together rather than stretched to fill.
export default function CheckInFlowShell({
  title,
  onClose,
  progress,
  heroAnimation,
  heroOutfit,
  heroSize = "large",
  stepKey,
  scroll = false,
  centered = false,
  children,
}: Props) {
  const { reduceMotion } = useTheme();
  const anim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  // Re-run a small enter transition each time the step changes. The hero
  // lives outside this animated wrapper so the character never flickers.
  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [stepKey, reduceMotion, anim]);

  const stepStyle = {
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
    ],
  };

  return (
    <View style={styles.root}>
      <Image source={PAPER_GRAIN} resizeMode="repeat" style={styles.grain} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <CheckInHeader title={title} onClose={onClose} />

        <View style={styles.progressSlot}>
          {progress ? <CheckInProgress current={progress.current} total={progress.total} /> : null}
        </View>

        {/* Hero + step content are one vertical group: centered as a compact
            cluster on short steps, top-aligned (hero fixed, content scrolls)
            on the goal picker. The hero keeps the same tree position in both
            so its GL canvas is never remounted between steps. */}
        <View style={[styles.group, centered && styles.groupCentered]}>
          <GlidermonCheckInHero animation={heroAnimation} outfit={heroOutfit} size={heroSize} />

          <Animated.View style={[centered ? styles.stepAuto : styles.stepFill, stepStyle]}>
            {scroll ? (
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : (
              <View style={styles.staticBody}>{children}</View>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAPER_SURFACE,
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
  },
  safe: {
    flex: 1,
  },
  progressSlot: {
    alignItems: "center",
    paddingTop: 8,
    minHeight: 8,
  },
  group: {
    flex: 1,
    alignItems: "center",
  },
  groupCentered: {
    justifyContent: "center",
    // Sits the hero+content cluster a little above true centre of the usable
    // area (paddingBottom shrinks the centring box from the bottom, lifting
    // the cluster) -- reads as intentional placement, not floating.
    paddingBottom: 90,
  },
  stepFill: {
    flex: 1,
    alignSelf: "stretch",
  },
  stepAuto: {
    alignSelf: "stretch",
    // Pull the first card up close under GliderMon's feet.
    marginTop: -2,
  },
  staticBody: {
    paddingHorizontal: 20,
    gap: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 14,
  },
});
