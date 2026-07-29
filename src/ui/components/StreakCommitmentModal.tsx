// components/StreakCommitmentModal.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { DotLottie } from "@lottiefiles/dotlottie-react-native";
import { useStreakStore } from "../../data/stores/streakStore";
import { requestPermission } from "../../notifications/streakReminder";

const DEFAULT_REMINDER_HOUR = 20;
const HEART_LOVE_LOTTIE = require("../../assets/lottie/heart-love.lottie");

export default function StreakCommitmentModal() {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const hasCommitted = useStreakStore((s) => s.hasCommitted);
  const pendingSplash = useStreakStore((s) => s.pendingSplash);
  const markCommitted = useStreakStore((s) => s.markCommitted);

  const visible = !hasCommitted && currentStreak >= 1 && !pendingSplash;
  if (!visible) return null;

  const handleEnable = async () => {
    const granted = await requestPermission();
    markCommitted(DEFAULT_REMINDER_HOUR, granted);
  };

  const handleSkip = () => {
    markCommitted(DEFAULT_REMINDER_HOUR, false);
  };

  return (
    <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}>
      <View style={{ position: "absolute", inset: 0, backgroundColor: "#000", opacity: 0.6 }} />

      <View
        style={{
          width: 320,
          paddingVertical: 28,
          paddingHorizontal: 20,
          backgroundColor: "#0b1220",
          borderRadius: 20,
          borderWidth: 2,
          borderColor: "#233043",
          alignItems: "center",
          boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
        }}
      >
        <DotLottie
          source={HEART_LOVE_LOTTIE}
          autoplay
          loop
          style={{ width: 80, height: 80, marginBottom: 8 }}
        />
        <Text style={{ color: "#cfe6ff", fontWeight: "800", fontSize: 20, marginBottom: 6, textAlign: "center" }}>
          Don't lose your streak!
        </Text>
        <Text style={{ color: "#9cc4e4", fontSize: 14, textAlign: "center", marginBottom: 20 }}>
          Get a reminder in the evening if you haven't kept your streak alive yet today.
        </Text>

        <Pressable
          onPress={handleEnable}
          style={{
            width: "100%",
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: "#4a90e2",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#5ba3f5",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16, textAlign: "center" }}>
            Remind me
          </Text>
        </Pressable>

        <Pressable onPress={handleSkip} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
          <Text style={{ color: "#7d95ac", fontWeight: "600", fontSize: 14, textAlign: "center" }}>
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
