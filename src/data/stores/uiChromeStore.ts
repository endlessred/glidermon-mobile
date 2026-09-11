// stores/uiChromeStore.ts
//
// Tiny, deliberately non-persisted store for "should the global chrome
// (bottom nav) be hidden right now." Furnish Nest is the first caller
// (HudScreen sets this true/false on enter/exit, App.tsx reads it), but this
// is generic session-only UI state, not a housing/furniture concern -- kept
// separate from housingStore and never written to AsyncStorage since it must
// always reset to visible on a fresh app launch regardless of how the app
// was left.
import { create } from "zustand";

type UiChromeState = {
  hideGlobalNav: boolean;
  setHideGlobalNav: (hidden: boolean) => void;
};

export const useUiChromeStore = create<UiChromeState>()((set) => ({
  hideGlobalNav: false,
  setHideGlobalNav: (hidden) => set({ hideGlobalNav: hidden }),
}));
