# Check-In System Design

**Date:** 2026-07-19  
**Status:** Approved — ready for implementation planning

> **2026-08 update:** two behaviors described below changed after initial
> implementation — see the callouts inline. Morning/midday/evening are no
> longer fixed roles (a missed slot no longer blocks later ones that day),
> and the glucose goal now runs for a fixed 5-hour window instead of being
> open-ended until the next check-in. The rest of this doc (cap formula,
> reward amounts, goal types) still reflects what's implemented.

---

## Overview

A three-times-daily companion check-in system where GliderMon guides users through setting and reviewing blood sugar management goals. Leveling and Acorn cap multipliers are driven by check-in adherence rather than purely passive glucose tick rewards.

Inspired by Finch — the emotional pull of a companion who reacts to your day is the core retention mechanism.

---

## Design Decisions

| Question | Decision |
|---|---|
| Progression model | Keep glucose-tick XP (baseline), boost daily cap via check-in adherence (C), add XP burst per completed check-in (B) |
| Adherence measurement | Auto-detected from CGM data for glucose goals; self-reported for lifestyle goals |
| Goal types | Glucose goal (auto-verified) + meal goal (self-reported) + optional activity goal (self-reported) |
| App entry point | Glowing card on the HUD home screen, appears when a check-in is ready, dismisses after completion |
| Check-in experience | Guided companion flow (Approach 2) — GliderMon leads each check-in with dialogue and animations |
| Simpler alternative | Approach 1 (quick card flow, no dialogue) available as a future settings toggle — design for it from day one |

---

## Architecture

### New Store: `checkInStore`

Zustand + persist store, resets daily. Lives alongside `progressionStore`.

```typescript
// As implemented (updated 2026-08): a fixed 5-hour window, not open-ended,
// and a tagged union since any slot can hold either kind of content now.
type GlucoseGoal = {
  type: 'tir' | 'no_highs' | 'no_lows';
  target: number;   // TIR % (50/70/80), ceiling mg/dL (180/200), or floor (70/80)
  startMs: number;  // when the window began
  endMs: number;    // startMs + 5 hours -- fixed duration, not "until next check-in"
};

type LifestyleGoal = {
  category: 'meal' | 'activity';
  text: string;     // e.g. "Bolus before every meal"
};

// Exactly one of today's three slots is ever goal_setting -- whichever
// check-in happens first that day, regardless of which named slot it lands
// in. The rest are grading, reporting on that one goal.
type GoalSettingCheckIn = { kind: 'goal_setting'; completedAt: string; glucoseGoal: GlucoseGoal; lifestyleGoals: LifestyleGoal[] };
type GradingCheckIn = { kind: 'grading'; completedAt: string; lifestyleProgress: number[]; glucoseAdherence: number }; // progress: 0, 0.5, or 1 per goal (partial credit)
type SlotCheckIn = GoalSettingCheckIn | GradingCheckIn;

type DailyCheckIns = {
  date: string;           // YYYY-MM-DD, reset daily
  morning: SlotCheckIn | null;
  midday: SlotCheckIn | null;
  evening: SlotCheckIn | null;
};
```

**Key actions:**
- `completeCheckIn(slot, payload)` — single action for all three slots; branches on whether a goal exists yet today (goal-setting vs grading content), computes glucose adherence, writes cap multiplier to progressionStore
- `computeGlucoseAdherence(goal, from, to)` — reads CGM trail from gameStore, returns 0–1 score over `[goal.startMs, min(now, goal.endMs)]` (capped at the 5-hour window). If fewer than 3 readings exist in the window, returns 0.5 (neutral partial credit — no data is not a failure)
- `resetDailyIfNeeded()` — clears morning/midday/evening on date change

**Check-in availability windows (local time):**

| Slot | Card appears | Card expires |
|---|---|---|
| Morning | 6:00 AM | 11:00 AM |
| Midday | 11:00 AM | 4:00 PM |
| Evening | 5:00 PM | midnight |

**Updated 2026-08:** each slot's availability now only depends on its own
window and its own null-ness — a missed slot no longer blocks the ones
after it. Whichever check-in happens first that day (morning, midday, or
evening) becomes the goal-setting one; the rest grade it. (The 4-5 PM gap
between midday and evening windows is unchanged.)

### Changes to `progressionStore`

One new field: `checkInCapMultiplier: number` (default 1.0). Daily cap becomes:

```
effectiveCap = dailyCap × checkInCapMultiplier
```

The tick logic in `onEgvsTick` is unchanged — it uses `effectiveCap` transparently.

New action: `setCheckInCapMultiplier(multiplier: number)` — called by checkInStore after each completed check-in.

New action: `grantCheckInXp(xp: number)` — immediate XP burst on check-in completion, not subject to daily cap.

---

## Cap Multiplier Formula

```
baseMultiplier = 1.0

Check-in completion bonuses (always awarded, regardless of goal outcome):
  + 0.17   morning check-in completed
  + 0.17   midday check-in completed
  + 0.17   evening check-in completed

Goal adherence bonuses (scaled 0–max by adherence score):
  + 0–0.10  glucose goal adherence × 0.10
  + 0–0.10  meal goal adherence (1.0 if yes, 0.5 if partial, 0.0 if no) × 0.10
  + 0–0.06  activity goal adherence (optional) × 0.06

Maximum multiplier ≈ 1.77×  (baseline 2,400 → ~4,250 acorns max)
Minimum multiplier = 1.0×   (no check-ins → baseline unchanged)
```

The cap never drops below baseline. Completing check-ins is always rewarded, even if goals weren't met — the habit matters as much as the outcome.

### XP Bursts Per Check-In

| Check-in | XP burst |
|---|---|
| Morning | +50 XP |
| Midday | +30 XP |
| Evening | +80 XP |

XP bursts are immediate and not subject to the daily cap.

---

## Check-In Flow (Approach 2: Guided Companion)

### Morning (~60 seconds, 5 screens)

1. **HUD card** — glowing card appears on home screen. "✨ Morning Check-In — GliderMon wants to say good morning!"
2. **Greeting** — `CheckIn/WakeUp` plays. Dialogue: *"Good morning! Ready to plan a great day?"*
3. **Glucose goal picker** — user picks one: Stay in range X% / No highs above X / No lows below X
4. **Lifestyle goal picker** — preset meal goals list; optional "+ Add activity goal" button at bottom
5. **Confirmation** — `CheckIn/Cheer` plays. XP burst shown (+50 XP, cap +0.17 unlocked)

### Midday (~30 seconds, 5 screens)

1. **HUD card** — "☀️ Midday Check-In — How's the morning going?"
2. **GliderMon reacts** — animation chosen by glucose adherence since morning:
   - In range / on track → `CheckIn/Cheer`
   - Running high → `High/HighWorriedFace`
   - Running low → `Low/LowSadFace`
   - Neutral (no data yet) → `Idle/IdleWave`
3. **Glucose recap** — TIR % since morning shown as bar + label. Goal shown with ✓ or partial
4. **Lifestyle self-report** — "Did you bolus for breakfast?" Yes / Not yet
5. **Reward** — `CheckIn/Cheer`. XP burst (+30 XP, cap +0.17 unlocked)

### Evening (~45 seconds, 4 screens)

1. **HUD card** — "🌙 Evening Check-In — Let's see how today went!"
2. **Greeting** — `ReadBook/ReadBook` plays (updated 2026-08, see Animation Plan below). Dialogue: *"You made it through the day! Let's see how you did."*
3. **Full day recap** — TIR % bar for the goal's 5-hour window + result; meal goal final self-report
4. **Cap reveal + reward** — `CheckIn/Cheer` (or `CheckIn/GoalMissed` post-MVP). Final XP burst (+80 XP). Cap multiplier shown with animation.

---

## Goal System

### Glucose Goals (auto-verified)

Each goal runs for a fixed 5-hour window from whichever check-in sets it
(updated 2026-08 — originally open-ended until the next check-in).

| Goal type | User sets | Adherence computation |
|---|---|---|
| Stay in range X% for 5 hours | Target TIR: 50 / 70 / 80% | `actual TIR / target TIR`, capped at 1.0 |
| No highs above X for 5 hours | Ceiling: 180 / 200 mg/dL | `1 − (% time above ceiling)` |
| No lows below X for 5 hours | Floor: 70 / 80 mg/dL | `1 − (% time below floor)` |

Partial credit always — no binary pass/fail.

### Meal Goals (self-reported)

Preset options (pick one at morning):
- Bolus before every meal
- Limit to 2 high-carb meals
- Eat at consistent times
- No carbs after 9 PM
- Custom (free text)

Adherence: 1.0 if confirmed at evening, 0.5 if "not yet" at midday + confirmed at evening, 0.0 if declined at evening.

### Activity Goals (optional, secondary)

Added via "+ Add activity goal" at morning step 4. Pick one:
- 30-minute walk
- Exercise session today
- Short walk after each meal
- Stretch for 10 minutes

Self-reported same as meal goals. One activity goal per day maximum.

---

## Animation Plan

### Existing animations (no new work needed)

| Animation | Used in check-in |
|---|---|
| `CheckIn/WakeUp` | Morning step 2 — greeting |
| `CheckIn/Cheer` | Morning step 5, Midday step 5, Evening step 4 (goals met) |
| `High/HighWorriedFace` | Midday step 2 — glucose running high |
| `Low/LowSadFace` | Midday step 2 — glucose running low |
| `Idle/Idle` | Goal picker screens |
| `Idle/IdleWave` | Midday step 2 — neutral/on-track |

### New animations required

| Priority | Animation | Description |
|---|---|---|
| ~~MVP~~ Resolved | ~~`CheckIn/WindDown`~~ | **Updated 2026-08:** never delivered; evening grading now uses the existing `ReadBook/ReadBook` clip instead (reading before bed reads as a wind-down moment without needing new art). Revisit a dedicated `CheckIn/WindDown` later if desired. |
| Post-MVP | `CheckIn/GoalMissed` | Gentle empathetic reaction when evening adherence was low. Soft, not punishing — GliderMon still supportive. |
| Post-MVP | `CheckIn/Streak` | More excited variant of Cheer for multi-day streak milestones (3-day, 7-day). |

### Artist brief: `CheckIn/WindDown` (not built — see table above)

- **Mood:** cozy, content, winding down — not sad or disappointed
- **Duration:** 2–3 seconds, loops cleanly
- **Key motions:** a gentle stretch or yawn, body settling; eyes drooping slightly but not closed
- **Context:** plays right before the evening recap, sets a reflective but warm tone regardless of how the day went

---

## Future: Approach 1 Setting Toggle

The simpler flow (Approach 1) should be buildable as a setting toggle without restructuring the data layer:

- `settingsStore.checkInStyle: 'guided' | 'quick'`
- `'guided'` → current Approach 2 flow with animations and dialogue
- `'quick'` → single-screen form per check-in, no animation sequence, same underlying data

Design the flow components to accept a `style` prop from day one so this is a config swap, not a rewrite.

---

## Out of Scope (this spec)

- Push notifications for check-in reminders (requires notification permissions infra)
- Check-in streak cosmetic unlocks (separate content spec)
- Historical check-in data / analytics view
- Social/leaderboard integration with check-in data
