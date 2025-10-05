# Ups and Downs — Flappy-Style Minigame (Hand‑off Spec)

This document is the implementation blueprint for a React Native + Skia minigame starring the Sugar Glider. It includes moment-to-moment mechanics, VirtuAcorns rewards, skill tree meta-progression, power-ups, data models, spawn logic, and a phased roadmap.

---

## 1) High‑Level Concept

A one-button, flappy-style endless runner where the Sugar Glider drifts upward slightly (auto-lift from eating fruit). The player taps an **Insulin** button to apply a **downward impulse** to thread gaps, collect fruit, and survive. Runs reward **VirtuAcorns (VA)** for meta progression.

**Core pillars**

* Simple, precise, readable controls (tap → downward impulse).
* Tight feedback (“juice”), predictable challenge ramp.
* Meta progression via **Skill Tree** (insulin capacity, regen, control).
* Occasional **power-ups** for in-run variety.

---

## 2) Controls & Core Loop

* **Auto-rise** due to fruit: gentle upward acceleration.
* **Tap (or press/hold)** Insulin button → brief downward impulse (like inverted Flappy flap).
* Avoid obstacles, collect fruit, survive as long as possible.
* **Score** by distance + fruit + perfect gap passes; convert to **VirtuAcorns** at run end.

**States**: `ready → playing → paused → gameOver`.

---

## 3) Physics & Tuning (initial)

Use a fixed game box (logical coords) inside the Skia canvas for consistent math.

```ts
// Baseline constants (tune during playtests)
GRAVITY = 900;          // px/s^2 downward
AUTO_LIFT = -250;       // px/s^2 upward (negative is up)
INSULIN_PUSH = +550;    // px/s^2 applied ~120ms on press
IMPULSE_DURATION = 0.12;// seconds
MAX_VY = 700;           // clamp vertical velocity
SPEED = 180;            // px/s horizontal world scroll
SPEED_RAMP = +1;        // px/s every 3s, cap ~240
GAP_START = 0.40;       // 40% of box height
GAP_MIN = 0.28;         // 28% floor
```

**Update per frame**

```ts
// dt in seconds (clamp 0..0.032)
acc = GRAVITY + AUTO_LIFT + activeInsulinImpulse(now);
vy  = clamp(vy + acc*dt, -MAX_VY, MAX_VY);
y   = y + vy*dt;

// advance world
for (o of obstacles) o.x -= SPEED*dt;
for (f of fruits)    f.x -= SPEED*dt;
spawnTimers.tick(dt);
```

---

## 4) Obstacles & Collectibles

* **Obstacles**: Top/bottom trunks/branches with a gap; slight vertical offset variation; gap gradually narrows.
* **Motion variants** (later): slow sway vines; mushrooms that bounce when grazed.
* **Fruit**: strawberries/blueberries/mango slices; placed along safe arcs; each fruit slightly increases auto-lift pressure for 4s (`AUTO_LIFT += −15 px/s^2`, stack & clamp).
* **Collision**: Glider circle vs obstacle AABBs; fruit/power-ups as circles.

---

## 5) Power‑Ups (floating pickups)

Spawn rarely (~3% chance per obstacle pair, after 150m). One active timed buff at a time; new pickup overrides.

| Key                | Icon          | Effect                        | Duration |
| ------------------ | ------------- | ----------------------------- | -------- |
| `extra_dose`       | Syringe       | +1 insulin immediately        | —        |
| `basal_surge`      | Vial          | Regen interval ×0.5           | 8s       |
| `weightless_fruit` | Feather       | Gravity ×0.7 (slower fall)    | 6s       |
| `chill_wind`       | Snowflake     | World speed ×0.8              | 5s       |
| `fruit_frenzy`     | Basket        | ×2 fruit density; +1 VA/fruit | 6s       |
| `shield_nut`       | Acorn shell   | One free hit                  | —        |
| `reflex_boost`     | Bolt          | Input cooldown ×0.6           | 5s       |
| `score_doubler`    | Coin          | Score & VA ×2                 | 5s       |
| `mega_fruit`       | Rainbow berry | +10 VA instantly              | —        |

**Apply/expire**

```ts
function applyPowerUp(p: PowerUpType) { /* modify run modifiers; set expiresAt */ }
function tickPowerUp(now) { if(expired) resetModifiersToBase(); }
```

---

## 6) Scoring & VirtuAcorns (VA)

**During run:**

* Score increases with distance, fruit, perfect gap center passes.

**End‑of‑run VA formula (clamped by run cap, e.g., 60–80 VA):**

```ts
VA = obstaclesCleared
   + floor(distanceMeters / 75)
   + floor(fruitChain / 5)
   + 2 * floor(noHitObstacles / 10)
   + (perfectCenters * perPerfectVA)    // fractional from skills
VA *= (1 + rewardBoostPct);             // skills/powerups
if (firstClear25Today) VA += 10 + dailyBonusPlus;
VA = clamp(floor(VA), 0, RUN_VA_CAP);
```

* **Fruit Frenzy** adds +1 VA per fruit during buff.
* **Score Doubler** doubles score + VA during buff.

---

## 7) Skill Tree (meta progression, VA‑funded)

Five branches, ~22 nodes, multi-tier. Focus on insulin capacity, regen, control, survivability, UX, and earnings.

### A) Insulin Mastery

1. **Dose Capacity I–V**: +1 dose per tier (Base 6 → up to 11). Costs: 25, 40, 60, 90, 130.
2. **Micro‑Dosing I–IV**: each press consumes 0.9 → 0.6 dose (multiplicative). Costs: 60, 90, 140, 200.
3. **Basal Regen I–III**: +1 dose every 20s → 16s → 12s. Costs: 120, 180, 260. (Req: Capacity II)
4. **Bolus Cooldown I–III**: min press interval 120ms → 100ms → 80ms. Costs: 90, 140, 210.

### B) Glide Control

1. **Counter‑Lift I–III**: downward impulse +6%/+12%/+18%. Costs: 60, 100, 160.
2. **Auto‑Lift Taming I–III**: reduce auto‑lift magnitude by 8%/16%/24%. Costs: 80, 130, 190.
3. **Feather Fall I–II**: max downward speed clamp −10%/−20%. Costs: 100, 150.

### C) Survival

1. **Bark Shield I–II**: 1 free bump per run → second bump at 75% score penalty. Costs: 150, 300.
2. **Safety Net I–III**: perfect gap restores 0.25 → 0.35 → 0.45 dose. Costs: 120, 170, 240.
3. **Cushioned Ceiling**: first ceiling graze costs 0.5 dose instead of KO. Cost: 180.

### D) Sensing/UX

1. **Gap Scout I–III**: ghost line to next gap center (range up). Costs: 70, 110, 160.
2. **Fruit Magnet I–III**: +8/+14/+20 px pickup radius. Costs: 90, 140, 210.
3. **Wind Predictor**: show wind vector if wind enabled. Cost: 130.

### E) Earnings

1. **Forager I–III**: +5%/+10%/+15% VA at end. Costs: 100, 160, 230.
2. **Perfector I–II**: +0.2/+0.4 VA per perfect‑center (fractional). Costs: 120, 180.
3. **Daily Booster**: +5 VA to first‑clear bonus. Cost: 160.

**Power‑Up Synergy Branch (optional late)**

* **Spawn Rate Boost I–III**: +1/+2/+3% power‑up chance.
* **Power Duration + I–II**: +1s/+2s to timed power‑ups.
* **Energy Synergy**: power-ups also grant +2 VA.
* **Adaptive Shield**: Shield Nut absorbs two hits if Bark Shield ≥ 1.

**Row gating**

* Require 2 nodes in A before B/C; 4 nodes total before D/E and Power Proficiency.

---

## 8) Data Models (Zustand‑style types)

```ts
type FlappyState = "ready" | "playing" | "paused" | "gameOver";

type VAStore = {
  balance: number;
  earn: (n: number) => void;   // clamp & persist
  spend: (n: number) => boolean;
};

type SkillKey =
  | "dose_capacity" | "micro_dose" | "basal_regen" | "bolus_cooldown"
  | "counter_lift" | "auto_lift_taming" | "feather_fall"
  | "bark_shield" | "safety_net" | "cushioned_ceiling"
  | "gap_scout" | "fruit_magnet" | "wind_predictor"
  | "forager" | "perfector" | "daily_booster"
  | "pu_spawn" | "pu_duration" | "pu_synergy" | "pu_adaptive_shield";

type SkillState = { level: number; maxTier: number; costs: number[]; prereqs?: SkillKey[] };

type SkillTreeStore = {
  skills: Record<SkillKey, SkillState>;
  canUpgrade: (k: SkillKey) => boolean;
  upgrade: (k: SkillKey) => boolean; // spends VA
  getModifierSnapshot: () => ModSnapshot;
};

type ModSnapshot = {
  // Insulin
  doseCapacityPlus: number;         // +N
  doseCostMultiplier: number;       // 1.0 → 0.6
  regenIntervalSec: number | null;  // null if locked
  pressCooldownMs: number;
  // Control
  impulseMultiplier: number;        // 1.0 → 1.3
  autoLiftScale: number;            // 1.0 → 0.76
  maxDownVelScale: number;          // 1.0 → 0.8
  // Safety
  freeBumps: number;
  centerRestoreDose: number;        // 0..0.45
  ceilingGrazeProtection: boolean;
  // UX
  scoutRangePx: number;             // 0..large
  magnetRadiusPx: number;           // 0..20
  showWind: boolean;
  // Rewards
  rewardBoostPct: number;           // 0..0.15
  perPerfectVA: number;             // 0..0.4
  dailyBonusPlus: number;           // +VA
  // Power-up tuning
  powerSpawnBonusPct: number;       // 0..+3
  powerDurationBonusSec: number;    // 0..+2
  powerVABonus: number;             // +2 VA
  adaptiveShield: boolean;
};

type PowerUpType =
  | "extra_dose" | "basal_surge" | "weightless_fruit" | "chill_wind"
  | "fruit_frenzy" | "shield_nut" | "reflex_boost" | "score_doubler" | "mega_fruit";

type ActivePowerUp = { type: PowerUpType; expiresAt: number | null };

type FlappyRun = {
  state: FlappyState;
  // Physics state
  y: number; vy: number;
  // Insulin economy
  dosesMax: number; dosesNow: number;
  doseCost: number; pressCooldownMs: number;
  regenIntervalSec?: number | null; regenNextAt?: number;
  // Score & progress
  score: number; obstaclesCleared: number; distanceMeters: number;
  fruitChain: number; noHitObstacles: number; perfectCenters: number;
  // Safety & buffs
  freeBumps: number; centerRestoreDose: number; ceilingGrazeProtection: boolean;
  activePowerUp?: ActivePowerUp;
  // Modifiers snapshot
  mods: ModSnapshot;
};
```

---

## 9) Integrating Skills & Power‑Ups in Run Logic

**At run start** (snapshot skills):

```ts
const m = skillTree.getModifierSnapshot();
run.mods = m;
run.dosesMax = 6 + m.doseCapacityPlus;
run.dosesNow = run.dosesMax;
run.doseCost = 1.0 * m.doseCostMultiplier;
run.pressCooldownMs = m.pressCooldownMs;
run.regenIntervalSec = m.regenIntervalSec; // null if locked
INSULIN_PUSH *= m.impulseMultiplier;
AUTO_LIFT     *= m.autoLiftScale;
MAX_VY        *= m.maxDownVelScale;
run.freeBumps = m.freeBumps;
run.centerRestoreDose = m.centerRestoreDose;
```

**On insulin press**

```ts
if (now - lastPressAt >= run.pressCooldownMs && run.dosesNow >= run.doseCost) {
  startImpulse(now); // lasts 120 ms
  run.dosesNow -= run.doseCost;
  lastPressAt = now;
}
```

**Passive regen**

```ts
if (run.regenIntervalSec && run.dosesNow < run.dosesMax && now >= run.regenNextAt!) {
  run.dosesNow = Math.min(run.dosesMax, run.dosesNow + 1);
  run.regenNextAt = now + run.regenIntervalSec*1000;
}
```

**Perfect gap center**

```ts
if (passedThroughCenterStripe) {
  run.dosesNow = Math.min(run.dosesMax, run.dosesNow + run.centerRestoreDose);
  run.perfectCenters++;
}
```

**Collision**

```ts
if (hitObstacleOrGround) {
  if (run.freeBumps > 0 || (run.mods.adaptiveShield && hasShieldNut)) {
    consumeShield();
    run.freeBumps = Math.max(0, run.freeBumps - 1);
    dampenVelocity();
  } else {
    endRun();
  }
}
```

---

## 10) Spawn Logic (obstacles, fruit, power‑ups)

```ts
function nextSpawn() {
  // Every N pixels create a pair of obstacles with gap
  // Offset vertical center slightly; shrink gap gradually to GAP_MIN
}

function maybeSpawnFruitLanes() {
  // Curved arcs between obstacles; density scaled by difficulty and power-ups
}

function maybeSpawnPowerUp() {
  const baseChance = 0.03 + run.mods.powerSpawnBonusPct/100; // gated by distance
  if (!run.activePowerUp && distMeters > 150 && Math.random() < baseChance) spawnPowerUp(weightedType());
}
```

**Weighted types** (reduce immediate repeats; `score_doubler` and `mega_fruit` rare).

---

## 11) UI/UX

* **HUD**: score (top-left), pause (top-right), big **Insulin** button bottom-center with cooldown ring and small ticker for regen (if unlocked). Dose meter uses pips (supports quarters for Safety Net).
* **Feedback**: small hitpause (60ms) on fruit, particle poofs; brief screen shake on insulin press; power-up aura color and icon near the glider.
* **Accessibility**: toggle *Tap to descend* vs *Hold to descend*; reduce motion; large hit areas; optional Assist Mode (infinite insulin @ 0.5× VA).
* **Game Over** modal: score, best, VA earned, buttons: Retry / Back.

---

## 12) Economy & Balance Safeguards

* VA multipliers total cap: **+25%**.
* Minimum `doseCostMultiplier`: **0.6** (never free).
* Regen pauses at ≥95% of max to avoid flicker.
* Power-ups: only one timed buff active at once.
* Per-run VA cap (tune): **RUN_VA_CAP = 60..80**.

---

## 13) Analytics & Telemetry (for tuning)

* Log: run time, distance, obstacles cleared, fruit eaten, doses used, collisions, VA earned, active skills.
* Funnels: where players die (gap size vs speed), dose exhaustion moments.
* A/B levers: GAP_MIN, SPEED_RAMP, power-up spawn.

---

## 14) File Structure (adds)

* `screens/FlappyScreen.tsx` — container + HUD overlay.
* `view/FlappyCanvas.tsx` — Skia canvas & RAF loop.
* `stores/vaStore.ts` — VirtuAcorns wallet.
* `stores/skillTree.ts` — definitions & selectors; prereq logic.
* `stores/flappyRunStore.ts` — per-run state (optional; can live inside FlappyCanvas state).
* `game/powerups.ts` — types, weights, apply/reset helpers.
* `game/spawn.ts` — obstacle/fruit/power-up generators.
* `assets/flappy/` — obstacle & fruit sprites.

---

## 15) Phase Roadmap (dev order)

**Phase 1 – Core Feel**

1. Scaffold `FlappyScreen` + `FlappyCanvas` with physics loop; draw glider; tap → impulse.
2. Obstacles + collisions; fruit pickups; base scoring.
3. Difficulty ramp (speed/gap); basic juice (particles, hitpause, shake).

**Phase 2 – Rewards & Meta**
4. VA end-of-run calc + wallet store; daily first‑clear bonus.
5. SkillTreeStore with A/B branches (capacity, regen, impulse & auto-lift tuning) and modifiers snapshot.
6. Hook skill modifiers into run start; HUD doses meter & cooldown/regen UI.

**Phase 3 – Variety & Polish**
7. Power-ups system (apply/expire, one active at a time); 3–4 initial types.
8. Flight Logs (achievements) + Best Runs; simple daily/weekly challenges.
9. Audio layers; additional parallax; cosmetic hooks (trails, themed fruit).

**Phase 4 – Expansion (optional)**
10. More obstacle patterns; wind days; leaderboards/ghosts; events.

---

## 16) Art & Audio Notes

* Obstacles: simple silhouettes with rim light; fruit bright & readable; power-ups distinct color coding (blue = dose/regen, green = control, gold = VA/score).
* Glider: small squash on press (scaleY 0.95 for 80ms), blink and emote states.
* SFX: collect, press, power-up, shield break; short music loop with additive layers.

---

## 17) Pseudocode Snippets

**Frame update**

```ts
function update(dt: number) {
  // physics
  const acc = GRAVITY + AUTO_LIFT + currentImpulse(now);
  vy = clamp(vy + acc*dt, -MAX_VY, MAX_VY);
  y += vy*dt;

  // world
  advanceWorld(dt);
  maybeSpawnFruit();
  maybeSpawnPowerUp();

  // regen
  if (regenInterval && dosesNow < dosesMax && now >= regenNextAt) {
    dosesNow++; regenNextAt = now + regenInterval*1000;
  }

  // collisions
  if (hitObstacleOrBounds()) handleCollision();
  for (f of fruits) if (overlap(glider,f)) collectFruit(f);
  const p = powerUpOverlap(); if (p) collectPowerUp(p);

  // scoring
  distanceMeters += (SPEED*dt) * 0.02; // tune factor
  score += distanceDeltaScore + fruitScore + perfectBonus;
}
```

**End run → VA**

```ts
const va = computeVA(run, mods);
vaStore.earn(va);
```

---

## 18) QA Checklist

* [ ] Tap cadence feels responsive across devices (80–120ms cooldown tuning).
* [ ] Hitboxes match visuals; near-miss feels fair.
* [ ] Skill modifiers apply only at run start; power-ups override & cleanly reset.
* [ ] VA caps correctly; daily bonus only once/day.
* [ ] Assist Mode halves VA; labeled clearly.
* [ ] Performance: steady 60fps; particles GC‑friendly (object pools).

---

## 19) Tuning Dials (centralized)

Create a `config.ts` for numbers that live-tune difficulty & rewards:

* Physics: `GRAVITY, AUTO_LIFT, INSULIN_PUSH, IMPULSE_DURATION, MAX_VY`
* World: `SPEED, SPEED_RAMP, GAP_START, GAP_MIN`
* Spawns: fruit density, power-up chance, distance gates
* Economy: run VA cap, daily bonus, fruit VA value
* Skills caps: impulse multiplier max, doseCostMultiplier min, rewardBoost cap

---

## 20) Future Extensions

* Time‑limited modes (Night Flight, Windy Day) rotating daily.
* Mini‑campaigns with fixed modifiers (no insulin, reversed gravity) for unique rewards.
* Friend leaderboards / ghosts; seasonal cosmetics; community goals.

---

**End of spec — ready for implementation.**
