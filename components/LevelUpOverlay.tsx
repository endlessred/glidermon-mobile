// components/LevelUpOverlay.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, Pressable, Animated, Easing } from "react-native";
import { useLevelUpStore } from "../stores/levelUpStore";

export default function LevelUpOverlay() {
  const current = useLevelUpStore((s) => s.current());
  const dismiss = useLevelUpStore((s) => s.dismissCurrent);

  // Anim states
  const bgA   = useRef(new Animated.Value(0)).current;     // backdrop fade
  const oldS  = useRef(new Animated.Value(1)).current;     // old badge scale
  const oldA  = useRef(new Animated.Value(1)).current;     // old badge alpha
  const newS  = useRef(new Animated.Value(0.6)).current;   // new badge scale
  const newA  = useRef(new Animated.Value(0)).current;     // new badge alpha
  const burst = useRef(new Animated.Value(0)).current;     // confetti/burst

  const visible = !!current;

  // Reset anims whenever a new event becomes current
  useEffect(() => {
    if (!visible) return;
    bgA.setValue(0); oldS.setValue(1); oldA.setValue(1);
    newS.setValue(0.6); newA.setValue(0);
    burst.setValue(0);

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
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, current?.id]);

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

  const onDismiss = () => {
    // Quick fade of backdrop for responsiveness
    Animated.timing(bgA, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      dismiss();
    });
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
      <Pressable onPress={onDismiss} style={{ alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
           width: 320,
             paddingVertical: 18,
             paddingHorizontal: 16,
             backgroundColor: "#0b1220",
             borderRadius: 16,
             borderWidth: 1,
             borderColor: "#233043",
             alignItems: "center",
             overflow: "hidden",
            // nice soft shadow on web
            boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
          }}
        >
          <Text style={{ color: "#cfe6ff", fontWeight: "800", fontSize: 18, marginBottom: 6 }}>
            Level Up!
          </Text>

          {/* Old badge → out */}
          <Animated.View
            style={{
              position: "absolute",
              top: 54,
              transform: [{ scale: oldS }],
              opacity: oldA,
            }}
          >
            <Badge level={oldLv} dimmed />
          </Animated.View>

          {/* New badge → in */}
          <Animated.View
            style={{
              marginTop: 36,
              transform: [{ scale: newS }],
              opacity: newA,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ position: "absolute" }}>{burstNodes}</View>
            <Badge level={newLv} />
          </Animated.View>

          {!!rewardsLine && (
            <Text style={{ color: "#9cc4e4", marginTop: 10, fontWeight: "600" }}>{rewardsLine}</Text>
          )}

          <View
            style={{
              marginTop: 14,
              paddingVertical: 8,
              paddingHorizontal: 14,
              backgroundColor: "#233043",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#2f4661",
            }}
          >
            <Text style={{ color: "#ffecd1", fontWeight: "800" }}>Continue</Text>
          </View>

          <Text style={{ color: "#7f93a8", fontSize: 12, marginTop: 6 }}>
            Tap anywhere to continue
          </Text>
        </View>
      </Pressable>
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
