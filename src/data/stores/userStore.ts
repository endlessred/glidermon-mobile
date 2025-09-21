// stores/userStore.ts
import { Platform } from "react-native";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UserState = {
  // Profile information
  glidermonName: string;
  displayName: string; // For leaderboards - privacy-safe name
  playerAvatar?: string; // Future: custom avatar/emoji selection

  // Onboarding and first-time experience
  hasCompletedOnboarding: boolean;
  isFirstLaunch: boolean;
  onboardingStep: number;

  // Privacy and social features
  allowLeaderboards: boolean;
  shareHealthData: boolean; // For aggregate/anonymous analytics

  // Account/sync (future)
  userId?: string;
  lastSync?: string;

  // Hydration status
  _rehydrated: boolean;

  // Actions
  setGlidermonName: (name: string) => void;
  setDisplayName: (name: string) => void;
  completeOnboarding: () => void;
  setOnboardingStep: (step: number) => void;
  setLeaderboardConsent: (allow: boolean) => void;
  setHealthDataConsent: (allow: boolean) => void;
  resetUserData: () => void;
};

// Choose platform storage
const storage = createJSONStorage(() =>
  Platform.OS === "web" ? {
    getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
    removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key))
  } : AsyncStorage
);

const STORE_VERSION = 1;

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      glidermonName: "",
      displayName: "",
      playerAvatar: undefined,

      hasCompletedOnboarding: false,
      isFirstLaunch: true,
      onboardingStep: 0,

      allowLeaderboards: true, // Default to opt-in
      shareHealthData: false, // Default to opt-out for privacy

      userId: undefined,
      lastSync: undefined,

      _rehydrated: false,

      // Actions
      setGlidermonName: (name: string) => {
        set({ glidermonName: name.trim() });
      },

      setDisplayName: (name: string) => {
        set({ displayName: name.trim() });
      },

      completeOnboarding: () => {
        set({
          hasCompletedOnboarding: true,
          isFirstLaunch: false,
          onboardingStep: 0
        });
      },

      setOnboardingStep: (step: number) => {
        set({ onboardingStep: Math.max(0, step) });
      },

      setLeaderboardConsent: (allow: boolean) => {
        set({ allowLeaderboards: allow });
      },

      setHealthDataConsent: (allow: boolean) => {
        set({ shareHealthData: allow });
      },

      resetUserData: () => {
        set({
          glidermonName: "",
          displayName: "",
          playerAvatar: undefined,
          hasCompletedOnboarding: false,
          isFirstLaunch: true,
          onboardingStep: 0,
          allowLeaderboards: true,
          shareHealthData: false,
          userId: undefined,
          lastSync: undefined,
        });
      },
    }),
    {
      name: "glidermon/user-v1",
      version: STORE_VERSION,
      storage,
      partialize: (s) => ({
        glidermonName: s.glidermonName,
        displayName: s.displayName,
        playerAvatar: s.playerAvatar,
        hasCompletedOnboarding: s.hasCompletedOnboarding,
        isFirstLaunch: s.isFirstLaunch,
        onboardingStep: s.onboardingStep,
        allowLeaderboards: s.allowLeaderboards,
        shareHealthData: s.shareHealthData,
        userId: s.userId,
        lastSync: s.lastSync,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn("[user] rehydrate error:", error);
          return;
        }

        try {
          useUserStore.setState((s) => ({
            _rehydrated: true,
          }));
        } catch (e) {
          console.warn("[user] post-rehydrate patch error:", e);
        }
      },
    }
  )
);