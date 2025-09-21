// stores/leaderboardStore.ts
import { create } from "zustand";
import { useUserStore } from "./userStore";
import { useProgressionStore } from "./progressionStore";
import { useCosmeticsStore } from "./cosmeticsStore";

// Privacy-safe player representation for leaderboards
export type LeaderboardPlayer = {
  id: string; // Anonymous player ID (not user ID)
  displayName: string; // User's chosen display name
  level: number;
  score: number; // Privacy-safe aggregated score (not raw health data)
  rank: number;

  // Cosmetic representation for avatar display
  equippedCosmetics: {
    headTop?: string; // Equipped hat/accessory
    theme?: string; // Color scheme
    // Future: more cosmetic slots
  };

  // Metadata (no health data)
  joinedDate: string; // When they started playing
  lastActive: string; // Last time they were active (approximate)
};

// Different leaderboard categories
export type LeaderboardType =
  | "weekly_consistency" // Based on consistent engagement, not glucose values
  | "monthly_progress"   // Based on progression/achievements
  | "cosmetic_collector" // Based on cosmetics unlocked
  | "streak_master";     // Based on engagement streaks

type LeaderboardData = {
  type: LeaderboardType;
  players: LeaderboardPlayer[];
  lastUpdated: string;
  myRank?: number; // Current user's rank in this leaderboard
  myScore?: number; // Current user's score in this leaderboard
};

type LeaderboardState = {
  // Current leaderboard data
  leaderboards: Record<LeaderboardType, LeaderboardData | null>;
  isLoading: boolean;
  error: string | null;

  // User's participation status
  isParticipating: boolean;

  // Privacy and consent tracking
  hasConsentedToLeaderboards: boolean;
  lastConsentDate?: string;

  // Actions
  fetchLeaderboard: (type: LeaderboardType) => Promise<void>;
  submitScore: (type: LeaderboardType) => Promise<void>;
  updateConsent: (consented: boolean) => void;
  getMyLeaderboardProfile: () => LeaderboardPlayer | null;

  // Privacy utilities
  calculatePrivacySafeScore: (type: LeaderboardType) => number;
  generateAnonymousId: () => string;
};

// Mock data for development - in production this would come from a backend
const generateMockLeaderboard = (type: LeaderboardType, userProfile?: LeaderboardPlayer): LeaderboardData => {
  const mockPlayers: LeaderboardPlayer[] = [
    {
      id: "anon_001",
      displayName: "SkyGlider",
      level: 15,
      score: 1250,
      rank: 1,
      equippedCosmetics: { headTop: "pirate_hat", theme: "sunset" },
      joinedDate: "2024-01-15",
      lastActive: "2024-03-10"
    },
    {
      id: "anon_002",
      displayName: "WindRider",
      level: 12,
      score: 980,
      rank: 2,
      equippedCosmetics: { headTop: "pilot_goggles", theme: "ocean" },
      joinedDate: "2024-02-01",
      lastActive: "2024-03-09"
    },
    {
      id: "anon_003",
      displayName: "CloudJumper",
      level: 11,
      score: 875,
      rank: 3,
      equippedCosmetics: { headTop: "cloud_hat", theme: "default" },
      joinedDate: "2024-01-28",
      lastActive: "2024-03-08"
    }
  ];

  // Insert user if they're participating
  if (userProfile) {
    mockPlayers.push(userProfile);
    mockPlayers.sort((a, b) => b.score - a.score);
    mockPlayers.forEach((player, index) => {
      player.rank = index + 1;
    });
  }

  return {
    type,
    players: mockPlayers.slice(0, 10), // Top 10
    lastUpdated: new Date().toISOString(),
    myRank: userProfile?.rank,
    myScore: userProfile?.score
  };
};

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  // Initial state
  leaderboards: {
    weekly_consistency: null,
    monthly_progress: null,
    cosmetic_collector: null,
    streak_master: null
  },
  isLoading: false,
  error: null,
  isParticipating: false,
  hasConsentedToLeaderboards: false,
  lastConsentDate: undefined,

  // Actions
  fetchLeaderboard: async (type: LeaderboardType) => {
    set({ isLoading: true, error: null });

    try {
      // Check if user has consented to leaderboards
      const userStore = useUserStore.getState();
      if (!userStore.allowLeaderboards) {
        throw new Error("User has not consented to leaderboard participation");
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const userProfile = get().getMyLeaderboardProfile();
      const mockData = generateMockLeaderboard(type, userProfile || undefined);

      set(state => ({
        leaderboards: {
          ...state.leaderboards,
          [type]: mockData
        },
        isLoading: false,
        isParticipating: !!userProfile
      }));

    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch leaderboard"
      });
    }
  },

  submitScore: async (type: LeaderboardType) => {
    const userStore = useUserStore.getState();
    if (!userStore.allowLeaderboards || !userStore.hasCompletedOnboarding) {
      return;
    }

    try {
      // Calculate privacy-safe score
      const score = get().calculatePrivacySafeScore(type);

      // In production, this would submit to backend
      console.log(`Submitting ${type} score: ${score}`);

      // Refresh leaderboard to show updated rankings
      await get().fetchLeaderboard(type);

    } catch (error) {
      console.warn("Failed to submit score:", error);
    }
  },

  updateConsent: (consented: boolean) => {
    const userStore = useUserStore.getState();
    userStore.setLeaderboardConsent(consented);

    set({
      hasConsentedToLeaderboards: consented,
      lastConsentDate: new Date().toISOString()
    });

    // Clear leaderboard data if user revokes consent
    if (!consented) {
      set({
        leaderboards: {
          weekly_consistency: null,
          monthly_progress: null,
          cosmetic_collector: null,
          streak_master: null
        },
        isParticipating: false
      });
    }
  },

  getMyLeaderboardProfile: (): LeaderboardPlayer | null => {
    const userStore = useUserStore.getState();
    const progressionStore = useProgressionStore.getState();
    const cosmeticsStore = useCosmeticsStore.getState();

    if (!userStore.allowLeaderboards || !userStore.hasCompletedOnboarding) {
      return null;
    }

    // Generate stable anonymous ID based on user data
    const anonymousId = get().generateAnonymousId();

    return {
      id: anonymousId,
      displayName: userStore.displayName || "Anonymous Glider",
      level: progressionStore.level,
      score: get().calculatePrivacySafeScore("weekly_consistency"), // Default score
      rank: 0, // Will be calculated when inserted into leaderboard
      equippedCosmetics: {
        headTop: cosmeticsStore.equipped.headTop,
        theme: userStore.playerAvatar // Could be theme or avatar
      },
      joinedDate: "2024-03-01", // Could track this in userStore
      lastActive: new Date().toISOString()
    };
  },

  calculatePrivacySafeScore: (type: LeaderboardType): number => {
    const progressionStore = useProgressionStore.getState();
    const userStore = useUserStore.getState();

    // Calculate scores based on non-health metrics only
    switch (type) {
      case "weekly_consistency":
        // Based on app engagement, not glucose values
        return progressionStore.level * 10 + (progressionStore.xpTotal / 100);

      case "monthly_progress":
        // Based on progression achievements
        return progressionStore.xpTotal;

      case "cosmetic_collector":
        // Based on cosmetics unlocked (if we track this)
        return progressionStore.level * 5; // Placeholder

      case "streak_master":
        // Based on engagement streaks (not glucose streaks)
        return progressionStore.level * 8; // Placeholder

      default:
        return 0;
    }
  },

  generateAnonymousId: (): string => {
    const userStore = useUserStore.getState();

    // Generate a stable but anonymous ID
    // In production, this could be a hash of user data or a server-generated anonymous ID
    const base = `${userStore.glidermonName}_${userStore.displayName}`;
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `anon_${Math.abs(hash).toString(36)}`;
  }
}));