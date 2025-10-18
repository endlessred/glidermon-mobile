// components/ComplimentSystem.tsx
import React, { useState } from "react";
import { View, Text, Pressable, Modal, Animated } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";

// Compliment categories with emojis and specific compliments
export const COMPLIMENT_CATEGORIES = {
  everything: {
    id: "everything",
    emoji: "✨",
    label: "Everything",
    compliments: [
      { id: "amazing_style", text: "Amazing style!", emoji: "🤩" },
      { id: "so_cool", text: "So cool!", emoji: "😎" },
      { id: "perfect_look", text: "Perfect look!", emoji: "👌" },
      { id: "incredible", text: "Incredible!", emoji: "🔥" },
    ]
  },
  hat: {
    id: "hat",
    emoji: "🎩",
    label: "Hat",
    compliments: [
      { id: "cool_hat", text: "Cool hat!", emoji: "😎" },
      { id: "awesome_headwear", text: "Awesome headwear!", emoji: "🤩" },
      { id: "love_the_hat", text: "Love the hat!", emoji: "😍" },
      { id: "great_choice", text: "Great choice!", emoji: "👍" },
    ]
  },
  outfit: {
    id: "outfit",
    emoji: "👕",
    label: "Outfit",
    compliments: [
      { id: "nice_outfit", text: "Nice outfit!", emoji: "👌" },
      { id: "stylish_look", text: "Stylish look!", emoji: "✨" },
      { id: "great_combo", text: "Great combo!", emoji: "🎨" },
      { id: "fashionable", text: "Fashionable!", emoji: "💫" },
    ]
  },
  colors: {
    id: "colors",
    emoji: "🌈",
    label: "Colors",
    compliments: [
      { id: "beautiful_colors", text: "Beautiful colors!", emoji: "🌈" },
      { id: "perfect_palette", text: "Perfect palette!", emoji: "🎨" },
      { id: "love_the_colors", text: "Love the colors!", emoji: "💖" },
      { id: "great_theme", text: "Great theme!", emoji: "✨" },
    ]
  },
  pose: {
    id: "pose",
    emoji: "🕺",
    label: "Pose",
    compliments: [
      { id: "cool_pose", text: "Cool pose!", emoji: "😎" },
      { id: "great_stance", text: "Great stance!", emoji: "💪" },
      { id: "nice_style", text: "Nice style!", emoji: "🌟" },
      { id: "perfect_pose", text: "Perfect pose!", emoji: "👌" },
    ]
  },
  creativity: {
    id: "creativity",
    emoji: "🎨",
    label: "Creative",
    compliments: [
      { id: "so_creative", text: "So creative!", emoji: "🎨" },
      { id: "unique_style", text: "Unique style!", emoji: "⭐" },
      { id: "original_look", text: "Original look!", emoji: "💡" },
      { id: "artistic", text: "Artistic!", emoji: "🖼️" },
    ]
  }
};

export type ComplimentCategory = keyof typeof COMPLIMENT_CATEGORIES;
export type Compliment = {
  id: string;
  text: string;
  emoji: string;
};

type ComplimentSystemProps = {
  onComplimentSelect: (categoryId: string, complimentId: string, complimentText: string) => void;
  disabled?: boolean;
};

export default function ComplimentSystem({ onComplimentSelect, disabled }: ComplimentSystemProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showComplimentPicker, setShowComplimentPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ComplimentCategory | null>(null);
  const [scaleAnim] = useState(new Animated.Value(0));

  const openCategoryPicker = () => {
    setShowCategoryPicker(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start();
  };

  const closePickers = () => {
    Animated.spring(scaleAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start(() => {
      setShowCategoryPicker(false);
      setShowComplimentPicker(false);
      setSelectedCategory(null);
    });
  };

  const handleCategorySelect = (categoryId: ComplimentCategory) => {
    setSelectedCategory(categoryId);
    setShowCategoryPicker(false);
    setShowComplimentPicker(true);
  };

  const handleComplimentSelect = (compliment: Compliment) => {
    if (selectedCategory) {
      onComplimentSelect(selectedCategory, compliment.id, compliment.text);
    }
    closePickers();
  };

  const renderCategoryWheel = () => {
    const categories = Object.values(COMPLIMENT_CATEGORIES);
    const radius = 100;
    const centerX = 150;
    const centerY = 150;

    return (
      <View style={{
        width: 300,
        height: 300,
        alignItems: "center",
        justifyContent: "center",
      }}>
        {categories.map((category, index) => {
          const angle = (index * 2 * Math.PI) / categories.length - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle) - 30; // -30 to center button
          const y = centerY + radius * Math.sin(angle) - 30; // -30 to center button

          return (
            <Pressable
              key={category.id}
              onPress={() => handleCategorySelect(category.id as ComplimentCategory)}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.primary[100],
                borderWidth: 2,
                borderColor: colors.primary[300],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 24 }}>{category.emoji}</Text>
              <Text style={{
                fontSize: typography.size.xs,
                color: colors.primary[700],
                fontWeight: typography.weight.medium as any,
                textAlign: "center",
                marginTop: 2,
              }}>
                {category.label}
              </Text>
            </Pressable>
          );
        })}

        {/* Center label */}
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.background.card,
          borderWidth: 2,
          borderColor: colors.primary[500],
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Text style={{
            fontSize: typography.size.sm,
            color: colors.primary[700],
            fontWeight: typography.weight.semibold as any,
            textAlign: "center",
          }}>
            Pick a{'\n'}Category
          </Text>
        </View>
      </View>
    );
  };

  const renderComplimentWheel = () => {
    if (!selectedCategory) return null;

    const category = COMPLIMENT_CATEGORIES[selectedCategory];
    const compliments = category.compliments;
    const radius = 90;
    const centerX = 130;
    const centerY = 130;

    return (
      <View style={{
        width: 260,
        height: 260,
        alignItems: "center",
        justifyContent: "center",
      }}>
        {compliments.map((compliment, index) => {
          const angle = (index * 2 * Math.PI) / compliments.length - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle) - 25; // -25 to center button
          const y = centerY + radius * Math.sin(angle) - 25; // -25 to center button

          return (
            <Pressable
              key={compliment.id}
              onPress={() => handleComplimentSelect(compliment)}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: colors.accent.lavender,
                borderWidth: 2,
                borderColor: colors.primary[300],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>{compliment.emoji}</Text>
            </Pressable>
          );
        })}

        {/* Center - show category and back button */}
        <Pressable
          onPress={() => {
            setShowComplimentPicker(false);
            setShowCategoryPicker(true);
          }}
          style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: colors.background.card,
            borderWidth: 2,
            borderColor: colors.primary[500],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20 }}>{category.emoji}</Text>
          <Text style={{
            fontSize: typography.size.xs,
            color: colors.primary[700],
            fontWeight: typography.weight.medium as any,
            textAlign: "center",
          }}>
            Back
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <>
      {/* Compliment Trigger Button */}
      <Pressable
        onPress={disabled ? undefined : openCategoryPicker}
        disabled={disabled}
        style={{
          backgroundColor: colors.accent.lavender,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.primary[200],
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text style={{
          fontSize: typography.size.sm,
          color: colors.primary[700],
          fontWeight: typography.weight.medium as any,
        }}>
          💬 Compliment
        </Text>
      </Pressable>

      {/* Modal for radial wheels */}
      <Modal
        visible={showCategoryPicker || showComplimentPicker}
        transparent
        animationType="none"
        onRequestClose={closePickers}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={closePickers}
        >
          <Animated.View
            style={{
              backgroundColor: colors.background.card,
              borderRadius: borderRadius.xl,
              padding: spacing.xl,
              margin: spacing.xl,
              shadowColor: colors.gray[900],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
              transform: [{ scale: scaleAnim }],
            }}
          >
            <Text style={{
              fontSize: typography.size.lg,
              fontWeight: typography.weight.semibold as any,
              color: colors.text.primary,
              textAlign: "center",
              marginBottom: spacing.lg,
            }}>
              {showCategoryPicker ? "What do you want to compliment?" : "Choose your compliment!"}
            </Text>

            {showCategoryPicker && renderCategoryWheel()}
            {showComplimentPicker && renderComplimentWheel()}

            <Pressable
              onPress={closePickers}
              style={{
                marginTop: spacing.lg,
                padding: spacing.sm,
                alignItems: "center",
              }}
            >
              <Text style={{
                fontSize: typography.size.md,
                color: colors.text.secondary,
              }}>
                Cancel
              </Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}