// components/checkin/CheckInProgress.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { INK_MUTED, FELT_GREEN, FELT_GREEN_DARK, KRAFT_TAN, CREAM_LIGHT } from "./tokens";

type Props = {
  /** 1-based current stop. */
  current: number;
  /** Total stops in the ritual. */
  total: number;
};

// A small handmade "how far through the ritual" marker: completed + current
// stops read muted green, stops still ahead read kraft/brown, joined by
// short dashed threads -- plus a quiet "N of M" caption. Deliberately not a
// progress bar; the flow should feel short and intentional.
export default function CheckInProgress({ current, total }: Props) {
  const dots = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <View style={styles.wrap} accessibilityLabel={`Step ${current} of ${total}`}>
      <View style={styles.track}>
        {dots.map((n) => (
          <React.Fragment key={n}>
            {n > 1 ? <View style={[styles.thread, n <= current ? styles.threadDone : styles.threadFuture]} /> : null}
            <View
              style={[
                styles.dot,
                n < current && styles.dotDone,
                n === current && styles.dotCurrent,
                n > current && styles.dotFuture,
              ]}
            />
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.caption}>
        {current} of {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 6,
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
  },
  thread: {
    width: 28,
    borderTopWidth: 2,
    borderStyle: "dashed",
    marginHorizontal: 4,
  },
  threadDone: {
    borderTopColor: FELT_GREEN_DARK,
    opacity: 0.7,
  },
  threadFuture: {
    borderTopColor: KRAFT_TAN,
    opacity: 0.8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  dotDone: {
    backgroundColor: FELT_GREEN,
    borderColor: FELT_GREEN_DARK,
  },
  dotCurrent: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: FELT_GREEN_DARK,
    backgroundColor: CREAM_LIGHT,
  },
  dotFuture: {
    backgroundColor: CREAM_LIGHT,
    borderColor: KRAFT_TAN,
  },
  caption: {
    color: INK_MUTED,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
