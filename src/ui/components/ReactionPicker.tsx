// components/ReactionPicker.tsx
import React, { useState } from "react";
import { View, Text, Pressable, Modal, Animated } from "react-native";
import { REACTION_TYPES, ReactionType } from "../../data/stores/galleryStore";
import { useTheme } from "../../data/hooks/useTheme";

type ReactionPickerProps = {
  onReactionSelect: (reactionType: string) => void;
  currentReactions: Record<string, number>;
  disabled?: boolean;
};

export default function ReactionPicker({ onReactionSelect, currentReactions, disabled }: ReactionPickerProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  const totalReactions = Object.values(currentReactions).reduce((sum, count) => sum + count, 0);

  const openPicker = () => {
    setShowPicker(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start();
  };

  const closePicker = () => {
    Animated.spring(scaleAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start(() => {
      setShowPicker(false);
    });
  };

  const handleReactionSelect = (reactionType: string) => {
    onReactionSelect(reactionType);
    closePicker();
  };

  const getTopReactions = () => {
    return Object.entries(currentReactions)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  const topReactions = getTopReactions();

  return (
    <>
      {/* Reaction Summary & Trigger Button */}
      <Pressable
        onPress={disabled ? undefined : openPicker}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.gray[50],
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.gray[200],
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {/* Show top reactions */}
        {topReactions.length > 0 ? (
          <>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: spacing.xs,
            }}>
              {topReactions.map(([reactionId, count]) => {
                const reaction = REACTION_TYPES[reactionId];
                if (!reaction) return null;

                return (
                  <View key={reactionId} style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: spacing.xs,
                  }}>
                    <Text style={{ fontSize: 16 }}>{reaction.emoji}</Text>
                    <Text style={{
                      fontSize: typography.size.xs,
                      color: colors.text.secondary,
                      marginLeft: spacing.xs / 2,
                    }}>
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>

            {totalReactions > 0 && (
              <Text style={{
                fontSize: typography.size.xs,
                color: colors.text.secondary,
                marginRight: spacing.xs,
              }}>
                {totalReactions}
              </Text>
            )}
          </>
        ) : (
          <Text style={{
            fontSize: typography.size.sm,
            color: colors.text.secondary,
            marginRight: spacing.xs,
          }}>
            React
          </Text>
        )}

        {!disabled && (
          <Text style={{
            fontSize: 16,
            color: colors.text.secondary,
          }}>
            +
          </Text>
        )}
      </Pressable>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="none"
        onRequestClose={closePicker}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={closePicker}
        >
          <Animated.View
            style={{
              backgroundColor: colors.background.card,
              borderRadius: borderRadius.xl,
              padding: spacing.lg,
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
              Choose a Reaction
            </Text>

            <View style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: spacing.md,
            }}>
              {Object.values(REACTION_TYPES).map((reaction: ReactionType) => (
                <Pressable
                  key={reaction.id}
                  onPress={() => handleReactionSelect(reaction.id)}
                  style={{
                    alignItems: "center",
                    padding: spacing.md,
                    borderRadius: borderRadius.lg,
                    backgroundColor: colors.gray[50],
                    borderWidth: 1,
                    borderColor: colors.gray[200],
                    minWidth: 80,
                    maxWidth: 100,
                  }}
                >
                  <Text style={{
                    fontSize: 32,
                    marginBottom: spacing.xs,
                  }}>
                    {reaction.emoji}
                  </Text>
                  <Text style={{
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium as any,
                    color: reaction.color,
                    textAlign: "center",
                    marginBottom: spacing.xs / 2,
                  }}>
                    {reaction.label}
                  </Text>
                  <Text style={{
                    fontSize: typography.size.xs,
                    color: colors.text.secondary,
                    textAlign: "center",
                  }}>
                    {reaction.description}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={closePicker}
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