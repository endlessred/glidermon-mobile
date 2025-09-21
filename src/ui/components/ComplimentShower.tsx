// components/ComplimentShower.tsx
import React, { useEffect, useRef } from "react";
import { View, Animated, Dimensions } from "react-native";
import { REACTION_TYPES } from "../../data/stores/galleryStore";

type ComplimentShowerProps = {
  reactions: Array<{
    type: string;
    count: number;
    timestamp: string;
  }>;
  onAnimationComplete: () => void;
  duration?: number;
};

export default function ComplimentShower({
  reactions,
  onAnimationComplete,
  duration = 3000
}: ComplimentShowerProps) {
  const animatedValues = useRef<Animated.Value[]>([]);
  const { width, height } = Dimensions.get("window");

  useEffect(() => {
    if (reactions.length === 0) return;

    // Create animated values for each reaction instance
    const animations: Animated.CompositeAnimation[] = [];
    animatedValues.current = [];

    reactions.forEach((reaction, reactionIndex) => {
      for (let i = 0; i < Math.min(reaction.count, 8); i++) { // Limit to 8 per type for performance
        const animValue = new Animated.Value(0);
        animatedValues.current.push(animValue);

        // Create floating animation
        const animation = Animated.sequence([
          Animated.delay(i * 200 + reactionIndex * 100), // Stagger animations
          Animated.parallel([
            Animated.timing(animValue, {
              toValue: 1,
              duration: duration,
              useNativeDriver: true,
            }),
          ])
        ]);

        animations.push(animation);
      }
    });

    // Start all animations
    Animated.parallel(animations).start(() => {
      onAnimationComplete();
    });

    return () => {
      // Clean up animations
      animations.forEach(anim => anim.stop());
    };
  }, [reactions, duration, onAnimationComplete]);

  if (reactions.length === 0) return null;

  const renderReactionInstances = () => {
    let animIndex = 0;
    const instances: React.ReactNode[] = [];

    reactions.forEach((reaction, reactionIndex) => {
      const reactionType = REACTION_TYPES[reaction.type];
      if (!reactionType) return;

      for (let i = 0; i < Math.min(reaction.count, 8); i++) {
        const animValue = animatedValues.current[animIndex];
        if (!animValue) continue;

        // Random starting position
        const startX = Math.random() * (width - 60);
        const startY = height * 0.7; // Start from bottom 30%

        // Animation values
        const translateY = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -height * 0.6], // Float up 60% of screen
        });

        const translateX = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, (Math.random() - 0.5) * 100], // Slight horizontal drift
        });

        const scale = animValue.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 1.2, 1, 0.8], // Pop in, then fade
        });

        const opacity = animValue.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 1, 1, 0], // Fade in and out
        });

        const rotation = animValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${(Math.random() - 0.5) * 60}deg`], // Slight rotation
        });

        instances.push(
          <Animated.View
            key={`${reactionIndex}-${i}`}
            style={{
              position: "absolute",
              left: startX,
              top: startY,
              transform: [
                { translateY },
                { translateX },
                { scale },
                { rotate: rotation },
              ],
              opacity,
            }}
          >
            <View style={{
              backgroundColor: reactionType.color + "20", // 20% opacity background
              borderRadius: 20,
              padding: 8,
              borderWidth: 2,
              borderColor: reactionType.color,
            }}>
              <Animated.Text style={{
                fontSize: 24,
                textAlign: "center",
              }}>
                {reactionType.emoji}
              </Animated.Text>
            </View>
          </Animated.View>
        );

        animIndex++;
      }
    });

    return instances;
  };

  return (
    <View style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "none", // Don't block touches
      zIndex: 1000,
    }}>
      {renderReactionInstances()}
    </View>
  );
}

// Hook to use the compliment shower system
export function useComplimentShower() {
  const [showShower, setShowShower] = React.useState(false);
  const [currentReactions, setCurrentReactions] = React.useState<Array<{
    type: string;
    count: number;
    timestamp: string;
  }>>([]);

  const triggerShower = (reactions: Array<{
    type: string;
    count: number;
    timestamp: string;
  }>) => {
    setCurrentReactions(reactions);
    setShowShower(true);
  };

  const ComplimentShowerComponent = showShower ? (
    <ComplimentShower
      reactions={currentReactions}
      onAnimationComplete={() => {
        setShowShower(false);
        setCurrentReactions([]);
      }}
    />
  ) : null;

  return {
    triggerShower,
    ComplimentShowerComponent,
    isShowingShower: showShower,
  };
}