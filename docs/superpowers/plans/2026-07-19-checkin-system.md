# Check-In System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-times-daily companion check-in system where GliderMon guides users through blood sugar goal-setting, with check-in adherence boosting the daily Acorn cap.

**Architecture:** A new `checkInStore` owns all check-in state and writes a `checkInCapMultiplier` to `progressionStore` after each completed slot. The daily cap in `onEgvsTick` is multiplied by this value. A `CheckInCard` appears on the HUD when a time window is active; tapping it opens `CheckInFlowModal`, a multi-step guided modal using `SpineCharacter` for animations.

**Tech Stack:** Zustand + AsyncStorage (same pattern as `progressionStore`), React Native `Modal`, `SpineCharacter` component (`src/game/view/SpineCharacter.tsx`), TypeScript.

**Design spec:** `docs/superpowers/specs/2026-07-19-checkin-system-design.md`

---

## File Map

| Action | Path |
|---|---|
| Modify | `src/data/stores/progressionStore.ts` |
| Create | `src/data/stores/checkInStore.ts` |
| Create | `src/ui/components/GoalPicker.tsx` |
| Create | `src/ui/components/CheckInCard.tsx` |
| Create | `src/ui/components/CheckInFlowModal.tsx` |
| Modify | `src/ui/screens/HudScreen.tsx` |

---

## Task 1: Extend progressionStore with cap multiplier support

**Files:**
- Modify: `src/data/stores/progressionStore.ts`

- [ ] **Step 1: Add `checkInCapMultiplier` field and new actions to the state type**

  In `progressionStore.ts`, find the `type ProgressionState` block and add three entries:

  ```typescript
  // inside ProgressionState type, after restedBank: number;
  checkInCapMultiplier: number; // set by checkInStore, default 1.0
  setCheckInCapMultiplier: (m: number) => void;
  grantCheckInXp: (xp: number, bonusAcorns?: number) => void;
  ```

- [ ] **Step 2: Add the initial value**

  In the `(set, get) => ({` block, after `restedBank: 0,`:

  ```typescript
  checkInCapMultiplier: 1.0,
  ```

- [ ] **Step 3: Add `setCheckInCapMultiplier` implementation**

  After the `grantAcorns` action:

  ```typescript
  setCheckInCapMultiplier: (m: number) => {
    set({ checkInCapMultiplier: Math.max(1.0, Math.min(2.0, m)) });
  },
  ```

- [ ] **Step 4: Add `grantCheckInXp` implementation**

  After `setCheckInCapMultiplier`:

  ```typescript
  grantCheckInXp: (xp: number, bonusAcorns: number = 0) => {
    const s0 = get();
    const carry = s0.xpIntoCurrent + xp;
    const rolled = consumeXpIntoLevels(s0.level, carry);
    const newTotalXp = s0.xpTotal + xp;

    if (rolled.leveled > 0) {
      useLevelUpStore.getState().enqueueRange(
        s0.level, rolled.level, () => ({ acorns: ACORNS_PER_LEVEL })
      );
    }

    set({
      xpIntoCurrent: rolled.xpOverflow,
      level: rolled.level,
      nextXp: xpNeededForLevel(rolled.level),
      xpTotal: newTotalXp,
      lifetimeXp: newTotalXp,
      acorns: s0.acorns + rolled.leveled * ACORNS_PER_LEVEL + bonusAcorns,
    });
  },
  ```

- [ ] **Step 5: Update `onEgvsTick` to apply the multiplier**

  Find the line in `onEgvsTick`:
  ```typescript
  const remainingCap = Math.max(0, s0.dailyCap - s0.dailyEarned);
  ```
  Replace with:
  ```typescript
  const effectiveCap = s0.dailyCap * s0.checkInCapMultiplier;
  const remainingCap = Math.max(0, effectiveCap - s0.dailyEarned);
  ```

- [ ] **Step 6: Add `checkInCapMultiplier` to `partialize`**

  In the `partialize` callback, add:
  ```typescript
  checkInCapMultiplier: s.checkInCapMultiplier,
  ```

- [ ] **Step 7: Verify TypeScript compiles**

  ```bash
  pnpm run tsc --noEmit
  ```
  Expected: no errors related to `progressionStore.ts`.

- [ ] **Step 8: Commit**

  ```bash
  git add src/data/stores/progressionStore.ts
  git commit -m "feat(progression): add checkInCapMultiplier and grantCheckInXp for check-in system"
  ```

---

## Task 2: Scaffold checkInStore — types, initial state, daily reset, and available slot

**Files:**
- Create: `src/data/stores/checkInStore.ts`

- [ ] **Step 1: Create the file with all exported types**

  Create `src/data/stores/checkInStore.ts`:

  ```typescript
  import { create } from "zustand";
  import { persist, createJSONStorage } from "zustand/middleware";
  import AsyncStorage from "@react-native-async-storage/async-storage";
  import { useGameStore } from "./gameStore";
  import { useProgressionStore } from "./progressionStore";

  // ─── Types ───────────────────────────────────────────────────────────────────

  export type GlucoseGoalType = "tir" | "no_highs" | "no_lows";

  export type GlucoseGoal = {
    type: GlucoseGoalType;
    /** TIR% for 'tir', ceiling mg/dL for 'no_highs', floor mg/dL for 'no_lows' */
    target: number;
    /** epoch ms when goal window began (set at morning completion) */
    startMs: number;
  };

  export type LifestyleGoalCategory = "meal" | "activity";

  export type LifestyleGoal = {
    category: LifestyleGoalCategory;
    text: string;
  };

  export type CheckInSlot = "morning" | "midday" | "evening";

  export type MorningCheckIn = {
    completedAt: string;   // ISO timestamp
    glucoseGoal: GlucoseGoal;
    lifestyleGoals: LifestyleGoal[];
  };

  export type MidEveningCheckIn = {
    slot: "midday" | "evening";
    completedAt: string;
    lifestyleProgress: boolean[];  // one per morning.lifestyleGoals
    glucoseAdherence: number;      // 0–1, computed from CGM trail
  };

  export type DailyCheckIns = {
    date: string;          // YYYY-MM-DD
    morning: MorningCheckIn | null;
    midday: MidEveningCheckIn | null;
    evening: MidEveningCheckIn | null;
  };

  // ─── Time windows (hours, local time) ────────────────────────────────────────

  const WINDOWS: Record<CheckInSlot, [number, number]> = {
    morning: [6, 11],    // 6:00 AM – 11:00 AM
    midday:  [11, 16],   // 11:00 AM – 4:00 PM
    evening: [17, 24],   // 5:00 PM – midnight
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const ymd = (d = new Date()) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const emptyDay = (): DailyCheckIns => ({
    date: ymd(),
    morning: null,
    midday: null,
    evening: null,
  });

  // ─── Store type ───────────────────────────────────────────────────────────────

  export type CheckInState = {
    today: DailyCheckIns;
    streak: number;

    // Actions
    resetDailyIfNeeded: () => void;
    availableSlot: () => CheckInSlot | null;
    completeMorningCheckIn: (glucoseGoal: GlucoseGoal, lifestyleGoals: LifestyleGoal[]) => void;
    completeMiddayCheckIn: (lifestyleProgress: boolean[]) => void;
    completeEveningCheckIn: (lifestyleProgress: boolean[]) => void;
  };

  const STORE_VERSION = 1;

  export const useCheckInStore = create<CheckInState>()(
    persist(
      (set, get) => ({
        today: emptyDay(),
        streak: 0,

        resetDailyIfNeeded: () => {
          const today = ymd();
          const s = get();
          if (s.today.date !== today) {
            const hadFullDay =
              s.today.morning !== null &&
              s.today.midday !== null &&
              s.today.evening !== null;
            set({
              today: emptyDay(),
              streak: hadFullDay ? s.streak + 1 : 0,
            });
          }
        },

        availableSlot: () => {
          const s = get();
          const now = new Date();
          const h = now.getHours() + now.getMinutes() / 60;

          if (h >= WINDOWS.morning[0] && h < WINDOWS.morning[1] && !s.today.morning) {
            return "morning";
          }
          if (h >= WINDOWS.midday[0] && h < WINDOWS.midday[1] && !s.today.midday && s.today.morning) {
            return "midday";
          }
          if (h >= WINDOWS.evening[0] && h < WINDOWS.evening[1] && !s.today.evening && s.today.morning) {
            return "evening";
          }
          return null;
        },

        // Stubs — implemented in Tasks 3 & 4
        completeMorningCheckIn: () => {},
        completeMiddayCheckIn: () => {},
        completeEveningCheckIn: () => {},
      }),
      {
        name: "glidermon/checkin-v1",
        version: STORE_VERSION,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (s) => ({
          today: s.today,
          streak: s.streak,
        }),
        migrate: (persisted: any) => {
          const s = persisted ?? {};
          s.today = s.today ?? emptyDay();
          s.streak = typeof s.streak === "number" ? s.streak : 0;
          return s;
        },
      }
    )
  );
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  pnpm run tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/data/stores/checkInStore.ts
  git commit -m "feat(checkin): scaffold checkInStore with types, daily reset, and available slot"
  ```

---

## Task 3: Implement glucose adherence computation

**Files:**
- Modify: `src/data/stores/checkInStore.ts`

- [ ] **Step 1: Add the pure `computeGlucoseAdherence` helper above the store**

  Paste this after the `emptyDay` function and before the `CheckInState` type:

  ```typescript
  /**
   * Reads the gameStore CGM trail and returns a 0–1 adherence score for a goal.
   * Returns 0.5 (neutral partial credit) if fewer than 3 readings exist in the window.
   */
  function computeGlucoseAdherence(
    goal: GlucoseGoal,
    fromMs: number,
    toMs: number
  ): number {
    const trail = useGameStore.getState().engine.trail;
    const readings = trail.filter(r => r.ts >= fromMs && r.ts <= toMs);

    if (readings.length < 3) return 0.5;

    switch (goal.type) {
      case "tir": {
        const inRange = readings.filter(r => r.mgdl >= 70 && r.mgdl <= 180).length;
        const actualPct = (inRange / readings.length) * 100;
        return Math.min(1.0, actualPct / goal.target);
      }
      case "no_highs": {
        const above = readings.filter(r => r.mgdl > goal.target).length;
        return 1.0 - above / readings.length;
      }
      case "no_lows": {
        const below = readings.filter(r => r.mgdl < goal.target).length;
        return 1.0 - below / readings.length;
      }
    }
  }
  ```

- [ ] **Step 2: Add the cap multiplier helper above the store**

  ```typescript
  /**
   * Recomputes the full cap multiplier from today's completed check-ins.
   * Adherence bonuses are only applied once evening is completed.
   */
  function computeCapMultiplier(today: DailyCheckIns): number {
    let m = 1.0;

    if (today.morning) m += 0.17;
    if (today.midday)  m += 0.17;

    if (today.evening) {
      m += 0.17;
      // Glucose adherence bonus (up to 0.10) from full-day window
      m += today.evening.glucoseAdherence * 0.10;

      // Lifestyle adherence from evening's final self-report
      if (today.morning) {
        today.morning.lifestyleGoals.forEach((goal, i) => {
          const met = today.evening!.lifestyleProgress[i] ?? false;
          if (goal.category === "meal")     m += met ? 0.10 : 0;
          if (goal.category === "activity") m += met ? 0.06 : 0;
        });
      }
    }

    return Math.min(1.77, m);
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  pnpm run tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/data/stores/checkInStore.ts
  git commit -m "feat(checkin): add glucose adherence computation and cap multiplier helpers"
  ```

---

## Task 4: Implement the three completeCheckIn actions

**Files:**
- Modify: `src/data/stores/checkInStore.ts`

- [ ] **Step 1: Replace the `completeMorningCheckIn` stub**

  ```typescript
  completeMorningCheckIn: (glucoseGoal: GlucoseGoal, lifestyleGoals: LifestyleGoal[]) => {
    get().resetDailyIfNeeded();
    const now = new Date().toISOString();
    const morningData: MorningCheckIn = {
      completedAt: now,
      glucoseGoal: { ...glucoseGoal, startMs: Date.now() },
      lifestyleGoals,
    };
    const nextToday = { ...get().today, morning: morningData };
    set({ today: nextToday });

    // Slot completion bonus only — adherence unknown until evening
    useProgressionStore.getState().setCheckInCapMultiplier(
      computeCapMultiplier(nextToday)
    );
    // XP burst + small acorn celebration
    useProgressionStore.getState().grantCheckInXp(50, 5);
  },
  ```

- [ ] **Step 2: Replace the `completeMiddayCheckIn` stub**

  ```typescript
  completeMiddayCheckIn: (lifestyleProgress: boolean[]) => {
    const s = get();
    if (!s.today.morning) return; // can't check in midday without morning

    const morningGoal = s.today.morning.glucoseGoal;
    const adherence = computeGlucoseAdherence(
      morningGoal,
      morningGoal.startMs,
      Date.now()
    );

    const midday: MidEveningCheckIn = {
      slot: "midday",
      completedAt: new Date().toISOString(),
      lifestyleProgress,
      glucoseAdherence: adherence,
    };
    const nextToday = { ...s.today, midday };
    set({ today: nextToday });

    useProgressionStore.getState().setCheckInCapMultiplier(
      computeCapMultiplier(nextToday)
    );
    useProgressionStore.getState().grantCheckInXp(30, 3);
  },
  ```

- [ ] **Step 3: Replace the `completeEveningCheckIn` stub**

  ```typescript
  completeEveningCheckIn: (lifestyleProgress: boolean[]) => {
    const s = get();
    if (!s.today.morning) return;

    const morningGoal = s.today.morning.glucoseGoal;
    const adherence = computeGlucoseAdherence(
      morningGoal,
      morningGoal.startMs,
      Date.now()
    );

    const evening: MidEveningCheckIn = {
      slot: "evening",
      completedAt: new Date().toISOString(),
      lifestyleProgress,
      glucoseAdherence: adherence,
    };
    const nextToday = { ...s.today, evening };
    set({ today: nextToday });

    // Full multiplier including all adherence bonuses
    useProgressionStore.getState().setCheckInCapMultiplier(
      computeCapMultiplier(nextToday)
    );
    useProgressionStore.getState().grantCheckInXp(80, 8);
  },
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  pnpm run tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/data/stores/checkInStore.ts
  git commit -m "feat(checkin): implement completeMorningCheckIn, completeMiddayCheckIn, completeEveningCheckIn"
  ```

---

## Task 5: Create GoalPicker component

**Files:**
- Create: `src/ui/components/GoalPicker.tsx`

- [ ] **Step 1: Create the component**

  ```typescript
  import React from "react";
  import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
  import { useTheme } from "../../data/hooks/useTheme";

  type Props = {
    title: string;
    options: string[];
    selected: string | null;
    onSelect: (value: string) => void;
  };

  export function GoalPicker({ title, options, selected, onSelect }: Props) {
    const { colors, typography, spacing, borderRadius } = useTheme();

    return (
      <View style={{ gap: spacing.sm }}>
        <Text style={{
          color: colors.text.secondary,
          fontSize: typography.size.sm,
          fontWeight: typography.weight.semibold as any,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: spacing.xs,
        }}>
          {title}
        </Text>

        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onSelect(option)}
              activeOpacity={0.75}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.md,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.accent?.primary ?? "#9b59b6" : colors.border?.primary ?? "#333",
                backgroundColor: isSelected
                  ? (colors.accent?.primary ?? "#9b59b6") + "22"
                  : colors.background?.secondary ?? "#1a1a2e",
              }}
            >
              <Text style={{
                color: isSelected ? colors.accent?.primary ?? "#9b59b6" : colors.text.primary,
                fontSize: typography.size.md,
                fontWeight: isSelected ? (typography.weight.semibold as any) : (typography.weight.regular as any),
              }}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  pnpm run tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/ui/components/GoalPicker.tsx
  git commit -m "feat(checkin): add GoalPicker component"
  ```

---

## Task 6: Create CheckInCard component

**Files:**
- Create: `src/ui/components/CheckInCard.tsx`

- [ ] **Step 1: Create the component**

  ```typescript
  import React, { useEffect, useRef } from "react";
  import { View, Text, TouchableOpacity, Animated } from "react-native";
  import { useCheckInStore } from "../../data/stores/checkInStore";
  import { useTheme } from "../../data/hooks/useTheme";

  const SLOT_LABELS = {
    morning: { emoji: "🌅", label: "Morning Check-In", sub: "GliderMon wants to plan your day!" },
    midday:  { emoji: "☀️", label: "Midday Check-In",  sub: "How's the morning goal going?" },
    evening: { emoji: "🌙", label: "Evening Check-In", sub: "Let's see how today went!" },
  } as const;

  type Props = {
    onPress: () => void;
  };

  export function CheckInCard({ onPress }: Props) {
    const slot = useCheckInStore(s => s.availableSlot());
    const { colors, spacing, typography, borderRadius } = useTheme();
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (!slot) return;
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }, [slot]);

    if (!slot) return null;

    const { emoji, label, sub } = SLOT_LABELS[slot];
    const accentColor = colors.accent?.primary ?? "#9b59b6";

    const borderColor = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [accentColor + "66", accentColor],
    });

    return (
      <Animated.View style={{
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        borderColor,
        backgroundColor: accentColor + "15",
        padding: spacing.md,
        marginVertical: spacing.sm,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.size.md, fontWeight: typography.weight.bold as any, color: colors.text.primary }}>
              {emoji} {label}
            </Text>
            <Text style={{ fontSize: typography.size.sm, color: colors.text.secondary, marginTop: 2 }}>
              {sub}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={{
              backgroundColor: accentColor,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              marginLeft: spacing.md,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: typography.weight.bold as any, fontSize: typography.size.sm }}>
              Let's go
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  pnpm run tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/ui/components/CheckInCard.tsx
  git commit -m "feat(checkin): add CheckInCard component with animated glow"
  ```

---

## Task 7: Create CheckInFlowModal — step infrastructure, morning flow

**Files:**
- Create: `src/ui/components/CheckInFlowModal.tsx`

- [ ] **Step 1: Create the file with shared infrastructure and morning flow**

  ```typescript
  import React, { useState, useCallback } from "react";
  import {
    Modal, View, Text, TouchableOpacity, ScrollView,
    SafeAreaView, Platform
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
        backgroundColor: (colors.accent?.primary ?? "#9b59b6") + "22",
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.accent?.primary ?? "#9b59b6",
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
    const accentColor = colors.accent?.primary ?? "#9b59b6";
    return (
      <View style={{
        backgroundColor: accentColor + "22",
        borderRadius: 12,
        padding: spacing.md,
        alignItems: "center",
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

    const accentColor = colors.accent?.primary ?? "#9b59b6";
    const bg = colors.background?.primary ?? "#0d0d1a";

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
            borderBottomColor: colors.border?.primary ?? "#222",
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
                onComplete={(glucoseGoal, lifestyleGoals) => {
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
          alignItems: "center",
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
        <View style={{ alignItems: "center", gap: spacing.md }}>
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
            <TouchableOpacity onPress={() => setShowActivityPicker(true)} style={{ alignItems: "center", padding: spacing.sm }}>
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
              const glucoseOption = GLUCOSE_OPTIONS.find(o => o.label === selectedGlucoseLabel)!;
              const lifestyleGoals: LifestyleGoal[] = [];
              if (selectedMealGoal) {
                lifestyleGoals.push(MEAL_GOALS.find(g => g.text === selectedMealGoal)!);
              }
              if (selectedActivityGoal) {
                lifestyleGoals.push(ACTIVITY_GOALS.find(g => g.text === selectedActivityGoal)!);
              }
              onComplete(glucoseOption.goal, lifestyleGoals);
            }}
            label="Confirm →"
          />
        </View>
      );
    }

    return null;
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  pnpm run tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/ui/components/CheckInFlowModal.tsx
  git commit -m "feat(checkin): add CheckInFlowModal with morning flow"
  ```

---

## Task 8: Add midday and evening flows to CheckInFlowModal

**Files:**
- Modify: `src/ui/components/CheckInFlowModal.tsx`

- [ ] **Step 1: Add midday and evening rendering to the `ScrollView` in `CheckInFlowModal`**

  Find the closing `}` of the `{slot === "morning" && ...}` block inside `ScrollView` and add:

  ```typescript
            {(slot === "midday" || slot === "evening") && (
              <MidEveningFlow
                slot={slot}
                step={step}
                setStep={setStep}
                lifestyleProgress={lifestyleProgress}
                setLifestyleProgress={setLifestyleProgress}
                today={today}
                onComplete={(progress) => {
                  if (slot === "midday") completeMiddayCheckIn(progress);
                  else completeEveningCheckIn(progress);
                  handleClose();
                }}
                colors={colors}
                spacing={spacing}
                typography={typography}
                borderRadius={borderRadius}
                accentColor={accentColor}
              />
            )}
  ```

- [ ] **Step 2: Add the `MidEveningFlow` component at the bottom of the file**

  ```typescript
  // ─── Midday + Evening flow ────────────────────────────────────────────────────

  function MidEveningFlow({
    slot, step, setStep,
    lifestyleProgress, setLifestyleProgress,
    today, onComplete,
    colors, spacing, typography, borderRadius, accentColor,
  }: any) {
    const morningGoals: LifestyleGoal[] = today.morning?.lifestyleGoals ?? [];
    const midday = today.midday;

    // Determine greeting animation based on glucose state from midday check-in
    // (for evening) or from morning data (for midday)
    const glucoseAdherence = midday?.glucoseAdherence ?? null;
    const greetingAnimation =
      glucoseAdherence === null
        ? "Idle/IdleWave"
        : glucoseAdherence >= 0.8
        ? "CheckIn/Cheer"
        : glucoseAdherence >= 0.5
        ? "Idle/IdleWave"
        : "High/HighWorriedFace";

    const eveningAnimation = "CheckIn/WakeUp"; // Use WakeUp until CheckIn/WindDown is created

    const NextButton = ({ onPress, disabled, label = "Next →" }: { onPress: () => void; disabled?: boolean; label?: string }) => (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={{
          backgroundColor: disabled ? "#444" : accentColor,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.md,
          alignItems: "center",
          marginTop: spacing.md,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: typography.weight.bold as any, fontSize: typography.size.md }}>
          {label}
        </Text>
      </TouchableOpacity>
    );

    // Step 0: GliderMon greeting with glucose-based reaction
    if (step === 0) {
      const dialogue = slot === "evening"
        ? "You made it through the day! Let's see how you did."
        : glucoseAdherence !== null && glucoseAdherence >= 0.8
        ? "You've been in great range this morning — nice work!"
        : glucoseAdherence !== null && glucoseAdherence >= 0.5
        ? "You're making progress — keep it up!"
        : "Glucose has been a bit tricky this morning. That's okay!";

      return (
        <View style={{ alignItems: "center", gap: spacing.md }}>
          <SpineCharacter
            animation={slot === "evening" ? eveningAnimation : greetingAnimation}
            width={180}
            height={220}
            scale={0.35}
          />
          <DialogueBubble text={dialogue} colors={colors} spacing={spacing} typography={typography} />
          <NextButton onPress={() => setStep(1)} label="Let's check in" />
        </View>
      );
    }

    // Step 1: Glucose recap bar
    if (step === 1) {
      const adherence = midday?.glucoseAdherence ?? 0.5;
      const pct = Math.round(adherence * 100);
      const goalLabel = today.morning?.glucoseGoal?.type === "tir"
        ? `Goal: ${today.morning.glucoseGoal.target}% in range`
        : today.morning?.glucoseGoal?.type === "no_highs"
        ? `Goal: no highs above ${today.morning.glucoseGoal.target}`
        : today.morning?.glucoseGoal?.type === "no_lows"
        ? `Goal: no lows below ${today.morning.glucoseGoal.target}`
        : "No goal set";

      return (
        <View style={{ gap: spacing.md }}>
          <Text style={{ color: colors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.bold as any }}>
            📊 {slot === "evening" ? "Today's glucose" : "Morning glucose"}
          </Text>
          {/* Adherence bar */}
          <View style={{ height: 8, borderRadius: 4, backgroundColor: "#1a0d2e", overflow: "hidden" }}>
            <View style={{
              height: "100%",
              width: `${Math.round(adherence * 100)}%`,
              backgroundColor: adherence >= 0.8 ? "#7deba3" : adherence >= 0.5 ? "#f0c040" : "#e07070",
              borderRadius: 4,
            }} />
          </View>
          <Text style={{ color: adherence >= 0.7 ? "#7deba3" : colors.text.secondary, fontWeight: typography.weight.bold as any }}>
            {pct}% adherence
          </Text>
          <Text style={{ color: colors.text.secondary, fontSize: typography.size.sm }}>{goalLabel}</Text>
          <NextButton onPress={() => {
            if (morningGoals.length === 0) {
              onComplete([]);
            } else {
              setLifestyleProgress(new Array(morningGoals.length).fill(false));
              setStep(2);
            }
          }} />
        </View>
      );
    }

    // Step 2: Self-report lifestyle goals
    if (step === 2 && morningGoals.length > 0) {
      const goalIndex = lifestyleProgress.filter(Boolean).length; // show current unanswered goal
      const currentGoalIdx = lifestyleProgress.findIndex((_, i) => lifestyleProgress[i] === false && i >= 0);
      const activeIdx = currentGoalIdx >= 0 ? currentGoalIdx : 0;
      const goal = morningGoals[activeIdx];

      const answer = (val: boolean) => {
        const next = [...lifestyleProgress];
        next[activeIdx] = val;
        if (next.every((_, i) => i >= morningGoals.length || next[i] !== undefined)) {
          onComplete(next.slice(0, morningGoals.length));
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
            {slot === "midday" ? "How's this going so far?" : "Did you manage this today?"}
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <TouchableOpacity
              onPress={() => answer(true)}
              style={{ flex: 1, backgroundColor: "#2d4a2d", borderRadius: borderRadius.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: "#4a9" }}
            >
              <Text style={{ fontSize: 20 }}>✓</Text>
              <Text style={{ color: "#4a9", fontSize: typography.size.sm, fontWeight: typography.weight.bold as any }}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => answer(false)}
              style={{ flex: 1, backgroundColor: "#2a1f1f", borderRadius: borderRadius.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: "#944" }}
            >
              <Text style={{ fontSize: 20 }}>✗</Text>
              <Text style={{ color: "#944", fontSize: typography.size.sm, fontWeight: typography.weight.bold as any }}>
                {slot === "midday" ? "Not yet" : "No"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Reward step (reached via onComplete → handleClose, but shown momentarily)
    return (
      <View style={{ alignItems: "center", gap: spacing.md }}>
        <SpineCharacter animation="CheckIn/Cheer" width={180} height={220} scale={0.35} />
        <DialogueBubble
          text={slot === "evening" ? "Great job today! See you tomorrow! 🌙" : "Keep it up — you're on track for a great day!"}
          colors={colors} spacing={spacing} typography={typography}
        />
        <RewardBadge
          xp={slot === "midday" ? 30 : 80}
          capNote={slot === "midday" ? "cap +0.17 unlocked" : "cap fully updated"}
          colors={colors} spacing={spacing} typography={typography}
        />
      </View>
    );
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  pnpm run tsc --noEmit
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/ui/components/CheckInFlowModal.tsx
  git commit -m "feat(checkin): add midday and evening flows to CheckInFlowModal"
  ```

---

## Task 9: Wire CheckInCard and CheckInFlowModal into HudScreen

**Files:**
- Modify: `src/ui/screens/HudScreen.tsx`

- [ ] **Step 1: Add imports**

  At the top of `HudScreen.tsx`, after the existing imports:

  ```typescript
  import { useState, useEffect } from "react"; // add useEffect if not already imported
  import { CheckInCard } from "../components/CheckInCard";
  import { CheckInFlowModal } from "../components/CheckInFlowModal";
  import { useCheckInStore } from "../../data/stores/checkInStore";
  ```

  Note: `useEffect` is already imported — just add the two component imports and `useCheckInStore`.

- [ ] **Step 2: Add state and store call inside `HudScreen`**

  Inside the `HudScreen` function body, after the existing store subscriptions:

  ```typescript
  const [checkInOpen, setCheckInOpen] = useState(false);
  const availableSlot = useCheckInStore(s => s.availableSlot());
  const resetDailyIfNeeded = useCheckInStore(s => s.resetDailyIfNeeded);

  // Reset daily check-in state on app foreground / component mount
  useEffect(() => {
    resetDailyIfNeeded();
  }, []);
  ```

- [ ] **Step 3: Add CheckInCard between the progress FramedCard and the game canvas FramedCard**

  In the `ScrollView` content, find the comment `{/* ===== Game Canvas (Cozy Theme) ===== */}` and insert just before it:

  ```tsx
  {/* ===== Check-In Card (appears when a slot is active) ===== */}
  {availableSlot && (
    <UIThemeProvider mode="cozy">
      <CheckInCard onPress={() => setCheckInOpen(true)} />
    </UIThemeProvider>
  )}
  ```

- [ ] **Step 4: Add CheckInFlowModal at the end of the `ScrollView` (before the closing tag)**

  Just before the closing `</ScrollView>`:

  ```tsx
  <CheckInFlowModal
    visible={checkInOpen}
    slot={availableSlot}
    onClose={() => setCheckInOpen(false)}
  />
  ```

- [ ] **Step 5: Verify TypeScript compiles**

  ```bash
  pnpm run tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 6: Verify the app loads on device**

  Ask the user to reload via `pnpm run iostunnel` and confirm:
  - Home screen loads without crash
  - Between 6–11 AM, a glowing morning check-in card appears
  - Tapping it opens the modal with the WakeUp animation
  - Completing morning check-in dismisses the modal and the card disappears
  - Check console for `[checkin]` logs if debugging

- [ ] **Step 7: Commit**

  ```bash
  git add src/ui/screens/HudScreen.tsx
  git commit -m "feat(checkin): wire CheckInCard and CheckInFlowModal into HudScreen"
  ```

---

## Self-Review Notes

**Spec coverage check:**

| Spec requirement | Task that covers it |
|---|---|
| Cap multiplier model (C + B) | Tasks 1, 4 |
| Auto-detected glucose adherence | Task 3 |
| Mixed goal types (glucose + meal + activity) | Tasks 2, 7, 8 |
| Glowing card on HUD | Tasks 6, 9 |
| Morning guided flow with WakeUp + Cheer | Task 7 |
| Midday glucose reaction animations | Task 8 |
| Evening recap flow | Task 8 |
| Daily reset + streak | Task 2 |
| `CheckIn/WindDown` animation | ⚠️ Placeholder — uses `CheckIn/WakeUp` until artist delivers `CheckIn/WindDown`. Wire it in `MidEveningFlow.eveningAnimation` once the asset is added to the skeleton. |
| Approach 1 setting toggle (future) | Not in scope — add `settingsStore.checkInStyle` flag and pass `style` prop to modal when ready |

**No placeholders confirmed:** All code blocks are complete. All type references are consistent across tasks. `GlucoseGoal.startMs` is set in `completeMorningCheckIn` (Task 4).
