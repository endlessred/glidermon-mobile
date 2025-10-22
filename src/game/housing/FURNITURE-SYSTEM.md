# Furniture System Documentation

## Overview

The furniture system extends the apartment housing system to support placing furniture items using JSON-based room files. It integrates with the existing isometric housing rendering and follows the same painterly rendering approach as characters.

## Architecture

### Core Components

1. **FurnitureLoader.ts** - Loads and creates furniture instances
2. **furnitureCatalog.ts** - Defines available furniture types and variants
3. **Painterly.ts** - Manages render ordering for proper visual layering
4. **Room JSON files** - Define furniture placement in rooms
5. **RoomBuilder.ts** - Processes room configuration including furniture

### Data Flow

```
Room JSON → RoomBuilder → FurnitureLoader → Scene Integration → Render Loop
```

## Furniture Configuration

### Room JSON Structure

```json
{
  "furniture": [
    {
      "id": "chair",
      "variantId": "wood_chair_green",
      "tileId": "C2",
      "rotation": 0,
      "layer": "mid",
      "facing": "right"
    }
  ]
}
```

### Configuration Fields

- **id**: Furniture type from `FURNITURE_CATALOG` (e.g., "chair")
- **variantId**: Specific variant (e.g., "wood_chair_green", "beanbag_brown")
- **tileId**: Grid position using Excel-style coordinates (A1-H8)
- **rotation**: Rotation in degrees (Spine uses degrees, not radians)
- **layer**: Render layer ("under", "mid", "over")
- **facing**: Orientation ("left", "right") - affects FlipX animation

### Available Furniture

Currently supported:
- **Chair**: Multiple variants including wood chairs, beanbags, office chairs
- Variants defined in `furnitureCatalog.ts` with corresponding Spine attachments

## Painterly Rendering System

### The Problem

Traditional z-depth rendering doesn't work well for 2D isometric games because:
- All objects are essentially flat sprites
- Need precise control over draw order for visual correctness
- Transparent materials require special handling

### The Solution: Painterly Rendering

The system uses **render order values** instead of z-depth:
- Higher `renderOrder` = renders later (appears in front)
- Materials have `depthTest = false` and `depthWrite = false`
- Draw order determined by scene graph order + renderOrder

### Render Order Hierarchy

```
Layer               Base RenderOrder    Purpose
==========================================
Room tiles          0                   Floor/walls (background)
Under layer          1000               Rugs, floor decorations (always behind)
Behind furniture     1500               Mid-layer furniture in back rows
Character            2000               Player character
Front furniture      2500               Mid-layer furniture in front rows
Over layer           3500               Tall items, lamps (always on top)
```

### Layer System

Furniture can be assigned to different layers that control their rendering behavior:

#### **"under" Layer (renderOrder: 1000)**
- **Purpose**: Rugs, floor decorations, carpet
- **Behavior**: Always renders behind character and all other furniture
- **Use case**: Items that should appear "on the floor" under everything else

#### **"mid" Layer (renderOrder: 1500-2500)**
- **Purpose**: Regular furniture like chairs, tables, beds
- **Behavior**: Uses depth sorting based on grid position relative to character
- **Back rows** (A, B): Renders behind character (1500)
- **Front rows** (C, D+): Renders in front of character (2500)

#### **"over" Layer (renderOrder: 3500)**
- **Purpose**: Tall furniture, lamps, hanging decorations
- **Behavior**: Always renders in front of character and all other furniture
- **Use case**: Items that should appear "above" everything else

### Depth Sorting System

For **"mid" layer furniture only**, the system uses grid row positions to determine depth:

#### Grid Layout (4x4 room example)
```
    1   2   3   4
A  [·] [·] [·] [·]  ← Back row (behind character)
B  [·] [·] [·] [·]  ← Back row (behind character)
C  [·] [☺] [·] [·]  ← Character position
D  [·] [·] [·] [·]  ← Front row (in front of character)
```

### Example Layering Scenario

```json
{
  "furniture": [
    {
      "id": "rug",
      "tileId": "C2",
      "layer": "under"     // Always behind everything (rug on floor)
    },
    {
      "id": "chair",
      "tileId": "A2",
      "layer": "mid"       // Behind character (back row)
    },
    {
      "id": "table",
      "tileId": "D3",
      "layer": "mid"       // In front of character (front row)
    },
    {
      "id": "lamp",
      "tileId": "B2",
      "layer": "over"      // Always on top (tall item)
    }
  ]
}
```

**Render order result**:
1. Room tiles (0)
2. Rug at C2 (1000) - under layer
3. Chair at A2 (1500) - mid layer, back row
4. Character (2000)
5. Table at D3 (2500) - mid layer, front row
6. Lamp at B2 (3500) - over layer

This creates natural depth layering where rugs appear under everything, furniture depth-sorts relative to the character, and lamps appear over everything.

### How Characters Render Properly

Characters work because they follow this pattern:

1. **Hierarchy**: Added as child of `room.mesh` (same coordinate space)
2. **Initial Setup**: Start with renderOrder 0
3. **Render Loop Updates**: Every frame, calculate new renderOrder:
   ```typescript
   mesh.renderOrder = renderOrderFromFeetY(CHARACTER_RENDER_ORDER_BASE, anchor.sceneY, 5);
   ```
4. **Child Mesh Ordering**: Apply micro-offsets to child meshes for z-fighting prevention
5. **Material Properties**: Use painterly material settings (no depth testing)

## Furniture Implementation Details

### 1. Furniture Loading (FurnitureLoader.ts)

```typescript
// Create furniture instance
const furnitureInstance = await createFurnitureInstance(config, anchor, roomScale);

// Store base render order for render loop
mesh.userData.basePainterlyOrder = calculateRenderOrder(config, anchor);

// Apply initial painterly state
applyPainterlyState(mesh, baseRenderOrder);

// Set up persistent painterly updates
mesh.onBeforeRender = () => {
  applyPainterlyState(mesh, mesh.userData.basePainterlyOrder);
};
```

### 2. Scene Integration (IsometricHousingThreeJS.tsx)

```typescript
// Add furniture as child of room.mesh (same as character)
room.mesh.add(furnitureInstance.mesh);

// Reset local transforms (inherits room transforms)
furnitureInstance.mesh.position.set(0, 0, 0);
furnitureInstance.mesh.scale.set(1, 1, 1);
```

### 3. Render Loop Updates

```typescript
// Every frame, update renderOrder like character does
const storedOrder = furnitureInstance.mesh.userData.basePainterlyOrder;
const anchor = getAnchor(furnitureInstance.config.tileId);
const finalOrder = renderOrderFromFeetY(storedOrder, anchor.sceneY, 5);

furnitureInstance.mesh.renderOrder = finalOrder;

// Apply to child meshes with micro-offsets
furnitureInstance.mesh.traverse((obj) => {
  if (obj === furnitureInstance.mesh) return;
  const baseSlotOrder = obj.userData?.baseRenderOrder ?? obj.renderOrder ?? 0;
  obj.renderOrder = finalOrder + baseSlotOrder * 0.01;
});
```

## Critical Success Factors

### ✅ What Makes It Work

1. **Same Hierarchy**: Furniture parented to `room.mesh` like character
2. **Render Loop Updates**: RenderOrder calculated every frame, not just once
3. **Base Order Storage**: `userData.basePainterlyOrder` survives refreshMeshes()
4. **Child Mesh Updates**: Apply renderOrder to all child meshes
5. **High Base Values**: Furniture uses 6000+ vs character's 2000

### ❌ Common Pitfalls

1. **Setting renderOrder once**: Gets reset by refreshMeshes()
2. **Wrong hierarchy**: Adding to scene instead of room.mesh breaks coordinates
3. **Missing child updates**: Only updating parent mesh renderOrder
4. **Low renderOrder values**: Must be higher than character (2000)
5. **Forgetting material properties**: Need depthTest/depthWrite = false

## Coordinate System

### Room Space Coordinates

Everything uses the room's local coordinate system:
- Anchors provide `spineX`, `spineY` coordinates in room space
- Furniture positioned using `skeleton.x = anchor.spineX`
- Room.mesh handles scaling and centering via its transforms

### Positioning Logic

```typescript
// Use same offsets as character
const baseTileCenterOffsetY = 500;
const scaledOffsetY = baseTileCenterOffsetY * roomScale;

// Position furniture (no feet offset like character)
const calculatedX = anchor.spineX + scaledOffsetX;
const calculatedY = anchor.spineY + scaledOffsetY;

skeleton.x = calculatedX;
skeleton.y = calculatedY;
```

## Adding New Furniture Types

### 1. Create Spine Assets
- Design furniture variants as Spine attachments
- Export as .atlas, .json, .png files
- Place in `src/assets/Apartment/[FurnitureType]/`

### 2. Update Furniture Catalog
```typescript
// furnitureCatalog.ts
export const FURNITURE_CATALOG = {
  newFurniture: {
    skeleton: "NewFurniture",
    variants: [
      { id: "variant1", skin: "Variant1_Attachment" },
      { id: "variant2", skin: "Variant2_Attachment" }
    ]
  }
};
```

### 3. Add Loader Support
```typescript
// FurnitureLoader.ts - loadFurnitureSkeleton()
if (furnitureId === 'newFurniture') {
  const atlasModule = require('../../../assets/Apartment/NewFurniture/NewFurniture.atlas');
  const jsonModule = require('../../../assets/Apartment/NewFurniture/NewFurniture.json');
  const textureModule = require('../../../assets/Apartment/NewFurniture/NewFurniture.png');

  return await loadSpineFromExpoAssets({
    atlasModule, jsonModule,
    textureModules: [textureModule],
    defaultMix: 0
  });
}
```

### 4. Use in Room JSON
```json
{
  "furniture": [
    {
      "id": "newFurniture",
      "variantId": "variant1",
      "tileId": "B2",
      "layer": "mid",
      "facing": "left"
    }
  ]
}
```

## Debugging Tips

### Visibility Issues
- Check `renderOrder` values in logs - should be 6000+ for furniture
- Verify furniture added as child of `room.mesh` not scene
- Ensure `mesh.visible = true` and `meshChildren > 0`

### Positioning Issues
- Check anchor coordinates - should match tile positions
- Verify skeleton.x/y values in logs
- Test on empty tiles outside room to isolate coordinate issues

### Performance Issues
- Limit `console.log` frequency with `Math.random() < 0.01`
- Consider skipping `refreshMeshes()` for static furniture
- Monitor frame rate with furniture count

### Common Log Patterns
```
✅ Good: "Painterly: Applied renderOrder 6005 to 5 meshes"
✅ Good: "Updated furniture renderOrder" with finalOrder 6000+
❌ Bad: "furnitureRenderOrder": 0 (means render loop not updating)
❌ Bad: Furniture visible at (0,0) (wrong coordinate transforms)
```

## Integration with Existing Systems

### Character Controller
- Characters and furniture use same painterly system
- Both update renderOrder in render loop
- Both parented to room.mesh for coordinate consistency

### Room Builder
- Processes furniture from room JSON
- Validates furniture catalog entries
- Stores furniture for later scene integration

### Animation System
- Furniture supports Spine animations (idle, interactions)
- FlipX animation for orientation changes
- Same animation update loop as character

The furniture system successfully extends the housing system while maintaining all existing functionality and performance characteristics.