// ui/haptics/hapticsFx.ts
import * as Haptics from "expo-haptics";

export function lightImpact() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
