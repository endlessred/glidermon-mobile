// components/StreakSplashOverlay.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { DotLottie } from "@lottiefiles/dotlottie-react-native";
import { useStreakStore } from "../../data/stores/streakStore";
import { useTheme } from "../../data/hooks/useTheme";
import { useAcornSource } from "../hooks/useAcornSource";

const FIRE_LOTTIE = require("../../assets/lottie/fire-streak-orange.lottie");
const HEART_BROKEN_LOTTIE = require("../../assets/lottie/heart-broken.lottie");

export default function StreakSplashOverlay() {
  const pendingSplash = useStreakStore((s) => s.pendingSplash);
  const dismissSplash = useStreakStore((s) => s.dismissSplash);
  const { reduceMotion } = useTheme();

  const bgA = useRef(new Animated.Value(0)).current;
  const cardS = useRef(new Animated.Value(0.7)).current;
  const cardA = useRef(new Animated.Value(0)).current;
  const { sourceRef: milestoneRewardRef, spawnFromRef } = useAcornSource();

  const visible = !!pendingSplash;

  useEffect(() => {
    if (!visible) return;
    bgA.setValue(0);
    cardS.setValue(0.7);
    cardA.setValue(0);

    if (reduceMotion) {
      bgA.setValue(1);
      cardS.setValue(1);
      cardA.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.timing(bgA, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardS, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(cardA, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pendingSplash?.kind, pendingSplash?.streak, reduceMotion]);

  // Milestone acorns are granted synchronously by streakStore.evaluate() before this
  // splash ever appears — fly them from the reward line once the card has popped in.
  useEffect(() => {
    if (pendingSplash?.kind !== "milestone" || !pendingSplash.milestoneReward) return;
    const t = setTimeout(() => spawnFromRef(pendingSplash.milestoneReward!), 420);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSplash?.kind, pendingSplash?.streak]);

  if (!visible) return null;

  const { kind, streak, lostFrom, freezesUsed, milestoneReward } = pendingSplash!;
  const freezeNote = freezesUsed ? `🧊 Used ${freezesUsed} freeze${freezesUsed > 1 ? "s" : ""} to keep it going. ` : "";

  const copy = {
    started: {
      title: "Streak started!",
      subtitle: lostFrom
        ? `Your ${lostFrom}-day streak ended, but a new one just began. Keep it up tomorrow!`
        : "Keep it up tomorrow to grow it.",
    },
    continued: { title: `${streak} Day Streak!`, subtitle: `${freezeNote}Nice work keeping it going.` },
    milestone: {
      title: `🏆 ${streak}-Day Milestone!`,
      subtitle: `${freezeNote}+${(milestoneReward ?? 0).toLocaleString()} Acorns! Keep the streak alive.`,
    },
    frozen: {
      title: "Streak protected!",
      subtitle: `Used ${freezesUsed} freeze${(freezesUsed ?? 1) > 1 ? "s" : ""} to cover yesterday. Keep it going today!`,
    },
    lost: {
      title: "Streak lost",
      subtitle: lostFrom ? `Your ${lostFrom}-day streak ended. Start a new one today!` : "Start a new one today!",
    },
  }[kind];

  const lottieSource = kind === "lost" ? HEART_BROKEN_LOTTIE : FIRE_LOTTIE;
  const cardBorderColor = kind === "milestone" ? "#e2b93a" : "#233043";

  return (
    <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}>
      <Animated.View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#000",
          opacity: bgA.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
        }}
      />

      <Animated.View
        style={{
          width: 320,
          paddingVertical: 28,
          paddingHorizontal: 20,
          backgroundColor: "#0b1220",
          borderRadius: 20,
          borderWidth: 2,
          borderColor: cardBorderColor,
          alignItems: "center",
          transform: [{ scale: cardS }],
          opacity: cardA,
          boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
        }}
      >
        <DotLottie
          key={kind === "lost" ? "heart-broken" : "fire"}
          source={lottieSource}
          autoplay
          loop={kind !== "lost"}
          style={{ width: 96, height: 96, marginBottom: 8 }}
        />
        <Text style={{ color: "#cfe6ff", fontWeight: "800", fontSize: 22, marginBottom: 6, textAlign: "center" }}>
          {copy.title}
        </Text>
        {kind !== "lost" && (
          <Text style={{ color: "#cfe6ff", fontWeight: "900", fontSize: 40, marginBottom: 6 }}>
            {streak}
          </Text>
        )}
        <View ref={milestoneRewardRef}>
          <Text style={{ color: "#9cc4e4", fontSize: 14, textAlign: "center", marginBottom: 20 }}>
            {copy.subtitle}
          </Text>
        </View>

        <Pressable
          onPress={dismissSplash}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: "#4a90e2",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#5ba3f5",
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
            {kind === "lost" ? "Got it" : kind === "frozen" ? "Got it!" : "Nice!"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
