// ui/hooks/useAcornSource.ts
import { useCallback, useRef } from "react";
import { View } from "react-native";
import { useAcornFxStore } from "../../data/stores/acornFxStore";

/**
 * For call sites that grant acorns: attach `sourceRef` to whatever element
 * triggered the reward (a button, an icon, a card), then call
 * `spawnFromRef(amount)` right after the store grant to fly acorns from
 * that element's center to the balance badge.
 */
export function useAcornSource() {
  const sourceRef = useRef<View>(null);
  const spawnAcornFx = useAcornFxStore((s) => s.spawnAcornFx);

  const spawnFromRef = useCallback(
    (amount: number) => {
      sourceRef.current?.measureInWindow((x, y, w, h) => {
        spawnAcornFx({ x: x + w / 2, y: y + h / 2 }, amount);
      });
    },
    [spawnAcornFx]
  );

  return { sourceRef, spawnFromRef };
}
