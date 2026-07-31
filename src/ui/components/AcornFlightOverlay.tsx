// ui/components/AcornFlightOverlay.tsx
//
// Root-level overlay (mounted once in App.tsx, like ToastHost/LevelUpOverlay):
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
const FLIGHT_DURATION_MS = 620;
const TEMP_BADGE_HOLD_MS = 550;

const randRange = (min: number, max: number) => min + Math.random() * (max - min);

type ParticleSpec = {
  key: number;
  delay: number;
  curveOffset: Point;
  overshoot: Point;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const particles = useMemo<ParticleSpec[]>(() => {
    if (!current) return [];
    return Array.from({ length: current.particleCount }, (_, i) => ({
      key: i,
      delay: i * randRange(STAGGER_MIN_MS, STAGGER_MAX_MS),
      curveOffset: { x: randRange(-70, 70), y: randRange(-110, -30) },
      overshoot: { x: randRange(-6, 6), y: randRange(-6, 6) },
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
    triggerPulse();

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
  if (!target) return null;

  return (
    <View style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {current &&
        particles.map((p) => (
          <AcornParticle
            key={`${current.id}-${p.key}`}
            source={current.source}
            target={target}
            spec={p}
            onLanded={handleParticleLanded}
          />
        ))}

      {tempBadgeStage !== "hidden" && (
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
      withTiming(1, { duration: FLIGHT_DURATION_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onLanded)();
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const oneMinusT = 1 - t;
    const controlX = source.x + spec.curveOffset.x;
    const controlY = source.y + spec.curveOffset.y;
    const endX = target.x + spec.overshoot.x;
    const endY = target.y + spec.overshoot.y;
    const x = oneMinusT * oneMinusT * source.x + 2 * oneMinusT * t * controlX + t * t * endX;
    const y = oneMinusT * oneMinusT * source.y + 2 * oneMinusT * t * controlY + t * t * endY;
    const scale = 1 - 0.35 * t;
    const opacity = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
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
