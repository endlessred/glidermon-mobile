import React, { useState, useCallback, useEffect } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import {
  useCheckInStore, CheckInSlot, GlucoseGoal, LifestyleGoal,
  findTodayGoalSetting, latestGrading, CHECK_IN_ACORNS, CHECK_IN_CAP_BONUS,
} from "../../data/stores/checkInStore";
import { useAcornSource } from "../hooks/useAcornSource";
import { useActiveLocalOutfit } from "../../data/stores/outfitStore";
import CraftPanel from "./handcrafted/CraftPanel";
import {
  CheckInFlowShell,
  CheckInDialogueCard,
  CheckInChoiceCard,
  CheckInChoiceGroup,
  CheckInCompleteStep,
  CraftPrimaryButton,
  INK, INK_MUTED, FELT_GREEN, GOLD, CREAM_LIGHT,
} from "./checkin";

// ─── Glucose goal options ─────────────────────────────────────────────────────
// Each goal runs for a fixed 5-hour window from whichever check-in sets it
// (see GLUCOSE_GOAL_DURATION_MS in checkInStore.ts), not open-ended. The
// canonical `label` is kept as the selection key so the submit lookup below
// is unchanged; `short` is what the choice card displays.

type GoalOption = {
  label: string;
  short: string;
  group: "tir" | "highs" | "lows";
  goal: Pick<GlucoseGoal, "type" | "target">;
};

const GLUCOSE_OPTIONS: GoalOption[] = [
  { label: "Stay in range 50% for 5 hours",  short: "Stay in range 50%",  group: "tir",   goal: { type: "tir",      target: 50 } },
  { label: "Stay in range 70% for 5 hours",  short: "Stay in range 70%",  group: "tir",   goal: { type: "tir",      target: 70 } },
  { label: "Stay in range 80% for 5 hours",  short: "Stay in range 80%",  group: "tir",   goal: { type: "tir",      target: 80 } },
  { label: "No highs above 180 for 5 hours", short: "No highs above 180", group: "highs", goal: { type: "no_highs", target: 180 } },
  { label: "No highs above 200 for 5 hours", short: "No highs above 200", group: "highs", goal: { type: "no_highs", target: 200 } },
  { label: "No lows below 70 for 5 hours",   short: "No lows below 70",   group: "lows",  goal: { type: "no_lows",  target: 70 } },
  { label: "No lows below 80 for 5 hours",   short: "No lows below 80",   group: "lows",  goal: { type: "no_lows",  target: 80 } },
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

const SLOT_TITLE: Record<CheckInSlot, string> = {
  morning: "Morning Check-In",
  midday: "Midday Check-In",
  evening: "Evening Check-In",
};

// Every completed check-in adds the same flat cap bonus, regardless of slot
// (see computeCapMultiplier in checkInStore).
const CAP_BONUS_LABEL = `+${CHECK_IN_CAP_BONUS.toFixed(2)}`;

// ─── Shared little surface ────────────────────────────────────────────────────

function GoalSurface({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <CraftPanel texture="paper" stitched shadow="card" grainOpacity={0.1} inset={18} contentStyle={styles.surface}>
      <Text style={styles.surfaceTitle}>{title}</Text>
      {subtitle ? <Text style={styles.surfaceSub}>{subtitle}</Text> : null}
      <View style={styles.surfaceBody}>{children}</View>
    </CraftPanel>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  slot: CheckInSlot | null;
  onClose: () => void;
};

export function CheckInFlowModal({ visible, slot, onClose }: Props) {
  const { completeCheckIn, today } = useCheckInStore();
  const { sourceRef: acornSourceRef, spawnFromRef } = useAcornSource();
  // Show the player's own equipped character as the guide, same source the
  // Home room uses -- so hair/hat/outfit combos read correctly in the ritual.
  const heroOutfit = useActiveLocalOutfit() ?? undefined;

  const [step, setStep] = useState(0);
  const [selectedGlucoseLabel, setSelectedGlucoseLabel] = useState<string | null>(null);
  const [selectedMealGoal, setSelectedMealGoal] = useState<string | null>(null);
  const [selectedActivityGoal, setSelectedActivityGoal] = useState<string | null>(null);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [lifestyleProgress, setLifestyleProgress] = useState<number[]>([]); // 0, 0.5, or 1 per goal

  // Freeze which slot + which flow (goal-setting vs grading) for the whole
  // session the instant it opens -- both `slot` and `findTodayGoalSetting`
  // change the moment completeCheckIn writes its record, which would
  // otherwise yank the reward step away before it's seen.
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

  if (!session) return null;
  const { slot: activeSlot, isGoalSetting } = session;

  const shared = {
    title: SLOT_TITLE[activeSlot],
    onClose: handleClose,
    slot: activeSlot,
    step, setStep,
    acornSourceRef,
    spawnFromRef,
    completeCheckIn,
    heroOutfit,
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      {isGoalSetting ? (
        <GoalSettingFlow
          {...shared}
          selectedGlucoseLabel={selectedGlucoseLabel}
          setSelectedGlucoseLabel={setSelectedGlucoseLabel}
          selectedMealGoal={selectedMealGoal}
          setSelectedMealGoal={setSelectedMealGoal}
          selectedActivityGoal={selectedActivityGoal}
          setSelectedActivityGoal={setSelectedActivityGoal}
          showActivityPicker={showActivityPicker}
          setShowActivityPicker={setShowActivityPicker}
        />
      ) : (
        <GradingFlow
          {...shared}
          today={today}
          lifestyleProgress={lifestyleProgress}
          setLifestyleProgress={setLifestyleProgress}
        />
      )}
    </Modal>
  );
}

// ─── Goal-setting flow (whichever check-in is first that day) ────────────────
// Three stops: greeting → set goal → done.

function GoalSettingFlow({
  title, onClose, slot, step, setStep,
  selectedGlucoseLabel, setSelectedGlucoseLabel,
  selectedMealGoal, setSelectedMealGoal,
  selectedActivityGoal, setSelectedActivityGoal,
  showActivityPicker, setShowActivityPicker,
  acornSourceRef, spawnFromRef, completeCheckIn, heroOutfit,
}: any) {
  // Step 0: greeting
  if (step === 0) {
    const greeting =
      slot === "morning" ? "Good morning! Ready to plan a great day?"
      : slot === "midday" ? "Let's set today's goal now — better late than never!"
      : "Let's set a goal for tonight.";
    return (
      <CheckInFlowShell
        title={title}
        onClose={onClose}
        progress={{ current: 1, total: 3 }}
        heroAnimation="Idle/IdleWave"
        stepKey="intro"
        heroOutfit={heroOutfit}
        centered
      >
        <CheckInDialogueCard tone="lavender" text={greeting} />
        <CraftPrimaryButton label="Start Check-In" accent="sunrise" size="lg" onPress={() => setStep(1)} />
      </CheckInFlowShell>
    );
  }

  // Step 1: pick the glucose goal (+ optional habit goal), one surface
  if (step === 1) {
    const glucoseOption = GLUCOSE_OPTIONS.find(o => o.label === selectedGlucoseLabel);

    const submit = () => {
      if (!glucoseOption) return;
      const lifestyleGoals: LifestyleGoal[] = [];
      const mealMatch = selectedMealGoal ? MEAL_GOALS.find(g => g.text === selectedMealGoal) : undefined;
      const activityMatch = selectedActivityGoal ? ACTIVITY_GOALS.find(g => g.text === selectedActivityGoal) : undefined;
      if (mealMatch) lifestyleGoals.push(mealMatch);
      if (activityMatch) lifestyleGoals.push(activityMatch);
      completeCheckIn(slot, { kind: "goal_setting", glucoseGoal: glucoseOption.goal, lifestyleGoals });
      spawnFromRef(CHECK_IN_ACORNS[slot as CheckInSlot]);
      setStep(2);
    };

    const groups: { key: GoalOption["group"]; label: string }[] = [
      { key: "tir", label: "Time in range" },
      { key: "highs", label: "Highs" },
      { key: "lows", label: "Lows" },
    ];

    const toggleMeal = (text: string) =>
      setSelectedMealGoal((cur: string | null) => (cur === text ? null : text));
    const toggleActivity = (text: string) =>
      setSelectedActivityGoal((cur: string | null) => (cur === text ? null : text));

    return (
      <CheckInFlowShell
        title={title}
        onClose={onClose}
        progress={{ current: 2, total: 3 }}
        heroAnimation="Idle/Idle"
        stepKey="goal"
        heroOutfit={heroOutfit}
        heroSize="medium"
        scroll
      >
        <GoalSurface title="Your glucose goal" subtitle="Choose a goal for the next 5 hours">
          {groups.map(g => (
            <CheckInChoiceGroup key={g.key} label={g.label}>
              {GLUCOSE_OPTIONS.filter(o => o.group === g.key).map(o => (
                <CheckInChoiceCard
                  key={o.label}
                  label={o.short}
                  selected={selectedGlucoseLabel === o.label}
                  onPress={() => setSelectedGlucoseLabel(o.label)}
                />
              ))}
            </CheckInChoiceGroup>
          ))}
        </GoalSurface>

        <GoalSurface title="Add a habit goal" subtitle="Optional — one meal focus for today">
          <CheckInChoiceGroup label="Meals">
            {MEAL_GOALS.map(g => (
              <CheckInChoiceCard
                key={g.text}
                label={g.text}
                selected={selectedMealGoal === g.text}
                onPress={() => toggleMeal(g.text)}
              />
            ))}
          </CheckInChoiceGroup>

          {showActivityPicker ? (
            <CheckInChoiceGroup label="Activity">
              {ACTIVITY_GOALS.map(g => (
                <CheckInChoiceCard
                  key={g.text}
                  label={g.text}
                  selected={selectedActivityGoal === g.text}
                  onPress={() => toggleActivity(g.text)}
                />
              ))}
            </CheckInChoiceGroup>
          ) : (
            <Text
              style={styles.addActivity}
              onPress={() => setShowActivityPicker(true)}
              accessibilityRole="button"
            >
              + Add an activity goal
            </Text>
          )}
        </GoalSurface>

        <View ref={acornSourceRef} collapsable={false}>
          <CraftPrimaryButton
            label="Set my goal"
            accent="green"
            size="lg"
            disabled={!selectedGlucoseLabel}
            onPress={submit}
          />
        </View>
      </CheckInFlowShell>
    );
  }

  // Step 2: done
  const doneMsg =
    slot === "morning" ? "You're ready for the morning."
    : slot === "midday" ? "You're set for the afternoon."
    : "You're set for tonight.";
  return (
    <CheckInFlowShell
      title={title}
      onClose={onClose}
      progress={null}
      heroAnimation="CheckIn/Cheer"
      stepKey="complete"
      heroOutfit={heroOutfit}
      centered
    >
      <CheckInCompleteStep
        title="Goal set!"
        message={doneMsg}
        acorns={CHECK_IN_ACORNS[slot as CheckInSlot]}
        capBonus={CAP_BONUS_LABEL}
        onDone={onClose}
      />
    </CheckInFlowShell>
  );
}

// ─── Grading flow (2nd/3rd check-ins of the day) ─────────────────────────────

function GradingFlow({
  title, onClose, slot, step, setStep,
  lifestyleProgress, setLifestyleProgress,
  today, acornSourceRef, spawnFromRef, completeCheckIn, heroOutfit,
}: any) {
  const goalSetting = findTodayGoalSetting(today);
  const lifestyleGoals: LifestyleGoal[] = goalSetting?.lifestyleGoals ?? [];
  const priorGrading = latestGrading(today);

  const glucoseAdherence = priorGrading?.glucoseAdherence ?? null;
  const greetingAnimation =
    slot === "evening" ? "ReadBook/ReadBook"
    : glucoseAdherence === null ? "Idle/IdleWave"
    : glucoseAdherence >= 0.8 ? "CheckIn/Cheer"
    : glucoseAdherence >= 0.5 ? "Idle/IdleWave"
    : "High/HighWorriedFace";

  const submitGrading = (progress: number[]) => {
    completeCheckIn(slot, { kind: "grading", lifestyleProgress: progress });
    spawnFromRef(CHECK_IN_ACORNS[slot as CheckInSlot]);
    setStep(3);
  };

  // Step 0: greeting with a glucose-based reaction
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
      <CheckInFlowShell
        title={title}
        onClose={onClose}
        progress={{ current: 1, total: 3 }}
        heroAnimation={greetingAnimation}
        stepKey="grade-intro"
        heroOutfit={heroOutfit}
        centered
      >
        <CheckInDialogueCard tone="lavender" text={dialogue} />
        <CraftPrimaryButton label="Let's check in" accent="sunrise" size="lg" onPress={() => setStep(1)} />
      </CheckInFlowShell>
    );
  }

  // Step 1: glucose recap
  if (step === 1) {
    const adherence = priorGrading?.glucoseAdherence ?? 0.5;
    const pct = Math.round(adherence * 100);
    const barColor = adherence >= 0.8 ? FELT_GREEN : adherence >= 0.5 ? GOLD : "#D98A73";
    const goalLabel = !goalSetting
      ? "No goal set today"
      : goalSetting.glucoseGoal.type === "tir"
      ? `Goal: ${goalSetting.glucoseGoal.target}% in range (5h)`
      : goalSetting.glucoseGoal.type === "no_highs"
      ? `Goal: no highs above ${goalSetting.glucoseGoal.target} (5h)`
      : `Goal: no lows below ${goalSetting.glucoseGoal.target} (5h)`;

    const next = () => {
      if (lifestyleGoals.length === 0) {
        submitGrading([]);
      } else {
        setLifestyleProgress([]);
        setStep(2);
      }
    };

    return (
      <CheckInFlowShell
        title={title}
        onClose={onClose}
        progress={{ current: 2, total: 3 }}
        heroAnimation="Idle/Idle"
        stepKey="grade-recap"
        heroOutfit={heroOutfit}
        heroSize="medium"
        centered
      >
        <GoalSurface title="Glucose check-in" subtitle={goalLabel}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(4, pct)}%` as any, backgroundColor: barColor }]} />
          </View>
          <Text style={[styles.barLabel, { color: adherence >= 0.7 ? INK : INK_MUTED }]}>
            {pct}% on track
          </Text>
        </GoalSurface>

        <View ref={lifestyleGoals.length === 0 ? acornSourceRef : undefined} collapsable={false}>
          <CraftPrimaryButton label="Continue" accent="green" size="lg" onPress={next} />
        </View>
      </CheckInFlowShell>
    );
  }

  // Step 2: self-report each lifestyle goal, one at a time (partial credit)
  if (step === 2 && lifestyleGoals.length > 0) {
    const activeIdx = lifestyleProgress.length;

    if (activeIdx >= lifestyleGoals.length) {
      submitGrading(lifestyleProgress);
      return null;
    }

    const goal = lifestyleGoals[activeIdx];
    const isLast = activeIdx === lifestyleGoals.length - 1;

    const answer = (val: number) => {
      const nextProgress = [...lifestyleProgress, val];
      if (nextProgress.length >= lifestyleGoals.length) {
        submitGrading(nextProgress);
      } else {
        setLifestyleProgress(nextProgress);
      }
    };

    const answers: { label: string; val: number }[] = [
      { label: "Yes", val: 1 },
      { label: "Partly", val: 0.5 },
      { label: slot === "evening" ? "No" : "Not yet", val: 0 },
    ];

    return (
      <CheckInFlowShell
        title={title}
        onClose={onClose}
        progress={{ current: 3, total: 3 }}
        heroAnimation="Idle/Idle"
        stepKey={`grade-report-${activeIdx}`}
        heroOutfit={heroOutfit}
        heroSize="medium"
        centered
      >
        <CheckInDialogueCard
          title={goal.text}
          text={slot !== "evening" ? "How's this going so far?" : "Did you manage this today?"}
        />
        <View ref={isLast ? acornSourceRef : undefined} collapsable={false} style={{ gap: 9 }}>
          {answers.map(a => (
            <CheckInChoiceCard
              key={a.label}
              label={a.label}
              selected={false}
              hideControl
              onPress={() => answer(a.val)}
            />
          ))}
        </View>
      </CheckInFlowShell>
    );
  }

  // Step 3: done
  const doneMsg = slot === "evening" ? "Great job today — see you tomorrow." : "Nice check-in — keep it up.";
  return (
    <CheckInFlowShell
      title={title}
      onClose={onClose}
      progress={null}
      heroAnimation="CheckIn/Cheer"
      stepKey="grade-complete"
      heroOutfit={heroOutfit}
      centered
    >
      <CheckInCompleteStep
        title={slot === "evening" ? "Day complete!" : "Checked in!"}
        message={doneMsg}
        acorns={CHECK_IN_ACORNS[slot as CheckInSlot]}
        capBonus={CAP_BONUS_LABEL}
        onDone={onClose}
      />
    </CheckInFlowShell>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 0,
  },
  surfaceTitle: {
    color: INK,
    fontSize: 19,
    fontWeight: "800",
  },
  surfaceSub: {
    color: INK_MUTED,
    fontSize: 13.5,
    marginTop: 4,
    lineHeight: 18,
  },
  surfaceBody: {
    marginTop: 14,
    gap: 18,
  },
  addActivity: {
    color: INK_MUTED,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 8,
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: INK,
    backgroundColor: CREAM_LIGHT,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 9,
  },
});
