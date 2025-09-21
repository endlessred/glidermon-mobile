# Cosmetic System Architecture

A comprehensive guide to the anchor-based cosmetic system for character customization in the mobile game.

## Overview

The cosmetic system allows for flexible attachment of visual items (hats, accessories, effects, etc.) to animated characters using an anchor-based positioning system. The system supports multiple render layers, frame-aware positioning, and complex cosmetic interactions.

## Core Concepts

### 1. Sockets and Anchors

**Sockets** define attachment points on characters where cosmetics can be equipped:

```typescript
type CosmeticSocket =
  // Head region
  | "headTop"        // Hats, caps, helmets
  | "headFront"      // Glasses, masks, face paint
  | "headBack"       // Hair, hood back layer
  | "earL" | "earR"  // Earrings, ear accessories

  // Body region
  | "bodyFront"      // Chest accessories, necklaces
  | "bodyBack"       // Capes, wings, backpacks
  | "hand"           // Held items, gloves
  | "waist"          // Belts, waist accessories

  // Special regions
  | "background"     // Environment effects, auras
  | "foreground"     // Overlay effects, particles
  | "fullBody";      // Complete outfit replacements
```

**Anchors** are the actual pixel coordinates for each socket on the character sprite.

### 2. Render Layers (Z-Depth)

Cosmetics render in specific layers to create proper visual depth:

```typescript
type RenderLayer =
  | "background"     // -100: Behind character (auras, environment)
  | "bodyBack"       // -50:  Behind body (wings, capes)
  | "bodyBase"       // 0:    Character base layer
  | "bodyFront"      // 50:   In front of body (armor, accessories)
  | "headBack"       // 100:  Behind head (hair, hoods)
  | "headBase"       // 150:  Head base layer
  | "headFront"      // 200:  In front of head (hats, glasses)
  | "accessory"      // 250:  Accessories layer
  | "foreground";    // 300:  Front overlay effects
```

### 3. Frame Modes

Cosmetics can respond to character animation in different ways:

- **Static**: Single frame, doesn't animate with character
- **Animated**: Follows character animation frame-by-frame
- **Conditional**: Complex logic based on character state

## Character Setup

### Defining Character Anchors

Each character/animation combination needs anchor definitions:

```typescript
export const glidermonIdleAnchors: CharacterAnchorSet = {
  characterId: "glidermon",
  animationSet: "idle",

  // Base anchor positions for each socket
  anchors: {
    headTop: { x: 34, y: 12, rotation: 0 },
    headFront: { x: 32, y: 18, rotation: 0 },
    headBack: { x: 32, y: 16, rotation: 0 },
    earL: { x: 20, y: 10, rotation: -15 },
    earR: { x: 44, y: 10, rotation: 15 },
    bodyFront: { x: 32, y: 35, rotation: 0 },
    bodyBack: { x: 32, y: 33, rotation: 0 },
    hand: { x: 40, y: 44, rotation: 0 },
    waist: { x: 32, y: 48, rotation: 0 },
    background: { x: 32, y: 32, rotation: 0 },
    foreground: { x: 32, y: 32, rotation: 0 },
    fullBody: { x: 32, y: 32, rotation: 0 },
  },

  // Frame-specific adjustments
  frameOverrides: [
    {
      frames: [3, 6], // Animation frames 3-6
      anchorAdjustments: {
        headTop: { x: -1 }, // Shift hat left by 1px
        headFront: { x: -1 }, // Keep glasses aligned
        earL: { rotation: -5 }, // Slight ear movement
        earR: { rotation: 5 },
      }
    },
    {
      frames: 7, // Blink frame
      anchorAdjustments: {
        headFront: { y: 1 }, // Glasses move slightly down when blinking
      }
    }
  ]
};
```

## Cosmetic Definitions

### Basic Cosmetic Structure

```typescript
type CosmeticDefinition = {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  socket: CosmeticSocket;        // Where it attaches
  renderLayer: RenderLayer;      // Rendering depth
  texKey: AssetKey;             // Sprite sheet reference
  frameMode: "static" | "animated" | "conditional";

  // Positioning relative to anchor
  anchor: {
    socket: CosmeticSocket;      // Which anchor to use
    offset: { x: number; y: number }; // Pixel offset from anchor
    pivot: { x: number; y: number };  // Rotation/scale center point
    scale?: number;              // Size multiplier
    rotation?: number;           // Base rotation in degrees
  };

  // Optional features...
  frameMapping?: { idle?: number[]; walk?: number[]; };
  frameOverrides?: Array<{ /* per-frame adjustments */ }>;
  cost: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  category: string;
};
```

### Example Cosmetic Definitions

#### Static Hat from Sprite Sheet

```typescript
{
  id: "frog_hat",
  name: "Green Frog Hat",
  socket: "headTop",
  renderLayer: "headFront",
  texKey: "hat_pack_1",
  frameMode: "static",
  frameMapping: {
    idle: [0, 0, 0, 0, 0, 0, 0, 0] // Frame 0 for all character frames
  },
  anchor: {
    socket: "headTop",
    offset: { x: -15, y: 8 },
    pivot: { x: 18, y: 20 },
  },
  cost: 300,
  rarity: "common",
  category: "hats"
}
```

#### Animated Background Effect

```typescript
{
  id: "magic_aura",
  name: "Magical Aura",
  socket: "background",
  renderLayer: "background",
  texKey: "magic_effects",
  frameMode: "animated",
  frameMapping: {
    idle: [0, 1, 2, 3, 4, 5, 6, 7] // Cycling animation
  },
  anchor: {
    socket: "background",
    offset: { x: -16, y: -16 }, // Center around character
    pivot: { x: 32, y: 32 },
    scale: 1.2, // Slightly larger than character
  },
  cost: 1200,
  rarity: "epic",
  category: "effects"
}
```

#### Conditional Accessory

```typescript
{
  id: "cool_glasses",
  name: "Cool Sunglasses",
  socket: "headFront",
  renderLayer: "headFront",
  texKey: "accessories_pack_1",
  frameMode: "static",
  anchor: {
    socket: "headFront",
    offset: { x: -8, y: 2 },
    pivot: { x: 16, y: 8 },
  },
  frameOverrides: [
    {
      characterFrames: 7, // Blink frame
      adjustments: {
        visible: false // Hide glasses during blink
      }
    }
  ],
  cost: 400,
  rarity: "uncommon",
  category: "accessories"
}
```

## System Integration

### Registration

```typescript
// Initialize the cosmetic system
export function initializeCosmeticSystem() {
  // Register character anchors
  cosmeticSystem.registerCharacterAnchors(glidermonIdleAnchors);

  // Register all cosmetic definitions
  cosmeticDefinitions.forEach(cosmetic => {
    cosmeticSystem.registerCosmetic(cosmetic);
  });
}
```

### Rendering Integration

```typescript
// In your character rendering component
export default function CosmeticSprite({
  Skia,
  characterId,
  animationSet,
  currentFrame,
  characterPosition,
  characterScale,
  flipX = false,
  equippedCosmetics,
  layerFilter // Optional: only render specific layers
}: CosmeticSpriteProps) {
  // Calculate render instructions
  const renderInstructions = useMemo(() => {
    const instructions = cosmeticSystem.calculateRenderInstructions(
      characterId,
      animationSet,
      currentFrame,
      equippedCosmetics,
      characterPosition,
      characterScale
    );

    // Filter by layer if specified
    if (layerFilter) {
      return instructions.filter(inst => inst.cosmetic.renderLayer === layerFilter);
    }

    return instructions;
  }, [characterId, animationSet, currentFrame, equippedCosmetics, characterPosition, characterScale, layerFilter]);

  // Render each cosmetic instruction...
}
```

### Layer-Based Rendering

Use the provided hook for easy layer management:

```typescript
const {
  renderBackgroundCosmetics,
  renderBodyBackCosmetics,
  renderBodyFrontCosmetics,
  renderHeadBackCosmetics,
  renderHeadFrontCosmetics,
  renderAccessoryCosmetics,
  renderForegroundCosmetics
} = useCosmeticRenderer(characterId, animationSet, equippedCosmetics);

// In your main character renderer:
return (
  <Group>
    {/* Background effects */}
    {renderBackgroundCosmetics(Skia, characterPos, frame, scale, flipX)}

    {/* Wings, capes */}
    {renderBodyBackCosmetics(Skia, characterPos, frame, scale, flipX)}

    {/* MAIN CHARACTER SPRITE */}
    <CharacterSprite {...characterProps} />

    {/* Front body accessories */}
    {renderBodyFrontCosmetics(Skia, characterPos, frame, scale, flipX)}

    {/* Head accessories (behind) */}
    {renderHeadBackCosmetics(Skia, characterPos, frame, scale, flipX)}

    {/* Head accessories (front) */}
    {renderHeadFrontCosmetics(Skia, characterPos, frame, scale, flipX)}

    {/* General accessories */}
    {renderAccessoryCosmetics(Skia, characterPos, frame, scale, flipX)}

    {/* Overlay effects */}
    {renderForegroundCosmetics(Skia, characterPos, frame, scale, flipX)}
  </Group>
);
```

## Advanced Features

### Frame Overrides

Both character anchors and individual cosmetics can have frame-specific adjustments:

```typescript
frameOverrides: [
  {
    characterFrames: [3, 6], // Frames 3-6
    adjustments: {
      offset: { x: -1 }, // Extra adjustment during these frames
      rotation: 5,       // Slight rotation
      scale: 1.1,        // Slightly larger
      visible: true      // Show/hide
    }
  }
]
```

### Conditional Rendering

Advanced cosmetics can have rendering conditions:

```typescript
conditions: {
  requiresSocket: ["bodyBack"], // Only show if wings equipped
  conflictsWith: ["headBack"],  // Hide if hood equipped
  animationStates: ["idle"]     // Only during idle animation
}
```

### Masking and Clipping

For cosmetics that should clip or modify the character:

```typescript
masking: {
  bodyPart: "head",
  mode: "clip" // "overlay" | "replace"
}
```

## Asset Organization

### Recommended File Structure

```
assets/
├── characters/
│   ├── glidermon_idle.png     # Main character animation
│   ├── glidermon_walk.png
│   └── glidermon_jump.png
├── cosmetics/
│   ├── hats/
│   │   ├── leaf_hat.png       # Individual animated hats
│   │   ├── greater_hat.png
│   │   └── hat_pack_1.png     # Sprite sheet with multiple hats
│   ├── accessories/
│   │   ├── glasses_pack.png
│   │   └── jewelry_pack.png
│   ├── effects/
│   │   ├── magic_effects.png
│   │   └── particle_effects.png
│   └── wings/
│       └── wing_pack_1.png
```

### Sprite Sheet Conventions

- **Character animations**: 8 frames horizontally (64x64 per frame)
- **Individual cosmetics**: Follow character frame count or use single frame
- **Cosmetic packs**: 8 items horizontally (64x64 per item)
- **Effect sheets**: Variable frame count, specify in frameMapping

## Performance Considerations

1. **Texture Management**: Load cosmetic textures only when needed
2. **Culling**: Don't render cosmetics outside screen bounds
3. **Batching**: Group cosmetics by texture for efficient rendering
4. **Caching**: Cache render instructions when character state unchanged
5. **LOD**: Use simplified cosmetics at small scales

## Extending the System

### Adding New Socket Types

1. Add to `CosmeticSocket` type
2. Update character anchor definitions
3. Add to render layer mapping if needed

### New Animation Support

1. Create new `CharacterAnchorSet` for animation
2. Register with cosmetic system
3. Update cosmetic `frameMapping` if needed

### Complex Interactions

The system supports cosmetics that interact with each other through the `conditions` system, allowing for complex layering rules and dependencies.

---

This system provides a scalable foundation for character customization that can grow with your game's needs while maintaining performance and visual quality.