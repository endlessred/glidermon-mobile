// screens/LeaderboardScreen.tsx
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useLeaderboardStore, LeaderboardType, LeaderboardPlayer } from "../../data/stores/leaderboardStore";
import { useUserStore } from "../../data/stores/userStore";
import { useTheme } from "../../data/hooks/useTheme";

export default function LeaderboardScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [selectedType, setSelectedType] = useState<LeaderboardType>("weekly_consistency");

  const {
    leaderboards,
    isLoading,
    error,
    isParticipating,
    hasConsentedToLeaderboards,
    fetchLeaderboard,
    updateConsent,
    getMyLeaderboardProfile
  } = useLeaderboardStore();

  const { allowLeaderboards, hasCompletedOnboarding } = useUserStore();

  useEffect(() => {
    // Sync consent state from user store
    updateConsent(allowLeaderboards);
  }, [allowLeaderboards, updateConsent]);

  useEffect(() => {
    // Fetch leaderboard data if user has consented
    if (hasConsentedToLeaderboards && hasCompletedOnboarding) {
      fetchLeaderboard(selectedType);
    }
  }, [selectedType, hasConsentedToLeaderboards, hasCompletedOnboarding, fetchLeaderboard]);

  const leaderboardTypes: { key: LeaderboardType; label: string; description: string }[] = [
    {
      key: "weekly_consistency",
      label: "Weekly Champions",
      description: "Most consistent engagement this week"
    },
    {
      key: "monthly_progress",
      label: "Progress Masters",
      description: "Biggest achievements this month"
    },
    {
      key: "cosmetic_collector",
      label: "Style Icons",
      description: "Most creative customization"
    },
    {
      key: "streak_master",
      label: "Dedication Awards",
      description: "Longest engagement streaks"
    }
  ];

  const currentLeaderboard = leaderboards[selectedType];
  const myProfile = getMyLeaderboardProfile();

  const handleConsentChange = () => {
    const newConsent = !allowLeaderboards;

    if (newConsent) {
      Alert.alert(
        "Join Leaderboards",
        "Participate in friendly competitions with other players. Only your display name and equipped cosmetics will be visible - your health data stays private.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Join", onPress: () => updateConsent(true) }
        ]
      );
    } else {
      Alert.alert(
        "Leave Leaderboards",
        "You'll no longer participate in competitions and your profile will be removed from leaderboards.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => updateConsent(false) }
        ]
      );
    }
  };

  const renderPlayer = (player: LeaderboardPlayer, index: number) => {
    const isCurrentUser = player.id === myProfile?.id;

    return (
      <View
        key={player.id}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: isCurrentUser ? colors.primary[50] : colors.background.card,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderWidth: isCurrentUser ? 2 : 1,
          borderColor: isCurrentUser ? colors.primary[300] : colors.gray[200],
        }}
      >
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.primary[500],
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.md,
        }}>
          <Text style={{
            color: colors.text.inverse,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.bold as any,
          }}>
            {player.rank}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: typography.size.md,
            fontWeight: typography.weight.semibold as any,
            color: colors.text.primary,
          }}>
            {player.displayName} {isCurrentUser && "(You)"}
          </Text>
          <Text style={{
            fontSize: typography.size.sm,
            color: colors.text.secondary,
          }}>
            Level {player.level} • {player.equippedCosmetics.headTop || "No hat"}
          </Text>
        </View>

        <Text style={{
          fontSize: typography.size.lg,
          fontWeight: typography.weight.bold as any,
          color: colors.primary[600],
        }}>
          {player.score.toLocaleString()}
        </Text>
      </View>
    );
  };

  if (!hasCompletedOnboarding) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
      }}>
        <Text style={{
          fontSize: typography.size.lg,
          color: colors.text.secondary,
          textAlign: "center",
        }}>
          Complete your glidermon setup to access leaderboards!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: spacing['3xl'],
      }}
    >
      {/* Privacy Notice */}
      <View style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.gray[200],
      }}>
        <Text style={{
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold as any,
          color: colors.text.primary,
          marginBottom: spacing.sm,
        }}>
          🔒 Your Privacy Matters
        </Text>
        <Text style={{
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          marginBottom: spacing.md,
          lineHeight: typography.size.sm * 1.4,
        }}>
          Leaderboards show only your display name and cosmetics. Your health data, glucose readings, and personal information are never shared.
        </Text>

        <Pressable
          onPress={handleConsentChange}
          style={{
            backgroundColor: allowLeaderboards ? colors.red[500] : colors.primary[500],
            borderRadius: borderRadius.md,
            padding: spacing.sm,
            alignItems: "center",
          }}
        >
          <Text style={{
            color: colors.text.inverse,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.semibold as any,
          }}>
            {allowLeaderboards ? "Leave Leaderboards" : "Join Leaderboards"}
          </Text>
        </Pressable>
      </View>

      {!allowLeaderboards ? (
        <View style={{
          backgroundColor: colors.background.card,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          alignItems: "center",
          marginTop: spacing.xl,
        }}>
          <Text style={{
            fontSize: typography.size.lg,
            color: colors.text.secondary,
            textAlign: "center",
          }}>
            Join leaderboards to compete with other players!
          </Text>
        </View>
      ) : (
        <>
          {/* Leaderboard Type Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: spacing.lg }}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {leaderboardTypes.map((type) => (
              <Pressable
                key={type.key}
                onPress={() => setSelectedType(type.key)}
                style={{
                  backgroundColor: selectedType === type.key ? colors.primary[500] : colors.background.card,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: selectedType === type.key ? colors.primary[600] : colors.gray[300],
                  minWidth: 120,
                }}
              >
                <Text style={{
                  color: selectedType === type.key ? colors.text.inverse : colors.text.primary,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.semibold as any,
                  textAlign: "center",
                }}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Current Leaderboard Description */}
          <Text style={{
            fontSize: typography.size.md,
            color: colors.text.secondary,
            textAlign: "center",
            marginBottom: spacing.lg,
          }}>
            {leaderboardTypes.find(t => t.key === selectedType)?.description}
          </Text>

          {/* Error State */}
          {error && (
            <View style={{
              backgroundColor: colors.red[50],
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
            }}>
              <Text style={{
                color: colors.red[700],
                fontSize: typography.size.sm,
                textAlign: "center",
              }}>
                {error}
              </Text>
            </View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View style={{
              backgroundColor: colors.background.card,
              borderRadius: borderRadius.lg,
              padding: spacing.xl,
              alignItems: "center",
            }}>
              <Text style={{
                fontSize: typography.size.md,
                color: colors.text.secondary,
              }}>
                Loading leaderboard...
              </Text>
            </View>
          )}

          {/* Leaderboard Content */}
          {currentLeaderboard && !isLoading && (
            <View style={{
              backgroundColor: colors.background.card,
              borderRadius: borderRadius.lg,
              padding: spacing.lg,
            }}>
              <View style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: spacing.lg,
              }}>
                <Text style={{
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.bold as any,
                  color: colors.text.primary,
                }}>
                  Top Players
                </Text>
                {currentLeaderboard.myRank && (
                  <Text style={{
                    fontSize: typography.size.sm,
                    color: colors.text.secondary,
                  }}>
                    Your rank: #{currentLeaderboard.myRank}
                  </Text>
                )}
              </View>

              {currentLeaderboard.players.map(renderPlayer)}

              <Text style={{
                fontSize: typography.size.xs,
                color: colors.text.secondary,
                textAlign: "center",
                marginTop: spacing.md,
              }}>
                Updated {new Date(currentLeaderboard.lastUpdated).toLocaleDateString()}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}