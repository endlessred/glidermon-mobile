// components/SeeReactions.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Modal, Animated, Dimensions } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import SpineCharacterPreview from "./SpineCharacterPreview";
import { REACTION_TYPES } from "../../data/stores/galleryStore";
import { COMPLIMENT_CATEGORIES } from "./ComplimentSystem";
import { OutfitSlot } from "../../data/types/outfitTypes";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type NewReaction = {
  type: string;
  count: number;
  timestamp: string;
};

type NewCompliment = {
  categoryId: string;
  complimentId: string;
  text: string;
  count: number;
  timestamp: string;
};

type SeeReactionsProps = {
  outfit: OutfitSlot;
  newReactions?: NewReaction[];
  newCompliments?: NewCompliment[];
  onClearReactions: () => void;
  disabled?: boolean;
};

// Category context messages for compliments
const getCategoryContext = (categoryId: string): string => {
  switch (categoryId) {
    case "hat": return "That hat!";
    case "outfit": return "That outfit!";
    case "colors": return "Those colors!";
    case "pose": return "That pose!";
    case "creativity": return "So creative!";
    case "everything": return "Amazing!";
    default: return "Nice!";
  }
};

export default function SeeReactions({
  outfit,
  newReactions = [],
  newCompliments = [],
  onClearReactions,
  disabled
}: SeeReactionsProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [animatedReactions, setAnimatedReactions] = useState<Array<{
    id: string;
    emoji: string;
    animValue: Animated.Value;
    startX: number;
  }>>([]);
  const [animatedCompliments, setAnimatedCompliments] = useState<Array<{
    id: string;
    text: string;
    context: string;
    animValue: Animated.Value;
    scaleValue: Animated.Value;
    startX: number;
  }>>([]);

  const hasNewFeedback = newReactions.length > 0 || newCompliments.length > 0;
  const totalNewCount = newReactions.reduce((sum, r) => sum + r.count, 0) +
                       newCompliments.reduce((sum, c) => sum + c.count, 0);

  const openModal = () => {
    if (hasNewFeedback) {
      setShowModal(true);
      startAnimations();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setAnimatedReactions([]);
    setAnimatedCompliments([]);
    onClearReactions();
  };

  const startAnimations = () => {
    // Create animated reactions
    const reactions: Array<{
      id: string;
      emoji: string;
      animValue: Animated.Value;
      startX: number;
    }> = [];

    newReactions.forEach((reaction, index) => {
      const reactionType = REACTION_TYPES[reaction.type];
      if (reactionType) {
        for (let i = 0; i < reaction.count; i++) {
          reactions.push({
            id: `reaction_${reaction.type}_${index}_${i}`,
            emoji: reactionType.emoji,
            animValue: new Animated.Value(0),
            startX: Math.random() * (screenWidth - 100) + 50, // Random X position
          });
        }
      }
    });

    // Create animated compliments
    const compliments: Array<{
      id: string;
      text: string;
      context: string;
      animValue: Animated.Value;
      scaleValue: Animated.Value;
      startX: number;
    }> = [];

    newCompliments.forEach((compliment, index) => {
      const context = getCategoryContext(compliment.categoryId);
      for (let i = 0; i < compliment.count; i++) {
        compliments.push({
          id: `compliment_${compliment.complimentId}_${index}_${i}`,
          text: compliment.text,
          context,
          animValue: new Animated.Value(0),
          scaleValue: new Animated.Value(0),
          startX: Math.random() * (screenWidth - 150) + 75, // Random X position
        });
      }
    });

    setAnimatedReactions(reactions);
    setAnimatedCompliments(compliments);

    // Start animations with staggered timing
    [...reactions, ...compliments].forEach((item, index) => {
      const delay = index * 200; // 200ms between each animation

      setTimeout(() => {
        if ('scaleValue' in item) {
          // Compliment animation - fade up and scale in
          Animated.parallel([
            Animated.timing(item.animValue, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(item.scaleValue, {
                toValue: 1.2,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(item.scaleValue, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ])
          ]).start();
        } else {
          // Reaction emoji animation - float up and pop
          Animated.sequence([
            Animated.timing(item.animValue, {
              toValue: 0.8,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(item.animValue, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }, delay);
    });
  };

  const renderFloatingReaction = (reaction: {
    id: string;
    emoji: string;
    animValue: Animated.Value;
    startX: number;
  }, index: number, totalReactions: number) => {
    // Calculate dynamic fan spread based on number of reactions and screen width
    const characterCenterX = screenWidth / 2;
    const characterY = screenHeight / 2; // Character center
    const aboveCharacterY = characterY - 150; // Position above character

    // Dynamic fan angle based on count and screen width
    const maxAngle = Math.min(120, Math.max(40, totalReactions * 12)); // 40-120° based on count
    const fanAngle = (index / Math.max(totalReactions - 1, 1)) * maxAngle - (maxAngle / 2); // Center the spread

    // Dynamic radius based on screen width and count
    const baseRadius = Math.min(100, screenWidth * 0.2); // Max 100px or 20% of screen width
    const radiusVariation = totalReactions > 6 ? 20 : 30; // Less variation with many reactions
    const fanRadius = baseRadius + (index % 3) * radiusVariation;

    // Calculate varied starting positions across bottom of screen
    const startSpread = Math.min(screenWidth * 0.6, totalReactions * 40); // Spread based on count
    const startX = characterCenterX + ((index / Math.max(totalReactions - 1, 1)) * startSpread - (startSpread / 2)) - 16;

    const finalX = characterCenterX + Math.sin(fanAngle * Math.PI / 180) * fanRadius - 16; // -16 to center emoji
    const finalY = aboveCharacterY - Math.abs(Math.cos(fanAngle * Math.PI / 180)) * 30; // Create arc above

    const translateX = reaction.animValue.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [startX, characterCenterX - 16, finalX], // Start spread, converge, then fan out
    });

    const translateY = reaction.animValue.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [screenHeight, aboveCharacterY, finalY], // Rise to above character, then fan out
    });

    const scale = reaction.animValue.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0.3, 1.0, 1.3], // Start small, grow to readable size
    });

    const opacity = reaction.animValue.interpolate({
      inputRange: [0, 0.3, 0.8, 1],
      outputRange: [0, 1, 1, 0.9], // Fade in, stay visible
    });

    return (
      <Animated.View
        key={reaction.id}
        style={{
          position: 'absolute',
          left: 0, // Use transform for positioning
          top: 0,
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
          opacity,
        }}
      >
        <Text style={{ fontSize: 32 }}>{reaction.emoji}</Text>
      </Animated.View>
    );
  };

  const renderFloatingCompliment = (compliment: {
    id: string;
    text: string;
    context: string;
    animValue: Animated.Value;
    scaleValue: Animated.Value;
    startX: number;
  }, index: number, totalCompliments: number) => {
    // Calculate dynamic fan spread for compliments
    const characterCenterX = screenWidth / 2;
    const characterY = screenHeight / 2; // Character center
    const belowCharacterY = characterY + 160; // Position below character (lowered to avoid button)

    // Dynamic fan angle based on count (compliments need less spread than emojis)
    const maxAngle = Math.min(80, Math.max(30, totalCompliments * 15)); // 30-80° based on count
    const fanAngle = (index / Math.max(totalCompliments - 1, 1)) * maxAngle - (maxAngle / 2); // Center the spread

    // Dynamic radius based on screen width and count (smaller for compliments since they're larger)
    const baseRadius = Math.min(80, screenWidth * 0.15); // Max 80px or 15% of screen width
    const radiusVariation = totalCompliments > 4 ? 15 : 25; // Less variation with many compliments
    const fanRadius = baseRadius + (index % 2) * radiusVariation;

    // Calculate varied starting positions across bottom of screen
    const startSpread = Math.min(screenWidth * 0.5, totalCompliments * 50); // Spread based on count
    const startX = characterCenterX + ((index / Math.max(totalCompliments - 1, 1)) * startSpread - (startSpread / 2)) - 75;

    const finalX = characterCenterX + Math.sin(fanAngle * Math.PI / 180) * fanRadius - 75; // -75 to center bubble (150px wide)
    const finalY = belowCharacterY + Math.abs(Math.cos(fanAngle * Math.PI / 180)) * 20; // Create arc below

    const translateX = compliment.animValue.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [startX, characterCenterX - 75, finalX], // Start spread, converge, then fan out
    });

    const translateY = compliment.animValue.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [screenHeight, belowCharacterY, finalY], // Rise to below character, then fan out
    });

    const opacity = compliment.animValue.interpolate({
      inputRange: [0, 0.3, 0.7, 1],
      outputRange: [0, 1, 1, 0.95],
    });

    return (
      <Animated.View
        key={compliment.id}
        style={{
          position: 'absolute',
          left: 0, // Use transform for positioning
          top: 0,
          transform: [
            { translateX },
            { translateY },
            { scale: compliment.scaleValue },
          ],
          opacity,
        }}
      >
        <View style={{
          backgroundColor: colors.background.card,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          borderWidth: 2,
          borderColor: colors.primary[300],
          maxWidth: 150,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        }}>
          <Text style={{
            fontSize: typography.size.sm,
            fontWeight: typography.weight.semibold as any,
            color: colors.primary[700],
            textAlign: 'center',
            marginBottom: spacing.xs,
          }}>
            {compliment.context} 👍
          </Text>
          <Text style={{
            fontSize: typography.size.xs,
            color: colors.text.secondary,
            textAlign: 'center',
          }}>
            {compliment.text}
          </Text>
        </View>

        {/* Speech bubble tail */}
        <View style={{
          position: 'absolute',
          bottom: -8,
          left: '50%',
          marginLeft: -8,
          width: 0,
          height: 0,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: colors.primary[300],
        }} />
        <View style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          marginLeft: -6,
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 6,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: colors.background.card,
        }} />
      </Animated.View>
    );
  };

  return (
    <>
      {/* See Reactions Button */}
      <Pressable
        onPress={disabled ? undefined : openModal}
        disabled={disabled || !hasNewFeedback}
        style={{
          backgroundColor: hasNewFeedback ? colors.health[100] : colors.gray[100],
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: hasNewFeedback ? colors.health[300] : colors.gray[300],
          opacity: disabled ? 0.6 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        }}
      >
        <Text style={{
          fontSize: typography.size.sm,
          color: hasNewFeedback ? colors.health[700] : colors.text.secondary,
          fontWeight: typography.weight.medium as any,
        }}>
          👀 See Reactions
        </Text>

        {/* New feedback indicator */}
        {hasNewFeedback && (
          <View style={{
            backgroundColor: colors.status.error,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.xs,
          }}>
            <Text style={{
              color: colors.text.inverse,
              fontSize: typography.size.xs,
              fontWeight: typography.weight.bold as any,
            }}>
              {totalNewCount}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Celebration Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          justifyContent: "center",
          alignItems: "center",
        }}>
          {/* Character Display */}
          <View style={{
            backgroundColor: colors.background.primary,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
            alignItems: 'center',
            margin: spacing.xl,
            shadowColor: colors.gray[900],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <Text style={{
              fontSize: typography.size.xl,
              fontWeight: typography.weight.bold as any,
              color: colors.text.primary,
              textAlign: 'center',
              marginBottom: spacing.lg,
            }}>
              🎉 You got reactions! 🎉
            </Text>

            <SpineCharacterPreview
              outfit={outfit}
              size="large"
            />

            <Pressable
              onPress={closeModal}
              style={{
                backgroundColor: colors.primary[500],
                borderRadius: borderRadius.md,
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.md,
                marginTop: spacing.lg,
              }}
            >
              <Text style={{
                color: colors.text.inverse,
                fontSize: typography.size.md,
                fontWeight: typography.weight.semibold as any,
              }}>
                Awesome!
              </Text>
            </Pressable>
          </View>

          {/* Floating Animations */}
          {animatedReactions.map((reaction, index) =>
            renderFloatingReaction(reaction, index, animatedReactions.length)
          )}
          {animatedCompliments.map((compliment, index) =>
            renderFloatingCompliment(compliment, index, animatedCompliments.length)
          )}
        </View>
      </Modal>
    </>
  );
}