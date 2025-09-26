// Progression manager for applying character upgrades and skills to runs
import { RunState, CharacterProgression, AcornHuntProgression, CharacterId } from './types';
import { getSkillNode } from './skillTrees';

export class ProgressionManager {
  private progression: AcornHuntProgression;

  constructor(progression: AcornHuntProgression) {
    this.progression = progression;
  }

  // Apply all character progressions to a run
  applyProgressionToRun(run: RunState): void {
    // Apply skill effects for each party member
    run.party.forEach(characterId => {
      this.applyCharacterSkills(run, characterId);
    });
  }

  // Apply all unlocked skills for a specific character to the run
  private applyCharacterSkills(run: RunState, characterId: CharacterId): void {
    const characterProgression = this.progression.characterProgressions[characterId];
    if (!characterProgression) return;

    // Apply each unlocked skill's effects
    characterProgression.unlockedSkills.forEach(skillId => {
      const skillNode = getSkillNode(characterId, skillId);
      if (skillNode) {
        try {
          // Apply the skill's effect to the run
          skillNode.effect(run.party.find(id => id === characterId) ?
            { id: characterId } as any : null, run);
        } catch (error) {
          console.warn(`Failed to apply skill ${skillId} for character ${characterId}:`, error);
        }
      }
    });
  }

  // Get all unlocked skills for a character
  getUnlockedSkills(characterId: CharacterId): string[] {
    return this.progression.characterProgressions[characterId]?.unlockedSkills || [];
  }

  // Get current moves for a character (including upgrades)
  getCurrentMoves(characterId: CharacterId): string[] {
    return this.progression.characterProgressions[characterId]?.currentMoves || [];
  }

  // Check if character can upgrade a move
  canUpgradeMove(characterId: CharacterId, moveId: string, cost: number): boolean {
    const characterProgression = this.progression.characterProgressions[characterId];
    if (!characterProgression) return false;

    // Check if player has enough VirtuAcorns
    if (this.progression.totalVirtuAcorns - this.progression.spentVirtuAcorns < cost) {
      return false;
    }

    // Check if the move is currently equipped
    return characterProgression.currentMoves.includes(moveId);
  }

  // Check if character can unlock a skill
  canUnlockSkill(characterId: CharacterId, skillId: string, cost: number): boolean {
    const characterProgression = this.progression.characterProgressions[characterId];
    if (!characterProgression) return false;

    // Check if already unlocked
    if (characterProgression.unlockedSkills.includes(skillId)) return false;

    // Check if player has enough VirtuAcorns
    if (this.progression.totalVirtuAcorns - this.progression.spentVirtuAcorns < cost) {
      return false;
    }

    // Check prerequisites (would need to implement skill tree logic)
    return true;
  }

  // Upgrade a character's move
  upgradeMove(characterId: CharacterId, oldMoveId: string, newMoveId: string, cost: number): boolean {
    if (!this.canUpgradeMove(characterId, oldMoveId, cost)) return false;

    const characterProgression = this.progression.characterProgressions[characterId];
    if (!characterProgression) return false;

    // Replace the old move with the new one
    const moveIndex = characterProgression.currentMoves.indexOf(oldMoveId);
    if (moveIndex !== -1) {
      characterProgression.currentMoves[moveIndex] = newMoveId;
      characterProgression.totalVirtuAcornsSpent += cost;
      this.progression.spentVirtuAcorns += cost;
      return true;
    }

    return false;
  }

  // Unlock a character skill
  unlockSkill(characterId: CharacterId, skillId: string, cost: number): boolean {
    if (!this.canUnlockSkill(characterId, skillId, cost)) return false;

    const characterProgression = this.progression.characterProgressions[characterId];
    if (!characterProgression) return false;

    characterProgression.unlockedSkills.push(skillId);
    characterProgression.totalVirtuAcornsSpent += cost;
    this.progression.spentVirtuAcorns += cost;
    return true;
  }

  // Add VirtuAcorns to the total
  addVirtuAcorns(amount: number): void {
    this.progression.totalVirtuAcorns += amount;
  }

  // Get available VirtuAcorns
  getAvailableVirtuAcorns(): number {
    return this.progression.totalVirtuAcorns - this.progression.spentVirtuAcorns;
  }
}

// Helper function to create a default progression state
export function createDefaultProgression(): AcornHuntProgression {
  return {
    totalVirtuAcorns: 500, // Starting amount for testing
    spentVirtuAcorns: 0,
    characterProgressions: {
      player: {
        characterId: 'player',
        unlockedSkills: [],
        currentMoves: ['peck', 'inspire', 'gust'],
        masteryLevel: 1,
        totalVirtuAcornsSpent: 0
      },
      sable: {
        characterId: 'sable',
        unlockedSkills: [],
        currentMoves: ['acorn_toss', 'hatpin_stab', 'shadow_juggle'],
        masteryLevel: 1,
        totalVirtuAcornsSpent: 0
      },
      luma: {
        characterId: 'luma',
        unlockedSkills: [],
        currentMoves: ['sparkle_spit', 'petal_shield', 'glow_burst'],
        masteryLevel: 1,
        totalVirtuAcornsSpent: 0
      },
      orvus: {
        characterId: 'orvus',
        unlockedSkills: [],
        currentMoves: ['wing_slam', 'blueprint_guard', 'miscalculation'],
        masteryLevel: 1,
        totalVirtuAcornsSpent: 0
      },
      juno: {
        characterId: 'juno',
        unlockedSkills: [],
        currentMoves: ['token_toss', 'echo_strike', 'squawk_of_glory'],
        masteryLevel: 1,
        totalVirtuAcornsSpent: 0
      },
      moss: {
        characterId: 'moss',
        unlockedSkills: [],
        currentMoves: ['lazy_swipe', 'nap_time', 'sloth_smash'],
        masteryLevel: 1,
        totalVirtuAcornsSpent: 0
      },
      carmine: {
        characterId: 'carmine',
        unlockedSkills: [],
        currentMoves: ['dramatic_peck', 'fashion_pose', 'encore_performance'],
        masteryLevel: 1,
        totalVirtuAcornsSpent: 0
      },
      zippa: {
        characterId: 'zippa',
        unlockedSkills: [],
        currentMoves: ['peck', 'inspire', 'gust'], // placeholder moves
        masteryLevel: 1,
        totalVirtuAcornsSpent: 0
      }
    },
    unlockedCharacters: ['player', 'sable', 'luma'] // Starting unlocked characters
  };
}