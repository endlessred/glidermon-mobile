// components/checkin/GlidermonCheckInHero.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import SpineCharacter from "../../../game/view/SpineCharacter";
import ContactShadow from "../handcrafted/ContactShadow";
import { OutfitSlot } from "../../../data/types/outfitTypes";

type Props = {
  /** Spine animation tag for the current step. */
  animation: string;
  outfit?: OutfitSlot | null;
  /** "large" on the greeting / completion steps where GliderMon is the
   * focus; "medium" on the goal picker where the choices lead. Only the
   * character scale changes between them -- the GL frame stays a fixed size
   * so the canvas is never resized/remounted mid-flow. */
  size?: "large" | "medium";
};

// One consistent, centered GliderMon stage used on every check-in step so
// the character feels like a stable guide through the ritual rather than
// jumping size/position between screens, with a soft contact shadow to
// ground it and enough headroom that no outfit/hair/hat combo crops against
// the frame. The canvas is transparent -- no accidental square behind him.
//
// `ambientIdle={false}`: the lifelike idle driver's ambient life (eye-looks,
// fidgets, the reading sequence, body composites) is suppressed here so the
// character plays ONLY the step's animation -- no book appearing mid-cheer.
const HERO_WIDTH = 268;
const HERO_HEIGHT = 250;
const HERO_SCALE_LARGE = 0.46;
const HERO_SCALE_MEDIUM = 0.42;

function GlidermonCheckInHero({ animation, outfit, size = "large" }: Props) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <SpineCharacter
        animation={animation}
        outfit={outfit}
        width={HERO_WIDTH}
        height={HERO_HEIGHT}
        scale={size === "large" ? HERO_SCALE_LARGE : HERO_SCALE_MEDIUM}
        y={HERO_HEIGHT * 0.16}
        ambientIdle={false}
      />
      <ContactShadow width={size === "large" ? 148 : 134} height={22} style={styles.shadow} />
    </View>
  );
}

// Memoised so re-rendering the step content below never remounts the GL
// canvas -- only `animation` / `size` prop changes reach the character.
export default React.memo(GlidermonCheckInHero);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: HERO_HEIGHT,
  },
  shadow: {
    position: "absolute",
    bottom: 8,
  },
});
