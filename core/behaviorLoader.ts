import type { BehaviorDefinition } from "./behaviors";
import type { SpriteSource } from "../sprites/rig";

// Behavior file loader and registry
export class BehaviorLoader {
  private static behaviors = new Map<string, BehaviorDefinition>();
  private static assetCache = new Map<string, SpriteSource>();

  // Register a behavior definition
  static register(behavior: BehaviorDefinition): void {
    this.behaviors.set(behavior.name, behavior);
  }

  // Get a behavior by name
  static get(name: string): BehaviorDefinition | undefined {
    return this.behaviors.get(name);
  }

  // Get all registered behaviors
  static getAll(): BehaviorDefinition[] {
    return Array.from(this.behaviors.values());
  }

  // Clear all behaviors (useful for testing)
  static clear(): void {
    this.behaviors.clear();
    this.assetCache.clear();
  }

  // Helper to resolve asset references in behavior files
  static resolveAsset(assetPath: string): SpriteSource {
    if (this.assetCache.has(assetPath)) {
      return this.assetCache.get(assetPath)!;
    }

    // For now, just return the asset path as string
    // In a full implementation, this would load from an asset registry
    console.log(`Asset reference: ${assetPath}`);
    this.assetCache.set(assetPath, assetPath);
    return assetPath;
  }

  // Load a behavior from a JSON-like object
  static loadFromObject(data: any): BehaviorDefinition {
    return {
      name: data.name,
      description: data.description,
      initialState: data.initialState,
      defaultFps: data.defaultFps,
      defaultBlinkSettings: data.defaultBlinkSettings ? {
        tex: data.defaultBlinkSettings.tex ? this.resolveAsset(data.defaultBlinkSettings.tex) : undefined,
        minLoops: data.defaultBlinkSettings.minLoops,
        maxLoops: data.defaultBlinkSettings.maxLoops,
      } : undefined,
      states: data.states.map((state: any) => ({
        name: state.name,
        tag: state.tag,
        fps: state.fps,
        duration: state.duration,
        loops: state.loops,
        blinkTex: state.blinkTex ? this.resolveAsset(state.blinkTex) : undefined,
        blinkMinLoops: state.blinkMinLoops,
        blinkMaxLoops: state.blinkMaxLoops,
      })),
      transitions: data.transitions || [],
    };
  }

  // Load a behavior from a JSON file path (disabled for now)
  static async loadFromFile(filePath: string): Promise<BehaviorDefinition> {
    // Disabled for now to avoid dynamic require issues
    console.warn(`Loading behavior files not implemented yet: ${filePath}`);
    throw new Error(`Loading behavior files not implemented yet: ${filePath}`);
  }

  // Load multiple behaviors from a directory (disabled for now)
  static async loadAllFromDirectory(): Promise<BehaviorDefinition[]> {
    // Disabled for now to avoid dynamic require issues
    console.log("Behavior file loading disabled for now");
    return [];
  }
}

// Built-in behavior definitions
export const BUILTIN_BEHAVIORS = {
  // Enhanced idle behavior (compatible with current system)
  enhancedIdle: {
    name: "enhanced_idle",
    description: "Enhanced idle behavior with random blink variations",
    initialState: "idle",
    defaultFps: 8,
    defaultBlinkSettings: {
      minLoops: 4,
      maxLoops: 7,
    },
    states: [
      {
        name: "idle",
        tag: "idle",
      }
    ],
    transitions: [], // No transitions - stays in idle forever
  } as BehaviorDefinition,

  // Simple sequence behavior (for complex behaviors like chess)
  chessSequence: {
    name: "chess_sequence",
    description: "Character playing chess against himself",
    initialState: "thinking_left",
    defaultFps: 6,
    states: [
      {
        name: "thinking_left",
        tag: "think", // Assuming you have a "think" animation
        fps: 4,
      },
      {
        name: "move_piece",
        tag: "reach", // Reaching to move a piece
        loops: 1, // Play once
      },
      {
        name: "walking_around",
        tag: "walk", // Walking to other side
        loops: 2, // Walk cycle twice
      },
      {
        name: "thinking_right",
        tag: "think",
        fps: 4,
      },
      {
        name: "move_piece_right",
        tag: "reach",
        loops: 1,
      },
      {
        name: "walking_back",
        tag: "walk",
        loops: 2,
      }
    ],
    transitions: [
      // Thinking -> Move (after 3-8 seconds)
      {
        from: "thinking_left",
        to: "move_piece",
        trigger: "timer",
        condition: { minTime: 3000, maxTime: 8000 }
      },
      // Move -> Walk (after animation completes)
      {
        from: "move_piece",
        to: "walking_around",
        trigger: "loops",
        condition: { afterLoops: 1 }
      },
      // Walk -> Think on other side
      {
        from: "walking_around",
        to: "thinking_right",
        trigger: "loops",
        condition: { afterLoops: 2 }
      },
      // Thinking right -> Move right
      {
        from: "thinking_right",
        to: "move_piece_right",
        trigger: "timer",
        condition: { minTime: 3000, maxTime: 8000 }
      },
      // Move right -> Walk back
      {
        from: "move_piece_right",
        to: "walking_back",
        trigger: "loops",
        condition: { afterLoops: 1 }
      },
      // Walk back -> Start over
      {
        from: "walking_back",
        to: "thinking_left",
        trigger: "loops",
        condition: { afterLoops: 2 }
      }
    ],
  } as BehaviorDefinition,

  // Mood-based behavior (like your current glucose-based system)
  moodBehavior: {
    name: "mood_behavior",
    description: "Behavior that changes based on external mood state",
    initialState: "neutral",
    defaultFps: 8,
    states: [
      {
        name: "happy",
        tag: "idle",
        fps: 10, // Faster when happy
        blinkMinLoops: 6,
        blinkMaxLoops: 9,
      },
      {
        name: "neutral",
        tag: "idle",
        fps: 8,
        blinkMinLoops: 4,
        blinkMaxLoops: 7,
      },
      {
        name: "sad",
        tag: "idle",
        fps: 6, // Slower when sad
        blinkMinLoops: 2,
        blinkMaxLoops: 4,
      }
    ],
    transitions: [
      // These would be triggered externally based on game state
      {
        from: "neutral",
        to: "happy",
        trigger: "external"
      },
      {
        from: "neutral",
        to: "sad",
        trigger: "external"
      },
      {
        from: "happy",
        to: "neutral",
        trigger: "external"
      },
      {
        from: "sad",
        to: "neutral",
        trigger: "external"
      }
    ],
  } as BehaviorDefinition,
};

// Register built-in behaviors
Object.values(BUILTIN_BEHAVIORS).forEach(behavior => {
  BehaviorLoader.register(behavior);
});