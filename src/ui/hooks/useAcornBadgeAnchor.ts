// ui/hooks/useAcornBadgeAnchor.ts
import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
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

  const onLayout = useCallback(() => {
    viewRef.current?.measureInWindow((x, y, w, h) => {
      registerBadgeAnchor({ x: x + w / 2, y: y + h / 2 });
    });
  }, [registerBadgeAnchor]);

  useEffect(() => {
    return () => unregisterBadgeAnchor();
  }, [unregisterBadgeAnchor]);

  return { viewRef, onLayout };
}
