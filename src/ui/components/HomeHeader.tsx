// ui/components/HomeHeader.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useUserStore } from "../../data/stores/userStore";
import AcornBadgeVisual from "./AcornBadgeVisual";
import StreakBadge from "./StreakBadge";
import { CraftPanel, INK } from "./handcrafted";

type Props = {
  acornAnchorRef: React.RefObject<View | null>;
  onAcornBadgeLayout: () => void;
  onStreakPress?: () => void;
};

// Compact crafted header replacing the old plain name/acorn/streak row --
// warm kraft cardstock strip. Deliberately low-height and low-decoration so
// the Nest below stays the dominant thing on screen; currency/streak read
// as small attached paper badges rather than a second competing surface.
export default function HomeHeader({ acornAnchorRef, onAcornBadgeLayout, onStreakPress }: Props) {
  const glidermonName = useUserStore((s) => s.glidermonName);

  return (
    <CraftPanel
      texture="kraft"
      stitched={false}
      shadow="card"
      grainOpacity={0.14}
      inset={10}
      style={styles.wrap}
      contentStyle={styles.content}
    >
      <Text style={styles.name} numberOfLines={1}>
        {glidermonName || "Glidermon"}
      </Text>
      <View style={styles.badges}>
        <View ref={acornAnchorRef} onLayout={onAcornBadgeLayout}>
          <AcornBadgeVisual width={92} height={34} />
        </View>
        <StreakBadge onPress={onStreakPress} />
      </View>
    </CraftPanel>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 64,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: INK,
    flexShrink: 1,
    marginRight: 8,
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
