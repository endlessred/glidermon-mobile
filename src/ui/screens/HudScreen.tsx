import React, { useEffect, useState } from "react";
import { View, ScrollView, useWindowDimensions, BackHandler, Platform } from "react-native";
import { useGalleryStore } from "../../data/stores/galleryStore";
import { useTheme } from "../../data/hooks/useTheme";
import { useComplimentShower } from "../components/ComplimentShower";
import { useActiveLocalOutfit } from "../../data/stores/outfitStore";
import { IsometricHousingThreeJS, IsometricRoomView, IsometricRoomView3D } from "../../game/housing";

// Housing renderer switch: 'legacy' is the original Spine-room-skeleton
// renderer (root cause of choppy character animation, kept only as a
// fallback); 'quad' is the Phase 1 flat-sprite-plane rewrite (kept as a
// fallback); 'primitive3d' is the real-3D-primitive room shell -- now the
// default. Known gap vs 'quad': no camera preset support yet (fast-follow).
type HousingRenderer = 'legacy' | 'quad' | 'primitive3d';
const HOUSING_RENDERER: HousingRenderer = 'primitive3d';
// Dev-only furniture picker -- kept out of the normal layout even in dev
// builds (FurnitureDevPanel itself is already __DEV__-gated); flip this
// locally when you actually need it rather than leaving it always-on.
const SHOW_FURNITURE_DEV_PANEL = false;
import HomeHeader from "../components/HomeHeader";
import NestCraftPanel from "../components/NestCraftPanel";
import CameraPresetTabs, { CameraMode } from "../components/CameraPresetTabs";
import FurnishToolbar from "../components/FurnishToolbar";
import FurnishInventoryArea from "../components/furnish/FurnishInventoryArea";
import { useAdventureBoardTextureSet } from "../components/adventureBoard/useAdventureBoardTextureSet";
import AdventureBoardA11y from "../components/adventureBoard/AdventureBoardA11y";
import { useAdventureBoardNotPlanned } from "../../data/selectors/adventureBoard";
import { useAcornBadgeAnchor } from "../hooks/useAcornBadgeAnchor";
import { CheckInCard } from "../components/CheckInCard";
import DailyGoalBoard from "../components/DailyGoalBoard";
import { CheckInFlowModal } from "../components/CheckInFlowModal";
import StreakDetailModal from "../components/StreakDetailModal";
import { useCheckInStore } from "../../data/stores/checkInStore";
import FurnitureDevPanel from "../components/FurnitureDevPanel";
import CraftConfirmModal from "../components/handcrafted/CraftConfirmModal";
import { useFurnishSession } from "../hooks/useFurnishSession";
import { useUiChromeStore } from "../../data/stores/uiChromeStore";
import { useHousingStore } from "../../data/stores/housingStore";

// Same mint used on the Equip screen -- ties Home into the same crafted
// visual system without making every screen identical.
const HOME_BACKGROUND = "#BFE0DA";

export default function HudScreen() {
  const { width, height } = useWindowDimensions();
  const { spacing } = useTheme();
  const { viewRef: acornBadgeAnchorRef, onLayout: onAcornBadgeLayout } = useAcornBadgeAnchor();

  // Local outfit for character display (what the user sees in their own app)
  const localOutfit = useActiveLocalOutfit();

  // Gallery system for compliment shower
  const { myEntry, getNewReactions, clearNewReactions } = useGalleryStore();
  const { triggerShower, ComplimentShowerComponent } = useComplimentShower();

  // Check-in state
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [streakDetailOpen, setStreakDetailOpen] = useState(false);
  const availableSlot = useCheckInStore(s => s.availableSlot());
  const resetDailyIfNeeded = useCheckInStore(s => s.resetDailyIfNeeded);

  useEffect(() => {
    resetDailyIfNeeded();
  }, []);

  // Camera preset selected via CameraPresetTabs -- "nest" is the standard
  // wide overview, "glidermon" activates the existing close/follow camera.
  // Only reflects a deliberate tab press, never changes on its own.
  const [cameraMode, setCameraMode] = useState<CameraMode>("nest");

  // In-world Adventure Board: the dynamic goal UI is a Skia-drawn texture on a
  // plane inside the room scene (not an RN overlay), so it depth-sorts against
  // Glidermon / furniture. Textures regenerate only on board-state changes.
  const boardTextures = useAdventureBoardTextureSet();
  const boardNotPlanned = useAdventureBoardNotPlanned();
  const boardInteractive = cameraMode === "goals" && boardNotPlanned && !!availableSlot;

  // Glidermon room fills roughly the same vertical budget it always has;
  // its GL view is sized to whatever that box measures out to via
  // onLayout, rather than a fixed pixel size.
  const [roomBoxSize, setRoomBoxSize] = useState<{ width: number; height: number } | null>(null);

  // ===== Furnish Nest: contextual slot-based furniture editor, reached from
  // the Nest tab's contextual menu (CameraPresetTabs). See useFurnishSession
  // for the draft-session model; nothing is written to housingStore until
  // Done. =====
  const furnish = useFurnishSession();
  const setHideGlobalNav = useUiChromeStore((s) => s.setHideGlobalNav);
  const roomSizeTier = useHousingStore((s) => s.roomSizeTier);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    setHideGlobalNav(furnish.active);
    return () => setHideGlobalNav(false);
  }, [furnish.active, setHideGlobalNav]);

  // Furnish always starts from (and stays on) the normal Nest overview --
  // Glidermon/Goals camera tabs are hidden anyway while editing, this just
  // guarantees the state is correct if the player was on one beforehand.
  useEffect(() => {
    if (furnish.active) setCameraMode("nest");
  }, [furnish.active]);

  const requestExitFurnish = () => {
    if (!furnish.dirty) {
      furnish.discard();
      return;
    }
    setDiscardConfirmOpen(true);
  };

  // Android hardware back mirrors Cancel while furnishing -- never silently
  // discards unsaved changes.
  useEffect(() => {
    if (Platform.OS !== "android" || !furnish.active) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      requestExitFurnish();
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [furnish.active, furnish.dirty]);

  // The Nest is the visual hero of Home -- sized a bit larger than a plain
  // third of the screen so it reads as more visually important.
  //
  // NOTE: does NOT grow while Furnish Nest is active. The spec asks for the
  // room to grow ~10-15% taller while furnishing, but on-device testing
  // (Android emulator, expo-gl) showed the underlying GL surface's own
  // buffer never resizes after creation -- growing this box just left an
  // unpainted band above the room, since the rendered content stayed
  // pinned at its original pixel size. Making it grow correctly would
  // require remounting IsometricRoomView3D (a new GL context -- texture/
  // Spine reload) on every Furnish enter/exit, which reads as a worse
  // regression than a same-size preview. See IsometricRoomView3D.tsx's
  // syncGlSizeIfChanged for the full account.
  const roomSectionHeight = Math.round((height / 3) * 1.12);
  const roomCardWidth = width - spacing.lg * 2;

  // Check for new reactions and trigger compliment shower
  useEffect(() => {
    if (myEntry) {
      const newReactions = getNewReactions(myEntry.id);
      if (newReactions && newReactions.length > 0) {
        // Trigger the compliment shower animation
        triggerShower(newReactions);

        // Clear the new reactions after triggering
        setTimeout(() => {
          clearNewReactions(myEntry.id);
        }, 3000); // Clear after animation completes
      }
    }
  }, [myEntry, getNewReactions, clearNewReactions, triggerShower]);

  return (
    <View style={{ flex: 1, backgroundColor: HOME_BACKGROUND }}>
      {/* ===== Header + Nest (fixed, non-scrolling -- the Nest stays the
          dominant, always-visible element) ===== */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }}>
        <HomeHeader
          acornAnchorRef={acornBadgeAnchorRef}
          onAcornBadgeLayout={onAcornBadgeLayout}
          onStreakPress={() => setStreakDetailOpen(true)}
        />

        <NestCraftPanel style={{ width: roomCardWidth, height: roomSectionHeight }}>
          {SHOW_FURNITURE_DEV_PANEL && HOUSING_RENDERER === 'primitive3d' && <FurnitureDevPanel />}
          <View
            style={{ flex: 1, overflow: 'hidden', borderRadius: 8 }}
            onLayout={(e) => {
              const rw = Math.round(e.nativeEvent.layout.width);
              const rh = Math.round(e.nativeEvent.layout.height);
              setRoomBoxSize((prev) => (prev && prev.width === rw && prev.height === rh) ? prev : { width: rw, height: rh });
            }}
          >
            {roomBoxSize && (
              HOUSING_RENDERER === 'legacy' ? (
                <IsometricHousingThreeJS
                  width={roomBoxSize.width}
                  height={roomBoxSize.height}
                  gridColumn={1}
                  gridRow={0}
                  characterScale={0.3}
                  outfit={localOutfit ?? undefined}
                />
              ) : HOUSING_RENDERER === 'primitive3d' ? (
                <IsometricRoomView3D
                  width={roomBoxSize.width}
                  height={roomBoxSize.height}
                  characterScale={0.35}
                  outfit={localOutfit ?? undefined}
                  cameraMode={cameraMode}
                  boardTextures={boardTextures}
                  boardInteractive={boardInteractive}
                  onBoardTap={() => setCheckInOpen(true)}
                  furnishMode={furnish.active}
                  draftFurnitureBySlot={furnish.active ? furnish.draftPlacements : null}
                  selectedSlotId={furnish.selectedSlotId}
                  draftSurfaces={furnish.active ? furnish.draftSurfaces : null}
                  selectedSurface={furnish.selectedSurface}
                  onSelectTarget={furnish.selectTarget}
                />
              ) : (
                <IsometricRoomView
                  width={roomBoxSize.width}
                  height={roomBoxSize.height}
                  gridColumn={1}
                  gridRow={0}
                  characterScale={0.3}
                  outfit={localOutfit ?? undefined}
                />
              )
            )}

          </View>
        </NestCraftPanel>

        {/* Non-visual screen-reader summary of the in-world board while the
            Goals camera frames it (its text is now a GL texture). Furnish
            forces the Nest camera, so `active` is already false while
            editing -- no extra guard needed here. */}
        <AdventureBoardA11y
          active={HOUSING_RENDERER === 'primitive3d' && cameraMode === 'goals'}
          onStartCheckIn={boardInteractive ? () => setCheckInOpen(true) : undefined}
        />

        {furnish.active ? (
          <FurnishToolbar onCancel={requestExitFurnish} onDone={furnish.commit} dirty={furnish.dirty} />
        ) : (
          <CameraPresetTabs
            mode={cameraMode}
            onSelectNest={() => setCameraMode("nest")}
            onSelectGlidermon={() => setCameraMode("glidermon")}
            onSelectGoals={() => setCameraMode("goals")}
            nestContextualActions={[{ id: "furnish", label: "Furnish Nest", icon: "🪑", onPress: furnish.enter }]}
          />
        )}
      </View>

      {/* ===== Rest of the HUD, scrollable below the Nest -- replaced by the
          furniture inventory panel while Furnish Nest is active ===== */}
      {furnish.active ? (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg }}>
          <FurnishInventoryArea
            selectedTarget={furnish.selectedTarget}
            roomSizeTier={roomSizeTier}
            draftPlacements={furnish.draftPlacements}
            onSelectFurniture={furnish.placeFurniture}
            onRemoveFurniture={furnish.removeFurniture}
            draftSurfaces={furnish.draftSurfaces}
            onPreviewSurface={furnish.placeSurface}
            onApplyTheme={furnish.applyThemeDraft}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md + 6,
            gap: spacing.lg + 6,
            paddingBottom: spacing['3xl'],
          }}
        >
          {/* ===== Check-In Card: a deliberate special interaction, shown
              above Today's Goals whenever a slot is currently relevant ===== */}
          {availableSlot && <CheckInCard onPress={() => setCheckInOpen(true)} />}

          {/* ===== Today's Goals: one coherent handcrafted board ===== */}
          <DailyGoalBoard />
        </ScrollView>
      )}

      {/* Compliment Shower Animation Overlay */}
      {ComplimentShowerComponent}

      <CheckInFlowModal
        visible={checkInOpen}
        slot={availableSlot}
        onClose={() => setCheckInOpen(false)}
      />

      <StreakDetailModal
        visible={streakDetailOpen}
        onClose={() => setStreakDetailOpen(false)}
      />

      <CraftConfirmModal
        visible={discardConfirmOpen}
        title="Discard Nest changes?"
        message="Your furniture and room-style changes will be reverted."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          furnish.discard();
        }}
        onCancel={() => setDiscardConfirmOpen(false)}
      />
    </View>
  );
}
