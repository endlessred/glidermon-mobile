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

// Idle duration for optional snapping (40f @ 30fps)
const IDLE_DUR_SEC = 40 / 30; // 1.333...

type Range = [number, number];

export class LifelikeIdleNoMix {
  private state: AnimationState;

  // Tuning knobs (seconds)
  private blinkRange: Range = [2, 6];
  private lookRange: Range  = [3, 8];

  // Timers
  private tBlink = 0;
  private tLook = 0;
  private nextBlinkAt = 0;
  private nextLookAt  = 0;

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

    this.state = new AnimationState(stateData);
    this.state.setAnimation(0, IDLE, true); // base idle always on track 0

    // Arm first randomized triggers
    this.nextBlinkAt = randIn(this.blinkRange);
    this.nextLookAt  = randIn(this.lookRange);
  }

  get animationState() { return this.state; }

  /** Call once per frame with dt in seconds */
  update(dt: number) {
    // Advance internal timers
    this.state.update(dt);

    // Blink scheduling
    this.tBlink += dt;
    if (this.tBlink >= this.nextBlinkAt) {
      if (!this.isPlaying(1)) {
        const delay = this.snapToIdleBoundary ? timeToNextIdleBoundary(this.state) : 0;
        this.state.addAnimation(1, BLINK, false, delay);
      }
      this.tBlink = 0;
      this.nextBlinkAt = randIn(this.blinkRange);
    }

    // Look scheduling
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

  /** Returns true if a non-complete entry exists on the given track */
  private isPlaying(trackIndex: number) {
    const cur = this.state.getCurrent(trackIndex);
    return !!cur && !cur.isComplete();
  }

  /** Update blink timing range */
  setBlinkRange(min: number, max: number) {
    this.blinkRange = [min, max];
  }

  /** Update look timing range */
  setLookRange(min: number, max: number) {
    this.lookRange = [min, max];
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