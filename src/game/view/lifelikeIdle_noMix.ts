// src/anim/lifelikeIdle_noMix.ts
import { AnimationState, AnimationStateData, Skeleton } from "@esotericsoftware/spine-core";
import type { Attachment } from "@esotericsoftware/spine-core";

// ---------------------------------------------------------------------------
// Track allocation
//
// 0: permanent Idle/Idle carrier -- always looping, never stopped or
//    replaced. Idle/Idle keys a handful of subtle "breathing" bones that no
//    other body animation touches (most notably the mouth -- L/R Mouth 2).
//    Keeping it permanently on track 0 means those bones keep gently moving
//    underneath everything else instead of freezing the instant some other
//    behavior takes over; higher tracks still correctly override whichever
//    specific bones they key (torso, limbs, etc).
// 1: blink
// 2: face / eye-look (Eyes/LookDirection/* and Face/Look* are mutually
//    exclusive on this track -- both key the eyes)
// 3: arms
// 4: body overlay -- FootLook, ReadBook/*, Body/Sit, Body/LeanLeft,
//    Body/LeanRight, Body/Jump, and reactions. Numbered above track 0 so it
//    overrides whatever bones it keys, but anything it *doesn't* key (like
//    the mouth) still shows track 0's idle motion through underneath.
// 5: tail
// 6: ears
// 7: wings
// 8: shoulders (new Slider primitives -- shrug etc; forearm/reach Sliders
//    reuse track 3 since they key the same L Arm/R Arm bones as the
//    existing ARM catalog and are never meant to play at the same time)
// 9: wrists
// 10: head/neck tilt
// 11: left leg (thigh/shin/foot Sliders)
// 12: right leg
// ---------------------------------------------------------------------------
const TRACK_IDLE_CARRIER = 0;
const TRACK_BLINK = 1;
const TRACK_FACE = 2;
const TRACK_ARMS = 3;
const TRACK_OVERLAY = 4;
const TRACK_TAIL = 5;
const TRACK_EARS = 6;
const TRACK_WINGS = 7;
const TRACK_SHOULDER = 8;
const TRACK_WRIST = 9;
const TRACK_HEAD = 10;
const TRACK_LEFT_LEG = 11;
const TRACK_RIGHT_LEG = 12;

const IDLE = "Idle/Idle";
const BLINK = "Eyes/Blink";
const LOOKS = [
  "Eyes/LookDirection/LookUp",
  "Eyes/LookDirection/LookDown",
  "Eyes/LookDirection/LookLeft",
  "Eyes/LookDirection/LookRight",
];

const FOOT_LOOK = "Idle/FootLook"; // 70 frames
const PULL_OUT_BOOK = "ReadBook/PullOutBook"; // 50 frames
const READ_BOOK = "ReadBook/ReadBook"; // 60 frames
const TURN_PAGE = "ReadBook/TurnPage"; // 60 frames
const PUT_AWAY_BOOK = "ReadBook/PutAwayBook"; // 50 frames

// Idle duration for optional snapping (40f @ 30fps)
const IDLE_DUR_SEC = 40 / 30; // 1.333...

type Range = [number, number];

/** A primitive's in/loop-or-hold/out triad. `single` is for primitives that
 * are a single self-contained clip with no separate in/out phase. `slider`
 * is for a clip authored as one extreme pose (e.g. a 90-degree elbow bend)
 * that should be played to a partial point (an `intensity` 0-1 fraction of
 * its duration) and held there, then reverse-played back to rest -- see
 * TrackSequencer's sliderIn/sliderOut phases. */
type Triad = { in?: string; loop?: string; single?: string; out?: string; slider?: string };

// ---------------------------------------------------------------------------
// Primitive clip catalog (from the Spine primitives library)
// ---------------------------------------------------------------------------
const ARM = {
  raise: { in: "Primitives/Arms/ArmsRaiseIn", loop: "Primitives/Arms/ArmsRaise", out: "Primitives/Arms/ArmsRaiseOut" } as Triad,
  // NOTE: the new export renamed these folders LeftArm/RightArm -> LeftArmFull/RightArmFull (leaf clip names unchanged).
  leftRaise: { in: "Primitives/Arms/LeftArmFull/LeftArmRaiseIn", loop: "Primitives/Arms/LeftArmFull/LeftArmRaise", out: "Primitives/Arms/LeftArmFull/LeftArmRaiseOut" } as Triad,
  rightRaise: { in: "Primitives/Arms/RightArmFull/RightArmRaiseIn", loop: "Primitives/Arms/RightArmFull/RightArmRaise", out: "Primitives/Arms/RightArmFull/RightArmRaiseOut" } as Triad,
  reachLeft: { in: "Primitives/Arms/LeftArmFull/ReachLeftIn", loop: "Primitives/Arms/LeftArmFull/ReachLeft", out: "Primitives/Arms/LeftArmFull/ReachLeftOut" } as Triad,
  reachRight: { in: "Primitives/Arms/RightArmFull/ReachRightIn", loop: "Primitives/Arms/RightArmFull/ReachRight", out: "Primitives/Arms/RightArmFull/ReachRightOut" } as Triad,
  scratchChin: { in: "Primitives/Arms/RightArmFull/RightArmScratchChinIn", loop: "Primitives/Arms/RightArmFull/RightArmScratchChin", out: "Primitives/Arms/RightArmFull/RightArmScratchChinOut" } as Triad,
};

const BODY = {
  leanLeft: { in: "Primitives/Body/LeanLeftIn", loop: "Primitives/Body/LeanLeft", out: "Primitives/Body/LeanLeftOut" } as Triad,
  leanRight: { in: "Primitives/Body/LeanRightIn", loop: "Primitives/Body/LeanRight", out: "Primitives/Body/LeanRightOut" } as Triad,
  sit: { in: "Primitives/Body/SitIn", loop: "Primitives/Body/Sit", out: "Primitives/Body/SitOut" } as Triad,
  jump: { single: "Primitives/Body/Jump" } as Triad,
};

const FACE = {
  lookLeft: { in: "Primitives/Face/LookLeftIn", loop: "Primitives/Face/LookLeft", out: "Primitives/Face/LookLeftOut" } as Triad,
  lookRight: { in: "Primitives/Face/LookRightIn", loop: "Primitives/Face/LookRight", out: "Primitives/Face/LookRightOut" } as Triad,
  lookUp: { in: "Primitives/Face/LookUpIn", loop: "Primitives/Face/LookUp", out: "Primitives/Face/LookUpOut" } as Triad,
  lookDown: { in: "Primitives/Face/LookDownIn", loop: "Primitives/Face/LookDown", out: "Primitives/Face/LookDownOut" } as Triad,
  frown: { in: "Primitives/Face/FrownIn", loop: "Primitives/Face/Frown", out: "Primitives/Face/FrownOut" } as Triad,
  smile: { in: "Primitives/Face/SmileIn", loop: "Primitives/Face/Smile", out: "Primitives/Face/SmileOut" } as Triad,
  nod: { single: "Primitives/Face/Nod" } as Triad,
  wiggleNose: { single: "Primitives/Face/WiggleNose" } as Triad,
  openMouth: { slider: "Primitives/Face/OpenMouthSlider" } as Triad,
};

// Forearm bends key the same L Arm/R Arm bones as ARM's raise/reach/
// scratchChin clips above, so these play on the same TRACK_ARMS via
// armsSeq -- they're an alternative way to pose the same bones, never
// meant to run at the same time as an ARM triad.
const FOREARM = {
  leftLower: { slider: "Primitives/Arms/Forearms/LeftForearmLowerSlider" } as Triad,
  leftRaise: { slider: "Primitives/Arms/Forearms/LeftForearmRaiseSlider" } as Triad,
  rightLower: { slider: "Primitives/Arms/Forearms/RightForearmLowerSlider" } as Triad,
  rightRaise: { slider: "Primitives/Arms/Forearms/RightForearmRaiseSlider" } as Triad,
};

// NOTE: the exported clip set is still asymmetric -- there's a shrug Slider
// for both shoulders but only a "raise" Slider for the left one, and a
// duplicate-looking "LefttShoulderRaiseSlider" (typo preserved verbatim
// from the Spine export) that's deliberately not wired up here. Worth a
// pass in the Spine project to export a matching right-side raise.
const SHOULDER = {
  leftShrug: { slider: "Primitives/Arms/Shoulders/LeftShoulderShrugSlider" } as Triad,
  rightShrug: { slider: "Primitives/Arms/Shoulders/RightShoulderShrugSlider" } as Triad,
  leftRaise: { slider: "Primitives/Arms/Shoulders/LeftShoulderRaiseSlider" } as Triad,
};

const WRIST = {
  leftLower: { slider: "Primitives/Arms/Wrists/LeftWristLowerSlider" } as Triad,
  leftRaise: { slider: "Primitives/Arms/Wrists/LeftWristRaiseSlider" } as Triad,
  rightLower: { slider: "Primitives/Arms/Wrists/RightWristLowerSlider" } as Triad,
  rightRaise: { slider: "Primitives/Arms/Wrists/RightWristRaiseSlider" } as Triad,
};

const HEAD = {
  tiltLeft: { slider: "Primitives/Head/HeadTiltLeftSlider" } as Triad,
  tiltRight: { slider: "Primitives/Head/HeadTiltRightSlider" } as Triad,
  eyelidsHalfDown: { slider: "Primitives/Head/EyelidsHalfDownSlider" } as Triad,
};

// Left/right thigh, shin, and foot Sliders are independently authored per
// bone -- unlike ARM.raise (one clip moves both arms), there's no combined
// clip here, so a symmetric pose (squat, weight shift) needs the left and
// right side played on their own tracks (leftLegSeq/rightLegSeq).
const LEG = {
  leftThighLeft: { slider: "Primitives/Legs/LeftThighLeftSlider" } as Triad,
  leftThighRight: { slider: "Primitives/Legs/LeftThighRightSlider" } as Triad,
  leftShinLeft: { slider: "Primitives/Legs/LeftShinLeftSlider" } as Triad,
  leftShinRight: { slider: "Primitives/Legs/LeftShinRightSlider" } as Triad,
  leftFootUp: { slider: "Primitives/Legs/LeftFootUpSlider" } as Triad,
  leftFootDown: { slider: "Primitives/Legs/LeftFootDownSlider" } as Triad,
  rightThighLeft: { slider: "Primitives/Legs/RightThighLeftSlider" } as Triad,
  rightThighRight: { slider: "Primitives/Legs/RightThighRightSlider" } as Triad,
  rightShinLeft: { slider: "Primitives/Legs/RightShinLeftSlider" } as Triad,
  rightShinRight: { slider: "Primitives/Legs/RightShinRightSlider" } as Triad,
  rightFootUp: { slider: "Primitives/Legs/RightFootUpSlider" } as Triad,
  rightFootDown: { slider: "Primitives/Legs/RightFootDownSlider" } as Triad,
};

// Not Sliders (no partial-intensity control, per the artist's own naming
// convention) -- plain single-clip lean poses, played to completion like
// BODY.jump.
const TORSO = {
  lowerLeft: { single: "Primitives/Torso/LowerTorsoLeft" } as Triad,
  lowerRight: { single: "Primitives/Torso/LowerTorsoRight" } as Triad,
  upperLeft: { single: "Primitives/Torso/UpperTorsoLeft" } as Triad,
  upperRight: { single: "Primitives/Torso/UpperTorsoRight" } as Triad,
};

/** Default partial-bend intensity for Slider primitives when a composite
 * doesn't specify its own -- "in between", not the full authored extreme
 * (e.g. a forearm Slider's ~90-110 degree bend becomes a natural ~40-55
 * degree elbow bend at this default). Tune per-primitive once rendering. */
const DEFAULT_SLIDER_INTENSITY = 0.5;

const TAIL = {
  flick: { single: "Primitives/Tail/FlickTail" } as Triad,
  wag: { loop: "Primitives/Tail/TailWagLoop" } as Triad,
};

const EARS = {
  flickLeft: { single: "Primitives/Ears/FlickLeftEar" } as Triad,
  flickRight: { single: "Primitives/Ears/FlickRightEar" } as Triad,
};

const WINGS = {
  raise: { in: "Primitives/Wings/WingsRaiseIn", loop: "Primitives/Wings/WingsRaise", out: "Primitives/Wings/WingsRaiseOut" } as Triad,
  leftRaise: { in: "Primitives/Wings/LeftWing/LeftWingRaiseIn", loop: "Primitives/Wings/LeftWing/LeftWingRaise", out: "Primitives/Wings/LeftWing/LeftWingRaiseOut" } as Triad,
  rightRaise: { in: "Primitives/Wings/RightWing/RightWingRaiseIn", loop: "Primitives/Wings/RightWing/RightWingRaise", out: "Primitives/Wings/RightWing/RightWingRaiseOut" } as Triad,
};

// ---------------------------------------------------------------------------
// Generic per-track sequencer: plays an optional `in`, then holds on `loop`
// (looping) or `single` (one-shot) for `holdSeconds`, then plays an optional
// `out`, then returns the track to idle and reports completion.
// ---------------------------------------------------------------------------
class TrackSequencer {
  private phase: "idle" | "in" | "hold" | "out" | "sliderIn" | "sliderOut" = "idle";
  private holdTimer = 0;
  private holdFor = 0;
  private clip: Triad | null = null;
  private onDone?: () => void;
  private sliderIntensity = 1;

  constructor(private state: AnimationState, private track: number) {}

  get busy() {
    return this.phase !== "idle";
  }

  play(clip: Triad, holdSeconds = 0, onDone?: () => void, intensity = 1) {
    this.clip = clip;
    this.holdFor = holdSeconds;
    this.holdTimer = 0;
    this.onDone = onDone;
    this.sliderIntensity = Math.max(0, Math.min(1, intensity));

    if (clip.slider) {
      this.phase = "sliderIn";
      this.state.setAnimation(this.track, clip.slider, false);
    } else if (clip.in) {
      this.phase = "in";
      this.state.setAnimation(this.track, clip.in, false);
    } else if (clip.loop) {
      this.phase = "hold";
      this.state.setAnimation(this.track, clip.loop, true);
    } else if (clip.single) {
      this.phase = "out"; // reuse the "out" phase to just wait for completion
      this.state.setAnimation(this.track, clip.single, false);
    } else {
      this.finish();
    }
  }

  update(dt: number) {
    if (this.phase === "idle" || !this.clip) return;
    const current = this.state.getTrack(this.track);

    if (this.phase === "in") {
      if (current && current.isComplete()) {
        if (this.clip.loop) {
          this.state.setAnimation(this.track, this.clip.loop, true);
          this.phase = "hold";
          this.holdTimer = 0;
        } else if (this.clip.out) {
          this.state.setAnimation(this.track, this.clip.out, false);
          this.phase = "out";
        } else {
          this.finish();
        }
      }
    } else if (this.phase === "sliderIn") {
      // Let trackTime advance naturally (timeScale is still 1 here), then
      // freeze it the instant it reaches the target intensity fraction of
      // the clip's authored duration -- e.g. 0.5 holds at a natural
      // half-bend instead of the full authored extreme.
      if (current) {
        const target = current.animationEnd * this.sliderIntensity;
        if (current.trackTime >= target) {
          current.trackTime = target;
          current.timeScale = 0;
          this.phase = "hold";
          this.holdTimer = 0;
        }
      }
    } else if (this.phase === "hold") {
      this.holdTimer += dt;
      if (this.holdTimer >= this.holdFor) {
        if (this.clip.slider) {
          // Play the same clip back in reverse from wherever it was held,
          // rather than a separately-authored `out` clip -- trackTime keeps
          // counting up regardless of `reverse` (spine-core samples
          // `duration - animationTime` when reverse is set), so mirroring
          // the held time around the clip's duration and resuming normal
          // playback lands smoothly back at the rest pose, then
          // isComplete() fires correctly with no special-casing needed.
          if (current) {
            const heldTime = current.trackTime;
            current.trackTime = current.animationEnd - heldTime;
            current.reverse = true;
            current.timeScale = 1;
          }
          this.phase = "sliderOut";
        } else if (this.clip.out) {
          this.state.setAnimation(this.track, this.clip.out, false);
          this.phase = "out";
        } else {
          this.finish();
        }
      }
    } else if (this.phase === "out" || this.phase === "sliderOut") {
      if (current && current.isComplete()) {
        this.finish();
      }
    }
  }

  /** Interrupt whatever is playing and immediately clear the track. */
  stop() {
    this.state.clearTrack(this.track);
    this.phase = "idle";
    this.clip = null;
    this.onDone = undefined;
  }

  private finish() {
    // Clear the track so the finished clip's held last-frame pose stops
    // overriding these bones -- otherwise a completed non-looping entry
    // keeps its final pose forever, and since this track's index is higher
    // than track 0, that frozen pose permanently wins over anything the
    // body track (idle, ReadBook, etc.) tries to do with the same bones.
    this.state.clearTrack(this.track);
    this.phase = "idle";
    this.clip = null;
    const cb = this.onDone;
    this.onDone = undefined;
    cb?.();
  }
}

// ---------------------------------------------------------------------------
// Composite behaviors -- combinations of primitives across tracks
// ---------------------------------------------------------------------------
type Composite = {
  body?: Triad; // plays on the overlay track, above the permanent idle carrier
  face?: Triad;
  arms?: Triad;
  /** Partial-bend intensity (0-1) when `arms` is a Slider-type triad (e.g.
   * FOREARM.*). Ignored for non-slider arms triads. Defaults to
   * DEFAULT_SLIDER_INTENSITY. */
  armsIntensity?: number;
  tail?: Triad;
  ears?: Triad;
  earsThen?: Triad; // plays right after `ears` completes, e.g. flick left then right
  wings?: Triad;
  /** Attachment names to swap onto L_Hand/R_Hand for the duration of `arms`
   * (e.g. "L_HandThumbsUp"), reverted automatically when the arms sequence
   * finishes. Only meaningful alongside an `arms` triad. */
  handPose?: { left?: string; right?: string };
  shoulder?: Triad;
  shoulderIntensity?: number;
  wrist?: Triad;
  wristIntensity?: number;
  head?: Triad;
  headIntensity?: number;
  leftLeg?: Triad;
  leftLegIntensity?: number;
  rightLeg?: Triad;
  rightLegIntensity?: number;
  holdRange?: Range; // default hold duration for looping/held components
};

// holdRange floors below are calibrated against each primitive's actual
// exported clip duration (read from skeleton.json), not guessed: the
// Arms/Wings "hold" loop clips (ArmsRaise, ReachLeft/Right, WingsRaise, etc.)
// are ~1.0s per cycle and RightArmScratchChin is ~1.233s, so holdRange
// minimums are kept at or above those lengths -- otherwise the loop gets cut
// off mid-cycle before it visually completes even once. Face/Look* "hold"
// clips are single-frame (0-duration) static poses, so their hold length is
// a pure design choice, not constrained by a loop cycle. `single` primitives
// (Jump, FlickTail, FlickLeftEar/RightEar, Nod, WiggleNose) ignore holdRange
// entirely -- they just play once and report completion via isComplete().

/** Ambient fidgets: secondary tracks only, idle keeps looping on track 0. */
const AMBIENT_FIDGETS: Record<string, Composite> = {
  curiousGlanceLeft: { face: FACE.lookLeft, ears: EARS.flickLeft, holdRange: [0.8, 1.4] },
  curiousGlanceRight: { face: FACE.lookRight, ears: EARS.flickRight, holdRange: [0.8, 1.4] },
  wingStretch: { wings: WINGS.raise, holdRange: [1.0, 1.4] }, // WingsRaise loop is ~1.0s
  chinScratch: { arms: ARM.scratchChin, face: FACE.lookUp, holdRange: [1.3, 2] }, // ScratchChin loop is ~1.233s
  tailFlickBurst: { tail: TAIL.flick },
  earTwitchAlert: { ears: EARS.flickLeft, earsThen: EARS.flickRight },
  noseWiggle: { face: FACE.wiggleNose },
  reachAndWonderLeft: { arms: ARM.reachLeft, face: FACE.lookLeft, holdRange: [1.0, 1.4] }, // ReachLeft loop is ~1.0s
  reachAndWonderRight: { arms: ARM.reachRight, face: FACE.lookRight, holdRange: [1.0, 1.4] }, // ReachRight loop is ~1.0s
  // New Slider-driven fidgets. headTiltLeft/RightSlider rotate the Head bone
  // ~80-98 degrees at full extreme; DEFAULT_SLIDER_INTENSITY (0.5) lands
  // around a natural curious tilt.
  headTiltCuriousLeft: { head: HEAD.tiltLeft, holdRange: [1, 1.8] },
  headTiltCuriousRight: { head: HEAD.tiltRight, holdRange: [1, 1.8] },
  // Shrug Sliders translate one shoulder bone at a time (no combined
  // both-shoulders clip exported) -- a single-shoulder shrug reads as a
  // quick "hm?" accent rather than a full two-shoulder shrug.
  shoulderShrugSmall: { shoulder: SHOULDER.leftShrug, holdRange: [0.8, 1.2] },
};

/** Ambient body composites: occupy the overlay track, join the same exclusive pool as
 * FootLook/Reading in the idle behavior picker. */
const AMBIENT_BODY_COMPOSITES: Record<string, Composite> = {
  bigStretchAndYawn: { body: BODY.leanLeft, arms: ARM.raise, face: FACE.smile, holdRange: [1.3, 1.6] },
  lookoutPerch: { body: BODY.sit, holdRange: [5, 8] },
  shyLean: { body: BODY.leanLeft, face: FACE.lookDown, holdRange: [1.5, 2.5] },
  nervousAnticipation: { body: BODY.leanRight, tail: TAIL.flick, holdRange: [1.2, 1.8] },
  // Cozy wind-down stretch using the new OpenMouthSlider/EyelidsHalfDownSlider
  // primitives -- a general ambient composite (not the same thing as the
  // standalone "CheckIn/WindDown" Spine clip CheckInFlowModal looks up by
  // name; that's a dedicated check-in animation tag, still ❌ per
  // src/game/CLAUDE.md, and would need either its own exported clip or
  // CheckInFlowModal switched over to call playReaction("stretchAndYawn")).
  // headIntensity is high (not the 0.5 default) because the clip's own
  // authored extreme already represents "half down" per its name -- playing
  // only half of that would be too subtle to read.
  stretchAndYawn: { body: BODY.leanLeft, arms: ARM.raise, face: FACE.openMouth, head: HEAD.eyelidsHalfDown, headIntensity: 0.9, holdRange: [1.5, 2] },
  // Subtle weight-shift sway using the new per-leg thigh Sliders, at low
  // intensity since the authored extremes are ~90-108 degree bends -- this
  // is meant to read as a gentle idle sway, not a squat. Which Left/Right
  // variant reads as "sway toward camera-left" vs "away" isn't confirmed
  // from the exported keyframe data alone; tune visually on-device.
  weightShiftSway: { leftLeg: LEG.leftThighLeft, rightLeg: LEG.rightThighRight, leftLegIntensity: 0.15, rightLegIntensity: 0.15, holdRange: [2.5, 4] },
};

/** Named one-shot / composite reactions, playable via playReaction(). Some
 * layer secondary-track flourishes on top of an existing full-body clip. */
const REACTIONS: Record<string, Composite> = {
  // Jump is a single 1.467s clip; wings/face hold ranges are set close to
  // that so they land/settle around when the jump finishes.
  excitedBounce: { body: BODY.jump, wings: WINGS.raise, face: FACE.smile, holdRange: [1.3, 1.5] },
  gentleSulk: { body: BODY.leanLeft, face: FACE.frown, holdRange: [1.5, 1.5] },
  cozyWindDown: { body: BODY.sit, arms: ARM.raise, face: FACE.smile, holdRange: [1.5, 1.5] },
  startledJolt: { body: BODY.jump, wings: WINGS.raise, face: FACE.frown, holdRange: [1.0, 1.2] }, // snappy, not lingering
  proudCheerPlus: { arms: ARM.raise, wings: WINGS.raise, holdRange: [1, 1.4] },
  warmGreetingPlus: { face: FACE.smile, wings: WINGS.raise, holdRange: [1, 1.4] },
  worriedFidgetPlus: { arms: ARM.scratchChin, face: FACE.frown, holdRange: [1.3, 1.8] }, // ScratchChin loop is ~1.233s
  // handPose swaps in a gesture-specific hand attachment for the duration of
  // `arms`, reverted automatically when it finishes -- see
  // applyHandPose/revertHandPose.
  pointAndLookLeft: { arms: ARM.reachLeft, face: FACE.lookLeft, handPose: { left: "L_HandPoint" }, holdRange: [1.0, 1.4] }, // ReachLeft loop is ~1.0s
  pointAndLookRight: { arms: ARM.reachRight, face: FACE.lookRight, handPose: { right: "R_HandPoint" }, holdRange: [1.0, 1.4] }, // ReachRight loop is ~1.0s
  thinkingPause: { arms: ARM.scratchChin, face: FACE.lookUp, holdRange: [1.5, 2.5] },
  happyWiggle: { face: FACE.smile, tail: TAIL.wag, holdRange: [1.5, 2] }, // TailWagLoop is ~1.033s
  alertEarsUp: { ears: EARS.flickLeft, earsThen: EARS.flickRight, face: FACE.lookUp, holdRange: [0.9, 0.9] },
  wavingHello: { arms: ARM.rightRaise, handPose: { right: "R_OpenHand" }, face: FACE.smile, holdRange: [1, 1.4] }, // RightArmRaise loop is ~1.0s
  thumbsUpCheer: { arms: ARM.rightRaise, handPose: { right: "R_HandThumbsUp" }, tail: TAIL.wag, face: FACE.smile, holdRange: [1, 1.4] },
};

/**
 * Furniture-interaction behaviors: named body composites GliderMon can be
 * asked to perform when he relocates to a character slot adjacent to a piece
 * of furniture (see roomSlots.ts / IsometricRoomView3D.tsx). Furniture items
 * declare a `behavior` key (furnitureCatalog.ts); only keys present here are
 * actually performed -- an unsupported key gracefully falls back to normal
 * idle (the caller checks SUPPORTED_INTERACTION_BEHAVIORS first).
 *
 * These reuse the existing body-composite machinery (startBodyComposite),
 * so no separate duration/timeout bookkeeping is introduced.
 */
const INTERACTION_BEHAVIORS: Record<string, Composite> = {
  // Real: BODY.sit already exists and is used by lookoutPerch. Longer hold
  // than the ambient perch since this is a deliberate "sit and stay a while".
  sit: { body: BODY.sit, holdRange: [8, 16] },
  // Placeholder "dance" assembled from existing primitives until a dedicated
  // Dance clip is exported -- a held sway with raised wings, wagging tail and a
  // smile. Uses a looping body triad (LeanRight) so it sustains for the whole
  // hold rather than ending after a single one-shot. Also reused as the
  // celebration phase of the tarot-table interaction (see tarotThink below) --
  // "happy bounce/dance" reads the same whether it's following a boombox beat
  // or a revealed tarot card.
  dance: { body: BODY.leanRight, wings: WINGS.raise, tail: TAIL.wag, face: FACE.smile, holdRange: [4, 7] },
  // Tarot-table interaction, phase 1 (see IsometricRoomView3D.tsx's tarot
  // orchestration and render/interactiveHobbyItem3D.ts's shuffle animation).
  // A calm, curious "considering" pose -- chin-scratch + looking up -- held
  // for the shuffle's own duration (passed as an explicit holdSeconds by the
  // caller, not this holdRange) so it ends in sync with the furniture.
  // Phase 2 is the shared `dance` composite above, started once the shuffle
  // completes and the card is revealed.
  tarotThink: { body: BODY.leanLeft, arms: ARM.scratchChin, face: FACE.lookUp, holdRange: [1.3, 1.3] },
};

/** Behavior keys startInteraction() will actually perform. Callers treat a
 * furniture `behavior` outside this set as "no interaction available". */
export const SUPPORTED_INTERACTION_BEHAVIORS: ReadonlySet<string> = new Set(
  Object.keys(INTERACTION_BEHAVIORS)
);

/** Why an interaction body-composite ended -- passed to startInteraction()'s
 * onDone so the caller can always run cleanup (restore render position etc.),
 * whether GliderMon finished naturally or was interrupted. */
export type InteractionEndReason = "completed" | "interrupted";

enum BehaviorState {
  IDLE = "idle",
  FOOT_LOOK = "footLook",
  READING_SEQUENCE = "readingSequence",
  BODY_COMPOSITE = "bodyComposite",
  REACTION = "reaction",
}

enum ReadingPhase {
  PULL_OUT = "pullOut",
  READING = "reading",
  PUT_AWAY = "putAway",
}

export class LifelikeIdleNoMix {
  private state: AnimationState;
  private skeleton?: Skeleton;

  // Snapshot of whatever the hand slots were showing before a handPose
  // gesture swapped them, so it can be restored exactly (plain hand,
  // *Shader recolor, or a future equipped glove) rather than a hardcoded
  // default name.
  private leftHandPrevAttachment: Attachment | null = null;
  private rightHandPrevAttachment: Attachment | null = null;

  // Tuning knobs (seconds)
  private blinkRange: Range = [2, 6];
  private lookRange: Range = [3, 8];
  private behaviorRange: Range = [8, 20]; // When to trigger footLook/reading/body composites
  private fidgetRange: Range = [4, 10]; // When to trigger a non-blocking ambient fidget

  // Timers
  private tBlink = 0;
  private tLook = 0;
  private tBehavior = 0;
  private tFidget = 0;
  private nextBlinkAt = 0;
  private nextLookAt = 0;
  private nextBehaviorAt = 0;
  private nextFidgetAt = 0;

  // Behavior state management
  private currentBehavior = BehaviorState.IDLE;
  private readingPhase = ReadingPhase.PULL_OUT;
  private readingDuration = 0; // 30-40 seconds total
  private nextTurnPageAt = 0;
  private readingTimer = 0;
  private bodyComposite: Composite | null = null;
  // Set by startInteraction(); fired exactly once (with 'completed' or
  // 'interrupted') when the current body composite ends, then cleared. The
  // room view relies on this to always restore GliderMon's render position
  // and clear its "interacting" flag -- it is never dropped silently.
  private bodyCompositeOnDone: ((reason: InteractionEndReason) => void) | null = null;

  // Secondary-track sequencers, shared by ambient fidgets, body composites,
  // and reactions -- whichever track a composite doesn't use is left alone.
  private faceSeq: TrackSequencer;
  private armsSeq: TrackSequencer;
  private tailSeq: TrackSequencer;
  private earsSeq: TrackSequencer;
  private wingsSeq: TrackSequencer;
  private shoulderSeq: TrackSequencer;
  private wristSeq: TrackSequencer;
  private headSeq: TrackSequencer;
  private leftLegSeq: TrackSequencer;
  private rightLegSeq: TrackSequencer;

  // Behavior
  public snapToIdleBoundary = true; // set false to start one-shots immediately

  // When false, the driver stops scheduling *ambient* life -- eye-looks,
  // fidgets, FootLook, the reading sequence, and ambient body composites --
  // and only keeps the track-0 carrier animation plus blinks running.
  // Used where the character is a deliberate guide/actor for a specific
  // moment (the check-in ritual) and should play only the animation it was
  // handed, not wander off into reading a book mid-cheer. Explicit
  // playReaction()/startInteraction() calls are unaffected.
  private ambientBehaviorsEnabled = true;

  setAmbientBehaviorsEnabled(enabled: boolean) {
    if (this.ambientBehaviorsEnabled === enabled) return;
    this.ambientBehaviorsEnabled = enabled;
    if (!enabled) this.forceIdle(); // abort anything already mid-behavior
  }

  constructor(stateData: AnimationStateData, skeleton?: Skeleton) {
    this.skeleton = skeleton;
    // No extra easing — your clips are self-contained
    stateData.defaultMix = 0;
    stateData.setMix(IDLE, BLINK, 0);
    stateData.setMix(BLINK, IDLE, 0);
    for (const L of LOOKS) {
      stateData.setMix(IDLE, L, 0);
      stateData.setMix(L, IDLE, 0);
    }

    // FootLook plays on the overlay track, not against IDLE directly (IDLE is
    // permanent on its own track now), but it still shares the blink track.
    stateData.setMix(FOOT_LOOK, BLINK, 0); // Can blink during FootLook
    stateData.setMix(BLINK, FOOT_LOOK, 0);

    // Reading sequence mixes -- all transitions happen on the overlay track
    stateData.setMix(PULL_OUT_BOOK, READ_BOOK, 0);
    stateData.setMix(READ_BOOK, TURN_PAGE, 0);
    stateData.setMix(TURN_PAGE, READ_BOOK, 0);
    stateData.setMix(READ_BOOK, PUT_AWAY_BOOK, 0);

    this.state = new AnimationState(stateData);
    this.state.setAnimation(TRACK_IDLE_CARRIER, IDLE, true); // permanent, never stopped

    this.faceSeq = new TrackSequencer(this.state, TRACK_FACE);
    this.armsSeq = new TrackSequencer(this.state, TRACK_ARMS);
    this.tailSeq = new TrackSequencer(this.state, TRACK_TAIL);
    this.earsSeq = new TrackSequencer(this.state, TRACK_EARS);
    this.wingsSeq = new TrackSequencer(this.state, TRACK_WINGS);
    this.shoulderSeq = new TrackSequencer(this.state, TRACK_SHOULDER);
    this.wristSeq = new TrackSequencer(this.state, TRACK_WRIST);
    this.headSeq = new TrackSequencer(this.state, TRACK_HEAD);
    this.leftLegSeq = new TrackSequencer(this.state, TRACK_LEFT_LEG);
    this.rightLegSeq = new TrackSequencer(this.state, TRACK_RIGHT_LEG);

    // Arm first randomized triggers
    this.nextBlinkAt = randIn(this.blinkRange);
    this.nextLookAt = randIn(this.lookRange);
    this.nextBehaviorAt = randIn(this.behaviorRange);
    this.nextFidgetAt = randIn(this.fidgetRange);
  }

  get animationState() {
    return this.state;
  }

  /** Call once per frame with dt in seconds */
  update(dt: number) {
    // Advance internal timers
    this.state.update(dt);

    // Update behavior state machine
    this.updateBehaviorStateMachine(dt);

    // Advance any active secondary-track sequencers
    this.faceSeq.update(dt);
    this.armsSeq.update(dt);
    this.tailSeq.update(dt);
    this.earsSeq.update(dt);
    this.wingsSeq.update(dt);
    this.shoulderSeq.update(dt);
    this.wristSeq.update(dt);
    this.headSeq.update(dt);
    this.leftLegSeq.update(dt);
    this.rightLegSeq.update(dt);

    // Handle blink scheduling (works during idle and FootLook behaviors)
    if (this.currentBehavior === BehaviorState.IDLE || this.currentBehavior === BehaviorState.FOOT_LOOK) {
      this.tBlink += dt;
      if (this.tBlink >= this.nextBlinkAt) {
        if (!this.isPlaying(TRACK_BLINK)) {
          const delay = this.snapToIdleBoundary ? timeToNextIdleBoundary(this.state) : 0;
          this.state.addAnimation(TRACK_BLINK, BLINK, false, delay);
        }
        this.tBlink = 0;
        this.nextBlinkAt = randIn(this.blinkRange);
      }
    }

    // Look scheduling (only during idle behavior, NOT during FootLook, reading,
    // or anything else that's already driving the face track)
    if (this.ambientBehaviorsEnabled && this.currentBehavior === BehaviorState.IDLE && !this.faceSeq.busy) {
      this.tLook += dt;
      if (this.tLook >= this.nextLookAt) {
        if (!this.isPlaying(TRACK_FACE)) {
          const L = LOOKS[(Math.random() * LOOKS.length) | 0];
          const delay = this.snapToIdleBoundary ? timeToNextIdleBoundary(this.state) : 0;
          this.state.addAnimation(TRACK_FACE, L, false, delay);
        }
        this.tLook = 0;
        this.nextLookAt = randIn(this.lookRange);
      }
    }

    // Ambient fidgets -- only while plain idling, and only one at a time
    if (this.ambientBehaviorsEnabled && this.currentBehavior === BehaviorState.IDLE) {
      this.tFidget += dt;
      if (this.tFidget >= this.nextFidgetAt && this.secondaryTracksFree()) {
        const keys = Object.keys(AMBIENT_FIDGETS);
        const key = keys[(Math.random() * keys.length) | 0];
        this.playComposite(AMBIENT_FIDGETS[key]);
        this.tFidget = 0;
        this.nextFidgetAt = randIn(this.fidgetRange);
      }
    }
  }

  /** Swap in a composite's requested hand attachments, snapshotting whatever
   * was there first so revertHandPose() can restore it exactly. */
  private applyHandPose(handPose?: Composite["handPose"]) {
    if (!handPose || !this.skeleton) return;
    if (handPose.left) {
      const slot = this.skeleton.findSlot("L_Hand");
      if (slot) {
        this.leftHandPrevAttachment = slot.pose.getAttachment();
        const attachment = this.skeleton.getAttachment("L_Hand", handPose.left);
        if (attachment) slot.pose.setAttachment(attachment);
      }
    }
    if (handPose.right) {
      const slot = this.skeleton.findSlot("R_Hand");
      if (slot) {
        this.rightHandPrevAttachment = slot.pose.getAttachment();
        const attachment = this.skeleton.getAttachment("R_Hand", handPose.right);
        if (attachment) slot.pose.setAttachment(attachment);
      }
    }
  }

  /** Restore whatever the hand slots were showing before applyHandPose(). */
  private revertHandPose(handPose?: Composite["handPose"]) {
    if (!handPose || !this.skeleton) return;
    if (handPose.left) {
      const slot = this.skeleton.findSlot("L_Hand");
      if (slot) slot.pose.setAttachment(this.leftHandPrevAttachment);
    }
    if (handPose.right) {
      const slot = this.skeleton.findSlot("R_Hand");
      if (slot) slot.pose.setAttachment(this.rightHandPrevAttachment);
    }
  }

  private secondaryTracksFree() {
    return !this.faceSeq.busy && !this.armsSeq.busy && !this.tailSeq.busy && !this.earsSeq.busy && !this.wingsSeq.busy
      && !this.shoulderSeq.busy && !this.wristSeq.busy && !this.headSeq.busy && !this.leftLegSeq.busy && !this.rightLegSeq.busy;
  }

  /** Fire a composite's secondary-track components (face/arms/tail/ears/wings),
   * without touching track 0. Safe to call while idling. */
  private playComposite(c: Composite) {
    const [lo, hi] = c.holdRange ?? [0.8, 1.2];
    const hold = lo + Math.random() * (hi - lo);
    if (c.face) this.faceSeq.play(c.face, hold);
    if (c.arms) {
      this.applyHandPose(c.handPose);
      this.armsSeq.play(c.arms, hold, () => this.revertHandPose(c.handPose), c.armsIntensity ?? DEFAULT_SLIDER_INTENSITY);
    }
    if (c.tail) this.tailSeq.play(c.tail, hold);
    if (c.ears) this.playEars(c.ears, c.earsThen);
    if (c.wings) this.wingsSeq.play(c.wings, hold);
    if (c.shoulder) this.shoulderSeq.play(c.shoulder, hold, undefined, c.shoulderIntensity ?? DEFAULT_SLIDER_INTENSITY);
    if (c.wrist) this.wristSeq.play(c.wrist, hold, undefined, c.wristIntensity ?? DEFAULT_SLIDER_INTENSITY);
    if (c.head) this.headSeq.play(c.head, hold, undefined, c.headIntensity ?? DEFAULT_SLIDER_INTENSITY);
    if (c.leftLeg) this.leftLegSeq.play(c.leftLeg, hold, undefined, c.leftLegIntensity ?? DEFAULT_SLIDER_INTENSITY);
    if (c.rightLeg) this.rightLegSeq.play(c.rightLeg, hold, undefined, c.rightLegIntensity ?? DEFAULT_SLIDER_INTENSITY);
  }

  /** Play an ears primitive, optionally chaining a second one right after
   * (e.g. flick left, then flick right) via the sequencer's onDone hook. */
  private playEars(first: Triad, then?: Triad) {
    if (then) {
      this.earsSeq.play(first, 0, () => this.earsSeq.play(then, 0));
    } else {
      this.earsSeq.play(first, 0);
    }
  }

  private updateBehaviorStateMachine(dt: number) {
    switch (this.currentBehavior) {
      case BehaviorState.IDLE:
        this.updateIdleBehavior(dt);
        break;
      case BehaviorState.FOOT_LOOK:
        this.updateFootLookBehavior();
        break;
      case BehaviorState.READING_SEQUENCE:
        this.updateReadingBehavior(dt);
        break;
      case BehaviorState.BODY_COMPOSITE:
        this.updateBodyComposite(dt);
        break;
      // REACTION resolves itself via the TrackSequencer onDone callback
    }
  }

  private updateIdleBehavior(dt: number) {
    if (!this.ambientBehaviorsEnabled) return;
    this.tBehavior += dt;
    if (this.tBehavior >= this.nextBehaviorAt) {
      const choice = Math.random();

      if (choice < 0.55) {
        this.startFootLookBehavior();
      } else if (choice < 0.75) {
        this.startReadingBehavior();
      } else {
        const keys = Object.keys(AMBIENT_BODY_COMPOSITES);
        const key = keys[(Math.random() * keys.length) | 0];
        this.startBodyComposite(AMBIENT_BODY_COMPOSITES[key]);
      }

      this.tBehavior = 0;
      this.nextBehaviorAt = randIn(this.behaviorRange);
    }
  }

  private startFootLookBehavior() {
    this.currentBehavior = BehaviorState.FOOT_LOOK;
    this.clearEyeLookTrack();
    this.state.setAnimation(TRACK_OVERLAY, FOOT_LOOK, false);
  }

  private updateFootLookBehavior() {
    const current = this.state.getTrack(TRACK_OVERLAY);
    if (current && current.animation?.name === FOOT_LOOK && current.isComplete()) {
      this.currentBehavior = BehaviorState.IDLE;
      this.state.clearTrack(TRACK_OVERLAY); // idle carrier already shows through underneath
      this.resetLookTimer();
    }
  }

  private startReadingBehavior() {
    this.currentBehavior = BehaviorState.READING_SEQUENCE;
    this.readingPhase = ReadingPhase.PULL_OUT;
    this.readingDuration = 30 + Math.random() * 10; // 30-40 seconds
    this.readingTimer = 0;
    this.clearEyeLookTrack();
    this.state.setAnimation(TRACK_OVERLAY, PULL_OUT_BOOK, false);
  }

  private updateReadingBehavior(dt: number) {
    this.readingTimer += dt;
    const current = this.state.getTrack(TRACK_OVERLAY);

    switch (this.readingPhase) {
      case ReadingPhase.PULL_OUT:
        if (current && current.animation?.name === PULL_OUT_BOOK && current.isComplete()) {
          this.readingPhase = ReadingPhase.READING;
          this.state.setAnimation(TRACK_OVERLAY, READ_BOOK, true); // Loop reading animation
          this.nextTurnPageAt = this.readingTimer + 3 + Math.random() * 4; // Turn page every 3-7 seconds
        }
        break;

      case ReadingPhase.READING:
        if (this.readingTimer >= this.readingDuration) {
          this.readingPhase = ReadingPhase.PUT_AWAY;
          this.state.setAnimation(TRACK_OVERLAY, PUT_AWAY_BOOK, false);
        } else if (this.readingTimer >= this.nextTurnPageAt) {
          this.state.setAnimation(TRACK_OVERLAY, TURN_PAGE, false);
          this.state.addAnimation(TRACK_OVERLAY, READ_BOOK, true, 0); // Return to reading after page turn
          this.nextTurnPageAt = this.readingTimer + 3 + Math.random() * 4; // Next page turn
        }
        break;

      case ReadingPhase.PUT_AWAY:
        if (current && current.animation?.name === PUT_AWAY_BOOK && current.isComplete()) {
          this.currentBehavior = BehaviorState.IDLE;
          this.state.clearTrack(TRACK_OVERLAY); // idle carrier already shows through underneath
          this.resetLookTimer();
        }
        break;
    }
  }

  /** Start an ambient body composite: an in->hold->out sequence on the overlay track,
   * with any secondary-track flourishes (arms/face/tail/etc) layered on top. */
  private startBodyComposite(c: Composite) {
    if (!c.body) return;
    this.currentBehavior = BehaviorState.BODY_COMPOSITE;
    this.bodyComposite = c;
    this.clearEyeLookTrack();

    const [lo, hi] = c.holdRange ?? [1, 1.5];
    const hold = lo + Math.random() * (hi - lo);

    if (c.face) this.faceSeq.play(c.face, hold);
    if (c.arms) {
      this.applyHandPose(c.handPose);
      this.armsSeq.play(c.arms, hold, () => this.revertHandPose(c.handPose), c.armsIntensity ?? DEFAULT_SLIDER_INTENSITY);
    }
    if (c.tail) this.tailSeq.play(c.tail, hold);
    if (c.ears) this.playEars(c.ears, c.earsThen);
    if (c.wings) this.wingsSeq.play(c.wings, hold);
    if (c.shoulder) this.shoulderSeq.play(c.shoulder, hold, undefined, c.shoulderIntensity ?? DEFAULT_SLIDER_INTENSITY);
    if (c.wrist) this.wristSeq.play(c.wrist, hold, undefined, c.wristIntensity ?? DEFAULT_SLIDER_INTENSITY);
    if (c.head) this.headSeq.play(c.head, hold, undefined, c.headIntensity ?? DEFAULT_SLIDER_INTENSITY);
    if (c.leftLeg) this.leftLegSeq.play(c.leftLeg, hold, undefined, c.leftLegIntensity ?? DEFAULT_SLIDER_INTENSITY);
    if (c.rightLeg) this.rightLegSeq.play(c.rightLeg, hold, undefined, c.rightLegIntensity ?? DEFAULT_SLIDER_INTENSITY);

    if (c.body.in) {
      this.state.setAnimation(TRACK_OVERLAY, c.body.in, false);
    } else if (c.body.loop) {
      this.state.setAnimation(TRACK_OVERLAY, c.body.loop, true);
    } else if (c.body.single) {
      this.state.setAnimation(TRACK_OVERLAY, c.body.single, false);
    }
    this.bodyPhase = c.body.in ? "in" : c.body.loop ? "hold" : "out";
    this.bodyHoldTimer = 0;
    this.bodyHoldFor = hold;
  }

  private bodyPhase: "in" | "hold" | "out" = "in";
  private bodyHoldTimer = 0;
  private bodyHoldFor = 0;

  private updateBodyComposite(dt: number) {
    const c = this.bodyComposite;
    if (!c || !c.body) {
      this.currentBehavior = BehaviorState.IDLE;
      return;
    }
    const current = this.state.getTrack(TRACK_OVERLAY);

    if (this.bodyPhase === "in") {
      if (current && current.isComplete()) {
        if (c.body.loop) {
          this.state.setAnimation(TRACK_OVERLAY, c.body.loop, true);
          this.bodyPhase = "hold";
          this.bodyHoldTimer = 0;
        } else if (c.body.out) {
          this.state.setAnimation(TRACK_OVERLAY, c.body.out, false);
          this.bodyPhase = "out";
        } else {
          this.finishBodyComposite();
        }
      }
    } else if (this.bodyPhase === "hold") {
      this.bodyHoldTimer += dt;
      if (this.bodyHoldTimer >= this.bodyHoldFor) {
        if (c.body.out) {
          this.state.setAnimation(TRACK_OVERLAY, c.body.out, false);
          this.bodyPhase = "out";
        } else {
          this.finishBodyComposite();
        }
      }
    } else if (this.bodyPhase === "out") {
      if (current && current.isComplete()) {
        this.finishBodyComposite();
      }
    }
  }

  private finishBodyComposite() {
    this.bodyComposite = null;
    this.currentBehavior = BehaviorState.IDLE;
    this.state.clearTrack(TRACK_OVERLAY); // idle carrier already shows through underneath
    this.resetLookTimer();
    this.fireBodyCompositeDone("completed");
  }

  /** Fire (once) and clear the startInteraction() completion callback. Called
   * from both the natural-completion path (finishBodyComposite) and every
   * interruption path (forceIdle, a body reaction pre-empting an interaction). */
  private fireBodyCompositeDone(reason: InteractionEndReason) {
    const cb = this.bodyCompositeOnDone;
    this.bodyCompositeOnDone = null;
    cb?.(reason);
  }

  /**
   * Perform a named furniture-interaction behavior (see
   * INTERACTION_BEHAVIORS). Returns false -- and does nothing -- when the
   * driver isn't currently idle or `behaviorKey` isn't supported, so the
   * caller can just leave GliderMon in a normal idle at that position.
   * `onDone` always fires exactly once (see bodyCompositeOnDone).
   */
  startInteraction(
    behaviorKey: string,
    holdSeconds?: number,
    onDone?: (reason: InteractionEndReason) => void
  ): boolean {
    if (this.currentBehavior !== BehaviorState.IDLE) return false;
    const spec = INTERACTION_BEHAVIORS[behaviorKey];
    if (!spec || !spec.body) return false;
    // currentBehavior === IDLE guarantees no composite is running, so there's
    // no stale callback to fire first.
    this.bodyCompositeOnDone = onDone ?? null;
    const composite: Composite =
      holdSeconds != null ? { ...spec, holdRange: [holdSeconds, holdSeconds] } : spec;
    this.startBodyComposite(composite);
    return true;
  }

  /** Returns true if a non-complete entry exists on the given track */
  private isPlaying(trackIndex: number) {
    const cur = this.state.getTrack(trackIndex);
    return !!cur && !cur.isComplete();
  }

  /** Clear any active eye look animations on the face track */
  private clearEyeLookTrack() {
    const current = this.state.getTrack(TRACK_FACE);
    if (current) {
      this.state.clearTrack(TRACK_FACE);
    }
    this.faceSeq.stop();
  }

  private resetLookTimer() {
    this.tLook = 0;
    this.nextLookAt = randIn(this.lookRange);
  }

  /** Update blink timing range */
  setBlinkRange(min: number, max: number) {
    this.blinkRange = [min, max];
  }

  /** Update look timing range */
  setLookRange(min: number, max: number) {
    this.lookRange = [min, max];
  }

  /** Update behavior timing range */
  setBehaviorRange(min: number, max: number) {
    this.behaviorRange = [min, max];
  }

  /** Get current behavior state for debugging */
  getCurrentBehavior(): string {
    return this.currentBehavior;
  }

  /** Get current reading phase for debugging */
  getCurrentReadingPhase(): string | null {
    return this.currentBehavior === BehaviorState.READING_SEQUENCE ? this.readingPhase : null;
  }

  /** Force trigger a specific ambient behavior (for testing) */
  forceBehavior(behavior: "footLook" | "reading" | keyof typeof AMBIENT_BODY_COMPOSITES) {
    if (this.currentBehavior !== BehaviorState.IDLE) {
      console.warn("Cannot force behavior while another behavior is active");
      return;
    }

    if (behavior === "footLook") {
      this.startFootLookBehavior();
    } else if (behavior === "reading") {
      this.startReadingBehavior();
    } else if (AMBIENT_BODY_COMPOSITES[behavior]) {
      this.startBodyComposite(AMBIENT_BODY_COMPOSITES[behavior]);
    }
  }

  /** Force return to idle (interrupt current behavior) */
  forceIdle() {
    this.currentBehavior = BehaviorState.IDLE;
    this.bodyComposite = null;
    this.fireBodyCompositeDone("interrupted");
    this.state.clearTrack(TRACK_OVERLAY); // idle carrier (track 0) is never touched -- always running
    this.faceSeq.stop();
    this.armsSeq.stop();
    this.tailSeq.stop();
    this.earsSeq.stop();
    this.wingsSeq.stop();
  }

  /**
   * Play a named one-shot reaction (see REACTIONS), playing any `body`
   * component on the overlay track (above the permanent idle carrier) and
   * layering secondary-track flourishes, then automatically returning to
   * idle. Reactions without a `body` component only touch secondary tracks
   * and layer on top of whatever's currently happening.
   */
  playReaction(name: keyof typeof REACTIONS) {
    const reaction = REACTIONS[name];
    if (!reaction) {
      console.warn(`playReaction: unknown reaction "${name}"`);
      return;
    }

    if (reaction.body) {
      // Full-body reactions go through the same body-composite machinery as
      // ambient behaviors, interrupting FootLook/Reading/whatever is active --
      // including an in-progress furniture interaction, whose cleanup callback
      // must still run.
      this.fireBodyCompositeDone("interrupted");
      this.currentBehavior = BehaviorState.IDLE; // reset so startBodyComposite is allowed
      this.startBodyComposite(reaction);
    } else {
      // Secondary-track-only reactions can layer on top of whatever track 0
      // is currently doing (idle or otherwise) without interrupting it.
      this.playComposite(reaction);
    }
  }

  /** List of reaction names available to playReaction(). */
  static get reactionNames(): string[] {
    return Object.keys(REACTIONS);
  }
}

/* ---------- helpers ---------- */

function randIn([min, max]: Range) {
  return min + Math.random() * (max - min);
}

function timeToNextIdleBoundary(state: AnimationState) {
  const cur = state.getTrack(TRACK_IDLE_CARRIER);
  if (!cur) return 0;
  // Track time modulo Idle duration
  const phase = cur.trackTime % IDLE_DUR_SEC;
  return IDLE_DUR_SEC - phase;
}
