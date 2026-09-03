// ui/components/adventureBoard/useAdventureBoardTextureSet.ts
//
// Generates the in-world Adventure Board texture set (compact + full) from the
// current model, ONLY when the render-relevant state changes -- never on
// Glidermon movement, camera pans, or unrelated Home re-renders. The previous
// set stays returned until a new one is ready (no blank board).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAdventureBoardModel,
  serializeAdventureBoardState,
} from "../../../data/selectors/adventureBoard";
import {
  renderAdventureBoardTextureSet,
  AdventureBoardTextureSet,
} from "./adventureBoardTexture";

export function useAdventureBoardTextureSet(): AdventureBoardTextureSet | null {
  const model = useAdventureBoardModel();
  const version = useMemo(() => serializeAdventureBoardState(model), [model]);
  const [set, setSet] = useState<AdventureBoardTextureSet | null>(null);
  const doneVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (doneVersionRef.current === version) return;
    // Defer off the commit path; Skia offscreen render is fast but not free.
    const id = setTimeout(() => {
      const next = renderAdventureBoardTextureSet(model, version);
      if (next) {
        doneVersionRef.current = version;
        setSet(next); // keep the previous set on failure
      }
    }, 0);
    return () => clearTimeout(id);
  }, [version, model]);

  return set;
}
