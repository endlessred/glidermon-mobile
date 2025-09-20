// screens/SettingsScreen.tsx
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSettingsStore } from "../stores/settingsStore";
import { useGameStore } from "../stores/gameStore";
import { useProgressionStore } from "../stores/progressionStore";
import { useToastStore } from "../stores/toastStore";
import { useTheme } from "../hooks/useTheme";
import { useLevelUpStore } from "../stores/levelUpStore";

export default function SettingsScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const useSimulator = useSettingsStore(s => s.useSimulator);
  const setUseSimulator = useSettingsStore(s => s.setUseSimulator);
  const simSpeed = useSettingsStore(s => s.simSpeed);
  const setSimSpeed = useSettingsStore(s => s.setSimSpeed);
  const isDarkMode = useSettingsStore(s => s.isDarkMode);
  const setDarkMode = useSettingsStore(s => s.setDarkMode);
  const showLevelUpTest = useSettingsStore(s => s.showLevelUpTest);
  const setShowLevelUpTest = useSettingsStore(s => s.setShowLevelUpTest);

  const clearLevelUpQueue = useLevelUpStore(s => s.clearAll);

  const onEgvs = useGameStore(s => s.onEgvs);
  const syncProgressionToEngine = useGameStore(s => s.syncProgressionToEngine);

  const resetProgression = useProgressionStore(s => s.resetProgression);
  const addToast = useToastStore(s => s.addToast);

  const section = (title: string, icon: string, children: React.ReactNode) => (
    <View style={{
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      shadowColor: colors.gray[900],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    }}>
      <Text style={{
        color: colors.text.primary,
        fontWeight: typography.weight.bold,
        fontSize: typography.size.lg,
        marginBottom: spacing.md,
      }}>
        {icon} {title}
      </Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );

  const Button = ({ label, onPress, variant = "primary" }: {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger";
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: variant === "danger"
          ? colors.status.error
          : variant === "secondary"
          ? colors.background.secondary
          : colors.primary[500],
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: variant === "danger"
          ? colors.status.error
          : variant === "secondary"
          ? colors.gray[300]
          : colors.primary[600],
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <Text style={{
        color: variant === "secondary" ? colors.text.primary : colors.text.inverse,
        fontWeight: typography.weight.semibold,
        fontSize: typography.size.sm,
        textAlign: "center",
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // --- Smoke test: push a fake tick through the pipeline.
  const fakeTick = () => {
    const now = Math.floor(Date.now() / 1000);
    // Generate a plausible mgdl near 110 ± 30
    const mgdl = Math.max(55, Math.min(250, Math.round(110 + (Math.random() - 0.5) * 60)));
    // Trend: 0=down, 1=flat, 2=up, 3=uncertain
    const trend = (Math.random() < 0.33 ? 0 : Math.random() < 0.5 ? 1 : 2) as 0 | 1 | 2;
    onEgvs(mgdl, trend, now);
    addToast(`Smoke tick: ${mgdl} mg/dL`);
  };

  // --- Reset progression & re-sync engine
  const doReset = () => {
    resetProgression();
    syncProgressionToEngine();
    addToast("Progression reset");
  };

  return (
    <ScrollView style={{
      flex: 1,
      backgroundColor: colors.background.primary,
    }}>
      <View style={{ padding: spacing.lg }}>
        {/* Header */}
        <View style={{
          backgroundColor: colors.background.card,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          shadowColor: colors.gray[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <Text style={{
            color: colors.text.primary,
            fontSize: typography.size['2xl'],
            fontWeight: typography.weight.bold,
          }}>
            ⚙️ Settings
          </Text>
          <Text style={{
            color: colors.text.secondary,
            fontSize: typography.size.sm,
            marginTop: spacing.xs,
          }}>
            Configure your pet's health monitoring
          </Text>
        </View>

        {section("🎨 Appearance", "", (
          <>
            <View style={{
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.gray[200],
            }}>
              <Text style={{
                color: colors.text.primary,
                fontSize: typography.size.base,
                fontWeight: typography.weight.medium,
              }}>
                Theme: {isDarkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Switch between light and dark themes
              </Text>
            </View>
            <Button
              label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              onPress={() => setDarkMode(!isDarkMode)}
              variant="secondary"
            />
          </>
        ))}

        {section("🩺 Data Source", "", (
          <>
            <View style={{
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.gray[200],
            }}>
              <Text style={{
                color: colors.text.primary,
                fontSize: typography.size.base,
                fontWeight: typography.weight.medium,
              }}>
                Glucose Simulator: {useSimulator ? "🟢 ON" : "🔴 OFF"}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Speed: {simSpeed}× normal rate
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
              <Button
                label={useSimulator ? "Turn Off Simulator" : "Turn On Simulator"}
                onPress={() => setUseSimulator(!useSimulator)}
                variant="secondary"
              />
              <Button label="Speed ×1" onPress={() => setSimSpeed(1)} variant="secondary" />
              <Button label="Speed ×6" onPress={() => setSimSpeed(6)} variant="secondary" />
            </View>
          </>
        ))}

        {section("🧪 Debug Tools", "", (
          <>
            <Text style={{
              color: colors.text.secondary,
              fontSize: typography.size.sm,
              marginBottom: spacing.sm,
            }}>
              Testing and development utilities
            </Text>

            <View style={{
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.gray[200],
              marginBottom: spacing.sm,
            }}>
              <Text style={{
                color: colors.text.primary,
                fontSize: typography.size.base,
                fontWeight: typography.weight.medium,
              }}>
                Level Up Test UI: {showLevelUpTest ? "🟢 Enabled" : "🔴 Disabled"}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Shows test buttons for level up system debugging
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.md }}>
              <Button
                label={showLevelUpTest ? "Hide Level Up Tests" : "Show Level Up Tests"}
                onPress={() => setShowLevelUpTest(!showLevelUpTest)}
                variant="secondary"
              />
              <Button
                label="🚮 Clear Stuck Level Ups"
                onPress={() => { clearLevelUpQueue(); addToast("Level up queue cleared"); }}
                variant="secondary"
              />
            </View>

            <Button label="📊 Send Fake Glucose Reading" onPress={fakeTick} />
            <Button label="🔄 Sync Game Engine" onPress={() => { syncProgressionToEngine(); addToast("Engine synced"); }} />
            <Button label="🗑️ Reset All Progress" onPress={doReset} variant="danger" />
          </>
        ))}

        {/* Info footer */}
        <View style={{
          backgroundColor: colors.accent.cream,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.accent.peach,
        }}>
          <Text style={{
            color: colors.text.primary,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.medium,
            textAlign: "center",
          }}>
            💡 Your pet's health is powered by glucose monitoring
          </Text>
          <Text style={{
            color: colors.text.secondary,
            fontSize: typography.size.xs,
            textAlign: "center",
            marginTop: spacing.xs,
          }}>
            Connect a real glucose monitor or use the simulator for testing
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
