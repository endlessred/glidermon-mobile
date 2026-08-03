import React, { useState, useCallback, useEffect } from "react";
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SpineCharacter from "../../game/view/SpineCharacter";
import { GoalPicker } from "./GoalPicker";
import {
  useCheckInStore, CheckInSlot, GlucoseGoal, LifestyleGoal,
  findTodayGoalSetting, latestGrading, CHECK_IN_XP, CHECK_IN_ACORNS,
} from "../../data/stores/checkInStore";
import { useTheme } from "../../data/hooks/useTheme";
import { useAcornSource } from "../hooks/useAcornSource";

// ─── Glucose goal options ─────────────────────────────────────────────────────
// Each goal now runs for a fixed 5-hour window from whichever check-in sets
// it (see GLUCOSE_GOAL_DURATION_MS in checkInStore.ts), not open-ended.

type GoalOption = { label: string; goal: Pick<GlucoseGoal, "type" | "target"> };

const GLUCOSE_OPTIONS: GoalOption[] = [
  { label: "Stay in range 50% for 5 hours",  goal: { type: "tir",      target: 50 } },
  { label: "Stay in range 70% for 5 hours",  goal: { type: "tir",      target: 70 } },
  { label: "Stay in range 80% for 5 hours",  goal: { type: "tir",      target: 80 } },
  { label: "No highs above 180 for 5 hours", goal: { type: "no_highs", target: 180 } },
  { label: "No highs above 200 for 5 hours", goal: { type: "no_highs", target: 200 } },
  { label: "No lows below 70 for 5 hours",   goal: { type: "no_lows",  target: 70 } },
  { label: "No lows below 80 for 5 hours",   goal: { type: "no_lows",  target: 80 } },
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

function NextButton({ onPress, disabled, label = "Next →", colors, spacing, typography, borderRadius, accentColor }: {
  onPress: () => void; disabled?: boolean; label?: string;
  colors: any; spacing: any; typography: any; borderRadius: any; accentColor: string;
}) {
  return (
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
}

function RewardBadge({ xp, acorns, capNote, colors, spacing, typography }: {
  xp: number; acorns: number; capNote: string; colors: any; spacing: any; typography: any;
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
      <Text style={{ color: "#7deba3", fontSize: 20, fontWeight: "800" }}>+{xp} XP · +{acorns} 🌰</Text>
      <Text style={{ color: colors.text.secondary, fontSize: typography.size.sm, marginTop: 4 }}>
        {capNote}
      </Text>
    </View>
  );
}

/** Terminal step for both flows: shows the real reward for this slot, then
 * requires an explicit tap to close (so it's actually seen, unlike before
 * when the modal auto-closed the instant the check-in was submitted). */
function RewardStep({ slot, dialogue, onDone, colors, spacing, typography, borderRadius, accentColor }: {
  slot: CheckInSlot; dialogue: string; onDone: () => void;
  colors: any; spacing: any; typography: any; borderRadius: any; accentColor: string;
}) {
  const capNote =
    slot === "evening" ? "Cap fully updated" : "Cap +0.17 unlocked";
  return (
    <View style={{ alignItems: "center" as const, gap: spacing.md }}>
      <SpineCharacter animation="CheckIn/Cheer" width={180} height={220} scale={0.35} />
      <DialogueBubble text={dialogue} colors={colors} spacing={spacing} typography={typography} />
      <RewardBadge
        xp={CHECK_IN_XP[slot]}
        acorns={CHECK_IN_ACORNS[slot]}
        capNote={capNote}
        colors={colors} spacing={spacing} typography={typography}
      />
      <NextButton onPress={onDone} label="Nice!" colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} accentColor={accentColor} />
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
  const { completeCheckIn, today } = useCheckInStore();
  const { sourceRef: acornSourceRef, spawnFromRef } = useAcornSource();

  const [step, setStep] = useState(0);
  const [selectedGlucoseLabel, setSelectedGlucoseLabel] = useState<string | null>(null);
  const [selectedMealGoal, setSelectedMealGoal] = useState<string | null>(null);
  const [selectedActivityGoal, setSelectedActivityGoal] = useState<string | null>(null);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [lifestyleProgress, setLifestyleProgress] = useState<number[]>([]); // 0, 0.5, or 1 per goal

  // Freeze which slot + which flow (goal-setting vs grading) for the whole
  // session the instant it opens. Both `slot` (derived from availableSlot())
  // and `findTodayGoalSetting(today)` change the moment completeCheckIn
  // writes its record -- without freezing, submitting the check-in would
  // immediately flip `slot` to null and yank the reward step away before
  // the user ever saw it.
  const [session, setSession] = useState<{ slot: CheckInSlot; isGoalSetting: boolean } | null>(null);

  useEffect(() => {
    if (visible && slot && !session) {
      setSession({ slot, isGoalSetting: findTodayGoalSetting(today) === null });
    } else if (!visible && session) {
      setSession(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, slot]);

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

  if (!session) return null;
  const { slot: activeSlot, isGoalSetting } = session;

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
            {activeSlot === "morning" ? "🌅 Morning Check-In"
              : activeSlot === "midday" ? "☀️ Midday Check-In"
              : "🌙 Evening Check-In"}
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Text style={{ color: colors.text.secondary, fontSize: typography.size.md }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          {isGoalSetting ? (
            <GoalSettingFlow
              slot={activeSlot}
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
              onSubmit={(glucoseGoal: Pick<GlucoseGoal, "type" | "target">, lifestyleGoals: LifestyleGoal[]) => {
                completeCheckIn(activeSlot, { kind: "goal_setting", glucoseGoal, lifestyleGoals });
                spawnFromRef(CHECK_IN_ACORNS[activeSlot]);
              }}
              onDone={handleClose}
              colors={colors}
              spacing={spacing}
              typography={typography}
              borderRadius={borderRadius}
              accentColor={accentColor}
              acornSourceRef={acornSourceRef}
            />
          ) : (
            <GradingFlow
              slot={activeSlot}
              step={step}
              setStep={setStep}
              lifestyleProgress={lifestyleProgress}
              setLifestyleProgress={setLifestyleProgress}
              today={today}
              onSubmit={(progress: number[]) => {
                completeCheckIn(activeSlot, { kind: "grading", lifestyleProgress: progress });
                spawnFromRef(CHECK_IN_ACORNS[activeSlot]);
              }}
              onDone={handleClose}
              colors={colors}
              spacing={spacing}
              typography={typography}
              borderRadius={borderRadius}
              accentColor={accentColor}
              acornSourceRef={acornSourceRef}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Goal-setting flow (whichever check-in is first that day) ────────────────

function GoalSettingFlow({
  slot,
  step, setStep,
  selectedGlucoseLabel, setSelectedGlucoseLabel,
  selectedMealGoal, setSelectedMealGoal,
  selectedActivityGoal, setSelectedActivityGoal,
  showActivityPicker, setShowActivityPicker,
  onSubmit, onDone,
  colors, spacing, typography, borderRadius, accentColor,
  acornSourceRef,
}: any) {
  // Step 0: Greeting
  if (step === 0) {
    const greeting =
      slot === "morning" ? "Good morning! Ready to plan a great day?"
      : slot === "midday" ? "Let's set today's goal now — better late than never!"
      : "Let's set a goal for tonight!";
    return (
      <View style={{ alignItems: "center" as const, gap: spacing.md }}>
        <SpineCharacter animation="CheckIn/WakeUp" width={180} height={220} scale={0.35} />
        <DialogueBubble text={greeting} colors={colors} spacing={spacing} typography={typography} />
        <NextButton onPress={() => setStep(1)} label="Let's do it!" colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} accentColor={accentColor} />
      </View>
    );
  }

  // Step 1: Glucose goal picker
  if (step === 1) {
    return (
      <View style={{ gap: spacing.md }}>
        <SpineCharacter animation="Idle/Idle" width={120} height={140} scale={0.25} />
        <GoalPicker
          title="🩸 Glucose goal for the next 5 hours"
          options={GLUCOSE_OPTIONS.map((o: GoalOption) => o.label)}
          selected={selectedGlucoseLabel}
          onSelect={setSelectedGlucoseLabel}
        />
        <NextButton onPress={() => setStep(2)} disabled={!selectedGlucoseLabel} colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} accentColor={accentColor} />
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
        <View ref={acornSourceRef}>
          <NextButton
            onPress={() => {
              const glucoseOption = GLUCOSE_OPTIONS.find(o => o.label === selectedGlucoseLabel);
              if (!glucoseOption) return;
              const lifestyleGoals: LifestyleGoal[] = [];
              const mealMatch = selectedMealGoal ? MEAL_GOALS.find(g => g.text === selectedMealGoal) : undefined;
              const activityMatch = selectedActivityGoal ? ACTIVITY_GOALS.find(g => g.text === selectedActivityGoal) : undefined;
              if (mealMatch) lifestyleGoals.push(mealMatch);
              if (activityMatch) lifestyleGoals.push(activityMatch);
              onSubmit(glucoseOption.goal, lifestyleGoals);
              setStep(3);
            }}
            label="Confirm →"
            colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} accentColor={accentColor}
          />
        </View>
      </View>
    );
  }

  // Step 3: Reward
  if (step === 3) {
    return (
      <RewardStep
        slot={slot}
        dialogue="Goal set! Keep it up — you're on track for a great day!"
        onDone={onDone}
        colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} accentColor={accentColor}
      />
    );
  }

  return null;
}

// ─── Grading flow (2nd/3rd check-ins of the day) ──────────────────────────────

function GradingFlow({
  slot, step, setStep,
  lifestyleProgress, setLifestyleProgress,
  today, onSubmit, onDone,
  colors, spacing, typography, borderRadius, accentColor,
  acornSourceRef,
}: any) {
  const goalSetting = findTodayGoalSetting(today);
  const lifestyleGoals: LifestyleGoal[] = goalSetting?.lifestyleGoals ?? [];
  const priorGrading = latestGrading(today);

  const glucoseAdherence = priorGrading?.glucoseAdherence ?? null;
  const greetingAnimation =
    glucoseAdherence === null ? "Idle/IdleWave"
    : glucoseAdherence >= 0.8 ? "CheckIn/Cheer"
    : glucoseAdherence >= 0.5 ? "Idle/IdleWave"
    : "High/HighWorriedFace";

  // Evening previously reused the morning "wake up" clip because a
  // dedicated wind-down animation was never made -- ReadBook/ReadBook is a
  // thematically better fit for a wind-down moment and already exists in
  // the character's animation set, no new art asset needed.
  const eveningAnimation = "ReadBook/ReadBook";

  // Step 0: greeting with glucose-based reaction
  if (step === 0) {
    const dialogue = slot === "evening"
      ? "You made it through the day! Let's see how you did."
      : glucoseAdherence !== null && glucoseAdherence >= 0.8
      ? "You've been in great range — nice work!"
      : glucoseAdherence !== null && glucoseAdherence >= 0.5
      ? "You're making progress — keep it up!"
      : goalSetting
      ? "Glucose has been a bit tricky. That's okay!"
      : "Let's see how things are going.";

    return (
      <View style={{ alignItems: "center" as const, gap: spacing.md }}>
        <SpineCharacter
          animation={slot === "evening" ? eveningAnimation : greetingAnimation}
          width={180}
          height={220}
          scale={0.35}
        />
        <DialogueBubble text={dialogue} colors={colors} spacing={spacing} typography={typography} />
        <NextButton onPress={() => setStep(1)} label="Let's check in" colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} accentColor={accentColor} />
      </View>
    );
  }

  // Step 1: Glucose recap bar
  if (step === 1) {
    const adherence = priorGrading?.glucoseAdherence ?? 0.5;
    const pct = Math.round(adherence * 100);
    const goalLabel = !goalSetting
      ? "No goal set today"
      : goalSetting.glucoseGoal.type === "tir"
      ? `Goal: ${goalSetting.glucoseGoal.target}% in range (5h)`
      : goalSetting.glucoseGoal.type === "no_highs"
      ? `Goal: no highs above ${goalSetting.glucoseGoal.target} (5h)`
      : `Goal: no lows below ${goalSetting.glucoseGoal.target} (5h)`;

    return (
      <View style={{ gap: spacing.md }}>
        <Text style={{ color: colors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.bold as any }}>
          📊 Glucose check-in
        </Text>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.background.secondary, overflow: "hidden" }}>
          <View style={{
            height: "100%" as any,
            width: `${pct}%` as any,
            backgroundColor: adherence >= 0.8 ? "#7deba3" : adherence >= 0.5 ? "#f0c040" : "#e07070",
            borderRadius: 4,
          }} />
        </View>
        <Text style={{ color: adherence >= 0.7 ? "#7deba3" : colors.text.secondary, fontWeight: typography.weight.bold as any }}>
          {pct}% adherence
        </Text>
        <Text style={{ color: colors.text.secondary, fontSize: typography.size.sm }}>{goalLabel}</Text>
        <View ref={lifestyleGoals.length === 0 ? acornSourceRef : undefined}>
          <NextButton onPress={() => {
            if (lifestyleGoals.length === 0) {
              onSubmit([]);
              setStep(3);
            } else {
              setLifestyleProgress([]);
              setStep(2);
            }
          }} colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} accentColor={accentColor} />
        </View>
      </View>
    );
  }

  // Step 2: Self-report lifestyle goals (one at a time), with partial credit
  if (step === 2 && lifestyleGoals.length > 0) {
    const activeIdx = lifestyleProgress.length;

    // All goals answered — submit
    if (activeIdx >= lifestyleGoals.length) {
      onSubmit(lifestyleProgress);
      setStep(3);
      return null;
    }

    const goal = lifestyleGoals[activeIdx];

    const answer = (val: number) => {
      const next = [...lifestyleProgress, val];
      if (next.length >= lifestyleGoals.length) {
        onSubmit(next);
        setStep(3);
      } else {
        setLifestyleProgress(next);
      }
    };

    return (
      <View style={{ gap: spacing.md }}>
        <Text style={{ color: colors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.bold as any }}>
          {goal.category === "meal" ? "🍽️" : "🏃"} {goal.text}
        </Text>
        <Text style={{ color: colors.text.secondary, fontSize: typography.size.md }}>
          {slot !== "evening" ? "How's this going so far?" : "Did you manage this today?"}
        </Text>
        <View
          ref={activeIdx === lifestyleGoals.length - 1 ? acornSourceRef : undefined}
          style={{ flexDirection: "row" as const, gap: spacing.sm }}
        >
          <TouchableOpacity
            onPress={() => answer(1)}
            style={{ flex: 1, backgroundColor: "#2d4a2d", borderRadius: borderRadius.md, padding: spacing.sm, alignItems: "center" as const, borderWidth: 1, borderColor: "#4a9" }}
          >
            <Text style={{ fontSize: 18 }}>✓</Text>
            <Text style={{ color: "#4a9", fontSize: typography.size.xs, fontWeight: typography.weight.bold as any }}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => answer(0.5)}
            style={{ flex: 1, backgroundColor: "#4a3f1f", borderRadius: borderRadius.md, padding: spacing.sm, alignItems: "center" as const, borderWidth: 1, borderColor: "#c93" }}
          >
            <Text style={{ fontSize: 18 }}>~</Text>
            <Text style={{ color: "#c93", fontSize: typography.size.xs, fontWeight: typography.weight.bold as any }}>Partly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => answer(0)}
            style={{ flex: 1, backgroundColor: "#2a1f1f", borderRadius: borderRadius.md, padding: spacing.sm, alignItems: "center" as const, borderWidth: 1, borderColor: "#944" }}
          >
            <Text style={{ fontSize: 18 }}>✗</Text>
            <Text style={{ color: "#944", fontSize: typography.size.xs, fontWeight: typography.weight.bold as any }}>
              {slot !== "evening" ? "Not yet" : "No"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 3: Reward
  if (step === 3) {
    return (
      <RewardStep
        slot={slot}
        dialogue={slot === "evening" ? "Great job today! See you tomorrow! 🌙" : "Nice check-in — keep it up!"}
        onDone={onDone}
        colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} accentColor={accentColor}
      />
    );
  }

  return null;
}
