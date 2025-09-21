// stores/galleryStore.ts
import { create } from "zustand";
import { useUserStore } from "./userStore";
import { useCosmeticsStore } from "./cosmeticsStore";
import { useProgressionStore } from "./progressionStore";

// Reaction types for gallery entries
export type ReactionType = {
  id: string;
  emoji: string;
  label: string;
  color: string;
  description: string;
};

export const REACTION_TYPES: Record<string, ReactionType> = {
  cool: {
    id: "cool",
    emoji: "😎",
    label: "Cool",
    color: "#3B82F6", // blue
    description: "So stylish!"
  },
  adorable: {
    id: "adorable",
    emoji: "😍",
    label: "Adorable",
    color: "#EC4899", // pink
    description: "Absolutely cute!"
  },
  fire: {
    id: "fire",
    emoji: "🔥",
    label: "Fire",
    color: "#EF4444", // red
    description: "Amazing look!"
  },
  magical: {
    id: "magical",
    emoji: "✨",
    label: "Magical",
    color: "#8B5CF6", // purple
    description: "Enchanting!"
  },
  champion: {
    id: "champion",
    emoji: "🏆",
    label: "Champion",
    color: "#F59E0B", // amber
    description: "Winner vibes!"
  },
  stunning: {
    id: "stunning",
    emoji: "🤩",
    label: "Stunning",
    color: "#10B981", // emerald
    description: "Mind-blowing!"
  }
};

// Player's showcase entry
export type GalleryEntry = {
  id: string;
  playerDisplayName: string;
  glidermonName: string;
  level: number;

  // Cosmetic showcase
  equippedCosmetics: {
    headTop?: string;
    theme?: string;
  };

  // Showcase stats (engagement-based, not health-based)
  stats: {
    daysActive: number;
    cosmeticsUnlocked: number;
    petInteractions: number;
    customizationChanges: number;
  };

  // Showcase message from player
  showcaseMessage?: string;

  // Social features - multiple reaction types
  reactions: Record<string, number>; // reactionId -> count
  totalReactions: number; // sum of all reactions
  lastUpdated: string;

  // Categories they're featured in
  featuredIn: GalleryCategory[];

  // New reactions received (for animation triggers)
  newReactions?: Array<{
    type: string;
    count: number;
    timestamp: string;
  }>;
};

export type GalleryCategory =
  | "style_stars" // Best cosmetic combinations
  | "collection_kings" // Most cosmetics unlocked
  | "daily_companions" // Most consistent app usage
  | "customization_masters" // Most cosmetic changes
  | "community_favorites" // Most liked by other players
  | "level_leaders" // Highest levels (engagement-based)
  | "newcomer_spotlight"; // Recently joined players doing well

type GalleryState = {
  // Featured galleries by category
  galleries: Record<GalleryCategory, GalleryEntry[]>;

  // Player's own showcase entry
  myEntry: GalleryEntry | null;

  // Participation settings
  isParticipating: boolean;

  // Actions
  updateMyShowcase: (message?: string) => void;
  submitForCategory: (category: GalleryCategory) => void;
  addReaction: (entryId: string, reactionType: string) => void;
  fetchGallery: (category: GalleryCategory) => Promise<void>;

  // Animation triggers (for future use)
  getNewReactions: (entryId: string) => Array<{type: string; count: number; timestamp: string}> | undefined;
  clearNewReactions: (entryId: string) => void;

  // Privacy controls
  setParticipation: (participating: boolean) => void;
};

export const useGalleryStore = create<GalleryState>((set, get) => ({
  galleries: {
    style_stars: [],
    collection_kings: [],
    daily_companions: [],
    customization_masters: [],
    community_favorites: [],
    level_leaders: [],
    newcomer_spotlight: []
  },

  myEntry: null,
  isParticipating: false,

  updateMyShowcase: (message?: string) => {
    const userStore = useUserStore.getState();
    const cosmeticsStore = useCosmeticsStore.getState();
    const progressionStore = useProgressionStore.getState();

    if (!userStore.allowLeaderboards || !userStore.hasCompletedOnboarding) {
      return;
    }

    // Create/update player's showcase entry
    const entry: GalleryEntry = {
      id: `showcase_${userStore.displayName}`,
      playerDisplayName: userStore.displayName,
      glidermonName: userStore.glidermonName,
      level: progressionStore.level,

      equippedCosmetics: {
        headTop: cosmeticsStore.equipped.headTop,
        theme: cosmeticsStore.equipped.theme
      },

      stats: {
        daysActive: 1, // Would track this over time
        cosmeticsUnlocked: Object.keys(cosmeticsStore.owned).length,
        petInteractions: 0, // Would track pet taps/interactions
        customizationChanges: 0 // Would track cosmetic changes
      },

      showcaseMessage: message,
      reactions: {}, // Start with no reactions
      totalReactions: 0,
      lastUpdated: new Date().toISOString(),
      featuredIn: [],
      newReactions: []
    };

    set({ myEntry: entry, isParticipating: true });
  },

  submitForCategory: async (category: GalleryCategory) => {
    const entry = get().myEntry;
    if (!entry) return;

    // In production, this would submit to backend
    console.log(`Submitting to ${category}:`, entry);

    // Update local state
    set(state => ({
      galleries: {
        ...state.galleries,
        [category]: [entry, ...state.galleries[category]].slice(0, 10) // Top 10
      }
    }));
  },

  addReaction: (entryId: string, reactionType: string) => {
    // In production, this would update backend
    set(state => {
      const newGalleries = { ...state.galleries };

      // Find and update the entry across all galleries
      Object.keys(newGalleries).forEach(category => {
        const categoryKey = category as GalleryCategory;
        newGalleries[categoryKey] = newGalleries[categoryKey].map(entry => {
          if (entry.id === entryId) {
            const currentReactions = { ...entry.reactions };
            const currentCount = currentReactions[reactionType] || 0;
            currentReactions[reactionType] = currentCount + 1;

            const totalReactions = Object.values(currentReactions).reduce((sum, count) => sum + count, 0);

            // Track new reaction for animation
            const newReactions = entry.newReactions || [];
            const existingNewReaction = newReactions.find(r => r.type === reactionType);

            let updatedNewReactions;
            if (existingNewReaction) {
              updatedNewReactions = newReactions.map(r =>
                r.type === reactionType ? { ...r, count: r.count + 1 } : r
              );
            } else {
              updatedNewReactions = [...newReactions, {
                type: reactionType,
                count: 1,
                timestamp: new Date().toISOString()
              }];
            }

            return {
              ...entry,
              reactions: currentReactions,
              totalReactions,
              newReactions: updatedNewReactions
            };
          }
          return entry;
        });
      });

      return { galleries: newGalleries };
    });
  },

  getNewReactions: (entryId: string) => {
    const state = get();
    // Find entry across all galleries
    for (const category of Object.keys(state.galleries)) {
      const categoryKey = category as GalleryCategory;
      const entry = state.galleries[categoryKey].find(e => e.id === entryId);
      if (entry) {
        return entry.newReactions;
      }
    }
    return undefined;
  },

  clearNewReactions: (entryId: string) => {
    set(state => {
      const newGalleries = { ...state.galleries };

      Object.keys(newGalleries).forEach(category => {
        const categoryKey = category as GalleryCategory;
        newGalleries[categoryKey] = newGalleries[categoryKey].map(entry =>
          entry.id === entryId ? { ...entry, newReactions: [] } : entry
        );
      });

      return { galleries: newGalleries };
    });
  },

  fetchGallery: async (category: GalleryCategory) => {
    // Mock data for development
    const mockEntries: GalleryEntry[] = [
      {
        id: "player_1",
        playerDisplayName: "SkyGlider",
        glidermonName: "Nimbus",
        level: 15,
        equippedCosmetics: { headTop: "viking_hat", theme: "sunset" },
        stats: { daysActive: 30, cosmeticsUnlocked: 8, petInteractions: 150, customizationChanges: 25 },
        showcaseMessage: "Love my viking glider! 🛡️",
        reactions: { cool: 15, fire: 12, champion: 8, stunning: 7 },
        totalReactions: 42,
        lastUpdated: "2024-03-10T10:00:00Z",
        featuredIn: ["style_stars", "level_leaders"]
      },
      {
        id: "player_2",
        playerDisplayName: "CloudJumper",
        glidermonName: "Whiskers",
        level: 12,
        equippedCosmetics: { headTop: "feather_cap", theme: "forest" },
        stats: { daysActive: 25, cosmeticsUnlocked: 6, petInteractions: 200, customizationChanges: 30 },
        showcaseMessage: "Forest theme is so peaceful 🌲",
        reactions: { adorable: 18, magical: 11, stunning: 9 },
        totalReactions: 38,
        lastUpdated: "2024-03-09T15:30:00Z",
        featuredIn: ["community_favorites", "customization_masters"]
      }
    ];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    set(state => ({
      galleries: {
        ...state.galleries,
        [category]: mockEntries
      }
    }));
  },

  setParticipation: (participating: boolean) => {
    set({ isParticipating: participating });

    if (!participating) {
      set({ myEntry: null });
    }
  }
}));