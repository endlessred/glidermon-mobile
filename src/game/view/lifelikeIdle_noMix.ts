// src/anim/lifelikeIdle_noMix.ts
import { AnimationState, AnimationStateData } from "@esotericsoftware/spine-core";

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
// ---------------------------------------------------------------------------
const TRACK_IDLE_CARRIER = 0;
const TRACK_BLINK = 1;
const TRACK_FACE = 2;
const TRACK_ARMS = 3;
const TRACK_OVERLAY = 4;
const TRACK_TAIL = 5;
const TRACK_EARS = 6;
const TRACK_WINGS = 7;

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
 * are a single self-contained clip with no separate in/out phase. */
type Triad = { in?: string; loop?: string; single?: string; out?: string };

// ---------------------------------------------------------------------------
// Primitive clip catalog (from the Spine primitives library)
// ---------------------------------------------------------------------------
const ARM = {
  raise: { in: "Primitives/Arms/ArmsRaiseIn", loop: "Primitives/Arms/ArmsRaise", out: "Primitives/Arms/ArmsRaiseOut" } as Triad,
  leftRaise: { in: "Primitives/Arms/LeftArm/LeftArmRaiseIn", loop: "Primitives/Arms/LeftArm/LeftArmRaise", out: "Primitives/Arms/LeftArm/LeftArmRaiseOut" } as Triad,
  rightRaise: { in: "Primitives/Arms/RightArm/RightArmRaiseIn", loop: "Primitives/Arms/RightArm/RightArmRaise", out: "Primitives/Arms/RightArm/RightArmRaiseOut" } as Triad,
  reachLeft: { in: "Primitives/Arms/LeftArm/ReachLeftIn", loop: "Primitives/Arms/LeftArm/ReachLeft", out: "Primitives/Arms/LeftArm/ReachLeftOut" } as Triad,
  reachRight: { in: "Primitives/Arms/RightArm/ReachRightIn", loop: "Primitives/Arms/RightArm/ReachRight", out: "Primitives/Arms/RightArm/ReachRightOut" } as Triad,
  scratchChin: { in: "Primitives/Arms/RightArm/RightArmScratchChinIn", loop: "Primitives/Arms/RightArm/RightArmScratchChin", out: "Primitives/Arms/RightArm/RightArmScratchChinOut" } as Triad,
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
};

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
  private phase: "idle" | "in" | "hold" | "out" = "idle";
  private holdTimer = 0;
  private holdFor = 0;
  private clip: Triad | null = null;
  private onDone?: () => void;

  constructor(private state: AnimationState, private track: number) {}

  get busy() {
    return this.phase !== "idle";
  }

  play(clip: Triad, holdSeconds = 0, onDone?: () => void) {
    this.clip = clip;
    this.holdFor = holdSeconds;
    this.holdTimer = 0;
    this.onDone = onDone;

    if (clip.in) {
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
    } else if (this.phase === "hold") {
      this.holdTimer += dt;
      if (this.holdTimer >= this.holdFor) {
        if (this.clip.out) {
          this.state.setAnimation(this.track, this.clip.out, false);
          this.phase = "out";
        } else {
          this.finish();
        }
      }
    } else if (this.phase === "out") {
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
  tail?: Triad;
  ears?: Triad;
  earsThen?: Triad; // plays right after `ears` completes, e.g. flick left then right
  wings?: Triad;
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
};

/** Ambient body composites: occupy the overlay track, join the same exclusive pool as
 * FootLook/Reading in the idle behavior picker. */
const AMBIENT_BODY_COMPOSITES: Record<string, Composite> = {
  bigStretchAndYawn: { body: BODY.leanLeft, arms: ARM.raise, face: FACE.smile, holdRange: [1.3, 1.6] },
  lookoutPerch: { body: BODY.sit, holdRange: [5, 8] },
  shyLean: { body: BODY.leanLeft, face: FACE.lookDown, holdRange: [1.5, 2.5] },
  nervousAnticipation: { body: BODY.leanRight, tail: TAIL.flick, holdRange: [1.2, 1.8] },
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
  pointAndLookLeft: { arms: ARM.reachLeft, face: FACE.lookLeft, holdRange: [1.0, 1.4] }, // ReachLeft loop is ~1.0s
  pointAndLookRight: { arms: ARM.reachRight, face: FACE.lookRight, holdRange: [1.0, 1.4] }, // ReachRight loop is ~1.0s
  thinkingPause: { arms: ARM.scratchChin, face: FACE.lookUp, holdRange: [1.5, 2.5] },
  happyWiggle: { face: FACE.smile, tail: TAIL.wag, holdRange: [1.5, 2] }, // TailWagLoop is ~1.033s
  alertEarsUp: { ears: EARS.flickLeft, earsThen: EARS.flickRight, face: FACE.lookUp, holdRange: [0.9, 0.9] },
};

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

  // Secondary-track sequencers, shared by ambient fidgets, body composites,
  // and reactions -- whichever track a composite doesn't use is left alone.
  private faceSeq: TrackSequencer;
  private armsSeq: TrackSequencer;
  private tailSeq: TrackSequencer;
  private earsSeq: TrackSequencer;
  private wingsSeq: TrackSequencer;

  // Behavior
  public snapToIdleBoundary = true; // set false to start one-shots immediately

  constructor(stateData: AnimationStateData) {
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
    if (this.currentBehavior === BehaviorState.IDLE && !this.faceSeq.busy) {
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
    if (this.currentBehavior === BehaviorState.IDLE) {
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

  private secondaryTracksFree() {
    return !this.faceSeq.busy && !this.armsSeq.busy && !this.tailSeq.busy && !this.earsSeq.busy && !this.wingsSeq.busy;
  }

  /** Fire a composite's secondary-track components (face/arms/tail/ears/wings),
   * without touching track 0. Safe to call while idling. */
  private playComposite(c: Composite) {
    const [lo, hi] = c.holdRange ?? [0.8, 1.2];
    const hold = lo + Math.random() * (hi - lo);
    if (c.face) this.faceSeq.play(c.face, hold);
    if (c.arms) this.armsSeq.play(c.arms, hold);
    if (c.tail) this.tailSeq.play(c.tail, hold);
    if (c.ears) this.playEars(c.ears, c.earsThen);
    if (c.wings) this.wingsSeq.play(c.wings, hold);
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
    if (c.arms) this.armsSeq.play(c.arms, hold);
    if (c.tail) this.tailSeq.play(c.tail, hold);
    if (c.ears) this.playEars(c.ears, c.earsThen);
    if (c.wings) this.wingsSeq.play(c.wings, hold);

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
      // ambient behaviors, interrupting FootLook/Reading/whatever is active.
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
