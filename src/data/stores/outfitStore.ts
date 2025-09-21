// data/stores/outfitStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  OutfitStorage,
  OutfitActions,
  OutfitSlot,
  UserCosmeticCustomization,
  CosmeticSocket,
  PoseCosmetic,
  DEFAULT_POSE,
  validateAdjustment
} from "../types/outfitTypes";

type OutfitStore = OutfitStorage & OutfitActions & {
  _rehydrated: boolean;
};

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Create default outfit
function createDefaultOutfit(): OutfitSlot {
  return {
    id: generateId(),
    name: "Default Outfit",
    cosmetics: {},
    isDefault: true,
    isPublic: false,
    createdAt: new Date(),
    lastModified: new Date()
  };
}

// Create default public outfit
function createDefaultPublicOutfit(): OutfitSlot {
  return {
    id: generateId(),
    name: "Gallery Look",
    cosmetics: {
      pose: {
        itemId: DEFAULT_POSE.id
      }
    },
    isDefault: false,
    isPublic: true,
    createdAt: new Date(),
    lastModified: new Date()
  };
}

export const useOutfitStore = create<OutfitStore>()(
  persist(
    (set, get) => ({
      // Initial state
      slots: [],
      maxSlots: 3,
      activeLocalOutfit: "",
      activePublicOutfit: "",
      unlockedCustomizations: ["position"], // Start with basic positioning
      poses: [DEFAULT_POSE],
      _rehydrated: false,

      // Slot management
      createOutfit: (name: string) => {
        const { slots, maxSlots } = get();

        if (slots.length >= maxSlots) {
          throw new Error("Maximum outfit slots reached");
        }

        const newOutfit: OutfitSlot = {
          id: generateId(),
          name,
          cosmetics: {},
          isDefault: false,
          isPublic: false,
          createdAt: new Date(),
          lastModified: new Date()
        };

        set(state => ({
          slots: [...state.slots, newOutfit]
        }));

        return newOutfit.id;
      },

      deleteOutfit: (id: string) => {
        const { slots, activeLocalOutfit, activePublicOutfit } = get();

        // Don't allow deleting active outfits
        if (id === activeLocalOutfit || id === activePublicOutfit) {
          throw new Error("Cannot delete active outfit");
        }

        set(state => ({
          slots: state.slots.filter(slot => slot.id !== id)
        }));
      },

      duplicateOutfit: (id: string, newName: string) => {
        const { slots } = get();
        const originalOutfit = slots.find(slot => slot.id === id);

        if (!originalOutfit) {
          throw new Error("Outfit not found");
        }

        const duplicatedOutfit: OutfitSlot = {
          ...originalOutfit,
          id: generateId(),
          name: newName,
          isDefault: false,
          isPublic: false,
          createdAt: new Date(),
          lastModified: new Date()
        };

        set(state => ({
          slots: [...state.slots, duplicatedOutfit]
        }));

        return duplicatedOutfit.id;
      },

      renameOutfit: (id: string, newName: string) => {
        set(state => ({
          slots: state.slots.map(slot =>
            slot.id === id
              ? { ...slot, name: newName, lastModified: new Date() }
              : slot
          )
        }));
      },

      // Outfit activation
      setLocalOutfit: (id: string) => {
        const { slots } = get();

        if (!slots.find(slot => slot.id === id)) {
          throw new Error("Outfit not found");
        }

        set({ activeLocalOutfit: id });
      },

      setPublicOutfit: (id: string) => {
        const { slots } = get();

        if (!slots.find(slot => slot.id === id)) {
          throw new Error("Outfit not found");
        }

        set({ activePublicOutfit: id });
      },

      // Cosmetic management
      equipCosmetic: (outfitId: string, socket: CosmeticSocket, itemId: string) => {
        set(state => ({
          slots: state.slots.map(slot =>
            slot.id === outfitId
              ? {
                  ...slot,
                  cosmetics: {
                    ...slot.cosmetics,
                    [socket]: { itemId }
                  },
                  lastModified: new Date()
                }
              : slot
          )
        }));
      },

      unequipCosmetic: (outfitId: string, socket: CosmeticSocket) => {
        set(state => ({
          slots: state.slots.map(slot =>
            slot.id === outfitId
              ? {
                  ...slot,
                  cosmetics: {
                    ...slot.cosmetics,
                    [socket]: undefined
                  },
                  lastModified: new Date()
                }
              : slot
          )
        }));
      },

      customizeCosmetic: (outfitId: string, socket: CosmeticSocket, customization: UserCosmeticCustomization) => {
        // Validate adjustment bounds
        if (!validateAdjustment(customization.adjustments)) {
          throw new Error("Adjustment values out of bounds");
        }

        set(state => ({
          slots: state.slots.map(slot =>
            slot.id === outfitId
              ? {
                  ...slot,
                  cosmetics: {
                    ...slot.cosmetics,
                    [socket]: slot.cosmetics[socket]
                      ? { ...slot.cosmetics[socket]!, customization }
                      : undefined
                  },
                  lastModified: new Date()
                }
              : slot
          )
        }));
      },

      // Pose management
      setPose: (outfitId: string, poseId: string) => {
        const { poses } = get();

        if (!poses.find(pose => pose.id === poseId)) {
          throw new Error("Pose not found");
        }

        set(state => ({
          slots: state.slots.map(slot =>
            slot.id === outfitId
              ? {
                  ...slot,
                  cosmetics: {
                    ...slot.cosmetics,
                    pose: { itemId: poseId }
                  },
                  lastModified: new Date()
                }
              : slot
          )
        }));
      },

      // Utility
      resetCosmeticToDefault: (outfitId: string, socket: CosmeticSocket) => {
        set(state => ({
          slots: state.slots.map(slot =>
            slot.id === outfitId
              ? {
                  ...slot,
                  cosmetics: {
                    ...slot.cosmetics,
                    [socket]: slot.cosmetics[socket]
                      ? { ...slot.cosmetics[socket]!, customization: undefined }
                      : undefined
                  },
                  lastModified: new Date()
                }
              : slot
          )
        }));
      },

      generateThumbnail: async (outfitId: string) => {
        // TODO: Implement thumbnail generation
        // This would capture a screenshot of the character with the outfit
        return `thumbnail_${outfitId}_${Date.now()}`;
      },

      exportOutfitCode: (outfitId: string) => {
        const { slots } = get();
        const outfit = slots.find(slot => slot.id === outfitId);

        if (!outfit) {
          throw new Error("Outfit not found");
        }

        // Create a shareable code (base64 encoded outfit data)
        const outfitData = {
          name: outfit.name,
          cosmetics: outfit.cosmetics
        };

        return btoa(JSON.stringify(outfitData));
      },

      importOutfitCode: (code: string) => {
        try {
          const outfitData = JSON.parse(atob(code));

          const importedOutfit: OutfitSlot = {
            id: generateId(),
            name: `${outfitData.name} (Imported)`,
            cosmetics: outfitData.cosmetics,
            isDefault: false,
            isPublic: false,
            createdAt: new Date(),
            lastModified: new Date()
          };

          return importedOutfit;
        } catch (error) {
          return null;
        }
      }
    }),
    {
      name: "outfit-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._rehydrated = true;

          // Initialize with default outfits if none exist
          if (state.slots.length === 0) {
            const defaultLocal = createDefaultOutfit();
            const defaultPublic = createDefaultPublicOutfit();

            state.slots = [defaultLocal, defaultPublic];
            state.activeLocalOutfit = defaultLocal.id;
            state.activePublicOutfit = defaultPublic.id;
          }
        }
      }
    }
  )
);

// Selectors for easier access
export const useActiveLocalOutfit = () => useOutfitStore(state =>
  state.slots.find(slot => slot.id === state.activeLocalOutfit)
);

export const useActivePublicOutfit = () => useOutfitStore(state =>
  state.slots.find(slot => slot.id === state.activePublicOutfit)
);

export const useOutfitSlots = () => useOutfitStore(state => state.slots);

export const useAvailablePoses = () => useOutfitStore(state => state.poses);