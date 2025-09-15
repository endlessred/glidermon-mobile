import type { SpriteSource } from "../sprites/rig";

export type BehaviorSpriteProps = {
  tag: string;
  fps?: number;
  blinkTex?: SpriteSource;
  blinkMinLoops?: number;
  blinkMaxLoops?: number;
};

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
  // a bit slower, blinks a little more often
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
  // steady, rarer blink
  return {
    tag: "idle",
    fps: opts.fps ?? 8,
    blinkTex: opts.blinkTex,
    blinkMinLoops: 6,
    blinkMaxLoops: 9,
  };
}
