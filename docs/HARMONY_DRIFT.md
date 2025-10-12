Harmony Drift – Implementation Plan (Hand‑off to Codex)

Mini-game for GliderMon. Goal: ship a cozy, turn-based card duel themed around balance and flow. Tech: React Native + Skia for render, Zustand for state, optional Spine/sprite portraits. This doc defines scope, files, contracts, visuals, and acceptance criteria.

🌙 Theme Overview

Harmony Drift is a gentle card-based duel where players and NPCs guide the world toward equilibrium. The experience should feel calm, tactile, and organic — not competitive. Every action should feel like nudging balance back into place.

Tone keywords: serene • rhythmic • mindful • satisfying • natural

Tagline: “Find your flow, steady the tide.”

Lore blurb:

“A calm duel of rhythm and reason — guide your cards into balance and let the world drift back to harmony.”

0) High-Level Scope & Milestones

M0 – Scaffolding (½–1 day)

Create folder structure, shared types, deterministic RNG, and mocks.

Integrate screen into app nav; add dev flag to enable/disable mini-game.

M1 – Core Rules & State (1–2 days)

Implement board, hand, turns, scoring per GDD.

Unit tests for rules and edge cases.

M2 – Skia UI & Input (2–3 days)

Render board, cards, hand; tap & drag-to-place; flip animations; harmony meter tween.

M3 – NPC AI (1–2 days)

Implement EASY/NORMAL tiers (single-ply + depth-2 beam). Time-capped.

M4 – Juice & UX (1–2 days)

Portrait emotes, harmony/swing feedback, haptics, result overlay.

M5 – Integration & Rewards (½–1 day)

Hook into progression store (Acorns), daily challenge, analytics events, i18n pass.

M6 – QA & Accessibility (½–1 day)

A11y audit, touch target checks, performance, device matrix, regression tests.

1) File Structure

src/
  game/harmony-drift/
    engine/
      CardTypes.ts
      CardData.ts
      Rules.ts
      TurnFlow.ts
      RNG.ts
      Utils.ts
    ai/
      Personas.ts
      Evaluator.ts
      Search.ts
      AI.ts
    state/
      types.ts
      store.ts
      selectors.ts
    ui/
      HarmonyDriftCanvas.tsx
      CardSprite.tsx
      HarmonyMeter.tsx
      Portrait.tsx
      SFX.ts
    screens/
      HarmonyDriftScreen.tsx
    i18n/
      en.json
  stores/
    progressionStore.ts

2) Visual & Aesthetic Guide

🎨 Palette

Primary: Sage green (#9BBE9C)

Accent: Amber gold (#F1C27D)

Cool contrast: Lavender mist (#C7C6E6)

Neutral background: Parchment beige (#F5F1E9)

Shadow: Deep moss (#344B40)

🪶 Style

Soft shadows, rounded corners, tactile depth.

Paper texture backdrop with gentle vignette.

Harmony pulses and energy flows shown as soft light ripples.

Card edges slightly curved with warm highlights.

✨ UI Naming

“Balance meter” → Harmony Bar.

“Acorn Balance” text → Harmony Drift in all headers, analytics, and localization keys.

Round results:

Win: “You found your flow!”

Draw: “Perfect equilibrium.”

Loss: “Out of tune — but still learning.”

🐿️ NPC Presentation

NPC

Color

Mood

Visual Hook

Sable

Moonlit gray-violet

Calm/Rest

Gentle glow overlay on Harmony Bar.

Luma

Bright lime-gold

Energy

Slight sparkle trails when she plays.

Orvus

Deep blue-gray

Anchor/Calm

Subtle particle ring expanding outward when AI plays.

3) Data Model & Contracts

(unchanged from Acorn Balance but with Harmony Drift naming)

Refer to types: CardType, GameState, AI.ts signatures remain identical.

All function and file references should use harmony drift naming conventions.

4) Turn Flow (State Machine)

Same structure as Acorn Balance with renamed UI events:

METER_TWEEN → HARMONY_TWEEN

RESULT outcome overlay uses new flavor text and visuals.

5) Skia UI Plan (Harmony Drift)

Canvas Composition

Background: parchment texture + lavender vignette.

Board: 5 slots in a flowing curve (slight arc) instead of straight line — emphasizes drift.

Cards (Hand): centered with soft shadow and floating hover.

Harmony Bar: vertical bar at right; soft gradient from cool (low) → warm (high) → calm green center (0).

Portrait: NPC portrait top-left; subtle breathing animation.

Animations

Pick: scale pulse (1 → 1.06) + faint glow.

Place: ease-out curve; card floats for 80ms before snapping in.

Harmony: soft white-green ripple outward.

Swing: low-frequency wobble + lavender tint flash.

Harmony Bar: smooth drift animation with elastic ease.

Result: ambient particle swirl matching outcome color (green=flow, gold=draw, blue=learn).

6) AI, Rules, and Integration

All logic from Acorn Balance remains valid.
Update naming (functions, constants, analytics) to Harmony Drift.
Analytics prefix: hd_start, hd_play, hd_result, hd_duration, hd_harmony_count.

7) Acceptance Criteria (Updated Feel)



8) Deliverable Summary

Goal: functional, performant, and visually aligned mini-game called Harmony Drift that feels meditative and rewarding, reflecting GliderMon’s theme of balance and mindfulness.


🌿 Game Design Document – Acorn Balance
1️⃣ Overview

A short, turn-based card mini-game set in the GliderMon world.
Players compete against NPCs to maintain blood sugar balance, not domination.
The theme mirrors the player’s real-life glucose management and emotional regulation — keeping things in range.

2️⃣ Design Pillars
Pillar	Description
🧘 Balance, not battle	Winning is about ending closest to equilibrium (0) rather than defeating the opponent.
💚 Cozy over competitive	Soft sound effects, warm palette, no penalties, always rewarding.
🌰 Short, satisfying sessions	Each match lasts ~2 minutes, perfect for breaks between main gameplay loops.
🪶 Meta integration	Uses Acorns, NPC friendships, and card collection to connect to the GliderMon economy.
3️⃣ Core Gameplay Loop
3.1 Match Flow

Draw Phase

Each player draws 5 random cards from their deck.

Board is empty (5 slots in a single “balance line”).

Play Phase

Players alternate turns placing one card per slot.

Cards have Value (–3 → +3) and Type (Energy, Calm, Rest, Nourish, Anchor).

Once all slots are filled, round ends.

Resolution Phase

Sum all card values.

Apply synergy modifiers:

+1 for each matching adjacent type (Harmony Bonus).

–1 for each opposed type (Swing Penalty).

Result = TotalValue + Modifiers.

Compare absolute distance from 0 (target range).

Player with lower absolute value wins.

Ties are friendly draws.

Reward Phase

Both players earn Acorns. Winner earns slightly more.

Optional: draw a new random card if player’s total deck < limit.

NPC gives dialogue line reacting to outcome.

4️⃣ Board & UI Layout
Element	Description
Grid	Horizontal line of 5 card slots (centered).
Player Hand	5 visible cards at bottom (Skia sprites or UI cards).
NPC Hand	Hidden (AI picks logically).
Balance Meter	Horizontal gauge showing total from –10 (too low) → 0 (in range) → +10 (too high).
Feedback	Gentle pulse animation when total crosses into/out of range.
End State	Win/Loss/Draw overlay with “Harmony Achieved!” or “Out of Range” flavor text.
5️⃣ Card System
5.1 Base Card Properties
type Card = {
  id: string;
  name: string;
  type: "Energy" | "Calm" | "Rest" | "Nourish" | "Anchor";
  value: number;        // –3 to +3
  rarity: "common" | "rare" | "epic";
  flavor: string;
  affinity?: "Friend" | "Snack" | "Activity" | "Emotion";
  artAsset: string;     // path to PNG
};

5.2 Synergy Table
Relation	Effect
Same type adjacency	+1 Harmony
Opposed types (Energy↔Rest, Calm↔Nourish)	–1 Swing
Anchor cards	Reduce total magnitude by 1 (soft dampening)
5.3 Elements Cycle

Energy ☀️ > Calm 🌊 > Rest 🌙 > Nourish 🌿 > Energy ☀️

6️⃣ Example Decks
Player Starter Deck
Name	Type	Value	Notes
Apple Slice	Nourish	+1	Beginner card
Morning Jog	Calm	–2	Common
Cozy Blanket	Rest	–1	Common
Mushroom Tea	Rest	–1	Common
Stress Spike	Energy	+2	Common
Breakfast Bolus	Anchor	–3	Rare
VirtuFruit Smoothie	Nourish	+2	Common
Meditation	Rest	–1	Common
Perfect Range	Anchor	0	Epic
In-Range Glide	Anchor	0	Common
NPC Decks

Sable (Emo Squirrel)
Prefers Rest 🌙 and Calm 🌊 cards. Slightly defensive play style.
Luma (Tree Frog Influencer)
Prefers Energy ☀️ cards; riskier, positive bias.
Orvus (Owl Scholar)
Prefers Calm 🌊 and Anchors; balanced and precise.

7️⃣ Scoring Algorithm
function calculateBalance(board: Card[]): number {
  let total = board.reduce((sum, c) => sum + c.value, 0);
  let modifier = 0;

  for (let i = 0; i < board.length - 1; i++) {
    const a = board[i], b = board[i + 1];
    if (a.type === b.type) modifier += 1;               // Harmony
    else if (isOpposed(a.type, b.type)) modifier -= 1;  // Swing
  }

  // Anchors soften total
  const anchors = board.filter(c => c.type === "Anchor").length;
  total = total - Math.sign(total) * anchors;

  return total + modifier;
}

function isOpposed(a: Card["type"], b: Card["type"]) {
  return (a === "Energy" && b === "Rest") || (a === "Rest" && b === "Energy") ||
         (a === "Calm" && b === "Nourish") || (a === "Nourish" && b === "Calm");
}


Winner = player with |total| closer to 0.

8️⃣ Reward System
Outcome	Reward	Flavor
Win	+100 Acorns + 1 random card (10 % rare chance)	“You kept things perfectly balanced.”
Draw	+50 Acorns	“Evenly matched! Harmony shared.”
Loss	+30 Acorns	“You learned something new about balance.”

Optional: Friendship XP for NPC deck used.

9️⃣ Progression & Meta Integration

Unlock new cards via:

Daily “in-range” streaks (based on real/simulated glucose data)

Shop purchases using Acorns

NPC friendship milestones

Card upgrades (visual only) available via cosmetic shop.

Weekly leaderboard (friendly, non-competitive): “Most Harmonious Rounds” stat.

🔟 Technical Implementation Plan
Layer	Description
Frontend (React Native / Skia)	Render board, card sprites, animations, balance meter.
Logic Module (TS)	Card definitions, AI logic, scoring function.
AI Module	Simple heuristic: chooses card minimizing projected
State Store	Use Zustand or Jotai (consistent with your existing stores) for deck, rewards, etc.
Save Data	Cards stored in cosmeticsStore or new cardsStore.
Art Assets	Card frames 64×96, themed textures (wood, parchment, leaf).

🧠 Optional Future Features
Idea	Description
“Overnight Drift” Mode	Auto-simulates a slow card shift after match — adds replay hooks.
2-round Gwent-style play	Add a stamina mechanic (you decide when to stop).
Seasonal Events	Limited “Harvest Decks” or “Bloom Festival” expansions.
PvP Ghost Mode	Play against other users’ saved decks asynchronously.

🧠 NPC AI — Logic Flow
0) Core concepts the AI evaluates

On its turn, the AI must choose (card, slot) from:

hand: up to 5 cards

slots: any empty of the 5 board positions

It scores each hypothetical placement with an evaluation function and picks according to difficulty.

Evaluation function (single ply)

For candidate (card c, slot s):

score =  - wBalance * |balanceAfter(c @ s)|            // closer to 0 is better
         + wHarmony * harmonyDelta(c @ s)              // +1 per new same-type adjacency, -1 per opposed
         + wAnchor   * anchorEffect(c @ s)             // how much anchors dampen |total|
         + wDisrupt  * oppPotentialReduction(c @ s)    // reduces opponent’s best reply potential
         + wFlex     * handFlexibilityAfter(c)         // preserve diverse types/values in hand
         + wSetups   * futureSynergySetup(c @ s)       // creates future same-type adjacency


balanceAfter(...) uses your existing scoring logic.

harmonyDelta is net change in adjacency bonuses/penalties newly created.

anchorEffect = (|totalBefore| - |totalAfter|) if c.type === "Anchor", else 0.

oppPotentialReduction = (opponent best one-ply improvement before − after you play).

handFlexibilityAfter rewards keeping at least one low/neutral/high value and multiple types.

futureSynergySetup rewards placing a type next to empty slots where you hold same-type cards.

Tune weights per difficulty (see §3).

1) Turn State Machine (per AI move)
AI_TURN:
  A) Gather state
     - board: Card?[] length 5
     - hand: Card[] (AI’s hand)
     - meta: difficulty, RNG seed, time budget

  B) Generate candidates
     - For each empty slot s:
         For each card c in hand:
           candidates.push({card:c, slot:s})

  C) Score candidates
     if difficulty == EASY:
       use heuristicScore (single ply, low weights)
     else if difficulty == NORMAL:
       heuristicScore + mild lookahead (depth 2 beam)
     else if difficulty == SMART:
       heuristicScore + depth 2–3 with pruning + opponent model
     else if difficulty == EXPERT:
       iterative deepening with time cap (e.g., 8–12 ms), transposition cache

  D) Tie-breaking & personality
     - Add tiny deterministic noise (seeded by matchId + turn) for variety
     - Apply NPC persona bias (e.g., Sable boosts Rest/Calm placements; Luma boosts Energy)

  E) Commit move
     - Remove card from hand
     - Place on slot
     - Trigger UI animations & SFX
     - End turn


Time budget: keep the AI snappy. Cap evaluation to ~8–12 ms on mobile. If time runs out mid-search, return best-so-far.

2) Opponent model (for lookahead)

A lightweight opponent model for depth-2:

Assume the opponent chooses the min |balance| move from their hand (greedy).

If ties, assume opponent prefers moves that undo your last harmony or create opposed adjacency next to your placement.

This is enough to produce credible counterplay without heavy computation.

3) Difficulty tiers (weights, search, randomness)
Tier	Search	Weights (typical)	Randomness	Notes
EASY	1-ply only	wBalance=1.0, wHarmony=0.3, wAnchor=0.4, wDisrupt=0.0, wFlex=0.2, wSetups=0.2	High (±5%)	Plays “reasonable but beatable”; sometimes sub-optimal
NORMAL	Depth-2 beam (top K=6)	1.2,0.4,0.6,0.2,0.3,0.3	Medium (±2%)	Looks ahead one opponent reply
SMART	Depth-3 with pruning (beam K=5 each ply)	1.5,0.5,0.8,0.4,0.4,0.4	Low (±1%)	Starts to block opponent synergies
EXPERT	Iterative deepening to depth-3/4 under time cap	1.8,0.6,1.0,0.6,0.5,0.5	None	Feels intentional; still cozy (no perfect play)

Persona biases (multiply final score by (1 + bias) if card type matches NPC):

Sable (Rest/Calm): +5% to placements creating negative drift or harmony with Rest/Calm.

Luma (Energy): +5% to positive drift & Energy synergies.

Orvus (Calm/Anchor): +7% to Anchor efficiency and balance proximity.

4) Slot selection vs. card selection

Evaluate both simultaneously (full Cartesian), but you can prune:

If placing c anywhere yields identical balanceAfter and harmonyDelta, prefer slots that:

Keep future adjacencies open (empty neighbors),

Avoid creating an opposed edge unless it wins now,

Match persona preference (e.g., corner or center aesthetics if you want style rules).

5) Heuristics & helpers (TypeScript-style)
type CardType = "Energy" | "Calm" | "Rest" | "Nourish" | "Anchor";

function evalCandidate(state: GameState, c: Card, s: number, weights: Weights): number {
  const before = state.board;
  const after = place(before, c, s);

  const balBefore = calculateBalance(before);
  const balAfter  = calculateBalance(after);

  const w = weights;

  const balanceTerm = -w.balance * Math.abs(balAfter);

  const harmonyTerm = w.harmony * adjHarmonyDelta(before, after, s);
  const anchorTerm  = (c.type === "Anchor")
    ? w.anchor * (Math.abs(balBefore) - Math.abs(balAfter))
    : 0;

  const oppTerm = w.disrupt * projectedOpponentGain(before, after, state.oppHand);

  const flexTerm = w.flex * handFlexibilityScore(state.myHand.filter(h => h.id !== c.id));
  const setupTerm = w.setups * futureSynergySetupScore(after, state.myHand.filter(h => h.id !== c.id));

  return balanceTerm + harmonyTerm + anchorTerm + oppTerm + flexTerm + setupTerm;
}

function adjHarmonyDelta(before: Board, after: Board, s: number): number {
  // compare neighbors of s (s-1, s+1) before/after
  // +1 if same type adjacency created, -1 if opposed created, 0 otherwise
  // sum both sides
  // Use your isOpposed() helper from the GDD
  return delta;
}

function projectedOpponentGain(before: Board, after: Board, oppHand: Card[]): number {
  // One-ply estimate: best improvement opponent can make in |balance|
  // (|balanceAfterOurMove| - min |balanceAfterOppMove|)
  let base = Math.abs(calculateBalance(after));
  let best = Infinity;
  for (const slot of emptySlots(after)) {
    for (const oc of oppHand) {
      const next = place(after, oc, slot);
      best = Math.min(best, Math.abs(calculateBalance(next)));
    }
  }
  return base - best; // larger is better for us (we reduced their best potential)
}

function handFlexibilityScore(hand: Card[]): number {
  // Reward diversity in types and presence of at least one neutral/anchor/low magnitude card
  const types = new Set(hand.map(h => h.type));
  const hasNeutral = hand.some(h => Math.abs(h.value) <= 1 || h.type === "Anchor");
  return types.size * 0.5 + (hasNeutral ? 0.5 : 0);
}

function futureSynergySetupScore(board: Board, hand: Card[]): number {
  // For each empty slot, check neighbors’ types and count how many hand cards could match for +1 later
  let setups = 0;
  for (const s of emptySlots(board)) {
    const neighborTypes = neighborTypesAt(board, s);
    for (const t of neighborTypes) {
      if (hand.some(c => c.type === t)) setups += 0.5;
    }
  }
  return setups; // small positive nudge
}

6) Search strategies
Beam search (good default)

Generate candidates; keep top K by heuristic (e.g., 6).

Simulate opponent reply via opponent model (top K again).

Optionally continue to depth-3 if time allows.

Iterative deepening with time cap

Depth = 1 → 2 → 3… until time budget hit.

Keep best action from the deepest completed iteration.

Randomization

Add tiny deterministic jitter to scores:

score *= (1 + jitter(seed, c.id, s) * jitterAmplitude);


jitterAmplitude: Easy 0.05, Normal 0.02, Smart 0.01, Expert 0.0.

7) Error handling & fallbacks

If evaluation throws or exceeds budget, fallback to:

Place Anchor in the most central empty slot, else

Place card that minimizes |balanceAfter|, else

First legal move (never stall).

8) Player “Hint” system (optional)

Reuse the same evaluator with player hand to suggest:

Best move (highest score)

Safe move (within X% of best, prioritizes harmony over disruption)
Tie into accessibility: “Suggest a move” button highlights slot glow + card pulse.

9) Integration notes

Keep AI in /mini/AcornBalance/ai.ts.

Configurable weights per NPC/persona in /mini/AcornBalance/npcProfiles.ts.

Seed RNG per match: seed = hash(matchId + npcId).

Expose a single async:

export async function chooseAIMove(state: GameState, persona: Persona, difficulty: Difficulty, timeMs=10): Promise<{cardId:string, slot:number}>


Use your existing Zustand store to:

Read board, aiHand, playerHand

Dispatch placeCard(cardId, slot) action

Trigger Skia animations (flip, pulse, meter tween)

10) Tuning checklist

Start with NORMAL weights and K=6 beam; profile on device.

Ensure anchors feel meaningful (increase wAnchor if not).

Keep disruption weights moderate—this is cozy, not cutthroat.

Use persona multipliers sparingly (+3–7%) to keep flavor without breaking fairness.