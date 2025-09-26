# Acorn Hunt – Arcade RPG Roguelite (Implementation Brief)

> Handoff target: Claude Code
> Platform: React Native (Expo) + Spine runtime (RN bridge)
> Target session length: 2–5 minutes per run
> Core loop: Auto-battle + player choices on relics and pathing

---

## 1) Scope & Goals

* Build a self-contained **mini game screen**: *Acorn Hunt*.
* Player forms a **party of 3** (Player Glider + 2 NPCs), fights **5–8 nodes** (battles/treasure/events) ending in a boss.
* Battles are **turn-based auto** with **2×/4× speed** options; player agency = **relic choices** and **path selection**.
* Rewards: **Acorns**, occasional **cosmetic shards/frames**, run stats; integrate with existing **progressionStore** to grant currency/XP.

Non-goals (for v1): networked gallery, asynchronous sharing, daily ladders.

---

## 2) Tech & Performance Budget

* **React Native (Expo)**; reuse existing stores where possible (progression, settings).
* **Spine runtime** via RN bridge; budget per scene:

  * Party size: **3 heroes**
  * Enemies: **1–2** (common), **2–3** (elite peak), **1 boss**
  * Typical concurrent skeletons: **5–6** (peak 7–8 with LOD)
* Spine targets (per skeleton):

  * Bones ≤ 50 (hero), ≤ 40 (enemy)
  * Mesh verts ≤ 2k
  * Atlas 512–1024 px (heroes 1k, enemies 512)
  * Tracks ≤ 2 active; crossfade 0.1–0.2s
* **LOD rules**

  * LOD0: normal (all secondaries, hit FX)
  * LOD1 (2×/4× speed): disable secondary loops, reduce particle spawn 50–75%
  * LOD2 (peak 7–8 skeletons): disable secondaries, sprite-based hit FX

---

## 3) Game Flow (High Level)

1. **Enter Acorn Hunt** from Arcade (Juno).
2. **Party Select** (prebaked combos or choose 2 NPCs)
3. **Map Generation**: 5–8 nodes laid out as a small directed graph (start → boss), node types = Battle, Treasure, Event, Boss.
4. **Node Resolve Loop**:

   * If Battle → auto-combat → rewards → relic offer.
   * If Treasure → relic offer (choose 1 of 3).
   * If Event → present choice → outcome (banter, small buff/penalty/Acorns).
5. **Boss** → jackpot reward screen.
6. **Grant rewards** to progression store and exit.

---

## 4) Data Models (TypeScript)

```ts
// Stats and derived values
export type StatKey = "STR" | "SPD" | "MAG" | "DEF" | "LCK";
export type Stats = Record<StatKey, number> & { HP: number; HPMax: number };

export type CharacterId =
  | "player"
  | "sable"
  | "luma"
  | "orvus"
  | "juno"
  | "moss"
  | "carmine"
  | "zippa"; // seasonal

export interface CharacterDef {
  id: CharacterId;
  name: string;
  base: Stats;            // base stats (scaled 1–10, HP 50–80 baseline)
  moves: MoveId[];        // 2 basics + 1 special
  passive?: PassiveId;    // optional unique passive
  spineKey: string;       // atlas/skeleton key
}

export type MoveId =
  | "acorn_toss"         // Sable basic
  | "hatpin_stab"        // Sable crit
  | "shadow_juggle"      // Sable special
  | "sparkle_spit"       // Luma basic
  | "petal_shield"       // Luma support
  | "glow_burst"         // Luma special
  | "wing_slam"          // Orvus basic
  | "blueprint_guard"    // Orvus support
  | "miscalculation"     // Orvus special
  | "token_toss"         // Juno basic
  | "echo_strike"        // Juno speed
  | "squawk_of_glory"    // Juno special
  | "lazy_swipe"         // Moss basic
  | "nap_time"           // Moss quirk
  | "sloth_smash"        // Moss special
  | "dramatic_peck"      // Carmine basic
  | "fashion_pose"       // Carmine support
  | "encore_performance" // Carmine special
  ;

export interface MoveDef {
  id: MoveId;
  kind: "attack" | "support" | "special";
  power?: number;       // base power for attacks
  statScale?: StatKey;  // which stat scales damage or effect
  target: "enemy" | "allEnemies" | "ally" | "allAllies" | "self";
  effect: (ctx: BattleCtx) => void; // applies dmg/buffs, enqueues VFX
  anim: { track: number; name: string; mix?: number };
}

export type PassiveId =
  | "sable_crit_bias"
  | "luma_post_battle_heal"
  | "orvus_guard"
  | "juno_bonus_acorns"
  | "moss_inconsistent"
  | "carmine_fabulous_crit";

export interface RelicDef {
  id: string;
  name: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  description: string;
  requires?: Partial<Stats>; // e.g., { STR: 6 } to activate bonus
  apply: (run: RunState) => void; // mutates modifiers on run/party
  iconKey: string;
}

export type NodeType = "battle" | "treasure" | "event" | "boss";

export interface MapNode {
  id: string;
  type: NodeType;
  next: string[]; // edges forward
}

export interface RunState {
  seed: number;
  party: CharacterId[]; // 3 chars
  relics: string[];     // relic ids
  modifiers: {
    // aggregated numeric modifiers from relics, events, etc.
    damageMult: number;
    critChanceBonus: number;
    dodgeBonus: number;
    healPerTurn: number;
    postBattleHealPct: number;
    acornDropMult: number;
  };
  map: MapNode[];
  nodeIndex: number;    // current node pointer
  rewards: { acorns: number; shards: number };
  speed: 1 | 2 | 4;
}
```

---

## 5) Base Stats (per Character)

*(Scale 1–10; HP baseline 60; tweak after first playtests)*

* **Sable** — STR 5, SPD 7, MAG 3, DEF 4, LCK 8, HP 55 (crit bias)
* **Luma** — STR 3, SPD 6, MAG 9, DEF 4, LCK 5, HP 55 (post-battle heal 5%)
* **Orvus** — STR 7, SPD 3, MAG 4, DEF 9, LCK 2, HP 70 (guard chance)
* **Juno** — STR 6, SPD 8, MAG 4, DEF 3, LCK 6, HP 55 (+10% Acorns per battle)
* **Moss** — STR 9, SPD 1, MAG 5, DEF 6, LCK 3, HP 70 (inconsistent turns)
* **Carmine** — STR 4, SPD 6, MAG 7, DEF 3, LCK 9, HP 50 (party crit aura procs)
* **Player (Glider)** — balanced STR 5, SPD 5, MAG 5, DEF 5, LCK 5, HP 60 (Inspire buff)

---

## 6) Move Definitions (behavior summary)

* **Sable**

  * *Acorn Toss* (attack, STR→enemy): medium damage
  * *Hatpin Stab* (attack, STR→enemy): low dmg, +30% crit chance
  * *Shadow Juggle* (special, STR→allEnemies): small AoE; always crits if LCK ≥ 7
* **Luma**

  * *Sparkle Spit* (attack, MAG→enemy): small dmg + self-heal 2
  * *Petal Shield* (support, ally): +DEF small for 2 turns
  * *Glow Burst* (special, allAllies): heal 8; +2 if MAG ≥ 8
* **Orvus**

  * *Wing Slam* (attack, STR→enemy): medium dmg; 20% stun if SPD diff ≥ 3
  * *Blueprint Guard* (support, allAllies): +DEF for 2 turns
  * *Miscalculation* (special): 70% party buff (+STR/+DEF), 30% silly self-debuff (-SPD 1 turn)
* **Juno**

  * *Token Toss* (attack, STR→enemy): small dmg; 20% +1 Acorn on hit
  * *Echo Strike* (attack, SPD→enemy): can double-hit (30%)
  * *Squawk of Glory* (special, allAllies): +crit chance 20% for 2 turns
* **Moss**

  * *Lazy Swipe* (attack, STR→enemy): big dmg; 70% chance to act
  * *Nap Time* (self): skip; heal 5; next *Sloth Smash* +50% power
  * *Sloth Smash* (special, STR→enemy): huge dmg; +25% per skipped turn
* **Carmine**

  * *Dramatic Peck* (attack, STR→enemy): small dmg; -SPD on enemy (1 turn)
  * *Fashion Pose* (support, ally): +crit 15% for 1 turn (random ally)
  * *Encore Performance* (special, allAllies): +LCK/+SPD small for 2 turns
* **Player (Glider)**

  * *Peck* (attack, STR→enemy): small dmg
  * *Inspire* (support, allAllies): +crit 10% for 1 turn
  * *Gust* (attack, MAG→allEnemies): tiny AoE

---

## 7) Starter Relics (15 + rarity)

**Common** (filler):

* *Acorn Sneakers* — +10% dodge if SPD > 7
* *Acorn Shell Shield* — DEF +2, 10% block chance
* *Four-Leaf Moss* — LCK +2 (Moss quips every fight)
* *Hummingbird Feather* — SPD +2, -10% damage

**Uncommon**:

* *Broken Nutcracker* — STR +2, 10% chance to drop 1 Acorn on hit
* *Runed Acorn* — MAG +3, +1 damage taken per hit
* *Rusty Branch Armor* — DEF +4, SPD -2
* *Orvus’s Sketchbook* — On spell cast: 20% random buff/debuff

**Rare**:

* *Pillow Fort Plans* — Party takes -1 damage per hit if DEF > 6
* *Luma’s Sparkle Ribbon* — Heal 2 HP to all allies each round if MAG > 8
* *Moss’s Hammock Rope* — If user skipped last turn, next attack deals ×2
* *Sable’s Hatpin* — +20% crit damage; +10% extra if STR > 5

**Legendary**:

* *Carmine’s Feather Boa* — Crits grant +1 Acorn and +5% SPD (1 turn) to party
* *Juno’s Lucky Token* — Every 5th round grants an extra turn to a random ally; always triggers in boss fights
* *Perfect Sketchbook* — Orvus’s Sketchbook but never applies debuffs

Relic `apply(run)` wires modifiers on **RunState.modifiers** and/or adds event hooks (onRoundStart, onAttack, onCrit, onPostBattle).

---

## 8) Battle System

### Turn Order

* Initiative each round by **SPD** (ties: player → allies → enemies).

### Damage Formula (simple & fast)

```
base = move.power
scale = attacker.stats[move.statScale] (e.g., STR or MAG)
raw = base + scale * 2
mitigated = max(1, raw - target.DEF)
crit = (rand < (5% + LCK*1.5% + run.modifiers.critChanceBonus)) ? ×1.5 : ×1
final = floor(mitigated * crit * run.modifiers.damageMult)
```

* Apply dodge check first: `rand < 5% + SPD*1% + run.modifiers.dodgeBonus` → miss.
* Apply on-hit hooks (e.g., Juno Acorn bonus, Sable crit effects).

### Status & Buffs

* Represent as short-lived modifiers on combatants `{ stat: StatKey, delta: number, ttl: number }`.
* Cleanup at end of round; decrement ttl.

### Auto-Battle & Speed

* Use a battle loop with a **tick** that advances animation and resolves queued moves.
* Speed 1×/2×/4× by setting a timeScale on the Spine state and shortening delays.
* At >1×, engage LOD1/LOD2 (see §2).

---

## 9) Map Generation

* Directed acyclic small graph: depth 5–8 nodes.
* Node mix (default): 50% Battle, 25% Treasure, 20% Event, 5% Boss (boss fixed at end).
* Ensure at least **2 relic offers** and **1 event** per run.
* Seeded RNG so runs are reproducible for testing (`seedrandom`).

---

## 10) Enemies (v1 templates)

* **Bark Beetle**: low HP, medium SPD, single-target nibble
* **Branch Snake (Elite)**: medium HP, high dmg, occasional stun
* **Sap Slime**: low dmg, applies -SPD goo for 1 turn
* **Boss: Hollow Acorn**: high HP, AoE slam, periodic armor-up

Define as `EnemyDef` with stats, 2 moves, and a special.

---

## 11) Rewards & Economy

* Battles: 15–40 Acorns depending on tier; +bonus if Juno in party.
* Boss: 100–150 Acorns + 1 rare/legendary relic pick.
* Random event choices can grant ±10–30 Acorns or temp stat buffs.
* On run complete → call `progressionStore.grant({ acorns, xp })`.

---

## 12) UI / UX

* **Top bar**: Party portraits (HP bars), speed toggle (1×/2×/4×), quit.
* **Center stage**: Spine scene — heroes left, enemies right.
* **Bottom panel**: Node description; when Treasure/Event → 3-card choice UI.
* **Result screen**: Acorns gained, relics collected, best crit, turns taken.
* **Banter**: One-liners surfaced in a small speech bubble queue (auto-fade).

---

## 13) Integration Points

* **Stores**:

  * `useProgressionStore()` → grant acorns/xp at end.
  * `useSettingsStore()` → read speed default, reduce motion.
* **Navigation**: push/pop *AcornHuntScreen* from Arcade NPC (Juno).
* **Assets**: minimal for v1 (use placeholder rigs if needed).

---

## 14) Pseudocode – Battle Loop (simplified)

```ts
function runBattle(encounter: Encounter, run: RunState) {
  const roster = [...run.partyChars, ...encounter.enemies];
  while (!isOver(roster)) {
    const order = sortBy(roster, r => -r.stats.SPD);
    for (const actor of order) {
      if (actor.HP <= 0) continue;
      const move = chooseMove(actor); // simple AI: special on cooldown, else best basic
      queueAnimation(actor, move.anim);
      resolveEffect(move, actor, pickTarget(move));
      applyRelicHooks(run, actor, move);
      if (isOver(roster)) break;
    }
    tickStatuses(roster); // decrement TTLs
    onRoundEnd(run);      // e.g., Sparkle Ribbon heals
  }
  return summarizeBattle(roster);
}
```

---

## 15) Milestones & Tasks

**M1 – Core Loop (Map & Battles)**

* [ ] Map generator (seeded)
* [ ] Basic enemy templates
* [ ] Battle loop (turn order, damage, buffs, deaths)
* [ ] Speed toggle + LOD hooks

**M2 – Content & Relics**

* [ ] Implement 15 relics + rarity tables
* [ ] Implement 3–4 events with choices & banter
* [ ] Boss encounter + jackpot flow

**M3 – Spine Integration & UI**

* [ ] Wire 3 hero rigs + 2 enemy rigs; idle/attack/hit/death tracks
* [ ] Scene layout; health bars; speech bubbles
* [ ] Result screen & grant to progression store

**M4 – Polish & QA**

* [ ] Balance pass (damage numbers, rewards pacing)
* [ ] Crash/GC profiling; pool enemy rigs; texture atlas audit
* [ ] Accessibility: Reduce Motion, readable text, color contrast

---

## 16) Test Plan

* Unit-test damage formula & crit/dodge math (seeded RNG)
* Snapshot-test relic application (modifiers aggregation)
* UI smoke tests: treasure choice cards, speed toggle
* Performance: 60fps on mid devices; peak scenes with LOD2 hold ≥ 50fps

---

## 17) Nice-to-Haves (Post-v1)

* Party drafting UI (synergy hints)
* More node types (Shop, Shrine, Elite-only paths)
* Daily modifiers (seed-of-the-day, bounty goals)
* Run summaries shared to Gallery (Carmine tie-in)

---

## 18) Acceptance Criteria (v1)

* Player can complete a **full run in ≤5 min** at 1×, ≤3 min at 2×.
* At least **2 Treasure offers** and **1 Event** per run.
* **3 heroes vs 2 enemies** runs at 60fps on mid device; boss scene stable.
* Rewards grant to progression store; exit cleanly back to Arcade.
