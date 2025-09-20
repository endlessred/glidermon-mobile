# Game System

Visual game rendering, sprite management, and interactive behaviors. This system handles all the visual and interactive aspects of the virtual pet game.

## Directory Structure

### Sprites (`sprites/`)
Asset management and sprite rendering system.

### Behaviors (`behaviors/`)
AI and interactive behavior system for game entities.

### View (`view/`)
React Native components for game rendering and interaction.

## Sprite System

### `spriteCatalog.ts`
- **Purpose**: Central registry of all game sprites and animations
- **Structure**: Hierarchical sprite definitions with metadata
- **Features**: Animation sequences, frame timing, sprite variations
- **Integration**: Links sprites to asset files

### `spriteLoader.ts`
- **Purpose**: Dynamic sprite loading and caching system
- **Features**: Lazy loading, memory management, error handling
- **Performance**: Efficient sprite atlasing and batching
- **Platform**: Cross-platform asset loading (native + web)

### `rig.ts`
- **Purpose**: Sprite animation and transformation system
- **Features**: Bone-based animation, transformation matrices
- **Usage**: Complex character animations, physics integration

## Behavior System

### `behaviors.ts`
- **Purpose**: Core behavior definitions and state machines
- **AI Patterns**: Pet behaviors, responses, autonomous actions
- **States**: Idle, active, feeding, sleeping, playing
- **Triggers**: Glucose events, user interaction, time-based

### `behaviorLoader.ts`
- **Purpose**: Dynamic behavior loading and initialization
- **Features**: Behavior composition, dependency resolution
- **Extensibility**: Plugin system for custom behaviors
- **Performance**: Efficient behavior scheduling

### `behaviorTest.ts`
- **Purpose**: Testing framework for behavior validation
- **Features**: Behavior simulation, state verification
- **Usage**: Development testing, QA validation

## Game View Components

### Core Canvas

#### `GameCanvas.tsx`
- **Purpose**: Main game rendering surface using React Native Skia
- **Features**: 60fps rendering, gesture handling, layer management
- **Integration**: Displays sprites, effects, UI overlays
- **Performance**: Hardware-accelerated rendering

#### `GameCanvasWithBehaviors.tsx`
- **Purpose**: Enhanced canvas with behavior system integration
- **Features**: Behavior-driven animations, interactive elements
- **AI Integration**: Connects behavior system to visual rendering
- **Real-time**: Responds to glucose data and user actions

### Sprite Components

#### `AnimatedSprite.tsx`
- **Purpose**: Individual sprite rendering with animation support
- **Features**: Frame-based animation, transformation support
- **Optimization**: Efficient redraw and state management
- **Flexibility**: Supports various sprite types and animations

#### `BehaviorSprite.tsx`
- **Purpose**: Sprites driven by behavior system
- **Features**: Automatic behavior-to-animation mapping
- **AI Visual**: Visual representation of behavior states
- **Dynamic**: Changes appearance based on pet state/mood

### Game Logic

#### `useGliderBehavior.ts`
- **Purpose**: React hook for pet behavior state management
- **Features**: Behavior triggering, state transitions, glucose response
- **Integration**: Connects glucose data to pet reactions
- **Real-time**: Updates pet behavior based on health data

#### `selectViewModel.ts`
- **Purpose**: View model selection and state management
- **Features**: Dynamic view switching, state persistence
- **Usage**: Different game modes, view configurations

## Visual Effects System

### Effect Types
- **Particle Effects**: Celebrations, achievements, environmental
- **Shader Effects**: Glow, blur, color correction
- **Transition Effects**: Screen transitions, morphing
- **UI Effects**: Button feedback, notification animations

### Performance Features
- **GPU Acceleration**: Leverages device graphics capabilities
- **Effect Pooling**: Reuses effect instances for performance
- **LOD System**: Adjusts effect quality based on device capability
- **Battery Optimization**: Reduces effects when battery low

## Game State Integration

### Real-time Data Flow
```
Health Data → Game Store → Behavior System → Visual Updates
     ↓            ↓             ↓              ↓
Glucose Reading → Engine → Pet Behavior → Animation Change
```

### Behavior Triggers
```typescript
// Glucose-based behavior
if (glucoseLevel > 180) {
  triggerBehavior('hyperAlert');
} else if (glucoseLevel < 70) {
  triggerBehavior('hypoWarning');
} else {
  triggerBehavior('healthy');
}
```

### Visual Feedback
```typescript
// Visual response to game events
onLevelUp: () => {
  playAnimation('celebration');
  showParticleEffect('levelUpBurst');
  updatePetAppearance(newLevel);
}
```

## Asset Management

### Asset Pipeline
1. **Design**: Artists create sprite assets in design tools
2. **Processing**: Assets converted to game-ready formats
3. **Atlas Generation**: Sprites packed into efficient texture atlases
4. **Loading**: Runtime loading with caching and fallbacks

### Asset Types
- **Sprites**: Pet characters, UI elements, decorations
- **Animations**: Movement sequences, idle cycles, interactions
- **Effects**: Particle textures, shader parameters
- **Audio**: Sound effects, ambient audio (if applicable)

### Optimization
- **Compression**: Efficient asset compression for mobile
- **Resolution**: Multiple asset resolutions for different devices
- **Streaming**: Load assets on demand to minimize memory usage

## Interaction System

### Gesture Recognition
```typescript
// Touch/gesture handling
onPetTap: () => {
  triggerBehavior('petted');
  showHappiness();
}

onPetDrag: (gesture) => {
  moveToLocation(gesture.endPosition);
}
```

### Feedback Systems
- **Visual**: Color changes, animations, effects
- **Haptic**: Vibration feedback on supported devices
- **Audio**: Sound effects for actions and achievements

## Development Tools

### Debug Visualization
- **Behavior State**: Visual indicators of current behavior
- **Performance Metrics**: Frame rate, memory usage, render time
- **Interaction Zones**: Touch areas, collision boundaries
- **Asset Status**: Loading states, error indicators

### Testing Features
- **Behavior Simulation**: Trigger specific behaviors manually
- **State Inspection**: View internal behavior state
- **Performance Profiling**: Identify rendering bottlenecks
- **Asset Validation**: Verify asset loading and display

## Platform Considerations

### iOS Specific
- **Metal Rendering**: Leverages iOS Metal for optimal performance
- **Memory Management**: iOS-specific memory optimization
- **Gesture Recognition**: Native iOS gesture handling

### Android Specific
- **Vulkan Support**: Modern graphics API where available
- **Fragment Management**: Android-specific lifecycle handling
- **Hardware Variation**: Adapts to wide range of Android devices

### Web Specific
- **WebGL Fallback**: Browser-compatible rendering
- **Touch Events**: Web touch event handling
- **Performance Scaling**: Adaptive quality for web performance

## Performance Optimization

### Rendering Efficiency
- **Culling**: Only render visible elements
- **Batching**: Group similar draw calls
- **LOD**: Level-of-detail for distant objects
- **Caching**: Cache expensive calculations

### Memory Management
- **Asset Streaming**: Load/unload assets as needed
- **Pooling**: Reuse objects to reduce garbage collection
- **Compression**: Minimize memory footprint of assets
- **Cleanup**: Proper disposal of graphics resources

### Battery Optimization
- **Adaptive Quality**: Reduce visual fidelity when battery low
- **Frame Rate Limiting**: Reduce refresh rate when appropriate
- **Background Behavior**: Minimize processing when app backgrounded

## Extension Points

### Adding New Pets
1. Create sprite assets and animations
2. Define behavior patterns in behavior system
3. Add pet configuration to sprite catalog
4. Implement pet-specific interactions

### Custom Behaviors
1. Define behavior state machine
2. Implement behavior logic
3. Connect to visual animations
4. Add trigger conditions

### Visual Effects
1. Create effect shaders/animations
2. Define effect parameters
3. Integrate with game events
4. Optimize for target platforms

The game system provides a complete visual and interactive experience that brings the health monitoring data to life through an engaging virtual pet interface.