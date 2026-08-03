// ui/components/AcornFlightOverlay.tsx
//
// Root-level overlay (mounted once in App.tsx, like ToastHost):
// consumes acornFxStore's burst queue and flies 3-7 staggered, curved acorn
// particles from a reward's source to the acorn balance badge. If the real
// badge isn't currently mounted (most tabs besides Home), it spawns a
// temporary stand-in badge to receive the animation, then fades it out.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useAcornFxStore, type Point } from "../../data/stores/acornFxStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import AcornBadgeVisual from "./AcornBadgeVisual";
import { playAcornCollectSound } from "../audio/soundFx";
import { lightImpact } from "../haptics/hapticsFx";

const PARTICLE_SIZE = 22;
const STAGGER_MIN_MS = 50;
const STAGGER_MAX_MS = 80;
const FLIGHT_DURATION_MS = 520;
const TEMP_BADGE_HOLD_MS = 550;
// Opacity/scale start fading out well before the particle reaches the
// badge, so it visibly dissolves into a small ghost on approach instead of
// looking like a solid object still moving fast right up to (and past) it.
const FADE_START_T = 0.55;
// Position reaches the target at this fraction of the flight and then
// freezes there for the remainder -- the fade/shrink keeps playing in
// place, so the particle visibly stops at the badge instead of still
// travelling while it dissolves.
const ARRIVE_T = 0.65;

const randRange = (min: number, max: number) => min + Math.random() * (max - min);

type ParticleSpec = {
  key: number;
  delay: number;
  curveOffset: Point;
};

type TempBadgeStage = "hidden" | "visible" | "leaving";

export default function AcornFlightOverlay() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const queue = useAcornFxStore((s) => s.queue);
  const badgeAnchor = useAcornFxStore((s) => s.badgeAnchor);
  const beginCurrent = useAcornFxStore((s) => s.beginCurrent);
  const bumpDisplayed = useAcornFxStore((s) => s.bumpDisplayed);
  const finishCurrent = useAcornFxStore((s) => s.finishCurrent);
  const triggerPulse = useAcornFxStore((s) => s.triggerPulse);

  const current = queue[0] ?? null;

  const [target, setTarget] = useState<Point | null>(null);
  const [tempBadgeStage, setTempBadgeStage] = useState<TempBadgeStage>("hidden");
  const processedId = useRef<string | null>(null);
  const landedCount = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default anchor for a temporary badge: top-right, under the safe area —
  // the conventional spot for a currency chip when no real one is on screen.
  const defaultAnchor: Point = { x: width - 56, y: insets.top + 44 };

  useEffect(() => {
    if (!current || processedId.current === current.id) return;
    processedId.current = current.id;
    landedCount.current = 0;

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    const usingRealBadge = !!badgeAnchor;
    setTarget(usingRealBadge ? badgeAnchor : defaultAnchor);
    setTempBadgeStage(usingRealBadge ? "hidden" : "visible");

    beginCurrent();
    // One pulse per burst (not per particle) -- the badge grows once, holds
    // while the number ticks up as particles land, then shrinks back down.
    triggerPulse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const particles = useMemo<ParticleSpec[]>(() => {
    if (!current) return [];
    return Array.from({ length: current.particleCount }, (_, i) => ({
      key: i,
      delay: i * randRange(STAGGER_MIN_MS, STAGGER_MAX_MS),
      // Tighter, more direct arc than before -- a smaller/gentler curve is
      // less prone to a "swoop past" look on approach.
      curveOffset: { x: randRange(-40, 40), y: randRange(-90, -20) },
    }));
  }, [current?.id]);

  const handleParticleLanded = () => {
    if (!current) return;
    landedCount.current += 1;
    const isLast = landedCount.current >= current.particleCount;

    if (landedCount.current === 1) {
      playAcornCollectSound();
      lightImpact();
    }

    if (isLast) {
      const share = current.amount / current.particleCount;
      // Snap to the true value rather than compounding rounded shares, so the badge always ends up exact.
      const truth = useProgressionStore.getState().acorns;
      bumpDisplayed(truth - (current.baselineAcorns + Math.round(share) * (current.particleCount - 1)));
      finishCurrent();

      if (tempBadgeStage === "visible") {
        hideTimer.current = setTimeout(() => setTempBadgeStage("leaving"), TEMP_BADGE_HOLD_MS);
      }
    } else {
      bumpDisplayed(Math.round(current.amount / current.particleCount));
    }
  };

  if (!current && tempBadgeStage === "hidden") return null;

  return (
    <View style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {target && current &&
        particles.map((p) => (
          <AcornParticle
            key={`${current.id}-${p.key}`}
            source={current.source}
            target={target}
            spec={p}
            onLanded={handleParticleLanded}
          />
        ))}

      {target && tempBadgeStage !== "hidden" && (
        <TemporaryBadge
          point={target}
          visible={tempBadgeStage === "visible"}
          onHidden={() => setTempBadgeStage("hidden")}
        />
      )}
    </View>
  );
}

function TemporaryBadge({
  point,
  visible,
  onHidden,
}: {
  point: Point;
  visible: boolean;
  onHidden: () => void;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) });
    } else {
      opacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onHidden)();
      });
      scale.value = withTiming(0.85, { duration: 220, easing: Easing.in(Easing.quad) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: point.x - 50,
    top: point.y - 18,
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <AcornBadgeVisual width={100} height={36} />
    </Animated.View>
  );
}

function AcornParticle({
  source,
  target,
  spec,
  onLanded,
}: {
  source: Point;
  target: Point;
  spec: ParticleSpec;
  onLanded: () => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      // Ease-out (not ease-in) so the particle decelerates into the badge
      // instead of covering most of its distance at top speed right at the
      // end, which read as "shooting past" the badge before vanishing.
      withTiming(1, { duration: FLIGHT_DURATION_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onLanded)();
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    // Position is driven by posT, which reaches 1 (and then stays there) at
    // ARRIVE_T -- the particle physically stops at the target instead of
    // continuing to move for the rest of the timeline.
    const posT = Math.min(1, t / ARRIVE_T);
    const oneMinusPosT = 1 - posT;
    const controlX = source.x + spec.curveOffset.x;
    const controlY = source.y + spec.curveOffset.y;
    const x = oneMinusPosT * oneMinusPosT * source.x + 2 * oneMinusPosT * posT * controlX + posT * posT * target.x;
    const y = oneMinusPosT * oneMinusPosT * source.y + 2 * oneMinusPosT * posT * controlY + posT * posT * target.y;
    // Shrink and fade out well before arrival (see FADE_START_T) rather
    // than staying full-size/opaque almost to the target; continues after
    // the particle has stopped moving, at ARRIVE_T.
    const scale = 1 - 0.6 * t;
    const opacity = t < FADE_START_T ? 1 : Math.max(0, 1 - (t - FADE_START_T) / (1 - FADE_START_T));
    return {
      position: "absolute",
      left: x - PARTICLE_SIZE / 2,
      top: y - PARTICLE_SIZE / 2,
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: PARTICLE_SIZE }}>🌰</Text>
    </Animated.View>
  );
}
