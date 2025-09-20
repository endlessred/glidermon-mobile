import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { UnlockData } from "../../data/stores/levelUpStore";
import { useTheme } from "../../data/hooks/useTheme";

interface UnlockDisplayProps {
  unlock: UnlockData;
  onComplete: () => void;
}

export default function UnlockDisplay({ unlock, onComplete }: UnlockDisplayProps) {
  const { reduceMotion } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const iconBounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset animations
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.5);
    iconBounceAnim.setValue(0);

    if (reduceMotion) {
      // Skip animations when reduce motion is enabled
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      iconBounceAnim.setValue(1);
      // Still show for 2 seconds but without animation
      setTimeout(() => {
        onComplete();
      }, 2000);
      return;
    }

    // Sequence: fade in, scale up, icon bounce, then auto-complete after a delay
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(iconBounceAnim, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.delay(2000), // Show for 2 seconds
    ]).start(() => {
      onComplete();
    });
  }, [unlock.name, reduceMotion]);

  const getUnlockIcon = (type: UnlockData['type']) => {
    switch (type) {
      case 'feature': return '⚡';
      case 'item': return '🎁';
      case 'area': return '🗺️';
      case 'ability': return '💫';
      default: return '✨';
    }
  };

  const iconTransform = iconBounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        inset: 0,
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      {/* Backdrop */}
      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#000",
          opacity: 0.7,
        }}
      />

      {/* Unlock Card */}
      <View
        style={{
          width: 340,
          paddingVertical: 24,
          paddingHorizontal: 20,
          backgroundColor: "#0b1220",
          borderRadius: 16,
          borderWidth: 2,
          borderColor: "#4a90e2",
          alignItems: "center",
          boxShadow: "0 10px 30px rgba(74, 144, 226, 0.3)",
        }}
      >
        <Text style={{
          color: "#4a90e2",
          fontWeight: "800",
          fontSize: 16,
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 1.2,
        }}>
          New Unlock!
        </Text>

        {/* Icon */}
        <Animated.View
          style={{
            marginBottom: 16,
            transform: [{ translateY: iconTransform }],
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#1a2a3d",
              borderWidth: 3,
              borderColor: "#4a90e2",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 32 }}>
              {unlock.icon || getUnlockIcon(unlock.type)}
            </Text>
          </View>
        </Animated.View>

        {/* Unlock Name */}
        <Text style={{
          color: "#cfe6ff",
          fontWeight: "700",
          fontSize: 22,
          marginBottom: 8,
          textAlign: "center",
        }}>
          {unlock.name}
        </Text>

        {/* Description */}
        <Text style={{
          color: "#9cc4e4",
          fontWeight: "500",
          fontSize: 14,
          textAlign: "center",
          lineHeight: 20,
          maxWidth: 280,
        }}>
          {unlock.description}
        </Text>

        {/* Type Badge */}
        <View
          style={{
            marginTop: 16,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: "#4a90e2",
            borderRadius: 12,
          }}
        >
          <Text style={{
            color: "#ffffff",
            fontWeight: "600",
            fontSize: 12,
            textTransform: "capitalize",
          }}>
            {unlock.type}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}