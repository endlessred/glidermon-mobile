import React, { useState, useCallback } from "react";
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  SafeAreaView,
} from "react-native";
import SpineCharacter from "../../game/view/SpineCharacter";
import { GoalPicker } from "./GoalPicker";
import { useCheckInStore, CheckInSlot, GlucoseGoal, LifestyleGoal } from "../../data/stores/checkInStore";
import { useTheme } from "../../data/hooks/useTheme";

// ─── Glucose goal options ─────────────────────────────────────────────────────

type GoalOption = { label: string; goal: GlucoseGoal };

const GLUCOSE_OPTIONS: GoalOption[] = [
  { label: "Stay in range 50%", goal: { type: "tir",      target: 50,  startMs: 0 } },
  { label: "Stay in range 70%", goal: { type: "tir",      target: 70,  startMs: 0 } },
  { label: "Stay in range 80%", goal: { type: "tir",      target: 80,  startMs: 0 } },
  { label: "No highs above 180",goal: { type: "no_highs", target: 180, startMs: 0 } },
  { label: "No highs above 200",goal: { type: "no_highs", target: 200, startMs: 0 } },
  { label: "No lows below 70",  goal: { type: "no_lows",  target: 70,  startMs: 0 } },
  { label: "No lows below 80",  goal: { type: "no_lows",  target: 80,  startMs: 0 } },
];

const MEAL_GOALS: LifestyleGoal[] = [
  { category: "meal", text: "Bolus before every meal" },
  { category: "meal", text: "Limit to 2 high-carb meals" },
  { category: "meal", text: "Eat at consistent times" },
  { category: "meal", text: "No carbs after 9 PM" },
];

const ACTIVITY_GOALS: LifestyleGoal[] = [
  { category: "activity", text: "30-minute walk" },
  { category: "activity", text: "Exercise session today" },
  { category: "activity", text: "Short walk after meals" },
  { category: "activity", text: "Stretch for 10 minutes" },
];

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function DialogueBubble({ text, colors, spacing, typography }: {
  text: string;
  colors: any;
  spacing: any;
  typography: any;
}) {
  return (
    <View style={{
      backgroundColor: (colors.accent.lavender ?? "#9b59b6") + "22",
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent.lavender ?? "#9b59b6",
      padding: spacing.md,
      marginVertical: spacing.sm,
    }}>
      <Text style={{ color: colors.text.primary, fontSize: typography.size.md, lineHeight: 22 }}>
        {text}
      </Text>
    </View>
  );
}

function RewardBadge({ xp, capNote, colors, spacing, typography }: {
  xp: number; capNote: string; colors: any; spacing: any; typography: any;
}) {
  const accentColor = colors.accent.lavender ?? "#9b59b6";
  return (
    <View style={{
      backgroundColor: accentColor + "22",
      borderRadius: 12,
      padding: spacing.md,
      alignItems: "center" as const,
      marginVertical: spacing.sm,
    }}>
      <Text style={{ color: "#7deba3", fontSize: 20, fontWeight: "800" }}>+{xp} XP</Text>
      <Text style={{ color: colors.text.secondary, fontSize: typography.size.sm, marginTop: 4 }}>
        {capNote}
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  slot: CheckInSlot | null;
  onClose: () => void;
};

export function CheckInFlowModal({ visible, slot, onClose }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { completeMorningCheckIn, completeMiddayCheckIn, completeEveningCheckIn, today } = useCheckInStore();

  // Morning state
  const [step, setStep] = useState(0);
  const [selectedGlucoseLabel, setSelectedGlucoseLabel] = useState<string | null>(null);
  const [selectedMealGoal, setSelectedMealGoal] = useState<string | null>(null);
  const [selectedActivityGoal, setSelectedActivityGoal] = useState<string | null>(null);
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  // Midday / Evening state
  const [lifestyleProgress, setLifestyleProgress] = useState<boolean[]>([]);

  const reset = useCallback(() => {
    setStep(0);
    setSelectedGlucoseLabel(null);
    setSelectedMealGoal(null);
    setSelectedActivityGoal(null);
    setShowActivityPicker(false);
    setLifestyleProgress([]);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const accentColor = colors.accent.lavender;
  const bg = colors.background.primary;

  if (!slot) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
        {/* Header */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.gray[200],
        }}>
          <Text style={{ color: colors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.bold as any }}>
            {slot === "morning" ? "🌅 Morning Check-In"
              : slot === "midday" ? "☀️ Midday Check-In"
              : "🌙 Evening Check-In"}
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Text style={{ color: colors.text.secondary, fontSize: typography.size.md }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          {slot === "morning" && (
            <MorningFlow
              step={step}
              setStep={setStep}
              selectedGlucoseLabel={selectedGlucoseLabel}
              setSelectedGlucoseLabel={setSelectedGlucoseLabel}
              selectedMealGoal={selectedMealGoal}
              setSelectedMealGoal={setSelectedMealGoal}
              selectedActivityGoal={selectedActivityGoal}
              setSelectedActivityGoal={setSelectedActivityGoal}
              showActivityPicker={showActivityPicker}
              setShowActivityPicker={setShowActivityPicker}
              onComplete={(glucoseGoal: GlucoseGoal, lifestyleGoals: LifestyleGoal[]) => {
                completeMorningCheckIn(glucoseGoal, lifestyleGoals);
                handleClose();
              }}
              colors={colors}
              spacing={spacing}
              typography={typography}
              borderRadius={borderRadius}
              accentColor={accentColor}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Morning flow ─────────────────────────────────────────────────────────────

function MorningFlow({
  step, setStep,
  selectedGlucoseLabel, setSelectedGlucoseLabel,
  selectedMealGoal, setSelectedMealGoal,
  selectedActivityGoal, setSelectedActivityGoal,
  showActivityPicker, setShowActivityPicker,
  onComplete,
  colors, spacing, typography, borderRadius, accentColor,
}: any) {
  const NextButton = ({ onPress, disabled, label = "Next →" }: { onPress: () => void; disabled?: boolean; label?: string }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        backgroundColor: disabled ? "#444" : accentColor,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        alignItems: "center" as const,
        marginTop: spacing.md,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: typography.weight.bold as any, fontSize: typography.size.md }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Step 0: Greeting
  if (step === 0) {
    return (
      <View style={{ alignItems: "center" as const, gap: spacing.md }}>
        <SpineCharacter animation="CheckIn/WakeUp" width={180} height={220} scale={0.35} />
        <DialogueBubble
          text="Good morning! Ready to plan a great day?"
          colors={colors} spacing={spacing} typography={typography}
        />
        <NextButton onPress={() => setStep(1)} label="Let's do it!" />
      </View>
    );
  }

  // Step 1: Glucose goal picker
  if (step === 1) {
    return (
      <View style={{ gap: spacing.md }}>
        <SpineCharacter animation="Idle/Idle" width={120} height={140} scale={0.25} />
        <GoalPicker
          title="🩸 Today's glucose goal"
          options={GLUCOSE_OPTIONS.map(o => o.label)}
          selected={selectedGlucoseLabel}
          onSelect={setSelectedGlucoseLabel}
        />
        <NextButton onPress={() => setStep(2)} disabled={!selectedGlucoseLabel} />
      </View>
    );
  }

  // Step 2: Lifestyle goal picker
  if (step === 2) {
    return (
      <View style={{ gap: spacing.md }}>
        <SpineCharacter animation="Idle/Idle" width={120} height={140} scale={0.25} />
        <GoalPicker
          title="🍽️ Meal goal (optional)"
          options={MEAL_GOALS.map(g => g.text)}
          selected={selectedMealGoal}
          onSelect={setSelectedMealGoal}
        />
        {!showActivityPicker ? (
          <TouchableOpacity onPress={() => setShowActivityPicker(true)} style={{ alignItems: "center" as const, padding: spacing.sm }}>
            <Text style={{ color: accentColor, fontSize: typography.size.sm }}>+ Add activity goal</Text>
          </TouchableOpacity>
        ) : (
          <GoalPicker
            title="🏃 Activity goal (optional)"
            options={ACTIVITY_GOALS.map(g => g.text)}
            selected={selectedActivityGoal}
            onSelect={setSelectedActivityGoal}
          />
        )}
        <NextButton
          onPress={() => {
            const glucoseOption = GLUCOSE_OPTIONS.find(o => o.label === selectedGlucoseLabel);
            if (!glucoseOption) return;
            const lifestyleGoals: LifestyleGoal[] = [];
            const mealMatch = selectedMealGoal ? MEAL_GOALS.find(g => g.text === selectedMealGoal) : undefined;
            const activityMatch = selectedActivityGoal ? ACTIVITY_GOALS.find(g => g.text === selectedActivityGoal) : undefined;
            if (mealMatch) lifestyleGoals.push(mealMatch);
            if (activityMatch) lifestyleGoals.push(activityMatch);
            onComplete(glucoseOption.goal, lifestyleGoals);
          }}
          label="Confirm →"
        />
      </View>
    );
  }

  return null;
}
