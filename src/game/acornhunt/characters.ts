// Character definitions for Acorn Hunt
import { CharacterDef, CharacterId } from './types';

// Character definitions with emojis as placeholders for Spine animations
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  player: {
    id: "player",
    name: "Glider",
    emoji: "🐿️", // sugar glider
    base: { STR: 5, SPD: 5, MAG: 5, DEF: 5, LCK: 5, HP: 60, HPMax: 60 },
    moves: ["peck", "inspire", "gust"],
    passive: "player_inspire",
    spineKey: "player_glider"
  },

  sable: {
    id: "sable",
    name: "Sable",
    emoji: "🖤🐿️", // goth squirrel
    base: { STR: 5, SPD: 7, MAG: 3, DEF: 4, LCK: 8, HP: 55, HPMax: 55 },
    moves: ["acorn_toss", "hatpin_stab", "shadow_juggle"],
    passive: "sable_crit_bias",
    spineKey: "sable_squirrel"
  },

  luma: {
    id: "luma",
    name: "Luma",
    emoji: "🐸✨", // tree frog with sparkles
    base: { STR: 3, SPD: 6, MAG: 9, DEF: 4, LCK: 5, HP: 55, HPMax: 55 },
    moves: ["sparkle_spit", "petal_shield", "healing_rain"],
    passive: "luma_post_battle_heal",
    spineKey: "luma_frog"
  },

  orvus: {
    id: "orvus",
    name: "Orvus",
    emoji: "🦉📐", // owl with blueprints/engineering tools
    base: { STR: 7, SPD: 3, MAG: 4, DEF: 9, LCK: 2, HP: 70, HPMax: 70 },
    moves: ["wing_slam", "blueprint_guard", "taunt", "protect", "fortress_mode"],
    passive: "orvus_guard",
    spineKey: "orvus_owl"
  },

  juno: {
    id: "juno",
    name: "Juno",
    emoji: "🦜🪙", // parrot with coins
    base: { STR: 6, SPD: 8, MAG: 4, DEF: 3, LCK: 6, HP: 55, HPMax: 55 },
    moves: ["token_toss", "echo_strike", "squawk_of_glory"],
    passive: "juno_bonus_acorns",
    spineKey: "juno_parrot"
  },

  moss: {
    id: "moss",
    name: "Moss",
    emoji: "🦥💤", // sloth with sleep/lazy indicators
    base: { STR: 9, SPD: 1, MAG: 5, DEF: 6, LCK: 3, HP: 70, HPMax: 70 },
    moves: ["lazy_swipe", "nap_time", "sloth_smash"],
    passive: "moss_inconsistent",
    spineKey: "moss_sloth"
  },

  carmine: {
    id: "carmine",
    name: "Carmine",
    emoji: "🐦‍⬛✨", // cardinal with dramatic flair
    base: { STR: 4, SPD: 6, MAG: 7, DEF: 3, LCK: 9, HP: 50, HPMax: 50 },
    moves: ["dramatic_peck", "fashion_pose", "encore_performance"],
    passive: "carmine_fabulous_crit",
    spineKey: "carmine_cardinal"
  },

  zippa: {
    id: "zippa",
    name: "Zippa",
    emoji: "🌟⚡", // seasonal character - energetic/electric theme
    base: { STR: 6, SPD: 9, MAG: 6, DEF: 3, LCK: 7, HP: 55, HPMax: 55 },
    moves: ["peck", "inspire", "gust"], // placeholder moves for now
    spineKey: "zippa_seasonal"
  }
};

// Helper function to get character by ID
export const getCharacter = (id: CharacterId): CharacterDef => {
  return CHARACTERS[id];
};

// Helper function to get available party members (excluding player)
export const getAvailablePartyMembers = (): CharacterDef[] => {
  return Object.values(CHARACTERS).filter(char => char.id !== "player");
};

// Helper function to create a combatant stats object from character
export const createCombatantStats = (character: CharacterDef) => ({
  ...character.base,
  HP: character.base.HPMax // Start at full HP
});