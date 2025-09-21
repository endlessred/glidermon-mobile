// screens/OnboardingScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { useUserStore } from "../../data/stores/userStore";
import { useTheme } from "../../data/hooks/useTheme";

type OnboardingScreenProps = {
  onComplete: () => void;
};

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [glidermonName, setGlidermonName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [allowLeaderboards, setAllowLeaderboards] = useState(true);

  const userStore = useUserStore();

  const handleComplete = () => {
    const trimmedGlidermon = glidermonName.trim();
    const trimmedDisplay = displayName.trim();

    if (!trimmedGlidermon) {
      Alert.alert("Name Required", "Please give your glidermon a name!");
      return;
    }

    if (!trimmedDisplay) {
      Alert.alert("Display Name Required", "Please choose a display name for leaderboards!");
      return;
    }

    // Save user preferences
    userStore.setGlidermonName(trimmedGlidermon);
    userStore.setDisplayName(trimmedDisplay);
    userStore.setLeaderboardConsent(allowLeaderboards);
    userStore.completeOnboarding();

    onComplete();
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background.primary
      }}
      contentContainerStyle={{
        flexGrow: 1,
        padding: spacing.lg,
        justifyContent: "center",
      }}
    >
      <View style={{
        alignItems: "center",
        marginBottom: spacing.xl,
      }}>
        <Text style={{
          fontSize: typography.size.xxl,
          fontWeight: typography.weight.bold as any,
          color: colors.text.primary,
          textAlign: "center",
          marginBottom: spacing.md,
        }}>
          Welcome to Glidermon!
        </Text>

        <Text style={{
          fontSize: typography.size.lg,
          color: colors.text.secondary,
          textAlign: "center",
          lineHeight: typography.size.lg * 1.4,
        }}>
          Your glucose monitoring companion is ready to glide with you on your health journey.
        </Text>
      </View>

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
          marginBottom: spacing.md,
        }}>
          Name Your Glidermon
        </Text>

        <Text style={{
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          marginBottom: spacing.md,
        }}>
          Give your gliding companion a unique name that you'll see throughout the app.
        </Text>

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.gray[300],
            borderRadius: borderRadius.md,
            padding: spacing.md,
            fontSize: typography.size.md,
            color: colors.text.primary,
            backgroundColor: colors.background.primary,
          }}
          placeholder="Enter your glidermon's name"
          placeholderTextColor={colors.text.placeholder}
          value={glidermonName}
          onChangeText={setGlidermonName}
          maxLength={20}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={{
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          marginTop: spacing.xs,
        }}>
          {glidermonName.length}/20 characters
        </Text>
      </View>

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
          marginBottom: spacing.md,
        }}>
          Choose Your Display Name
        </Text>

        <Text style={{
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          marginBottom: spacing.md,
        }}>
          This name will be shown on leaderboards to protect your privacy. It can be different from your glidermon's name.
        </Text>

        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.gray[300],
            borderRadius: borderRadius.md,
            padding: spacing.md,
            fontSize: typography.size.md,
            color: colors.text.primary,
            backgroundColor: colors.background.primary,
          }}
          placeholder="Enter your display name"
          placeholderTextColor={colors.text.placeholder}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={15}
          autoCapitalize="words"
          returnKeyType="done"
        />

        <Text style={{
          fontSize: typography.size.xs,
          color: colors.text.secondary,
          marginTop: spacing.xs,
        }}>
          {displayName.length}/15 characters
        </Text>
      </View>

      <View style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.gray[200],
      }}>
        <Text style={{
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold as any,
          color: colors.text.primary,
          marginBottom: spacing.md,
        }}>
          Leaderboards & Competition
        </Text>

        <Text style={{
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          marginBottom: spacing.md,
        }}>
          Would you like to participate in friendly competitions with other players? Your health data stays private - only your display name and equipped cosmetics will be visible.
        </Text>

        <Pressable
          onPress={() => setAllowLeaderboards(!allowLeaderboards)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: spacing.sm,
          }}
        >
          <View style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: allowLeaderboards ? colors.primary[500] : colors.gray[400],
            backgroundColor: allowLeaderboards ? colors.primary[500] : "transparent",
            marginRight: spacing.sm,
            alignItems: "center",
            justifyContent: "center",
          }}>
            {allowLeaderboards && (
              <Text style={{ color: colors.text.inverse, fontSize: 12 }}>✓</Text>
            )}
          </View>
          <Text style={{
            fontSize: typography.size.md,
            color: colors.text.primary,
          }}>
            Join leaderboards and competitions
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleComplete}
        style={{
          backgroundColor: colors.primary[500],
          borderRadius: borderRadius.md,
          padding: spacing.md,
          alignItems: "center",
          marginBottom: spacing.lg,
        }}
      >
        <Text style={{
          color: colors.text.inverse,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold as any,
        }}>
          Start My Journey
        </Text>
      </Pressable>

      <Text style={{
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        textAlign: "center",
        lineHeight: typography.size.xs * 1.4,
      }}>
        Your health data is never shared directly. Only aggregate, anonymous statistics may be used to improve the app experience.
      </Text>
    </ScrollView>
  );
}