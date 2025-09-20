// components/LevelUpOverlay.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { useLevelUpStore } from "../../data/stores/levelUpStore";
import { useTheme } from "../../data/hooks/useTheme";
import UnlockDisplay from "./UnlockDisplay";
import CutsceneDisplay from "./CutsceneDisplay";

type LevelUpPhase = 'levelup' | 'unlock' | 'cutscene';

export default function LevelUpOverlay() {
  const current = useLevelUpStore((s) => s.current());
  const dismiss = useLevelUpStore((s) => s.dismissCurrent);
  const { reduceMotion } = useTheme();
  const [phase, setPhase] = useState<LevelUpPhase>('levelup');
  const [animationComplete, setAnimationComplete] = useState(false);

  // Anim states
  const bgA   = useRef(new Animated.Value(0)).current;     // backdrop fade
  const oldS  = useRef(new Animated.Value(1)).current;     // old badge scale
  const oldA  = useRef(new Animated.Value(1)).current;     // old badge alpha
  const newS  = useRef(new Animated.Value(0.6)).current;   // new badge scale
  const newA  = useRef(new Animated.Value(0)).current;     // new badge alpha
  const burst = useRef(new Animated.Value(0)).current;     // confetti/burst

  const visible = !!current;

  // Reset phase and anims whenever a new event becomes current
  useEffect(() => {
    if (!visible) return;
    setPhase('levelup');
    setAnimationComplete(false);
    bgA.setValue(0); oldS.setValue(1); oldA.setValue(1);
    newS.setValue(0.6); newA.setValue(0);
    burst.setValue(0);

    if (reduceMotion) {
      // Skip animations when reduce motion is enabled
      bgA.setValue(1);
      oldS.setValue(0.7);
      oldA.setValue(0);
      newS.setValue(1);
      newA.setValue(1);
      burst.setValue(1);
      setAnimationComplete(true);
      return;
    }

    Animated.sequence([
      Animated.timing(bgA, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(oldS, { toValue: 0.7, duration: 250, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(oldA, { toValue: 0,   duration: 250, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(newS, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(newA, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(burst, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      // Hold the burst for a moment, then fade out
      Animated.delay(200),
      Animated.timing(burst, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      // Animation complete, show continue button
      setAnimationComplete(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, current?.id, reduceMotion]);

  const rewardsLine = useMemo(() => {
    if (!current?.rewards) return null;
    const parts: string[] = [];
    if (current.rewards.acorns) parts.push(`+${current.rewards.acorns.toLocaleString()} 🌰`);
    if (current.rewards.items?.length) parts.push(`+${current.rewards.items.length} item(s)`);
    return parts.length ? parts.join("  ·  ") : null;
  }, [current]);

  if (!visible) return null;

  const oldLv = current!.fromLevel;
  const newLv = current!.toLevel;

  // A few “burst” emojis that fan out using the same animated value
  const burstNodes = [0, 1, 2, 3, 4].map((i) => {
    const angle = (-60 + i * 30) * (Math.PI / 180); // -60..+60 degrees
    const radius = burst.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 60],
    });
    const tx = Animated.multiply(radius, Math.cos(angle));
    const ty = Animated.multiply(radius, Math.sin(angle));
    const opa = burst.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    return (
      <Animated.Text
        key={i}
        style={{
          position: "absolute",
          fontSize: 18,
          transform: [{ translateX: tx }, { translateY: ty }],
          opacity: opa,
        }}
      >
        {i % 2 === 0 ? "🌰" : "✨"}
      </Animated.Text>
    );
  });

  const handleLevelUpContinue = () => {
    if (current?.unlock) {
      setPhase('unlock');
    } else if (current?.cutscene) {
      setPhase('cutscene');
    } else {
      // No more phases, dismiss directly
      dismiss();
    }
  };

  const handleUnlockComplete = () => {
    if (current?.cutscene) {
      setPhase('cutscene');
    } else {
      // No more phases, dismiss directly
      dismiss();
    }
  };

  const handleCutsceneComplete = () => {
    // Cutscene finished, dismiss directly
    dismiss();
  };

  const handleCutsceneSkip = () => {
    // Cutscene skipped, dismiss directly
    dismiss();
  };

  return (
    <View
      style={{
        position: "absolute",
        inset: 0,
        alignItems: "center",
        justifyContent: "center",
        // RNW deprecation fix
        pointerEvents: "auto",
      }}
    >
      {/* Level Up Animation Phase */}
      {phase === 'levelup' && (
        <>
          {/* Backdrop */}
          <Animated.View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#000",
              opacity: bgA.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
            }}
          />

          {/* Card */}
          <View style={{ alignItems: "center", justifyContent: "center", padding: 20 }}>
            <View
              style={{
               width: 360,
                 paddingVertical: 24,
                 paddingHorizontal: 20,
                 backgroundColor: "#0b1220",
                 borderRadius: 20,
                 borderWidth: 2,
                 borderColor: "#233043",
                 alignItems: "center",
                 overflow: "hidden",
                // nice soft shadow on web
                boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
              }}
            >
              <Text style={{ color: "#cfe6ff", fontWeight: "800", fontSize: 24, marginBottom: 8 }}>
                Level Up!
              </Text>

              {/* Badge Animation Area */}
              <View style={{ height: 140, justifyContent: "center", alignItems: "center", position: "relative" }}>
                {/* Old badge → out */}
                <Animated.View
                  style={{
                    position: "absolute",
                    transform: [{ scale: oldS }],
                    opacity: oldA,
                  }}
                >
                  <Badge level={oldLv} dimmed />
                </Animated.View>

                {/* New badge → in */}
                <Animated.View
                  style={{
                    transform: [{ scale: newS }],
                    opacity: newA,
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <Badge level={newLv} />
                  <View style={{
                    position: "absolute",
                    top: 55, // Center of the 110px badge
                    left: 55,
                    width: 0,
                    height: 0,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {burstNodes}
                  </View>
                </Animated.View>
              </View>

              {/* Rewards */}
              {!!rewardsLine && (
                <View style={{
                  backgroundColor: "#1a2a3d",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: "#2d4356",
                }}>
                  <Text style={{ color: "#9cc4e4", fontSize: 14, fontWeight: "600", textAlign: "center" }}>
                    {rewardsLine}
                  </Text>
                </View>
              )}

              {/* Continue Button */}
              {animationComplete && (
                <Pressable
                  onPress={handleLevelUpContinue}
                  style={{
                    marginTop: 20,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    backgroundColor: "#4a90e2",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#5ba3f5",
                  }}
                >
                  <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
                    Continue
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </>
      )}

      {/* Unlock Display Phase */}
      {phase === 'unlock' && current?.unlock && (
        <UnlockDisplay
          unlock={current.unlock}
          onComplete={handleUnlockComplete}
        />
      )}

      {/* Cutscene Phase */}
      {phase === 'cutscene' && current?.cutscene && (
        <CutsceneDisplay
          frames={current.cutscene.frames}
          onComplete={handleCutsceneComplete}
          onSkip={handleCutsceneSkip}
        />
      )}

    </View>
  );
}

/** Simple circular level badge */
function Badge({ level, dimmed }: { level: number; dimmed?: boolean }) {
  return (
    <View
      style={{
        width: 110,
        height: 110,
        borderRadius: 999,
        backgroundColor: dimmed ? "#1a2431" : "#1f2c3b",
        borderWidth: 2,
        borderColor: dimmed ? "#2a3a4b" : "#3b556e",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#9cc4e4", fontWeight: "700", fontSize: 14, marginBottom: -4 }}>LEVEL</Text>
      <Text style={{ color: "#cfe6ff", fontWeight: "900", fontSize: 34 }}>{level}</Text>
    </View>
  );
}
