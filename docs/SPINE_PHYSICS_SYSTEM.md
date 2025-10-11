# Spine 2D Physics System

Complete guide to implementing and troubleshooting Spine 2D physics in the mobile application.

## Overview

The Spine 2D physics system provides realistic motion for character elements like ears, tails, wings, and hair. Physics constraints are defined in Spine Editor and applied to bone chains, creating natural swaying and movement that responds to environmental forces like wind.

## Core Concepts

### Physics Constraints
- **Definition**: Bone chains in Spine Editor that react to physics forces
- **Examples**: Ear tips, tail segments, wing membranes, hair strands
- **Properties**: Each constraint has parameters like `wind`, `damping`, and `mix`

### Wind System
- **Purpose**: Primary force that drives physics movement
- **Implementation**: Applied globally to all physics constraints on a skeleton
- **Visual Effect**: Creates natural swaying, breathing, and ambient movement

## API Reference

### Core Physics API

#### Correct Usage (Spine 4.2+)
```typescript
import { Physics } from '@esotericsoftware/spine-core';

// ✅ Correct - Physics.update is a constant, not a function
skeleton.updateWorldTransform(Physics.update);
```

#### Common Mistakes
```typescript
// ❌ Wrong - Causes "physics is undefined" error
skeleton.updateWorldTransform(Physics);

// ❌ Wrong - Physics.update is not a function
Physics.update(skeleton, deltaTime);

// ❌ Wrong - Old Spine 3.x API
skeleton.updateWorldTransform();
```

### Physics Utilities (`utils/spinePhysics.ts`)

#### setGlobalWind(skeleton, windValue)
Sets constant wind force across all physics constraints.

```typescript
import { setGlobalWind } from '../utils/spinePhysics';

// Set light wind
setGlobalWind(skeleton, 15);

// Set strong wind
setGlobalWind(skeleton, 35);

// No wind (static)
setGlobalWind(skeleton, 0);
```

**Parameters:**
- `skeleton`: Spine skeleton with physics constraints
- `windValue`: Wind strength (0-50+ typical range)

#### applyWindGusts(skeleton, time, base, gustAmp)
Creates time-varying wind with natural gusts.

```typescript
import { applyWindGusts } from '../utils/spinePhysics';

// In render loop
const currentTime = performance.now() / 1000;
applyWindGusts(skeleton, currentTime, 25, 15);
```

**Parameters:**
- `skeleton`: Spine skeleton with physics constraints
- `time`: Current time in seconds
- `base`: Base wind strength (default: 25)
- `gustAmp`: Gust amplitude variation (default: 15)

**Wind Formula:**
```typescript
wind = base + sin(time * 0.8) * gustAmp + sin(time * 2.3) * (gustAmp * 0.25)
```

#### applySubtleWindGusts(skeleton, time, base, gustAmp)
Creates very gentle, slow wind for delicate movements like wings.

```typescript
import { applySubtleWindGusts } from '../utils/spinePhysics';

// In render loop - much more subtle and less frequent
const currentTime = performance.now() / 1000;
applySubtleWindGusts(skeleton, currentTime);
```

**Parameters:**
- `skeleton`: Spine skeleton with physics constraints
- `time`: Current time in seconds
- `base`: Base wind strength (default: 8) - much lower than regular gusts
- `gustAmp`: Gust amplitude variation (default: 3) - much gentler

**Wind Formula:**
```typescript
// Much slower oscillations (0.2 and 0.7 vs 0.8 and 2.3)
wind = base + sin(time * 0.2) * gustAmp + sin(time * 0.7) * (gustAmp * 0.3)
```

**Use Case:** Perfect for wing movement and other delicate physics that should be barely noticeable.

## Implementation Patterns

### Character Preview Implementation

```typescript
// src/ui/components/SpineCharacterPreview.tsx
import { Physics } from '@esotericsoftware/spine-core';
import { applySubtleWindGusts } from '../../../utils/spinePhysics';

// In render loop
const render = () => {
  const currentTime = performance.now() / 1000;

  // Apply subtle wind effects for delicate wing movement
  applySubtleWindGusts(skeleton, currentTime);

  // Update world transform with physics
  skeleton.updateWorldTransform(Physics.update);

  // Refresh mesh and render
  mesh.refreshMeshes();
  renderer.render(scene, camera);
};
```

### Shop Screen Implementation

```typescript
// src/ui/components/ShadedShopViewport.tsx
import { Physics } from '@esotericsoftware/spine-core';
import { applySubtleWindGusts } from '../../../utils/spinePhysics';

// Store skeleton references for physics access
const skeletonRef = useRef<spine.Skeleton | null>(null);
const sableSkeletonRef = useRef<spine.Skeleton | null>(null);
const lumaSkeletonRef = useRef<spine.Skeleton | null>(null);

// Assign references when loading
skeletonRef.current = skeleton;
sableSkeletonRef.current = sableResult.skeleton;
lumaSkeletonRef.current = lumaResult.skeleton;

// In render loop - apply subtle wind to all characters
const render = () => {
  const currentTime = performance.now() / 1000;

  // Same subtle wind for all shop characters
  if (skeletonRef.current) {
    applySubtleWindGusts(skeletonRef.current, currentTime);
  }
  if (sableSkeletonRef.current) {
    applySubtleWindGusts(sableSkeletonRef.current, currentTime);
  }
  if (lumaSkeletonRef.current) {
    applySubtleWindGusts(lumaSkeletonRef.current, currentTime);
  }

  // Update meshes
  skeletonMesh.update(deltaSeconds);
  sableMesh.update(deltaSeconds);
  lumaMesh.update(deltaSeconds);
};
```

### Housing System Implementation

```typescript
// src/game/housing/rooms/RoomLoader.ts
import { Physics } from '@esotericsoftware/spine-core';

// After skeleton setup
const PHYSICS: any = Physics as any;
skeleton.updateWorldTransform(PHYSICS.update);

// In room builder
// src/game/housing/builders/RoomBuilder.ts
const PHYSICS = (Physics as any);
this.skeleton.updateWorldTransform(PHYSICS.update);
```

### Spine Controller Implementation

```typescript
// src/spine/createSpineCharacterController.ts
import { Physics } from '@esotericsoftware/spine-core';
import { applySubtleWindGusts } from '../utils/spinePhysics';

const PHYSICS: any = Physics as any;

function updateWorldXform(skeleton: Skeleton, dt = 0) {
  skeleton.updateWorldTransform(PHYSICS.update);
}

// In update method
update: (deltaSeconds: number) => {
  const currentTime = performance.now() / 1000;
  applySubtleWindGusts(skeleton, currentTime);
  updateWorldXform(skeleton, deltaSeconds);
  mesh.update(deltaSeconds);
}
```

## Physics Parameters Guide

### Wind Strength Values
- **0**: No movement (static pose)
- **5-15**: Subtle breathing/ambient movement
- **15-25**: Light breeze effect
- **25-35**: Moderate wind movement
- **35-50**: Strong wind effect
- **50+**: Extreme/hurricane effect

### Gust Amplitude Values
- **5-10**: Minimal variation (steady wind)
- **10-20**: Natural variation (recommended)
- **20-30**: Dramatic gusts
- **30+**: Chaotic movement

### Character-Specific Recommendations

```typescript
// Main character with wings - very subtle movement
applySubtleWindGusts(skeleton, time); // base: 8, gustAmp: 3

// Background characters - even more subtle
applySubtleWindGusts(skeleton, time, 5, 2);

// Action scenes - use regular gusts sparingly
applyWindGusts(skeleton, time, 20, 10);

// Shop/UI characters - gentle subtle movement
applySubtleWindGusts(skeleton, time); // Default values work well
```

### New Subtle vs Regular Wind Guidelines

**Use `applySubtleWindGusts()` for:**
- Wing physics (most important)
- UI/preview characters
- Delicate ear/tail movement
- Always-on ambient animation

**Use `applyWindGusts()` for:**
- Environmental storytelling
- Dramatic wind effects
- Action sequences
- When you want noticeable movement

## Troubleshooting

### "Physics is undefined" Error

**Cause**: Incorrect Physics API usage
**Solution**:
```typescript
// ✅ Correct
import { Physics } from '@esotericsoftware/spine-core';
skeleton.updateWorldTransform(Physics.update);

// ❌ Wrong
skeleton.updateWorldTransform(Physics);
```

### No Physics Movement Visible

**Cause**: No wind forces applied
**Solution**: Add wind effects in render loop
```typescript
const currentTime = performance.now() / 1000;
applyWindGusts(skeleton, currentTime, 25, 15);
```

### Physics Constraints Not Found

**Cause**: Skeleton has no physics constraints
**Check**:
```typescript
const pcs = (skeleton as any).physicsConstraints;
console.log('Physics constraints:', pcs?.length || 0);
```

**Solution**: Ensure Spine file was exported with physics constraints

### Erratic/Jittery Movement

**Cause**: Wind values too high or delta time issues
**Solution**:
- Reduce wind strength (use 15-30 range)
- Ensure stable delta time in render loop
- Check for multiple wind applications per frame

### Performance Issues

**Cause**: Physics calculations on every frame
**Solution**:
- Limit wind updates (every 2-3 frames)
- Use lower wind values for distant characters
- Disable physics for off-screen characters

## Version Compatibility

### Spine Runtime Versions
- **4.2.43**: Current version (recommended)
- **4.2.92/93**: Compatible with current API
- **4.1.x**: May require different API patterns
- **3.8.x**: Uses old `skeleton.updateWorldTransform()` without parameters

### Migration Guide

#### From Spine 3.x
```typescript
// Old
skeleton.updateWorldTransform();

// New
import { Physics } from '@esotericsoftware/spine-core';
skeleton.updateWorldTransform(Physics.update);
```

#### From Spine 4.1.x
```typescript
// Old
Physics.update(skeleton, deltaTime);

// New
skeleton.updateWorldTransform(Physics.update);
```

## Performance Optimization

### Best Practices

1. **Batch Wind Updates**: Apply wind to multiple characters in single loop
2. **Variable Update Rates**: Update background characters less frequently
3. **Distance-Based LOD**: Reduce physics quality for distant characters
4. **Frame Rate Limiting**: Cap physics updates to 30fps for background elements

### Example Optimizations

```typescript
// Update counter for performance
let updateCounter = 0;

const render = () => {
  updateCounter++;
  const currentTime = performance.now() / 1000;

  // Main character - every frame
  applyWindGusts(mainSkeleton, currentTime, 25, 15);

  // Background characters - every 3rd frame
  if (updateCounter % 3 === 0) {
    backgroundSkeletons.forEach(skeleton => {
      applyWindGusts(skeleton, currentTime, 15, 8);
    });
  }

  // All skeletons need world transform update
  allSkeletons.forEach(skeleton => {
    skeleton.updateWorldTransform(Physics.update);
  });
};
```

## Physics in Different Contexts

### UI Components (Preview, Shop)
- **Wind Strength**: 15-25 (subtle movement)
- **Update Frequency**: Every frame
- **Purpose**: Visual appeal, character personality

### Gameplay Scenes (Housing, Main Game)
- **Wind Strength**: 20-35 (noticeable movement)
- **Update Frequency**: Every frame
- **Purpose**: Environmental immersion, realism

### Cutscenes/Animations
- **Wind Strength**: Variable (0-50 based on scene)
- **Update Frequency**: Every frame
- **Purpose**: Dramatic effect, storytelling

## Debugging Tools

### Physics Constraint Logging
```typescript
function debugPhysicsConstraints(skeleton: Skeleton) {
  const pcs = (skeleton as any).physicsConstraints as PhysicsConstraint[] | undefined;
  if (pcs) {
    console.log(`Found ${pcs.length} physics constraints:`);
    pcs.forEach((c, i) => {
      console.log(`  ${i}: wind=${c.wind}, mix=${c.mix}`);
    });
  } else {
    console.warn('No physics constraints found');
  }
}
```

### Wind Force Visualization
```typescript
function debugWindForce(skeleton: Skeleton, time: number) {
  const base = 25, gustAmp = 15;
  const wind = base + Math.sin(time * 0.8) * gustAmp + Math.sin(time * 2.3) * (gustAmp * 0.25);
  console.log(`Current wind force: ${wind.toFixed(2)}`);
  return wind;
}
```

## Common Integration Points

### Character Controllers
All character controllers should include physics updates in their update loop.

### Scene Loaders
Room and scene loaders must call `updateWorldTransform(Physics.update)` after skeleton setup.

### Animation Systems
Animation state changes should be followed by physics updates to maintain consistency.

### Mesh Updates
Physics updates should occur before mesh refresh operations for correct rendering.

## Testing Physics Implementation

### Visual Tests
1. **Load character with physics constraints**
2. **Apply wind effects in render loop**
3. **Verify tail/ear/wing movement**
4. **Test different wind strengths**

### Performance Tests
1. **Monitor FPS with physics enabled**
2. **Test multiple characters simultaneously**
3. **Verify memory usage remains stable**
4. **Check for physics-related crashes**

### Integration Tests
1. **Test across all character display contexts**
2. **Verify physics work after animation changes**
3. **Test physics persistence across scenes**
4. **Validate physics with different skeleton types**

## Future Enhancements

### Advanced Wind Effects
- **Directional wind**: Vector-based wind forces
- **Environmental responses**: Wind based on scene/weather
- **Interactive forces**: User touch affects physics

### Performance Improvements
- **Physics LOD system**: Automatic quality scaling
- **Predictive updates**: Skip updates for stable states
- **GPU acceleration**: Move physics to shaders

### Visual Enhancements
- **Particle integration**: Wind affects particle systems
- **Cloth simulation**: Advanced fabric physics
- **Hair physics**: Detailed strand-by-strand movement

---

This physics system provides the foundation for natural, engaging character animation that responds dynamically to environmental forces, creating a more immersive and lively user experience.