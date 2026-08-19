// components/StreakSplashOverlay.tsx
import React, { useEffect } from "react";
import { DotLottie } from "@lottiefiles/dotlottie-react-native";
import { useStreakStore } from "../../data/stores/streakStore";
import { useAcornSource } from "../hooks/useAcornSource";
import { CraftCelebrationModal, FeltFlameAnimation } from "./handcrafted";

const HEART_BROKEN_LOTTIE = require("../../assets/lottie/heart-broken.lottie");

export default function StreakSplashOverlay() {
  const pendingSplash = useStreakStore((s) => s.pendingSplash);
  const dismissSplash = useStreakStore((s) => s.dismissSplash);
  const { sourceRef: milestoneRewardRef, spawnFromRef } = useAcornSource();

  const visible = !!pendingSplash;

  // Milestone acorns are granted synchronously by streakStore.evaluate()
  // before this splash ever appears -- fly them from the reward line once
  // the card has had a beat to pop in.
  useEffect(() => {
    if (pendingSplash?.kind !== "milestone" || !pendingSplash.milestoneReward) return;
    const t = setTimeout(() => spawnFromRef(pendingSplash.milestoneReward!), 420);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSplash?.kind, pendingSplash?.streak]);

  if (!visible) return null;

  const { kind, streak, lostFrom, freezesUsed, milestoneReward } = pendingSplash!;
  const freezeNote = freezesUsed ? `🧊 Used ${freezesUsed} freeze${freezesUsed > 1 ? "s" : ""} to keep it going. ` : "";

  const copy = {
    started: {
      title: "Streak started!",
      message: lostFrom
        ? `Your ${lostFrom}-day streak ended, but a new one just began. Keep it up tomorrow!`
        : "Come back tomorrow to keep it growing.",
    },
    continued: { title: "Streak continued!", message: `${freezeNote}Nice work keeping it going.` },
    milestone: {
      title: "Milestone reached!",
      message: `${freezeNote}+${(milestoneReward ?? 0).toLocaleString()} Acorns! Keep the streak alive.`,
    },
    frozen: {
      title: "Streak protected!",
      message: `Used ${freezesUsed} freeze${(freezesUsed ?? 1) > 1 ? "s" : ""} to cover yesterday. Keep it going today!`,
    },
    lost: {
      title: "Streak lost",
      message: lostFrom ? `Your ${lostFrom}-day streak ended. Start a new one today!` : "Start a new one today!",
    },
  }[kind];

  const isLost = kind === "lost";

  return (
    <CraftCelebrationModal
      visible={visible}
      onDismiss={dismissSplash}
      variant={isLost ? "information" : "celebration"}
      hero={
        isLost ? (
          <DotLottie key="heart-broken" source={HEART_BROKEN_LOTTIE} autoplay loop={false} style={{ width: 84, height: 84 }} />
        ) : (
          <FeltFlameAnimation size={104} />
        )
      }
      title={copy.title}
      value={isLost ? undefined : String(streak)}
      unit={isLost ? undefined : streak === 1 ? "day" : "days"}
      message={copy.message}
      messageRef={kind === "milestone" ? milestoneRewardRef : undefined}
      actionLabel={kind === "lost" || kind === "frozen" ? "Got it!" : "Nice!"}
      sparks={kind === "started"}
    />
  );
}
