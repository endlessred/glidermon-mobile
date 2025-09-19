import type { SpriteSource } from "../sprites/rig";

// Legacy behavior props for backward compatibility
export type BehaviorSpriteProps = {
  tag: string;
  fps?: number;
  blinkTex?: SpriteSource;
  blinkMinLoops?: number;
  blinkMaxLoops?: number;
};

// New comprehensive behavior system types
export type AnimationState = {
  name: string;
  tag: string;  // Animation tag from sprite rig
  fps?: number;
  duration?: number;  // Optional fixed duration in ms
  blinkTex?: SpriteSource;
  blinkMinLoops?: number;
  blinkMaxLoops?: number;
  loops?: number;  // How many times to loop this animation (default: infinite)
};

export type TransitionRule = {
  from: string;  // Source state name
  to: string;    // Target state name
  trigger: 'timer' | 'loops' | 'random' | 'external';
  condition?: {
    // For 'timer' trigger
    minTime?: number;
    maxTime?: number;
    // For 'random' trigger
    probability?: number;  // 0-1, checked every loop
    // For 'loops' trigger
    afterLoops?: number;
  };
};

export type BehaviorDefinition = {
  name: string;
  description?: string;
  initialState: string;
  states: AnimationState[];
  transitions: TransitionRule[];
  // Global settings
  defaultFps?: number;
  defaultBlinkSettings?: {
    tex?: SpriteSource;
    minLoops?: number;
    maxLoops?: number;
  };
};

// Behavior engine state for runtime
export type BehaviorEngineState = {
  currentState: string;
  stateStartTime: number;
  currentLoops: number;
  nextTransitionTime?: number;
};

// Legacy behavior functions for backward compatibility
export function behavior_inRangeIdle(opts: {
  blinkTex?: SpriteSource; fps?: number; minLoops?: number; maxLoops?: number;
} = {}): BehaviorSpriteProps {
  return {
    tag: "idle",
    fps: opts.fps ?? 8,
    blinkTex: opts.blinkTex,
    blinkMinLoops: opts.minLoops ?? 4,
    blinkMaxLoops: opts.maxLoops ?? 7,
  };
}

export function behavior_lowIdle(opts: {
  blinkTex?: SpriteSource; fps?: number;
} = {}): BehaviorSpriteProps {
  return {
    tag: "idle",
    fps: opts.fps ?? 7,
    blinkTex: opts.blinkTex,
    blinkMinLoops: 3,
    blinkMaxLoops: 5,
  };
}

export function behavior_highIdle(opts: {
  blinkTex?: SpriteSource; fps?: number;
} = {}): BehaviorSpriteProps {
  return {
    tag: "idle",
    fps: opts.fps ?? 8,
    blinkTex: opts.blinkTex,
    blinkMinLoops: 6,
    blinkMaxLoops: 9,
  };
}

// New behavior engine class
export class BehaviorEngine {
  private definition: BehaviorDefinition;
  private state: BehaviorEngineState;
  private listeners: Array<(newState: AnimationState) => void> = [];

  constructor(definition: BehaviorDefinition) {
    this.definition = definition;
    this.state = {
      currentState: definition.initialState,
      stateStartTime: Date.now(),
      currentLoops: 0,
    };
    this.scheduleNextTransition();
  }

  getCurrentState(): AnimationState {
    const state = this.definition.states.find(s => s.name === this.state.currentState);
    if (!state) {
      throw new Error(`State '${this.state.currentState}' not found in behavior '${this.definition.name}'`);
    }
    return {
      ...state,
      fps: state.fps ?? this.definition.defaultFps,
      blinkTex: state.blinkTex ?? this.definition.defaultBlinkSettings?.tex,
      blinkMinLoops: state.blinkMinLoops ?? this.definition.defaultBlinkSettings?.minLoops,
      blinkMaxLoops: state.blinkMaxLoops ?? this.definition.defaultBlinkSettings?.maxLoops,
    };
  }

  onStateChange(listener: (newState: AnimationState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  // Called when animation completes a loop
  onAnimationLoop(): void {
    this.state.currentLoops++;
    this.checkTransitions();
  }

  // Called periodically to check time-based transitions
  update(): void {
    const now = Date.now();
    if (this.state.nextTransitionTime && now >= this.state.nextTransitionTime) {
      this.checkTransitions();
    }
  }

  // Force a transition (for external triggers)
  forceTransition(targetState?: string): void {
    if (targetState) {
      this.transitionTo(targetState);
    } else {
      this.checkTransitions();
    }
  }

  private checkTransitions(): void {
    const now = Date.now();
    const timeInState = now - this.state.stateStartTime;

    for (const transition of this.definition.transitions) {
      if (transition.from !== this.state.currentState) continue;

      let shouldTransition = false;

      switch (transition.trigger) {
        case 'timer':
          if (transition.condition?.minTime && timeInState >= transition.condition.minTime) {
            if (!transition.condition.maxTime || timeInState <= transition.condition.maxTime) {
              shouldTransition = true;
            }
          }
          break;

        case 'loops':
          if (transition.condition?.afterLoops && this.state.currentLoops >= transition.condition.afterLoops) {
            shouldTransition = true;
          }
          break;

        case 'random':
          if (transition.condition?.probability && Math.random() < transition.condition.probability) {
            shouldTransition = true;
          }
          break;

        case 'external':
          // External transitions must be triggered via forceTransition
          break;
      }

      if (shouldTransition) {
        this.transitionTo(transition.to);
        return; // Only do one transition per update
      }
    }

    // Schedule next check for timer-based transitions
    this.scheduleNextTransition();
  }

  private transitionTo(stateName: string): void {
    const targetState = this.definition.states.find(s => s.name === stateName);
    if (!targetState) {
      console.warn(`Target state '${stateName}' not found in behavior '${this.definition.name}'`);
      return;
    }

    this.state.currentState = stateName;
    this.state.stateStartTime = Date.now();
    this.state.currentLoops = 0;
    this.state.nextTransitionTime = undefined;

    // Notify listeners
    this.listeners.forEach(listener => listener(this.getCurrentState()));

    this.scheduleNextTransition();
  }

  private scheduleNextTransition(): void {
    const now = Date.now();
    let nextCheck: number | undefined;

    for (const transition of this.definition.transitions) {
      if (transition.from !== this.state.currentState) continue;

      if (transition.trigger === 'timer' && transition.condition?.minTime) {
        const checkTime = this.state.stateStartTime + transition.condition.minTime;
        if (!nextCheck || checkTime < nextCheck) {
          nextCheck = checkTime;
        }
      }
    }

    this.state.nextTransitionTime = nextCheck;
  }
}
