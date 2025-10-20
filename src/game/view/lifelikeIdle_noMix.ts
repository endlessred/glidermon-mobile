// src/anim/lifelikeIdle_noMix.ts
import { AnimationState, AnimationStateData } from "@esotericsoftware/spine-core";

const IDLE = "Idle/Idle";
const BLINK = "Eyes/Blink";
const LOOKS = [
  "Eyes/LookDirection/LookUp",
  "Eyes/LookDirection/LookDown",
  "Eyes/LookDirection/LookLeft",
  "Eyes/LookDirection/LookRight",
];

// New behavior animations
const FOOT_LOOK = "Idle/FootLook"; // 70 frames
const PULL_OUT_BOOK = "ReadBook/PullOutBook"; // 50 frames
const READ_BOOK = "ReadBook/ReadBook"; // 60 frames
const TURN_PAGE = "ReadBook/TurnPage"; // 60 frames
const PUT_AWAY_BOOK = "ReadBook/PutAwayBook"; // 50 frames

// Idle duration for optional snapping (40f @ 30fps)
const IDLE_DUR_SEC = 40 / 30; // 1.333...
const FOOT_LOOK_DUR_SEC = 70 / 30; // ~2.33 seconds
const PULL_OUT_BOOK_DUR_SEC = 50 / 30; // ~1.67 seconds
const READ_BOOK_DUR_SEC = 60 / 30; // 2 seconds
const TURN_PAGE_DUR_SEC = 60 / 30; // 2 seconds
const PUT_AWAY_BOOK_DUR_SEC = 50 / 30; // ~1.67 seconds

type Range = [number, number];

enum BehaviorState {
  IDLE = "idle",
  FOOT_LOOK = "footLook",
  READING_SEQUENCE = "readingSequence"
}

enum ReadingPhase {
  PULL_OUT = "pullOut",
  READING = "reading",
  PUT_AWAY = "putAway"
}

export class LifelikeIdleNoMix {
  private state: AnimationState;

  // Tuning knobs (seconds)
  private blinkRange: Range = [2, 6];
  private lookRange: Range  = [3, 8];
  private behaviorRange: Range = [8, 20]; // When to trigger special behaviors (reduced for testing)

  // Timers
  private tBlink = 0;
  private tLook = 0;
  private tBehavior = 0;
  private nextBlinkAt = 0;
  private nextLookAt  = 0;
  private nextBehaviorAt = 0;

  // Behavior state management
  private currentBehavior = BehaviorState.IDLE;
  private readingPhase = ReadingPhase.PULL_OUT;
  private readingStartTime = 0;
  private readingDuration = 0; // 30-40 seconds total
  private nextTurnPageAt = 0;
  private readingTimer = 0;

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

    // Set up new behavior animation mixes
    stateData.setMix(IDLE, FOOT_LOOK, 0);
    stateData.setMix(FOOT_LOOK, IDLE, 0);
    stateData.setMix(FOOT_LOOK, BLINK, 0); // Can blink during FootLook
    stateData.setMix(BLINK, FOOT_LOOK, 0);

    // Reading sequence mixes
    stateData.setMix(IDLE, PULL_OUT_BOOK, 0);
    stateData.setMix(PULL_OUT_BOOK, READ_BOOK, 0);
    stateData.setMix(READ_BOOK, TURN_PAGE, 0);
    stateData.setMix(TURN_PAGE, READ_BOOK, 0);
    stateData.setMix(READ_BOOK, PUT_AWAY_BOOK, 0);
    stateData.setMix(PUT_AWAY_BOOK, IDLE, 0);

    this.state = new AnimationState(stateData);
    this.state.setAnimation(0, IDLE, true); // base idle always on track 0

    // Arm first randomized triggers
    this.nextBlinkAt = randIn(this.blinkRange);
    this.nextLookAt  = randIn(this.lookRange);
    this.nextBehaviorAt = randIn(this.behaviorRange);
  }

  get animationState() { return this.state; }

  /** Call once per frame with dt in seconds */
  update(dt: number) {
    // Advance internal timers
    this.state.update(dt);

    // Update behavior state machine
    this.updateBehaviorStateMachine(dt);

    // Handle blink scheduling (works during idle and FootLook behaviors)
    if (this.currentBehavior === BehaviorState.IDLE || this.currentBehavior === BehaviorState.FOOT_LOOK) {
      this.tBlink += dt;
      if (this.tBlink >= this.nextBlinkAt) {
        if (!this.isPlaying(1)) {
          const delay = this.snapToIdleBoundary ? timeToNextIdleBoundary(this.state) : 0;
          this.state.addAnimation(1, BLINK, false, delay);
        }
        this.tBlink = 0;
        this.nextBlinkAt = randIn(this.blinkRange);
      }
    }

    // Look scheduling (only during idle behavior, NOT during FootLook or reading)
    if (this.currentBehavior === BehaviorState.IDLE) {
      this.tLook += dt;
      if (this.tLook >= this.nextLookAt) {
        if (!this.isPlaying(2)) {
          const L = LOOKS[(Math.random() * LOOKS.length) | 0];
          const delay = this.snapToIdleBoundary ? timeToNextIdleBoundary(this.state) : 0;
          this.state.addAnimation(2, L, false, delay);
        }
        this.tLook = 0;
        this.nextLookAt = randIn(this.lookRange);
      }
    }
  }

  private updateBehaviorStateMachine(dt: number) {
    switch (this.currentBehavior) {
      case BehaviorState.IDLE:
        this.updateIdleBehavior(dt);
        break;
      case BehaviorState.FOOT_LOOK:
        this.updateFootLookBehavior(dt);
        break;
      case BehaviorState.READING_SEQUENCE:
        this.updateReadingBehavior(dt);
        break;
    }
  }

  private updateIdleBehavior(dt: number) {
    this.tBehavior += dt;
    if (this.tBehavior >= this.nextBehaviorAt) {
      // Randomly choose between FootLook and Reading behaviors
      const behaviorChoice = Math.random();

      if (behaviorChoice < 0.7) {
        // 70% chance: FootLook behavior (increased for testing)
        this.startFootLookBehavior();
      } else {
        // 30% chance: Reading sequence
        this.startReadingBehavior();
      }

      this.tBehavior = 0;
      this.nextBehaviorAt = randIn(this.behaviorRange);
    }
  }

  private startFootLookBehavior() {
    this.currentBehavior = BehaviorState.FOOT_LOOK;

    // Clear any active eye look animations so FootLook animation can control pupils
    this.clearEyeLookTrack();

    const delay = this.snapToIdleBoundary ? timeToNextIdleBoundary(this.state) : 0;
    this.state.setAnimation(0, FOOT_LOOK, false, delay);
    this.state.addAnimation(0, IDLE, true, 0); // Return to idle after FootLook
  }

  private updateFootLookBehavior(dt: number) {
    // Check if FootLook animation is complete
    const current = this.state.getCurrent(0);
    if (current && current.animation?.name === FOOT_LOOK && current.isComplete()) {
      this.currentBehavior = BehaviorState.IDLE;

      // Reset eye look timer to prevent immediate eye movements after FootLook
      this.tLook = 0;
      this.nextLookAt = randIn(this.lookRange);
    }
  }

  private startReadingBehavior() {
    this.currentBehavior = BehaviorState.READING_SEQUENCE;
    this.readingPhase = ReadingPhase.PULL_OUT;
    this.readingDuration = 30 + Math.random() * 10; // 30-40 seconds
    this.readingTimer = 0;

    // Clear any active eye look animations so reading animations can control pupils
    this.clearEyeLookTrack();

    const delay = this.snapToIdleBoundary ? timeToNextIdleBoundary(this.state) : 0;
    this.state.setAnimation(0, PULL_OUT_BOOK, false, delay);
  }

  private updateReadingBehavior(dt: number) {
    this.readingTimer += dt;
    const current = this.state.getCurrent(0);

    switch (this.readingPhase) {
      case ReadingPhase.PULL_OUT:
        if (current && current.animation?.name === PULL_OUT_BOOK && current.isComplete()) {
          this.readingPhase = ReadingPhase.READING;
          this.state.setAnimation(0, READ_BOOK, true); // Loop reading animation
          this.nextTurnPageAt = this.readingTimer + 3 + Math.random() * 4; // Turn page every 3-7 seconds
        }
        break;

      case ReadingPhase.READING:
        // Check if it's time to end the reading sequence
        if (this.readingTimer >= this.readingDuration) {
          this.readingPhase = ReadingPhase.PUT_AWAY;
          this.state.setAnimation(0, PUT_AWAY_BOOK, false);
        }
        // Check if it's time to turn a page
        else if (this.readingTimer >= this.nextTurnPageAt) {
          this.state.setAnimation(0, TURN_PAGE, false);
          this.state.addAnimation(0, READ_BOOK, true, 0); // Return to reading after page turn
          this.nextTurnPageAt = this.readingTimer + 3 + Math.random() * 4; // Next page turn
        }
        break;

      case ReadingPhase.PUT_AWAY:
        if (current && current.animation?.name === PUT_AWAY_BOOK && current.isComplete()) {
          this.currentBehavior = BehaviorState.IDLE;
          this.state.setAnimation(0, IDLE, true); // Return to idle

          // Reset eye look timer to prevent immediate eye movements after reading
          this.tLook = 0;
          this.nextLookAt = randIn(this.lookRange);
        }
        break;
    }
  }

  /** Returns true if a non-complete entry exists on the given track */
  private isPlaying(trackIndex: number) {
    const cur = this.state.getCurrent(trackIndex);
    return !!cur && !cur.isComplete();
  }

  /** Clear any active eye look animations on track 2 */
  private clearEyeLookTrack() {
    const current = this.state.getCurrent(2);
    if (current) {
      this.state.clearTrack(2);
    }
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

  /** Force trigger a specific behavior (for testing) */
  forceBehavior(behavior: "footLook" | "reading") {
    if (this.currentBehavior !== BehaviorState.IDLE) {
      console.warn("Cannot force behavior while another behavior is active");
      return;
    }

    if (behavior === "footLook") {
      this.startFootLookBehavior();
    } else if (behavior === "reading") {
      this.startReadingBehavior();
    }
  }

  /** Force return to idle (interrupt current behavior) */
  forceIdle() {
    this.currentBehavior = BehaviorState.IDLE;
    this.state.setAnimation(0, IDLE, true);
  }
}

/* ---------- helpers ---------- */

function randIn([min, max]: Range) {
  return min + Math.random() * (max - min);
}

function timeToNextIdleBoundary(state: AnimationState) {
  const cur = state.getCurrent(0);
  if (!cur) return 0;
  // Track time modulo Idle duration
  const phase = cur.trackTime % IDLE_DUR_SEC;
  return (IDLE_DUR_SEC - phase);
}