import type { GameState } from "../core/engine";

export type RenderViewModel = {
  // scene
  bg: "forest_day" | "night_sky";
  gliderPose: "idle" | "happy" | "thinking" | "unicorn";
  particles: "none" | "fireflies" | "stars";
  // HUD bits
  points: number; xp: number; level: number; streak: number;
  toasts: { id: string; text: string }[];
};

export function selectViewModel(engine: GameState, toasts: RenderViewModel["toasts"]): RenderViewModel {
  const unicorn = engine.lastBg === 100;
  const pose: RenderViewModel["gliderPose"] =
    unicorn ? "unicorn" : engine.glucoseState === "IN_RANGE" ? "happy" : "thinking";

  const bg = engine.level < 8 ? "forest_day" : "night_sky";
  const particles = bg === "night_sky" ? "stars" : "fireflies";

  return {
    bg, gliderPose: pose, particles,
    points: engine.points, xp: engine.xp, level: engine.level, streak: engine.streak,
    toasts,
  };
}
