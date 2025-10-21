// Battle system for Acorn Hunt
import {
  BattleContext,
  BattleAction,
  Combatant,
  StatusEffect,
  RunState,
  MoveDef,
  Stats,
  StatKey
} from './types';
import { SeededRNG } from './rng';
import { ENEMY_MOVES } from './enemies';
import { PLAYER_MOVES } from './moves';

export interface BattleResult {
  victory: boolean;
  survivors: Combatant[];
  actions: BattleAction[];
  acornsEarned: number;
  virtuAcornsEarned: number;
  experience: number;
}

export interface BattleAnimationCallbacks {
  onActionStart?: (action: BattleAction) => void;
  onTurnDelay?: () => Promise<void>;
  onStateUpdate?: () => void;
  onActionAnimationComplete?: (actionId: string) => void;
  waitForActionAnimation?: (actionId: string) => Promise<void>;
}

export class BattleEngine {
  private rng: SeededRNG;
  private combatants: Combatant[];
  private battleLog: BattleAction[];
  private round: number;
  private run: RunState;

  constructor(run: RunState, allies: Combatant[], enemies: Combatant[]) {
    this.rng = new SeededRNG(run.seed + Date.now());
    this.combatants = [...allies, ...enemies];
    this.battleLog = [];
    this.round = 0;
    this.run = run;
  }

  // Animated battle loop with callbacks for UI feedback
  async runBattleWithAnimations(callbacks?: BattleAnimationCallbacks): Promise<BattleResult> {
    console.log("🏁 BATTLE STARTING WITH ANIMATIONS");
    console.log("👥 Allies:", this.combatants.filter(c => !c.isEnemy).map(c => `${c.character.name} (${c.stats.HP}/${c.stats.HPMax} HP)`));
    console.log("👹 Enemies:", this.combatants.filter(c => c.isEnemy).map(c => `${c.character.name} (${c.stats.HP}/${c.stats.HPMax} HP)`));

    this.battleLog.push({
      type: "special",
      source: "system",
      target: [],
      value: 0,
      message: "Battle begins!"
    });

    while (!this.isBattleOver()) {
      this.round++;
      console.log(`\n⚔️ === ROUND ${this.round} ===`);
      this.battleLog.push({
        type: "special",
        source: "system",
        target: [],
        value: 0,
        message: `--- Round ${this.round} ---`
      });

      await this.processAnimatedRound(callbacks);
      this.processStatusEffects();
      this.processRoundEndEffects();

      // Update UI after each round
      if (callbacks?.onStateUpdate) {
        callbacks.onStateUpdate();
      }

      // Log round summary
      console.log("📊 Round Summary:");
      console.log("   Allies:", this.combatants.filter(c => !c.isEnemy && c.stats.HP > 0).map(c => `${c.character.name} (${c.stats.HP}/${c.stats.HPMax})`));
      console.log("   Enemies:", this.combatants.filter(c => c.isEnemy && c.stats.HP > 0).map(c => `${c.character.name} (${c.stats.HP}/${c.stats.HPMax})`));
    }

    const result = this.generateResult();
    console.log(`\n🏆 BATTLE ENDED: ${result.victory ? 'VICTORY!' : 'DEFEAT!'}`);
    console.log("💰 Rewards:", result.acornsEarned, "acorns");

    return result;
  }

  // Main battle loop (original method)
  async runBattle(): Promise<BattleResult> {
    console.log("🏁 BATTLE STARTING");
    console.log("👥 Allies:", this.combatants.filter(c => !c.isEnemy).map(c => `${c.character.name} (${c.stats.HP}/${c.stats.HPMax} HP)`));
    console.log("👹 Enemies:", this.combatants.filter(c => c.isEnemy).map(c => `${c.character.name} (${c.stats.HP}/${c.stats.HPMax} HP)`));

    this.battleLog.push({
      type: "special",
      source: "system",
      target: [],
      value: 0,
      message: "Battle begins!"
    });

    while (!this.isBattleOver()) {
      this.round++;
      console.log(`\n⚔️ === ROUND ${this.round} ===`);
      this.battleLog.push({
        type: "special",
        source: "system",
        target: [],
        value: 0,
        message: `--- Round ${this.round} ---`
      });

      await this.processRound();
      this.processStatusEffects();
      this.processRoundEndEffects();

      // Log round summary
      console.log("📊 Round Summary:");
      console.log("   Allies:", this.combatants.filter(c => !c.isEnemy && c.stats.HP > 0).map(c => `${c.character.name} (${c.stats.HP}/${c.stats.HPMax})`));
      console.log("   Enemies:", this.combatants.filter(c => c.isEnemy && c.stats.HP > 0).map(c => `${c.character.name} (${c.stats.HP}/${c.stats.HPMax})`));
    }

    const result = this.generateResult();
    console.log(`\n🏆 BATTLE ENDED: ${result.victory ? 'VICTORY!' : 'DEFEAT!'}`);
    console.log("💰 Rewards:", result.acornsEarned, "acorns");

    return result;
  }

  private async processAnimatedRound(callbacks?: BattleAnimationCallbacks): Promise<void> {
    // Determine turn order by SPD (ties: player -> allies -> enemies)
    const turnOrder = this.getTurnOrder();
    console.log(`📋 Turn order:`, turnOrder.map(c => `${c.character.name} (SPD:${c.stats.SPD})`));

    for (const combatant of turnOrder) {
      if (combatant.stats.HP <= 0) continue;
      if (this.isBattleOver()) break;

      await this.processAnimatedCombatantTurn(combatant, callbacks);

      // Add short delay between turns for visual feedback (reduced since we wait for animations)
      if (callbacks?.onTurnDelay) {
        await callbacks.onTurnDelay();
      }
    }
  }

  private async processRound(): Promise<void> {
    // Determine turn order by SPD (ties: player -> allies -> enemies)
    const turnOrder = this.getTurnOrder();
    console.log(`📋 Turn order:`, turnOrder.map(c => `${c.character.name} (SPD:${c.stats.SPD})`));

    for (const combatant of turnOrder) {
      if (combatant.stats.HP <= 0) continue;
      if (this.isBattleOver()) break;

      await this.processCombatantTurn(combatant);
    }
  }

  private getTurnOrder(): Combatant[] {
    return [...this.combatants]
      .filter(c => c.stats.HP > 0)
      .sort((a, b) => {
        // Primary sort: SPD (higher first)
        if (b.stats.SPD !== a.stats.SPD) {
          return b.stats.SPD - a.stats.SPD;
        }

        // Tie-breaker: player -> allies -> enemies
        if (!a.isEnemy && b.isEnemy) return -1;
        if (a.isEnemy && !b.isEnemy) return 1;

        // Same type, maintain order
        return 0;
      });
  }

  private async processAnimatedCombatantTurn(combatant: Combatant, callbacks?: BattleAnimationCallbacks): Promise<void> {
    console.log(`\n🎯 ${combatant.character.name}'s turn (${combatant.isEnemy ? 'Enemy' : 'Ally'})`);

    // Check for status effects that prevent action
    const stunned = combatant.statusEffects.some(effect =>
      effect.id === "stun" || effect.id === "sleep"
    );

    if (stunned) {
      console.log(`   💫 ${combatant.character.name} is stunned and cannot act`);
      this.battleLog.push({
        type: "special",
        source: combatant.id,
        target: [],
        value: 0,
        message: `${combatant.character.name} is unable to act!`
      });
      return;
    }

    // Choose move (AI for enemies, player/allies use simple logic for now)
    const move = this.chooseMove(combatant);
    if (!move) {
      console.log(`   ❌ ${combatant.character.name} has no available moves`);
      return;
    }

    // Check if combatant can use attacks (fortress mode prevents attacking)
    const fortressEffect = combatant.statusEffects.find(effect => effect.id === "fortress");
    if (fortressEffect && fortressEffect.preventAttack && move.kind === "attack") {
      console.log(`   🛡️ ${combatant.character.name} cannot attack while in fortress mode! Skipping turn.`);
      return;
    }

    console.log(`   🗡️ Using move: ${move.name} (Power: ${move.power})`);

    // Execute move
    const targets = this.selectTargets(combatant, move);
    console.log(`   🎯 Targeting:`, targets.map(t => t.character.name));

    const context: BattleContext = {
      combatants: this.combatants,
      actions: [{ // Add a temporary action to help moves find the source
        type: "special",
        source: combatant.id,
        target: [],
        value: 0,
        message: "temp"
      }],
      round: this.round,
      run: this.run,
      rng: () => this.rng.next()
    };

    // Get move effects
    const actions = move.effect(context);

    // Process each action with animation callbacks
    for (const action of actions) {
      // Fill in missing action details
      action.source = combatant.id;
      if (action.target.length === 0) {
        action.target = targets.map(t => t.id);
      }

      console.log(`   💥 Processing ${action.type} action: ${action.message}`);

      // Trigger animation before processing action
      if (callbacks?.onActionStart) {
        callbacks.onActionStart(action);
      }

      // Wait for animation to complete if callback is provided
      if (callbacks?.waitForActionAnimation) {
        console.log(`   ⏳ Waiting for animation completion for action ${action.source}`);
        await callbacks.waitForActionAnimation(action.source);
        console.log(`   ✅ Animation completed for action ${action.source}`);
      }

      this.processAction(action, combatant, move);
    }

    combatant.lastAction = move.name;
  }

  private async processCombatantTurn(combatant: Combatant): Promise<void> {
    console.log(`\n🎯 ${combatant.character.name}'s turn (${combatant.isEnemy ? 'Enemy' : 'Ally'})`);

    // Check for status effects that prevent action
    const stunned = combatant.statusEffects.some(effect =>
      effect.id === "stun" || effect.id === "sleep"
    );

    if (stunned) {
      console.log(`   💫 ${combatant.character.name} is stunned and cannot act`);
      this.battleLog.push({
        type: "special",
        source: combatant.id,
        target: [],
        value: 0,
        message: `${combatant.character.name} is unable to act!`
      });
      return;
    }

    // Choose move (AI for enemies, player/allies use simple logic for now)
    const move = this.chooseMove(combatant);
    if (!move) {
      console.log(`   ❌ ${combatant.character.name} has no available moves`);
      return;
    }

    // Check if combatant can use attacks (fortress mode prevents attacking)
    const fortressEffect = combatant.statusEffects.find(effect => effect.id === "fortress");
    if (fortressEffect && fortressEffect.preventAttack && move.kind === "attack") {
      console.log(`   🛡️ ${combatant.character.name} cannot attack while in fortress mode! Skipping turn.`);
      return;
    }

    console.log(`   🗡️ Using move: ${move.name} (Power: ${move.power})`);

    // Execute move
    const targets = this.selectTargets(combatant, move);
    console.log(`   🎯 Targeting:`, targets.map(t => t.character.name));

    const context: BattleContext = {
      combatants: this.combatants,
      actions: [{ // Add a temporary action to help moves find the source
        type: "special",
        source: combatant.id,
        target: [],
        value: 0,
        message: "temp"
      }],
      round: this.round,
      run: this.run,
      rng: () => this.rng.next()
    };

    // Get move effects
    const actions = move.effect(context);

    // Process each action
    for (const action of actions) {
      // Fill in missing action details
      action.source = combatant.id;
      if (action.target.length === 0) {
        action.target = targets.map(t => t.id);
      }

      console.log(`   💥 Processing ${action.type} action: ${action.message}`);
      this.processAction(action, combatant, move);
    }

    combatant.lastAction = move.name;
  }

  private chooseMove(combatant: Combatant): MoveDef | null {
    const moves = combatant.character.moves;
    if (moves.length === 0) return null;

    const hpPercent = combatant.stats.HP / combatant.stats.HPMax;
    const currentEnemies = this.combatants.filter(c => c.isEnemy && c.stats.HP > 0).length;

    // === ROLE-BASED AI FOR PLAYER CHARACTERS ===
    if (!combatant.isEnemy) {
      return this.choosePlayerMove(combatant, hpPercent);
    }

    // === ENHANCED AI FOR EACH ENEMY TYPE ===

    // Bark Beetle AI - Swarm tactics
    if (combatant.character.name === "Bark Beetle" || combatant.character.name === "Swarming Beetle") {
      // Use swarm call when weakened and outnumbered (only main beetles)
      if (combatant.character.name === "Bark Beetle" && hpPercent < 0.75 && currentEnemies <= 2 && moves.includes("swarm_call") && this.rng.next() < 0.6) {
        console.log(`   🧠 AI: Bark Beetle calling for backup at ${Math.round(hpPercent * 100)}% HP`);
        return this.getMoveDef("swarm_call");
      }

      // Use scurry when low HP for speed boost
      if (hpPercent < 0.4 && moves.includes("scurry") && this.rng.next() < 0.7) {
        console.log(`   🧠 AI: Beetle using speed boost at ${Math.round(hpPercent * 100)}% HP`);
        return this.getMoveDef("scurry");
      }

      return this.getMoveDef("nibble");
    }

    // Branch Snake AI - Tactical and adaptive
    if (combatant.character.name === "Branch Snake") {
      // Use ambush strike on first turns when at high HP
      if (this.round <= 2 && hpPercent > 0.9 && moves.includes("ambush_strike") && this.rng.next() < 0.8) {
        console.log(`   🧠 AI: Branch Snake using ambush strike (Round ${this.round})`);
        return this.getMoveDef("ambush_strike");
      }

      // Use coil defense when damaged and not already coiled
      const hasCoiledBuff = combatant.statusEffects.some(effect => effect.id === "coiled");
      if (hpPercent < 0.6 && !hasCoiledBuff && moves.includes("coil_defense") && this.rng.next() < 0.7) {
        console.log(`   🧠 AI: Branch Snake coiling defensively at ${Math.round(hpPercent * 100)}% HP`);
        return this.getMoveDef("coil_defense");
      }

      // Use venom spit for debuff chance
      if (moves.includes("venom_spit") && this.rng.next() < 0.4) {
        return this.getMoveDef("venom_spit");
      }

      return this.getMoveDef("constrict");
    }

    // Sap Slime AI - Defensive and splitting
    if (combatant.character.name === "Sap Slime" || combatant.character.name.includes("Small Slime")) {
      // Always try to split when at 25% HP or below (main slime only)
      if (combatant.character.name === "Sap Slime" && hpPercent <= 0.25 && moves.includes("split")) {
        console.log(`   🧠 AI: Sap Slime attempting to split at ${Math.round(hpPercent * 100)}% HP`);
        return this.getMoveDef("split");
      }

      // When below 50% HP, favor healing over attacking
      if (hpPercent <= 0.5 && moves.includes("blob") && this.rng.next() < 0.7) {
        console.log(`   🧠 AI: Slime healing at ${Math.round(hpPercent * 100)}% HP`);
        return this.getMoveDef("blob");
      }

      return this.getMoveDef("sticky_slap");
    }

    // Hollow Acorn AI - Escalating boss mechanics
    if (combatant.character.name === "Hollow Acorn") {
      // Use Forest Rage when damaged (stronger when more damaged)
      const hasRageBuff = combatant.statusEffects.some(effect => effect.id === "forest_rage");
      if (hpPercent < 0.8 && !hasRageBuff && moves.includes("forest_rage") && this.rng.next() < 0.5) {
        console.log(`   🧠 AI: Hollow Acorn channeling forest rage at ${Math.round(hpPercent * 100)}% HP`);
        return this.getMoveDef("forest_rage");
      }

      // Use Root Entangle for crowd control
      if (this.round >= 2 && moves.includes("root_entangle") && this.rng.next() < 0.4) {
        console.log(`   🧠 AI: Hollow Acorn using root entangle`);
        return this.getMoveDef("root_entangle");
      }

      // Use armor up when not already armored
      const hasArmorBuff = combatant.statusEffects.some(effect => effect.id === "armored");
      if (!hasArmorBuff && moves.includes("armor_up") && this.rng.next() < 0.3) {
        console.log(`   🧠 AI: Hollow Acorn hardening shell`);
        return this.getMoveDef("armor_up");
      }

      // Rotate between powerful attacks
      const attackMoves = ["acorn_slam", "dark_spores"].filter(move => moves.includes(move));
      if (attackMoves.length > 0) {
        const moveId = this.rng.choose(attackMoves);
        return this.getMoveDef(moveId);
      }
    }

    // Fallback for unlisted enemies
    console.log(`   🧠 AI: Using fallback AI for ${combatant.character.name}`);
    const moveId = this.rng.choose(moves);
    return this.getMoveDef(moveId);
  }

  private choosePlayerMove(combatant: Combatant, hpPercent: number): MoveDef | null {
    const moves = combatant.character.moves;
    const allies = this.combatants.filter(c => !c.isEnemy && c.stats.HP > 0);
    const enemies = this.combatants.filter(c => c.isEnemy && c.stats.HP > 0);

    // Calculate party health status
    const woundedAllies = allies.filter(ally => ally.stats.HP < ally.stats.HPMax * 0.8);
    const lowHealthAllies = allies.filter(ally => ally.stats.HP < ally.stats.HPMax * 0.5);
    const criticalAllies = allies.filter(ally => ally.stats.HP < ally.stats.HPMax * 0.25);

    console.log(`   🧠 Player AI: ${combatant.character.name} analyzing situation...`);
    console.log(`      HP: ${Math.round(hpPercent * 100)}%, Wounded allies: ${woundedAllies.length}, Critical: ${criticalAllies.length}`);

    // === ORVUS (TANK) AI ===
    if (combatant.character.name === "Orvus") {
      // Emergency fortress mode if critical
      if (hpPercent < 0.2 && moves.includes("fortress_mode") && this.rng.next() < 0.8) {
        console.log(`   🛡️ Tank AI: Emergency fortress mode!`);
        return this.getMoveDef("fortress_mode");
      }

      // Protect critical allies
      if (criticalAllies.length > 0 && moves.includes("protect") && this.rng.next() < 0.9) {
        console.log(`   🛡️ Tank AI: Protecting critical ally`);
        return this.getMoveDef("protect");
      }

      // Taunt when multiple enemies and party is wounded
      if (enemies.length > 1 && woundedAllies.length > 1 && moves.includes("taunt") && this.rng.next() < 0.7) {
        console.log(`   🛡️ Tank AI: Taunting to protect party`);
        return this.getMoveDef("taunt");
      }

      // Blueprint guard for defensive support
      if (woundedAllies.length >= 2 && moves.includes("blueprint_guard") && this.rng.next() < 0.6) {
        console.log(`   🛡️ Tank AI: Providing defensive support`);
        return this.getMoveDef("blueprint_guard");
      }

      // Default to wing slam
      if (moves.includes("wing_slam")) {
        console.log(`   🛡️ Tank AI: Basic attack`);
        return this.getMoveDef("wing_slam");
      }
    }

    // === LUMA (HEALER) AI ===
    if (combatant.character.name === "Luma") {
      // Emergency healing for critical allies
      if (criticalAllies.length > 0) {
        if (moves.includes("life_burst") && this.rng.next() < 0.95) {
          console.log(`   💚 Healer AI: Emergency life burst for critical allies`);
          return this.getMoveDef("life_burst");
        }
        if (moves.includes("healing_rain") && this.rng.next() < 0.85) {
          console.log(`   💚 Healer AI: Healing rain for critical allies`);
          return this.getMoveDef("healing_rain");
        }
      }

      // Heal multiple wounded allies
      if (woundedAllies.length >= 2 && moves.includes("healing_rain") && this.rng.next() < 0.8) {
        console.log(`   💚 Healer AI: Group healing for wounded party`);
        return this.getMoveDef("healing_rain");
      }

      // Single target protection
      if (lowHealthAllies.length > 0 && moves.includes("petal_shield") && this.rng.next() < 0.7) {
        console.log(`   💚 Healer AI: Shielding low health ally`);
        return this.getMoveDef("petal_shield");
      }

      // Attack if party is healthy
      if (woundedAllies.length === 0) {
        if (moves.includes("glow_burst")) {
          console.log(`   💚 Healer AI: Party healthy, attacking`);
          return this.getMoveDef("glow_burst");
        }
        if (moves.includes("sparkle_spit")) {
          console.log(`   💚 Healer AI: Party healthy, basic attack`);
          return this.getMoveDef("sparkle_spit");
        }
      }

      // Default to healing if anyone is wounded
      if (woundedAllies.length > 0 && moves.includes("healing_rain")) {
        console.log(`   💚 Healer AI: Default healing`);
        return this.getMoveDef("healing_rain");
      }
    }

    // === SABLE (DPS) AI ===
    if (combatant.character.name === "Sable") {
      // Use strongest attacks when available
      if (moves.includes("shadow_storm") && enemies.length > 1 && this.rng.next() < 0.8) {
        console.log(`   🗡️ DPS AI: AoE shadow storm`);
        return this.getMoveDef("shadow_storm");
      }

      if (moves.includes("void_strike") && this.rng.next() < 0.7) {
        console.log(`   🗡️ DPS AI: Powerful void strike`);
        return this.getMoveDef("void_strike");
      }

      if (moves.includes("assassinate") && this.rng.next() < 0.6) {
        console.log(`   🗡️ DPS AI: Precision assassinate`);
        return this.getMoveDef("assassinate");
      }

      if (moves.includes("shadow_bolt") && this.rng.next() < 0.5) {
        console.log(`   🗡️ DPS AI: Shadow bolt`);
        return this.getMoveDef("shadow_bolt");
      }

      // Fallback attacks
      if (moves.includes("acorn_toss")) {
        console.log(`   🗡️ DPS AI: Basic ranged attack`);
        return this.getMoveDef("acorn_toss");
      }
    }

    // === GLIDER (SUPPORT LEADER) AI ===
    if (combatant.character.name === "Glider") {
      // Use battle cry in tough fights
      if (enemies.length > 2 && moves.includes("battle_cry") && this.rng.next() < 0.8) {
        console.log(`   👑 Leader AI: Ultimate team buff`);
        return this.getMoveDef("battle_cry");
      }

      // Rally when party is wounded
      if (woundedAllies.length >= 2 && moves.includes("rally") && this.rng.next() < 0.7) {
        console.log(`   👑 Leader AI: Rallying wounded party`);
        return this.getMoveDef("rally");
      }

      // Basic team buffs
      if (this.round <= 2 && moves.includes("inspire") && this.rng.next() < 0.6) {
        console.log(`   👑 Leader AI: Early game inspiration`);
        return this.getMoveDef("inspire");
      }

      // Storm call for multiple enemies
      if (enemies.length > 1 && moves.includes("storm_call") && this.rng.next() < 0.7) {
        console.log(`   👑 Leader AI: AoE storm attack`);
        return this.getMoveDef("storm_call");
      }

      // Wind wall for defense
      if (woundedAllies.length > 0 && moves.includes("wind_wall") && this.rng.next() < 0.5) {
        console.log(`   👑 Leader AI: Defensive wind wall`);
        return this.getMoveDef("wind_wall");
      }

      // Default attacks
      if (moves.includes("alpha_strike") && this.rng.next() < 0.6) {
        console.log(`   👑 Leader AI: Alpha strike`);
        return this.getMoveDef("alpha_strike");
      }

      if (moves.includes("precision_strike") && this.rng.next() < 0.5) {
        console.log(`   👑 Leader AI: Precision strike`);
        return this.getMoveDef("precision_strike");
      }

      if (moves.includes("peck")) {
        console.log(`   👑 Leader AI: Basic attack`);
        return this.getMoveDef("peck");
      }
    }

    // === FALLBACK: GENERIC PLAYER AI ===
    console.log(`   🧠 Player AI: Using generic AI for ${combatant.character.name}`);

    // Prefer support moves if allies are wounded
    if (woundedAllies.length > 0) {
      const supportMoves = moves.filter(move =>
        move.includes("heal") || move.includes("shield") || move.includes("guard") ||
        move.includes("inspire") || move.includes("rally") || move.includes("protect")
      );
      if (supportMoves.length > 0) {
        const moveId = this.rng.choose(supportMoves);
        console.log(`   🧠 Player AI: Using support move ${moveId}`);
        return this.getMoveDef(moveId);
      }
    }

    // Default to random move
    const moveId = this.rng.choose(moves);
    console.log(`   🧠 Player AI: Random move ${moveId}`);
    return this.getMoveDef(moveId);
  }

  private getMoveDef(moveId: string): MoveDef | null {
    // Check if it's a player move first
    if (PLAYER_MOVES[moveId as keyof typeof PLAYER_MOVES]) {
      return PLAYER_MOVES[moveId as keyof typeof PLAYER_MOVES];
    }

    // Check if it's an enemy move
    if (ENEMY_MOVES[moveId]) {
      return ENEMY_MOVES[moveId];
    }

    // Otherwise, use mock moves for characters - TODO: Import actual character move definitions
    const moveName = moveId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return {
      id: moveId as any,
      name: moveName,
      kind: "attack",
      power: 10,
      statScale: "STR",
      target: "enemy",
      description: `${moveName} - A basic attack`,
      effect: (ctx) => {
        // This effect will be processed by processAction, we just return the action template
        return [{
          type: "damage",
          source: "", // Will be filled by processAction
          target: [], // Will be filled by selectTargets
          value: 10,
          message: `${moveName} hits!`
        }];
      },
      anim: { track: 1, name: "attack" }
    };
  }

  private selectTargets(combatant: Combatant, move: MoveDef): Combatant[] {
    // Check if combatant is taunted and forced to target a specific enemy
    const tauntedEffect = combatant.statusEffects.find(effect => effect.id === "taunted");
    if (tauntedEffect && tauntedEffect.forcedTarget && (move.target === "enemy" || move.target === "allEnemies")) {
      const forcedTargetCombatant = this.combatants.find(c => c.id === tauntedEffect.forcedTarget && c.stats.HP > 0);
      if (forcedTargetCombatant) {
        console.log(`   👿 ${combatant.character.name} is taunted and must target ${forcedTargetCombatant.character.name}!`);
        return [forcedTargetCombatant];
      }
    }

    // Normal targeting logic
    switch (move.target) {
      case "enemy":
        return this.getAliveEnemies(combatant).slice(0, 1);
      case "allEnemies":
        return this.getAliveEnemies(combatant);
      case "ally":
        return this.getAliveAllies(combatant).slice(0, 1);
      case "allAllies":
        return this.getAliveAllies(combatant);
      case "self":
        return [combatant];
      default:
        return [];
    }
  }

  private processAction(action: BattleAction, source: Combatant, move: MoveDef): void {
    switch (action.type) {
      case "damage":
        this.processDamage(action, source, move);
        break;
      case "heal":
        this.processHeal(action);
        break;
      case "buff":
      case "debuff":
        this.processStatusEffect(action);
        break;
      case "special":
        // Handle splitting mechanics
        if (action.splitInto && action.splitInto.length > 0) {
          this.processSplit(action, source);
        }
        break;
    }

    this.battleLog.push(action);
  }

  private processDamage(action: BattleAction, source: Combatant, move: MoveDef): void {
    action.target.forEach(targetId => {
      const target = this.combatants.find(c => c.id === targetId);
      if (!target || target.stats.HP <= 0) return;

      console.log(`      🧮 Damage calculation: ${source.character.name} → ${target.character.name}`);

      // Calculate damage using the formula from the spec
      let damage = this.calculateDamage(source, target, move, action);
      console.log(`         Base damage: ${damage} (before modifiers)`);

      // Apply dodge check
      if (this.checkDodge(target)) {
        console.log(`         💨 ${target.character.name} dodged the attack!`);
        action.miss = true;
        action.message += " (Dodged!)";
        return;
      }

      // Apply crit check
      if (this.checkCrit(source)) {
        const oldDamage = damage;
        damage = Math.floor(damage * 1.5);
        console.log(`         ✨ Critical hit! ${oldDamage} → ${damage} damage`);
        action.crit = true;
        action.message += " Critical hit!";

        // Trigger crit hooks
        if (this.run.modifiers.hooks.onCrit) {
          const ctx: BattleContext = {
            combatants: this.combatants,
            actions: [],
            round: this.round,
            run: this.run,
            rng: () => this.rng.next()
          };
          this.run.modifiers.hooks.onCrit(ctx);
        }
      }

      // Apply damage
      const oldHP = target.stats.HP;
      target.stats.HP = Math.max(0, target.stats.HP - damage);
      action.value = damage;

      console.log(`         💔 ${target.character.name}: ${oldHP} → ${target.stats.HP} HP (-${damage})`);

      if (target.stats.HP === 0) {
        console.log(`         💀 ${target.character.name} is defeated!`);
        action.message += ` ${target.character.name} is defeated!`;
      }
    });
  }

  private calculateDamage(source: Combatant, target: Combatant, move: MoveDef, action: BattleAction): number {
    // Damage formula from spec:
    // base = move.power
    // scale = attacker.stats[move.statScale] (e.g., STR or MAG)
    // raw = base + scale * 2
    // mitigated = max(1, raw - target.DEF)
    // final = floor(mitigated * crit * run.modifiers.damageMult * protection)

    const base = move.power || action.value || 10;
    const scaleStat = move.statScale || "STR";
    const scale = source.stats[scaleStat];
    const raw = base + scale * 2;
    const mitigated = Math.max(1, raw - target.stats.DEF);
    let final = Math.floor(mitigated * this.run.modifiers.damageMult);

    // Check for protection status effects
    const protectedEffect = target.statusEffects.find(effect => effect.id === "protected");
    if (protectedEffect && protectedEffect.damageReduction) {
      const oldDamage = final;
      final = Math.floor(final * (1 - protectedEffect.damageReduction));
      console.log(`            🛡️ Protection reduces damage from ${oldDamage} to ${final} (${protectedEffect.damageReduction * 100}% reduction)`);
    }

    console.log(`            Formula: base(${base}) + ${scaleStat}(${scale})*2 - DEF(${target.stats.DEF}) = ${raw} - ${target.stats.DEF} = ${mitigated} * dmgMult(${this.run.modifiers.damageMult}) = ${final}`);

    return final;
  }

  private checkDodge(target: Combatant): boolean {
    // Dodge formula: 5% + SPD*1% + run.modifiers.dodgeBonus
    const dodgeChance = 0.05 + (target.stats.SPD * 0.01) + (this.run.modifiers.dodgeBonus / 100);
    return this.rng.next() < dodgeChance;
  }

  private checkCrit(source: Combatant): boolean {
    // Crit formula: 5% + LCK*1.5% + run.modifiers.critChanceBonus
    const critChance = 0.05 + (source.stats.LCK * 0.015) + (this.run.modifiers.critChanceBonus / 100);
    return this.rng.next() < critChance;
  }

  private processHeal(action: BattleAction): void {
    action.target.forEach(targetId => {
      const target = this.combatants.find(c => c.id === targetId);
      if (!target) return;

      const healAmount = action.value;
      const oldHP = target.stats.HP;
      target.stats.HP = Math.min(target.stats.HPMax, target.stats.HP + healAmount);
      action.value = target.stats.HP - oldHP; // Actual healing done
    });
  }

  private processStatusEffect(action: BattleAction): void {
    if (!action.statusEffect) return;

    action.target.forEach(targetId => {
      const target = this.combatants.find(c => c.id === targetId);
      if (!target) return;

      // Remove existing effect of same type
      target.statusEffects = target.statusEffects.filter(
        effect => effect.id !== action.statusEffect!.id
      );

      // Add new effect
      target.statusEffects.push({ ...action.statusEffect! });

      // Apply stat changes immediately if applicable
      if (action.statusEffect.stat && action.statusEffect.delta) {
        const statKey = action.statusEffect.stat;
        target.stats[statKey] += action.statusEffect.delta;
      }
    });
  }

  private processStatusEffects(): void {
    this.combatants.forEach(combatant => {
      combatant.statusEffects = combatant.statusEffects.filter(effect => {
        effect.ttl--;

        if (effect.ttl <= 0) {
          // Remove stat effects
          if (effect.stat && effect.delta) {
            combatant.stats[effect.stat] -= effect.delta;
          }
          return false;
        }

        return true;
      });
    });
  }

  private processRoundEndEffects(): void {
    // Apply heal per turn
    if (this.run.modifiers.healPerTurn > 0) {
      this.combatants.forEach(combatant => {
        if (!combatant.isEnemy && combatant.stats.HP > 0) {
          const oldHP = combatant.stats.HP;
          combatant.stats.HP = Math.min(
            combatant.stats.HPMax,
            combatant.stats.HP + this.run.modifiers.healPerTurn
          );

          if (combatant.stats.HP > oldHP) {
            this.battleLog.push({
              type: "heal",
              source: "relic",
              target: [combatant.id],
              value: combatant.stats.HP - oldHP,
              message: `${combatant.character.name} regenerates health!`
            });
          }
        }
      });
    }

    // Call round start hooks
    if (this.run.modifiers.hooks.onRoundStart) {
      const ctx: BattleContext = {
        combatants: this.combatants,
        actions: [],
        round: this.round,
        run: this.run,
        rng: () => this.rng.next()
      };
      this.run.modifiers.hooks.onRoundStart(ctx);
    }
  }

  private getAliveEnemies(from: Combatant): Combatant[] {
    return this.combatants.filter(c =>
      c.isEnemy !== from.isEnemy && c.stats.HP > 0
    );
  }

  private getAliveAllies(from: Combatant): Combatant[] {
    return this.combatants.filter(c =>
      c.isEnemy === from.isEnemy && c.stats.HP > 0 && c.id !== from.id
    );
  }

  private isBattleOver(): boolean {
    const aliveAllies = this.combatants.filter(c => !c.isEnemy && c.stats.HP > 0);
    const aliveEnemies = this.combatants.filter(c => c.isEnemy && c.stats.HP > 0);

    return aliveAllies.length === 0 || aliveEnemies.length === 0;
  }

  private generateResult(): BattleResult {
    const survivors = this.combatants.filter(c => c.stats.HP > 0);
    const victory = survivors.some(c => !c.isEnemy);

    let acornsEarned = 0;
    let virtuAcornsEarned = 0;

    if (victory) {
      // Base acorns based on enemy count and type
      const enemyCount = this.combatants.filter(c => c.isEnemy).length;
      acornsEarned = 15 + (enemyCount * 10);

      // Apply Juno's bonus if in party
      if (this.combatants.some(c => c.character.id === "juno" && !c.isEnemy)) {
        acornsEarned = Math.floor(acornsEarned * 1.1);
      }

      // Apply relic modifiers
      acornsEarned = Math.floor(acornsEarned * this.run.modifiers.acornDropMult);

      // Calculate VirtuAcorns (50% of regular acorns for victory)
      virtuAcornsEarned = Math.floor(acornsEarned * 0.5);

      // Check for perfect victory (no damage taken)
      const alliesAtFullHP = this.combatants.filter(c => !c.isEnemy).every(ally =>
        ally.stats.HP === ally.stats.HPMax
      );
      if (alliesAtFullHP) {
        virtuAcornsEarned = Math.floor(virtuAcornsEarned * 1.5); // +50% bonus for perfect victory
      }

      // Add to run rewards
      this.run.rewards.acorns += acornsEarned;
      this.run.rewards.virtuAcorns += virtuAcornsEarned;
    } else {
      // Small consolation VirtuAcorns for defeat
      virtuAcornsEarned = Math.floor((15 + this.combatants.filter(c => c.isEnemy).length * 5) * 0.25);
      this.run.rewards.virtuAcorns += virtuAcornsEarned;
    }

    return {
      victory,
      survivors,
      actions: this.battleLog,
      acornsEarned,
      virtuAcornsEarned,
      experience: victory ? 50 : 0
    };
  }

  private processSplit(action: BattleAction, source: Combatant): void {
    if (!action.splitInto || action.splitInto.length === 0) return;

    console.log(`🪄 ${source.character.name} is splitting into ${action.splitInto.length} enemies!`);

    // Remove the source enemy from combatants
    const sourceIndex = this.combatants.indexOf(source);
    if (sourceIndex !== -1) {
      this.combatants.splice(sourceIndex, 1);
      console.log(`   💀 Removed ${source.character.name} from battle`);
    }

    // Add new enemies from the split
    action.splitInto.forEach((enemyDef, index) => {
      const newCombatant = {
        id: `${enemyDef.id}_${index}`,
        character: enemyDef,
        stats: { ...enemyDef.stats },
        statusEffects: [],
        isEnemy: true
      };

      this.combatants.push(newCombatant);
      console.log(`   ➕ Added ${newCombatant.character.name} (${newCombatant.stats.HP}/${newCombatant.stats.HPMax} HP)`);
    });
  }

  // Get current battle state for UI
  getBattleState() {
    return {
      combatants: this.combatants,
      battleLog: this.battleLog,
      round: this.round,
      isOver: this.isBattleOver()
    };
  }
}

// Utility functions
export const createCombatant = (
  id: string,
  character: any,
  isEnemy: boolean = false
): Combatant => {
  return {
    id,
    character,
    stats: { ...(character.base || character.stats) },
    statusEffects: [],
    isEnemy
  };
};

export const applyStatModifiers = (combatant: Combatant, run: RunState): void => {
  // Apply relic stat bonuses
  Object.entries(run.modifiers.statBonuses).forEach(([stat, bonus]) => {
    if (bonus && stat in combatant.stats) {
      combatant.stats[stat as StatKey] += bonus;
    }
  });
};