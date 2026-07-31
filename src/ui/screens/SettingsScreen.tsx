// screens/SettingsScreen.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable } from "react-native";
import { useSettingsStore } from "../../data/stores/settingsStore";
import { useGameStore } from "../../data/stores/gameStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useToastStore } from "../../data/stores/toastStore";
import { useTheme } from "../../data/hooks/useTheme";
import { ThemeVariation, themeDisplayNames } from "../../styles/themeVariations";
import { useHealthKit } from "../../data/hooks/useHealthKit";
import { unifiedHealthService } from "../../health/healthService";
import { useStreakStore, MAX_FREEZES } from "../../data/stores/streakStore";

const formatHour = (hour: number) => {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
};

export default function SettingsScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const useSimulator = useSettingsStore(s => s.useSimulator);
  const setUseSimulator = useSettingsStore(s => s.setUseSimulator);
  const simSpeed = useSettingsStore(s => s.simSpeed);
  const setSimSpeed = useSettingsStore(s => s.setSimSpeed);
  const isDarkMode = useSettingsStore(s => s.isDarkMode);
  const setDarkMode = useSettingsStore(s => s.setDarkMode);
  const showLevelUpTest = useSettingsStore(s => s.showLevelUpTest);
  const setShowLevelUpTest = useSettingsStore(s => s.setShowLevelUpTest);
  const themeVariation = useSettingsStore(s => s.themeVariation);
  const setThemeVariation = useSettingsStore(s => s.setThemeVariation);

  // Visual Effects
  const enableAnimations = useSettingsStore(s => s.enableAnimations);
  const setEnableAnimations = useSettingsStore(s => s.setEnableAnimations);
  const enableParticleEffects = useSettingsStore(s => s.enableParticleEffects);
  const setEnableParticleEffects = useSettingsStore(s => s.setEnableParticleEffects);
  const enableBlurEffects = useSettingsStore(s => s.enableBlurEffects);
  const setEnableBlurEffects = useSettingsStore(s => s.setEnableBlurEffects);

  // Accessibility
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const setReduceMotion = useSettingsStore(s => s.setReduceMotion);
  const textScale = useSettingsStore(s => s.textScale);
  const setTextScale = useSettingsStore(s => s.setTextScale);
  const highContrast = useSettingsStore(s => s.highContrast);
  const setHighContrast = useSettingsStore(s => s.setHighContrast);

  // Health monitoring integration (HealthKit on iOS, Health Connect on Android)
  const healthKit = useHealthKit();
  const serviceName = unifiedHealthService.getServiceName();

  const onEgvs = useGameStore(s => s.onEgvs);
  const syncProgressionToEngine = useGameStore(s => s.syncProgressionToEngine);

  const resetProgression = useProgressionStore(s => s.resetProgression);
  const addToast = useToastStore(s => s.addToast);

  // Streak
  const streakFreezes = useStreakStore(s => s.freezesAvailable);
  const remindersEnabled = useStreakStore(s => s.remindersEnabled);
  const reminderHour = useStreakStore(s => s.reminderHour);
  const setRemindersEnabled = useStreakStore(s => s.setRemindersEnabled);
  const setReminderHour = useStreakStore(s => s.setReminderHour);

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

  const ThemeModal = () => (
    <Modal
      visible={showThemeModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowThemeModal(false)}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}
        onPress={() => setShowThemeModal(false)}
      >
        <Pressable
          style={{
            backgroundColor: colors.background.card,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            width: '100%',
            maxWidth: 400,
            maxHeight: '80%',
            shadowColor: colors.gray[900],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={{
            color: colors.text.primary,
            fontSize: typography.size.xl,
            fontWeight: typography.weight.bold as any,
            marginBottom: spacing.md,
            textAlign: 'center',
          }}>
            🎨 Choose Theme
          </Text>

          <Text style={{
            color: colors.text.secondary,
            fontSize: typography.size.sm,
            marginBottom: spacing.lg,
            textAlign: 'center',
          }}>
            Development tool - instantly try any theme
          </Text>

          <ScrollView style={{ maxHeight: 300 }}>
            {Object.entries(themeDisplayNames).map(([themeId, displayName]) => (
              <TouchableOpacity
                key={themeId}
                onPress={() => {
                  setThemeVariation(themeId as ThemeVariation);
                  addToast(`Switched to ${displayName} theme`);
                  setShowThemeModal(false);
                }}
                style={{
                  backgroundColor: themeVariation === themeId ? colors.primary[100] : colors.background.secondary,
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  borderWidth: themeVariation === themeId ? 2 : 1,
                  borderColor: themeVariation === themeId ? colors.primary[500] : colors.gray[200],
                }}
              >
                <Text style={{
                  color: themeVariation === themeId ? colors.primary[700] : colors.text.primary,
                  fontSize: typography.size.base,
                  fontWeight: themeVariation === themeId ? typography.weight.semibold as any : typography.weight.medium as any,
                }}>
                  {themeVariation === themeId ? '✓ ' : ''}{displayName}
                </Text>
                {themeId !== 'default' && (
                  <Text style={{
                    color: colors.text.tertiary,
                    fontSize: typography.size.xs,
                    marginTop: spacing.xs,
                  }}>
                    {themeId === 'cute' && 'Soft pastels with pink & purple'}
                    {themeId === 'cyberpunk' && 'Neon blues, purples & electric greens'}
                    {themeId === 'forest' && 'Earth tones with greens & browns'}
                    {themeId === 'ocean' && 'Blues and teals with aquatic feel'}
                    {themeId === 'sunset' && 'Warm oranges, pinks & purples'}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={() => setShowThemeModal(false)}
            style={{
              backgroundColor: colors.gray[200],
              borderRadius: borderRadius.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              marginTop: spacing.lg,
            }}
          >
            <Text style={{
              color: colors.text.primary,
              fontSize: typography.size.base,
              fontWeight: typography.weight.medium as any,
              textAlign: 'center',
            }}>
              Close
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

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
            {/* HealthKit Section */}
            {healthKit.isAvailable && (
              <>
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
                    {serviceName}: {healthKit.status === 'authorized' ? '🟢 Connected' :
                                   healthKit.status === 'available' ? '🟡 Available' :
                                   healthKit.status === 'denied' ? '🔴 Denied' : '⚪ Checking...'}
                  </Text>
                  <Text style={{
                    color: colors.text.secondary,
                    fontSize: typography.size.sm,
                    marginTop: spacing.xs,
                  }}>
                    {healthKit.isObserving ? 'Monitoring live blood glucose data' :
                     healthKit.isAuthorized ? 'Ready to monitor blood glucose' :
                     'Connect to use real health data from iPhone'}
                  </Text>
                  {healthKit.lastReading && (
                    <Text style={{
                      color: colors.text.tertiary,
                      fontSize: typography.size.xs,
                      marginTop: spacing.xs,
                    }}>
                      Last reading: {healthKit.lastReading.value} mg/dL at {healthKit.lastReading.date.toLocaleTimeString()}
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.md }}>
                  {!healthKit.isAuthorized ? (
                    <Button
                      label={`Connect ${serviceName}`}
                      onPress={() => healthKit.requestPermissions()}
                      variant="primary"
                    />
                  ) : (
                    <>
                      <Button
                        label={healthKit.isObserving ? "Stop Monitoring" : "Start Monitoring"}
                        onPress={() => healthKit.isObserving ? healthKit.stopObserving() : healthKit.startObserving()}
                        variant={healthKit.isObserving ? "secondary" : "primary"}
                      />
                      <Button
                        label="Fetch Latest"
                        onPress={() => healthKit.fetchLatest()}
                        variant="secondary"
                      />
                    </>
                  )}
                </View>
              </>
            )}

            {/* Simulator Section */}
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
              {healthKit.isAvailable && !healthKit.isObserving && (
                <Text style={{
                  color: colors.text.tertiary,
                  fontSize: typography.size.xs,
                  marginTop: spacing.xs,
                  fontStyle: 'italic',
                }}>
                  Use for testing when {serviceName} is not monitoring
                </Text>
              )}
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

        {section("🎭 Visual Effects", "", (
          <>
            <Text style={{
              color: colors.text.secondary,
              fontSize: typography.size.sm,
              marginBottom: spacing.sm,
            }}>
              Customize animations and visual effects
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
                Animations: {enableAnimations ? "🟢 Enabled" : "🔴 Disabled"}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Enable smooth transitions and animations
              </Text>
            </View>

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
                Particle Effects: {enableParticleEffects ? "🟢 Enabled" : "🔴 Disabled"}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Level up celebrations and visual sparkles
              </Text>
            </View>

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
                Blur Effects: {enableBlurEffects ? "🟢 Enabled" : "🔴 Disabled"}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Depth and focus effects (may impact performance)
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
              <Button
                label={enableAnimations ? "Disable Animations" : "Enable Animations"}
                onPress={() => setEnableAnimations(!enableAnimations)}
                variant="secondary"
              />
              <Button
                label={enableParticleEffects ? "Disable Particles" : "Enable Particles"}
                onPress={() => setEnableParticleEffects(!enableParticleEffects)}
                variant="secondary"
              />
              <Button
                label={enableBlurEffects ? "Disable Blur" : "Enable Blur"}
                onPress={() => setEnableBlurEffects(!enableBlurEffects)}
                variant="secondary"
              />
            </View>
          </>
        ))}

        {section("♿ Accessibility", "", (
          <>
            <Text style={{
              color: colors.text.secondary,
              fontSize: typography.size.sm,
              marginBottom: spacing.sm,
            }}>
              Customize accessibility and motion preferences
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
                Reduce Motion: {reduceMotion ? "🟢 Enabled" : "🔴 Disabled"}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Minimizes animations for better accessibility
              </Text>
            </View>

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
                Text Scale: {textScale.toFixed(1)}×
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Adjust text size for better readability
              </Text>
            </View>

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
                High Contrast: {highContrast ? "🟢 Enabled" : "🔴 Disabled"}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Enhanced contrast for better visibility
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.md }}>
              <Button
                label={reduceMotion ? "Allow Motion" : "Reduce Motion"}
                onPress={() => setReduceMotion(!reduceMotion)}
                variant="secondary"
                accessibilityLabel={reduceMotion ? "Allow motion and animations" : "Reduce motion for accessibility"}
                accessibilityHint="Toggles whether animations and motion effects are enabled or reduced for accessibility"
              />
              <Button
                label={highContrast ? "Normal Contrast" : "High Contrast"}
                onPress={() => setHighContrast(!highContrast)}
                variant="secondary"
                accessibilityLabel={highContrast ? "Switch to normal contrast" : "Enable high contrast mode"}
                accessibilityHint="Toggles high contrast colors for better visibility"
              />
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
              <Button
                label="Text 0.8×"
                onPress={() => setTextScale(0.8)}
                variant="secondary"
                accessibilityLabel="Set text size to small: 0.8 times normal"
                accessibilityHint="Makes all text smaller for compact viewing"
              />
              <Button
                label="Text 1.0×"
                onPress={() => setTextScale(1.0)}
                variant="secondary"
                accessibilityLabel="Set text size to normal: 1.0 times default"
                accessibilityHint="Uses the default text size"
              />
              <Button
                label="Text 1.2×"
                onPress={() => setTextScale(1.2)}
                variant="secondary"
                accessibilityLabel="Set text size to large: 1.2 times normal"
                accessibilityHint="Makes all text 20 percent larger for easier reading"
              />
              <Button
                label="Text 1.5×"
                onPress={() => setTextScale(1.5)}
                variant="secondary"
                accessibilityLabel="Set text size to extra large: 1.5 times normal"
                accessibilityHint="Makes all text 50 percent larger for much easier reading"
              />
            </View>
          </>
        ))}

        {section("🔥 Streak", "", (
          <>
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
                Daily reminder: {remindersEnabled ? "🟢 Enabled" : "🔴 Disabled"} at {formatHour(reminderHour)}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Nudges you in the evening if today's streak goal isn't met yet
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Freezes: {streakFreezes} / {MAX_FREEZES} (earned every 7-day streak)
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.md }}>
              <Button
                label={remindersEnabled ? "Disable Reminders" : "Enable Reminders"}
                onPress={() => setRemindersEnabled(!remindersEnabled)}
                variant="secondary"
              />
            </View>

            <Text style={{
              color: colors.text.secondary,
              fontSize: typography.size.sm,
              marginBottom: spacing.sm,
            }}>
              Reminder time
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
              <Button label="6 PM" onPress={() => setReminderHour(18)} variant={reminderHour === 18 ? "primary" : "secondary"} />
              <Button label="8 PM" onPress={() => setReminderHour(20)} variant={reminderHour === 20 ? "primary" : "secondary"} />
              <Button label="9 PM" onPress={() => setReminderHour(21)} variant={reminderHour === 21 ? "primary" : "secondary"} />
              <Button label="10 PM" onPress={() => setReminderHour(22)} variant={reminderHour === 22 ? "primary" : "secondary"} />
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
                Dev Test Buttons: {showLevelUpTest ? "🟢 Enabled" : "🔴 Disabled"}
              </Text>
              <Text style={{
                color: colors.text.secondary,
                fontSize: typography.size.sm,
                marginTop: spacing.xs,
              }}>
                Shows on-screen test buttons (e.g. streak scenarios) for debugging
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.md }}>
              <Button
                label={showLevelUpTest ? "Hide Dev Test Buttons" : "Show Dev Test Buttons"}
                onPress={() => setShowLevelUpTest(!showLevelUpTest)}
                variant="secondary"
              />
            </View>

            <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginBottom: spacing.md }}>
              <Button label="📊 Send Fake Glucose Reading" onPress={fakeTick} />
              <Button label="🔄 Sync Game Engine" onPress={() => { syncProgressionToEngine(); addToast("Engine synced"); }} />
              <Button label="🎨 Theme Picker" onPress={() => setShowThemeModal(true)} variant="secondary" />
            </View>
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

      <ThemeModal />
    </ScrollView>
  );
}
