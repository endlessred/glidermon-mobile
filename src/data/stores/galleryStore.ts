// stores/galleryStore.ts
import { create } from "zustand";
import { useUserStore } from "./userStore";
import { useCosmeticsStore } from "./cosmeticsStore";
import { useProgressionStore } from "./progressionStore";
import { useOutfitStore } from "./outfitStore";
import { OutfitSlot } from "../types/outfitTypes";

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

// Generate anonymous glider name based on entry ID
function generateAnonymousGliderName(entryId: string): string {
  // Create a simple hash from the entry ID to generate consistent numbers
  let hash = 0;
  for (let i = 0; i < entryId.length; i++) {
    const char = entryId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Use absolute value and ensure it's a reasonable 4-digit number
  const gliderNumber = Math.abs(hash) % 9000 + 1000; // Range: 1000-9999
  return `Glider#${gliderNumber}`;
}

// Player's showcase entry
export type GalleryEntry = {
  id: string;
  anonymousGliderName: string; // Generated like "Glider#1724"
  level: number;

  // Outfit showcase - contains full outfit data for Spine preview
  outfit: OutfitSlot;

  // Showcase stats (engagement-based, not health-based)
  stats: {
    daysActive: number;
    cosmeticsUnlocked: number;
    petInteractions: number;
    customizationChanges: number;
  };

  // Social features - multiple reaction types (emoji only, no text)
  reactions: Record<string, number>; // reactionId -> count
  totalReactions: number; // sum of all reactions

  // Compliments - predefined positive messages by category
  compliments: Record<string, number>; // complimentId -> count
  totalCompliments: number; // sum of all compliments

  lastUpdated: string;

  // Categories they're featured in
  featuredIn: GalleryCategory[];

  // New reactions received (for animation triggers)
  newReactions?: Array<{
    type: string;
    count: number;
    timestamp: string;
  }>;

  // New compliments received (for animation triggers)
  newCompliments?: Array<{
    categoryId: string;
    complimentId: string;
    text: string;
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
  updateMyShowcase: () => void;
  submitForCategory: (category: GalleryCategory) => void;
  addReaction: (entryId: string, reactionType: string) => void;
  addCompliment: (entryId: string, categoryId: string, complimentId: string, complimentText: string) => void;
  fetchGallery: (category: GalleryCategory) => Promise<void>;

  // Animation triggers (for future use)
  getNewReactions: (entryId: string) => Array<{type: string; count: number; timestamp: string}> | undefined;
  clearNewReactions: (entryId: string) => void;
  getNewCompliments: (entryId: string) => Array<{categoryId: string; complimentId: string; text: string; count: number; timestamp: string}> | undefined;
  clearNewCompliments: (entryId: string) => void;

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
  isParticipating: true, // Set to true for easier testing

  updateMyShowcase: () => {
    const userStore = useUserStore.getState();
    const cosmeticsStore = useCosmeticsStore.getState();
    const progressionStore = useProgressionStore.getState();
    const outfitStore = useOutfitStore.getState();
    const publicOutfit = outfitStore.slots.find(slot => slot.id === outfitStore.activePublicOutfit);

    if (!userStore.allowLeaderboards || !userStore.hasCompletedOnboarding || !publicOutfit) {
      return;
    }

    // Create anonymous entry ID based on user data
    const entryId = `showcase_${userStore.displayName}_${Date.now()}`;

    // Create/update player's showcase entry
    const entry: GalleryEntry = {
      id: entryId,
      anonymousGliderName: generateAnonymousGliderName(entryId),
      level: progressionStore.level,

      outfit: publicOutfit,

      stats: {
        daysActive: 1, // Would track this over time
        cosmeticsUnlocked: Object.keys(cosmeticsStore.owned).length,
        petInteractions: 0, // Would track pet taps/interactions
        customizationChanges: 0 // Would track cosmetic changes
      },

      reactions: {}, // Start with no reactions
      totalReactions: 0,
      compliments: {}, // Start with no compliments
      totalCompliments: 0,
      lastUpdated: new Date().toISOString(),
      featuredIn: [],
      // Add lots of mock new reactions for testing (around 10 total)
      newReactions: [
        { type: "cool", count: 3, timestamp: new Date().toISOString() },
        { type: "fire", count: 2, timestamp: new Date().toISOString() },
        { type: "adorable", count: 2, timestamp: new Date().toISOString() },
        { type: "magical", count: 1, timestamp: new Date().toISOString() },
        { type: "champion", count: 1, timestamp: new Date().toISOString() },
        { type: "stunning", count: 1, timestamp: new Date().toISOString() },
      ],
      // Add 3-4 different compliments for testing
      newCompliments: [
        {
          categoryId: "hat",
          complimentId: "cool_hat",
          text: "Cool hat!",
          count: 1,
          timestamp: new Date().toISOString()
        },
        {
          categoryId: "colors",
          complimentId: "beautiful_colors",
          text: "Beautiful colors!",
          count: 2,
          timestamp: new Date().toISOString()
        },
        {
          categoryId: "everything",
          complimentId: "amazing_style",
          text: "Amazing style!",
          count: 1,
          timestamp: new Date().toISOString()
        },
        {
          categoryId: "creativity",
          complimentId: "so_creative",
          text: "So creative!",
          count: 1,
          timestamp: new Date().toISOString()
        }
      ]
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

  addCompliment: (entryId: string, categoryId: string, complimentId: string, complimentText: string) => {
    // In production, this would update backend
    set(state => {
      const newGalleries = { ...state.galleries };

      // Find and update the entry across all galleries
      Object.keys(newGalleries).forEach(category => {
        const categoryKey = category as GalleryCategory;
        newGalleries[categoryKey] = newGalleries[categoryKey].map(entry => {
          if (entry.id === entryId) {
            const currentCompliments = { ...entry.compliments };
            const currentCount = currentCompliments[complimentId] || 0;
            currentCompliments[complimentId] = currentCount + 1;

            const totalCompliments = Object.values(currentCompliments).reduce((sum, count) => sum + count, 0);

            // Track new compliment for animation
            const newCompliments = entry.newCompliments || [];
            const existingNewCompliment = newCompliments.find(c => c.complimentId === complimentId);

            let updatedNewCompliments;
            if (existingNewCompliment) {
              updatedNewCompliments = newCompliments.map(c =>
                c.complimentId === complimentId ? { ...c, count: c.count + 1 } : c
              );
            } else {
              updatedNewCompliments = [...newCompliments, {
                categoryId,
                complimentId,
                text: complimentText,
                count: 1,
                timestamp: new Date().toISOString()
              }];
            }

            return {
              ...entry,
              compliments: currentCompliments,
              totalCompliments,
              newCompliments: updatedNewCompliments
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

  getNewCompliments: (entryId: string) => {
    const state = get();
    // Find entry across all galleries
    for (const category of Object.keys(state.galleries)) {
      const categoryKey = category as GalleryCategory;
      const entry = state.galleries[categoryKey].find(e => e.id === entryId);
      if (entry) {
        return entry.newCompliments;
      }
    }
    return undefined;
  },

  clearNewCompliments: (entryId: string) => {
    set(state => {
      const newGalleries = { ...state.galleries };

      Object.keys(newGalleries).forEach(category => {
        const categoryKey = category as GalleryCategory;
        newGalleries[categoryKey] = newGalleries[categoryKey].map(entry =>
          entry.id === entryId ? { ...entry, newCompliments: [] } : entry
        );
      });

      return { galleries: newGalleries };
    });
  },

  fetchGallery: async (category: GalleryCategory) => {
    // Mock data for development with full outfit data - no user-generated content
    const mockEntries: GalleryEntry[] = [
      {
        id: "player_1",
        anonymousGliderName: generateAnonymousGliderName("player_1"),
        level: 15,
        outfit: {
          id: "mock_outfit_1",
          name: "Viking Style",
          cosmetics: {
            headTop: { itemId: "viking_hat" },
            skin: { itemId: "forest_skin" }
          },
          spineSettings: {
            currentSkin: "Hats/Viking Hat",
            renderMode: "spine"
          },
          skinVariation: 'forest',
          eyeColor: 'brown',
          shoeVariation: 'brown',
          isDefault: false,
          isPublic: true,
          createdAt: new Date(),
          lastModified: new Date()
        },
        stats: { daysActive: 30, cosmeticsUnlocked: 8, petInteractions: 150, customizationChanges: 25 },
        reactions: { cool: 15, fire: 12, champion: 8, stunning: 7 },
        totalReactions: 42,
        compliments: { cool_hat: 5, amazing_style: 8, great_combo: 3 },
        totalCompliments: 16,
        lastUpdated: "2024-03-10T10:00:00Z",
        featuredIn: ["style_stars", "level_leaders"]
      },
      {
        id: "player_2",
        anonymousGliderName: generateAnonymousGliderName("player_2"),
        level: 12,
        outfit: {
          id: "mock_outfit_2",
          name: "Nature Lover",
          cosmetics: {
            headTop: { itemId: "flower_crown" },
            skin: { itemId: "summer_skin" }
          },
          spineSettings: {
            currentSkin: "Hats/Flower Crown",
            renderMode: "spine"
          },
          skinVariation: 'summer',
          eyeColor: 'green',
          shoeVariation: 'green',
          isDefault: false,
          isPublic: true,
          createdAt: new Date(),
          lastModified: new Date()
        },
        stats: { daysActive: 25, cosmeticsUnlocked: 6, petInteractions: 200, customizationChanges: 30 },
        reactions: { adorable: 18, magical: 11, stunning: 9 },
        totalReactions: 38,
        compliments: { beautiful_colors: 12, love_the_colors: 7, so_creative: 4 },
        totalCompliments: 23,
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