// components/StreakSplashOverlay.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { useStreakStore } from "../../data/stores/streakStore";
import { useTheme } from "../../data/hooks/useTheme";

export default function StreakSplashOverlay() {
  const pendingSplash = useStreakStore((s) => s.pendingSplash);
  const dismissSplash = useStreakStore((s) => s.dismissSplash);
  const { reduceMotion } = useTheme();

  const bgA = useRef(new Animated.Value(0)).current;
  const cardS = useRef(new Animated.Value(0.7)).current;
  const cardA = useRef(new Animated.Value(0)).current;

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

  if (!visible) return null;

  const { kind, streak, lostFrom } = pendingSplash!;

  const copy = {
    started: { emoji: "🔥", title: "Streak started!", subtitle: "Keep it up tomorrow to grow it." },
    continued: { emoji: "🔥", title: `${streak} Day Streak!`, subtitle: "Nice work keeping it going." },
    lost: {
      emoji: "💔",
      title: "Streak lost",
      subtitle: lostFrom ? `Your ${lostFrom}-day streak ended. Start a new one today!` : "Start a new one today!",
    },
  }[kind];

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
          borderColor: "#233043",
          alignItems: "center",
          transform: [{ scale: cardS }],
          opacity: cardA,
          boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
        }}
      >
        <Text style={{ fontSize: 56, marginBottom: 8 }}>{copy.emoji}</Text>
        <Text style={{ color: "#cfe6ff", fontWeight: "800", fontSize: 22, marginBottom: 6, textAlign: "center" }}>
          {copy.title}
        </Text>
        {kind !== "lost" && (
          <Text style={{ color: "#cfe6ff", fontWeight: "900", fontSize: 40, marginBottom: 6 }}>
            {streak}
          </Text>
        )}
        <Text style={{ color: "#9cc4e4", fontSize: 14, textAlign: "center", marginBottom: 20 }}>
          {copy.subtitle}
        </Text>

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
            {kind === "lost" ? "Got it" : "Nice!"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
