// Simple test for the behavior system
import { BehaviorEngine, type BehaviorDefinition } from "./behaviors";
import { BehaviorLoader, BUILTIN_BEHAVIORS } from "./behaviorLoader";

// Test behavior definition
const testBehavior: BehaviorDefinition = {
  name: "test_behavior",
  description: "Simple test behavior",
  initialState: "state1",
  defaultFps: 8,
  states: [
    {
      name: "state1",
      tag: "idle",
      fps: 8,
    },
    {
      name: "state2",
      tag: "idle",
      fps: 10,
    }
  ],
  transitions: [
    {
      from: "state1",
      to: "state2",
      trigger: "timer",
      condition: { minTime: 2000 }
    },
    {
      from: "state2",
      to: "state1",
      trigger: "timer",
      condition: { minTime: 1000 }
    }
  ],
};

export function runBehaviorTests(): void {
  console.log("Running behavior system tests...");

  // Test 1: Basic BehaviorEngine functionality
  console.log("Test 1: Basic BehaviorEngine");
  const engine = new BehaviorEngine(testBehavior);
  console.log("Initial state:", engine.getCurrentState().name);

  // Test 2: State change listener
  console.log("Test 2: State change listener");
  const unsubscribe = engine.onStateChange((newState) => {
    console.log("State changed to:", newState.name, "fps:", newState.fps);
  });

  // Test 3: Force transition
  console.log("Test 3: Force transition");
  engine.forceTransition("state2");
  console.log("Current state after force:", engine.getCurrentState().name);

  // Test 4: BehaviorLoader
  console.log("Test 4: BehaviorLoader");
  BehaviorLoader.register(testBehavior);
  const loaded = BehaviorLoader.get("test_behavior");
  console.log("Loaded behavior:", loaded?.name);

  // Test 5: Built-in behaviors
  console.log("Test 5: Built-in behaviors");
  const builtins = BehaviorLoader.getAll();
  console.log("Built-in behaviors:", builtins.map(b => b.name));

  // Test 6: Enhanced idle behavior
  console.log("Test 6: Enhanced idle behavior");
  const enhancedEngine = new BehaviorEngine(BUILTIN_BEHAVIORS.enhancedIdle);
  console.log("Enhanced idle state:", enhancedEngine.getCurrentState());

  // Clean up
  unsubscribe();

  console.log("Behavior system tests completed!");
}

// Export for use in development
if (typeof window !== 'undefined') {
  (window as any).runBehaviorTests = runBehaviorTests;
}