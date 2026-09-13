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
   * focus; "medium" on the goal picker; "small" on the board-reveal step
   * where the board itself is the event. Only the character scale + the
   * layout height of this stage change -- the SpineCharacter's GL canvas
   * stays a fixed size so it's never resized/remounted mid-flow. */
  size?: "large" | "medium" | "small";
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
const HERO_SCALE_SMALL = 0.31; // ~26% smaller than medium
// The GL canvas is always HERO_HEIGHT; "small" just clips the empty headroom
// above the (bottom-anchored) character so the stage takes less vertical room.
const STAGE_HEIGHT: Record<NonNullable<Props["size"]>, number> = {
  large: HERO_HEIGHT,
  medium: HERO_HEIGHT,
  small: 168,
};

function GlidermonCheckInHero({ animation, outfit, size = "large" }: Props) {
  const scale =
    size === "large" ? HERO_SCALE_LARGE : size === "small" ? HERO_SCALE_SMALL : HERO_SCALE_MEDIUM;
  return (
    <View style={[styles.wrap, { height: STAGE_HEIGHT[size] }]} pointerEvents="none">
      <SpineCharacter
        animation={animation}
        outfit={outfit}
        width={HERO_WIDTH}
        height={HERO_HEIGHT}
        scale={scale}
        y={HERO_HEIGHT * 0.16}
        ambientIdle={false}
      />
      <ContactShadow
        width={size === "large" ? 148 : size === "small" ? 108 : 134}
        height={size === "small" ? 18 : 22}
        style={styles.shadow}
      />
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
    overflow: "hidden",
  },
  shadow: {
    position: "absolute",
    bottom: 8,
  },
});
