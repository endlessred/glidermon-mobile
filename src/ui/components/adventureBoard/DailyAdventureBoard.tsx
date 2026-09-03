// ui/components/adventureBoard/DailyAdventureBoard.tsx
//
// The ONE dynamic-content surface for the Daily Adventure Board, shared by:
//   - variant="house"   : projected RN overlay aligned to the Spine board's
//                         placeholder interior in the room (HouseBoardOverlay)
//   - variant="checkin" : the Morning Check-In "setting up today's adventures"
//                         reveal step (wrapped by DailyAdventureBoardPreview)
//
// Both variants render the same view model (useAdventureBoardModel) -- one
// source of truth. No goal business logic here; it only presents `model`.
//
// The wooden frame (Spine board in-world, or the preview frame in check-in)
// carries the visual weight and the "Today's Adventures" plaque. This surface
// stays deliberately quiet: a calm cream sheet, thin/absent borders, a single
// hairline divider, no nested cards.
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import BoardSurface from "./BoardSurface";
import CheckBadge from "../handcrafted/CheckBadge";
import CraftPrimaryButton from "../checkin/CraftPrimaryButton";
import { AdventureBoardModel, MinorGoalView, PrimaryGoalView } from "../../../data/selectors/adventureBoard";
import {
  BOARD_INK,
  BOARD_INK_MUTED,
  BOARD_GREEN,
  BOARD_AMBER,
  BOARD_HAIRLINE,
  REVEAL_PRIMARY,
  REVEAL_MINOR_1,
  REVEAL_MINOR_2,
  REVEAL_SUMMARY,
} from "./boardStyles";

let PhosphorIcons: any = {};
try {
  PhosphorIcons = require("phosphor-react-native");
} catch {
  /* emoji fallback below */
}

const MAX_VISIBLE_MINOR = 2;

type Props = {
  variant: "house" | "checkin";
  model: AdventureBoardModel;
  /** house variant, not-planned state: launch the existing Morning Check-In. */
  onStartCheckIn?: () => void;
  /** checkin variant: staggered reveal cursor (see boardStyles). undefined =
   * show everything at once (house variant). */
  revealStep?: number;
  /** "fill" (house) makes the surface fill its positioned box and centre the
   * content; otherwise (checkin) the content defines the surface height. */
  fill?: boolean;
  /** "compact" is the small in-room projection when the Goals camera isn't
   * active -- a one-glance status only. "full" (default, and always in Goals
   * mode) shows the primary goal, minor goals and the daily summary. */
  density?: "full" | "compact";
};

export default function DailyAdventureBoard({
  variant,
  model,
  onStartCheckIn,
  revealStep,
  fill = variant === "house",
  density = "full",
}: Props) {
  const shown = (at: number) => revealStep === undefined || revealStep >= at;

  if (density === "compact") return <CompactBoard model={model} fill={fill} />;

  const visibleMinor = model.minorGoals.slice(0, MAX_VISIBLE_MINOR);
  const hiddenMinor = model.minorGoals.length - visibleMinor.length;

  return (
    <BoardSurface fill={fill} contentStyle={variant === "house" ? styles.padHouse : styles.padCheckin}>
      {model.state === "not-planned" ? (
        <View style={styles.notPlanned}>
          <Text style={styles.notPlannedLine}>Plan today's adventures!</Text>
          {variant === "house" && onStartCheckIn && (
            <CraftPrimaryButton label="Start Check-In" accent="sunrise" onPress={onStartCheckIn} />
          )}
        </View>
      ) : (
        <View style={styles.body}>
          {model.primary && (
            <Reveal visible={shown(REVEAL_PRIMARY)}>
              <PrimaryGoal primary={model.primary} />
            </Reveal>
          )}

          <View style={styles.divider} />

          <View style={styles.minorList}>
            {visibleMinor.map((g, i) => (
              <Reveal key={g.id} visible={shown(i === 0 ? REVEAL_MINOR_1 : REVEAL_MINOR_2)}>
                <MinorRow goal={g} last={i === visibleMinor.length - 1} />
              </Reveal>
            ))}
          </View>

          <Reveal visible={shown(REVEAL_SUMMARY)}>
            <Text style={styles.summary} numberOfLines={1}>
              🌰 {model.dailyAcorns} today
              {hiddenMinor > 0 ? `  ·  +${hiddenMinor} more` : ""}
            </Text>
          </Reveal>
        </View>
      )}
    </BoardSurface>
  );
}

// ── Compact (Nest-mode) status glance ──────────────────────────────────
function CompactBoard({ model, fill }: { model: AdventureBoardModel; fill: boolean }) {
  let big: string;
  let sub: string | null;
  let tint: string | undefined;

  if (model.state === "not-planned") {
    big = "Plan";
    sub = "today";
  } else if (model.state === "complete") {
    big = "DONE!";
    sub = null;
    tint = BOARD_GREEN;
  } else {
    const left = model.minorGoals.filter((g) => !g.done).length;
    const p = model.primary;
    big = !p ? String(left) : p.evaluation === "met" ? "✓" : primaryGlance(p);
    sub = left > 0 ? `${left} left` : "on track";
    if (p?.evaluation === "met") tint = BOARD_GREEN;
  }

  return (
    <BoardSurface fill={fill} contentStyle={styles.compactContent}>
      <Text style={[styles.compactBig, tint ? { color: tint } : null]}>{big}</Text>
      {sub && <Text style={styles.compactSub}>{sub}</Text>}
    </BoardSurface>
  );
}

function primaryGlance(p: PrimaryGoalView): string {
  if (p.displayKind === "tir-pct") return `${p.displayMetric}%`;
  return String(p.displayMetric);
}

// ── Reveal wrapper: quick fade/slide in, or nothing when already visible ──
function Reveal({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const a = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible, a]);
  return (
    <Animated.View
      style={{
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}
      pointerEvents={visible ? "auto" : "none"}
    >
      {children}
    </Animated.View>
  );
}

// ── Primary glucose goal -- the one prominent dynamic element ───────────
function PrimaryGoal({ primary }: { primary: PrimaryGoalView }) {
  const met = primary.evaluation === "met";
  const missed = primary.evaluation === "missed";

  const bigValue =
    primary.displayKind === "tir-pct" ? `${primary.displayMetric}%` : `${primary.displayMetric}`;

  const subtitle =
    primary.displayKind === "tir-pct"
      ? primary.targetPct != null
        ? `Target: ${primary.targetPct}%`
        : ""
      : primary.displayKind === "highs-count"
      ? `${primary.displayMetric === 1 ? "1 high" : `${primary.displayMetric} highs`} so far`
      : `${primary.displayMetric === 1 ? "1 low" : `${primary.displayMetric} lows`} so far`;

  const statusLabel = primary.windowEnded
    ? met
      ? "Done"
      : "Missed"
    : primary.onTrack
    ? "On track"
    : "Off track";
  const statusColor = primary.windowEnded
    ? met
      ? BOARD_GREEN
      : BOARD_AMBER
    : primary.onTrack
    ? BOARD_GREEN
    : BOARD_AMBER;

  return (
    <View style={styles.primary}>
      <View style={styles.primaryLeft}>
        {met ? (
          <CheckBadge size={28} />
        ) : (
          <Text style={[styles.primaryValue, missed && { color: BOARD_INK_MUTED }]}>{bigValue}</Text>
        )}
      </View>
      <View style={styles.primaryRight}>
        <Text style={styles.primaryLabel} numberOfLines={1}>{primary.label}</Text>
        {!!subtitle && (
          <Text style={styles.primarySub} numberOfLines={1}>{subtitle}</Text>
        )}
        <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

// ── Minor goal row -- simpler than the primary: icon · title · control ──
function MinorRow({ goal, last }: { goal: MinorGoalView; last: boolean }) {
  const Icon = PhosphorIcons[goal.icon];
  return (
    <View style={[styles.minor, !last && styles.minorRule]}>
      <View style={styles.minorIcon}>
        {Icon ? (
          <Icon size={15} color={goal.done ? BOARD_INK_MUTED : BOARD_INK} weight="bold" />
        ) : (
          <Text style={[styles.minorEmoji, goal.done && { opacity: 0.6 }]}>{goal.emojiFallback}</Text>
        )}
      </View>
      <Text style={[styles.minorTitle, goal.done && styles.minorTitleDone]} numberOfLines={1}>
        {goal.title}
      </Text>
      {goal.done ? <CheckBadge size={16} /> : <View style={styles.emptyCircle} />}
    </View>
  );
}

const styles = StyleSheet.create({
  // Content padding between the full-bleed cream surface and the goal content.
  // house is tighter (the surface is small at Goals-camera scale) but still
  // gives the text clear breathing room off the wooden lip.
  padHouse: { paddingHorizontal: 12, paddingTop: 11, paddingBottom: 10 },
  padCheckin: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },

  compactContent: { alignItems: "center", justifyContent: "center", padding: 6 },
  compactBig: { fontSize: 15, fontWeight: "900", color: BOARD_INK, textAlign: "center", letterSpacing: 0.3 },
  compactSub: { fontSize: 10.5, fontWeight: "700", color: BOARD_INK_MUTED, textAlign: "center", marginTop: 1 },

  notPlanned: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 6 },
  notPlannedLine: { fontSize: 14, fontWeight: "700", color: BOARD_INK_MUTED, textAlign: "center" },

  body: { gap: 10 },

  primary: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 2 },
  primaryLeft: { alignItems: "flex-start", justifyContent: "center" },
  primaryValue: { fontSize: 20, fontWeight: "900", color: BOARD_INK, letterSpacing: -0.5 },
  primaryRight: { flex: 1, gap: 1 },
  primaryLabel: { fontSize: 13, fontWeight: "800", color: BOARD_INK },
  primarySub: { fontSize: 10.5, fontWeight: "600", color: BOARD_INK_MUTED },
  status: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.3, marginTop: 2 },

  divider: { height: 1, backgroundColor: BOARD_HAIRLINE, marginHorizontal: 2 },

  minorList: { paddingHorizontal: 2 },
  minor: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  minorRule: { borderBottomWidth: 1, borderBottomColor: BOARD_HAIRLINE },
  minorIcon: { width: 15, alignItems: "center" },
  minorEmoji: { fontSize: 13 },
  minorTitle: { flex: 1, fontSize: 11.5, fontWeight: "700", color: BOARD_INK },
  minorTitleDone: { color: BOARD_INK_MUTED },
  emptyCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: BOARD_INK,
    backgroundColor: "transparent",
  },

  summary: { fontSize: 12, fontWeight: "800", color: BOARD_INK, textAlign: "center", marginTop: 2 },
});
