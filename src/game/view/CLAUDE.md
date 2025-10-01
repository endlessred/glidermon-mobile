# Spine 2D Implementation Guide

This guide explains how to use the Spine 2D Three.js implementation for animating characters in React Native Expo apps.

## Overview

The implementation uses Spine 4.2 runtime with Three.js and expo-gl to render Spine animations on mobile platforms. It consists of:

- `SpineCharacter.tsx` - React component for rendering Spine characters
- `../../spine/SpineThree.ts` - Three.js adapter for Spine skeleton rendering
- `../../spine/loaders.ts` - Asset loading utilities (optional)

## Key Components

### SpineCharacter Component

```tsx
import SpineCharacter from './SpineCharacter';

<SpineCharacter
  scale={1}                    // Base scale multiplier
  animation="idle"             // Animation name from Spine project
  skin="default"              // Skin name (optional)
  x={100}                     // Position props (currently unused)
  y={100}
/>
```

### Required Assets

Place your Spine assets in `src/assets/GliderMonSpine/`:
- `skeleton.json` - Spine skeleton data
- `skeleton.atlas` - Texture atlas definition
- `skeleton.png` - Texture atlas image

## Critical Implementation Details

### ⚠️ Transform System

**IMPORTANT**: The SpineThree adapter ignores Three.js mesh transforms. Use Spine's skeleton transforms instead:

```tsx
// ❌ DON'T DO THIS - Won't work!
mesh.scale.set(finalScale, finalScale, 1);
mesh.position.set(posX, posY, 0);

// ✅ DO THIS - Works correctly!
skeleton.scaleX = finalScale;
skeleton.scaleY = finalScale;
skeleton.x = posX;
skeleton.y = posY;
```

**Why**: The adapter calls `mesh.matrix.identity()` each frame and bakes world-space vertices directly into the geometry, bypassing Three.js object transforms.

### Coordinate System

The implementation uses a flipped Y-coordinate camera:

```tsx
const camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
```

This ensures Spine characters render right-side up without additional rotations.

**⚠️ Important**: With flipped Y coordinates, positioning behaves differently:
- **Lower Y values** (e.g., `height * 0.3`) move the character **DOWN**
- **Higher Y values** (e.g., `height * 0.7`) move the character **UP**
- Use `skeleton.y = height * 0.4` to position character lower in frame
- Use `skeleton.y = height * 0.6` to position character higher in frame

### Physics Integration (Spine 4.2)

**Critical**: Spine 4.2 requires a Physics parameter for `updateWorldTransform()`:

```tsx
// ✅ Correct - Required for Spine 4.2+
skeleton.updateWorldTransform(Physics.update);

// ❌ Old way - Causes "physics is undefined" error
skeleton.updateWorldTransform();
```

Import Physics from spine-core:
```tsx
import { Physics } from '@esotericsoftware/spine-core';
```

## Usage Examples

### Basic Character

```tsx
function MyComponent() {
  return (
    <SpineCharacter
      scale={1}
      animation="idle"
    />
  );
}
```

### Scaled Character with Custom Animation

```tsx
function MyCharacter() {
  return (
    <SpineCharacter
      scale={0.5}                    // 50% size
      animation="Eyes/LookDirection/LookDown"
    />
  );
}
```

## Scaling Guidelines

The `scale` prop is multiplied by an internal factor (currently 0.15) for proper sizing:

- `scale={1}` = Normal size (0.15 final scale)
- `scale={2}` = Double size (0.30 final scale)
- `scale={0.5}` = Half size (0.075 final scale)

Adjust the internal multiplier in `SpineCharacter.tsx` if needed:

```tsx
const finalScale = scale * 0.15; // Adjust this multiplier
```

## Performance Notes

- Renders at 60fps with hardware acceleration
- Uses expo-three's `loadAsync()` for reliable texture loading
- Minimal texture caching via `MaterialCache`
- Geometry buffers are updated each frame for animation

## Troubleshooting

### Character appears upside down
- Ensure camera uses flipped Y coordinates: `OrthographicCamera(0, width, height, 0, ...)`
- Don't apply manual rotations to the mesh

### Character doesn't scale/move
- Use skeleton transforms, not mesh transforms
- Check that `skeleton.scaleX/Y` and `skeleton.x/y` are set before creating SkeletonMesh

### "Physics is undefined" error
- Import `Physics` from `@esotericsoftware/spine-core`
- Use `skeleton.updateWorldTransform(Physics.update)`
- Ensure using Spine 4.2+ compatible runtime

### Texture loading fails
- Use `expo-three`'s `loadAsync()` instead of `THREE.TextureLoader`
- Set `texture.flipY = false` for Spine textures
- Verify asset paths in require() statements

### Animation not found
- Check animation name matches exactly (case-sensitive)
- Use skeleton data to list available animations:
  ```tsx
  console.log('Available animations:', skeletonData.animations.map(a => a.name));
  ```

## Asset Requirements

### Spine Project Export
- Export for Spine 4.2 runtime
- Use PNG texture atlas format
- Ensure texture atlas page names match filename (e.g., "skeleton.png")

### Metro Configuration
- Assets are loaded via `require()` statements
- Metro auto-parses JSON files (used directly)
- Atlas and PNG files need explicit asset loading

## Extension Points

### Custom Animations
```tsx
// Set animation programmatically
state.setAnimation(0, "customAnimation", true);
```

### Multiple Characters
```tsx
function GameScreen() {
  return (
    <View>
      <SpineCharacter scale={1} animation="idle" />
      <SpineCharacter scale={0.5} animation="walking" />
    </View>
  );
}
```

### Dynamic Scaling
```tsx
const [characterScale, setCharacterScale] = useState(1);

<SpineCharacter
  scale={characterScale}
  animation="idle"
/>
```

## Dependencies

Required packages:
```json
{
  "@esotericsoftware/spine-core": "4.2.93",
  "three": "^0.180.0",
  "expo-three": "^8.0.0",
  "expo-gl": "^16.0.7"
}
```

## Architecture Notes

The implementation follows this pattern:
1. Load assets via Metro's require() system
2. Create Spine objects (skeleton, state, atlas)
3. Apply transforms to skeleton (not Three.js mesh)
4. Create SkeletonMesh adapter with identity transforms
5. Update loop: state → skeleton → refreshMeshes → render

This approach provides optimal performance while maintaining compatibility with Expo's asset system and React Native's rendering constraints.