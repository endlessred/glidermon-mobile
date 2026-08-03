// ui/hooks/useAcornBadgeAnchor.ts
import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAcornFxStore } from "../../data/stores/acornFxStore";

/**
 * For the persistent acorn badge (currently only mounted on the Home tab):
 * registers its live screen position so AcornFlightOverlay can target it
 * directly instead of spawning a temporary stand-in badge.
 */
export function useAcornBadgeAnchor() {
  const viewRef = useRef<View>(null);
  const registerBadgeAnchor = useAcornFxStore((s) => s.registerBadgeAnchor);
  const unregisterBadgeAnchor = useAcornFxStore((s) => s.unregisterBadgeAnchor);
  const insets = useSafeAreaInsets();

  const onLayout = useCallback(() => {
    // measureInWindow called synchronously inside onLayout can return a
    // stale pre-paint value on the very first layout pass (observed as a
    // negative y -- above the top of the screen). Deferring a frame lets
    // the native layout actually commit first.
    requestAnimationFrame(() => {
      viewRef.current?.measureInWindow((x, y, w, h) => {
        // Separately: measureInWindow on this app measures relative to the
        // window's content area, excluding the top safe-area inset (status
        // bar) -- confirmed empirically against the badge's real on-screen
        // position. AcornFlightOverlay's own default-anchor fallback
        // already accounts for this the same way (`insets.top + 44`).
        registerBadgeAnchor({ x: x + w / 2, y: y + insets.top + h / 2 });
      });
    });
  }, [registerBadgeAnchor, insets.top]);

  useEffect(() => {
    return () => unregisterBadgeAnchor();
  }, [unregisterBadgeAnchor]);

  return { viewRef, onLayout };
}
