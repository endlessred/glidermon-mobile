// Enhanced character descriptions that highlight their roles and capabilities
import { CharacterId } from './types';

export interface CharacterDescription {
  role: string;
  playstyle: string;
  strengths: string[];
  specialties: string[];
  keyMoves: string[];
}

export const CHARACTER_DESCRIPTIONS: Record<CharacterId, CharacterDescription> = {
  player: {
    role: "Support Leader",
    playstyle: "Team coordination and tactical support",
    strengths: ["Team Buffs", "Utility", "Leadership"],
    specialties: ["Inspire allies", "Resource gathering", "Tactical coordination"],
    keyMoves: ["Inspire (+1 STR to party)", "Rally (stronger team buff)", "Battle Cry (ultimate team empowerment)"]
  },

  sable: {
    role: "DPS Assassin",
    playstyle: "High damage critical strikes and shadow abilities",
    strengths: ["Critical Hits", "Stealth", "Burst Damage"],
    specialties: ["Shadow magic", "Assassination techniques", "Critical strike mastery"],
    keyMoves: ["Shadow Bolt (dark projectile)", "Assassinate (guaranteed crit)", "Shadow Storm (AoE darkness)"]
  },

  luma: {
    role: "Primary Healer",
    playstyle: "Party healing and magical protection",
    strengths: ["Healing Magic", "Protective Buffs", "Nature Powers"],
    specialties: ["Multi-target healing", "Defensive shields", "Status restoration"],
    keyMoves: ["Healing Rain (heal all allies 25%)", "Life Burst (heal all allies 40%)", "Petal Shield (+2 DEF to ally)"]
  },

  orvus: {
    role: "Main Tank",
    playstyle: "Defensive protection and tactical analysis",
    strengths: ["High Defense", "Party Protection", "Enemy Analysis"],
    specialties: ["Damage mitigation", "Strategic positioning", "Engineering support"],
    keyMoves: ["Blueprint Guard (+3 DEF to all allies)", "Wing Slam (defensive attack)", "Tactical Defense (damage reduction)"]
  },

  juno: {
    role: "Speed Support",
    playstyle: "Fast utility and resource generation",
    strengths: ["High Speed", "Economy Bonuses", "Team Coordination"],
    specialties: ["VirtuAcorn generation", "Speed buffs", "Sound-based attacks"],
    keyMoves: ["Echo Strike (sound attack)", "Squawk of Glory (+2 LCK to party)", "Token Toss (economy attack)"]
  },

  moss: {
    role: "Berserker Tank",
    playstyle: "High damage with self-sustaining abilities",
    strengths: ["Massive Damage", "Self-Healing", "High HP"],
    specialties: ["Devastating attacks", "Sleep-based recovery", "Unpredictable effects"],
    keyMoves: ["Nap Time (self-heal 30% HP)", "Sloth Smash (high damage)", "Power Nap (stat boost via sleeping)"]
  },

  carmine: {
    role: "Luck Buffer",
    playstyle: "Performance-based team enhancement and luck manipulation",
    strengths: ["Luck Bonuses", "Team Inspiration", "Performance Arts"],
    specialties: ["Dramatic effects", "Luck manipulation", "Morale boosting"],
    keyMoves: ["Fashion Pose (+3 LCK self)", "Encore Performance (+2 MAG to party)", "Standing Ovation (ultimate performance)"]
  },

  zippa: {
    role: "Seasonal Specialist",
    playstyle: "High-speed elemental abilities",
    strengths: ["Very High Speed", "Elemental Powers", "Seasonal Effects"],
    specialties: ["Lightning-fast attacks", "Weather manipulation", "Energy-based abilities"],
    keyMoves: ["Storm Strike (lightning attack)", "Energy Burst (speed boost)", "Seasonal Power (context-based effects)"]
  }
};

// Helper function to get role-based emoji
export const getRoleEmoji = (characterId: CharacterId): string => {
  const roleEmojis = {
    player: "👑", // Leader
    sable: "🗡️", // DPS
    luma: "💚", // Healer
    orvus: "🛡️", // Tank
    juno: "⚡", // Speed Support
    moss: "💪", // Berserker Tank
    carmine: "🎭", // Buffer
    zippa: "🌟" // Specialist
  };
  return roleEmojis[characterId];
};

// Helper function to get role color
export const getRoleColor = (characterId: CharacterId): string => {
  const roleColors = {
    player: "#FFD700", // Gold for leader
    sable: "#8B0000", // Dark red for DPS
    luma: "#32CD32", // Green for healer
    orvus: "#4682B4", // Steel blue for tank
    juno: "#FF6347", // Orange for speed support
    moss: "#8B4513", // Brown for berserker
    carmine: "#DA70D6", // Orchid for buffer
    zippa: "#00CED1" // Turquoise for specialist
  };
  return roleColors[characterId];
};