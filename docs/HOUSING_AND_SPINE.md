# Isometric Housing + Spine Character Integration

This document describes how to integrate a Spine character with the isometric housing system for movement, positioning, and camera following.

## Current System Overview

### Coordinate Systems

The housing system uses three coordinate spaces:

1. **Grid Coordinates** (tile-based): `(col, row)` where `col=0, row=0` is top-left tile
2. **Isometric Screen Coordinates**: `(x, y)` pixels in diamond layout
3. **Centered Scene Coordinates**: `(x, y)` relative to scene origin (0,0)

### Key Functions

```typescript
// Convert grid position to isometric screen space
const isoToScreenCentered = (col: number, row: number) => ({
  x: (col - row) * HALF_W,  // HALF_W = 202
  y: (col + row) * HALF_H,  // HALF_H = 101
});

// Convert screen space to centered scene coordinates
const placeX = (sx: number) => sx - roomCtr.x;
const placeY = (sy: number) => roomCtr.y - sy; // Y-down screen space
```

### Rendering Order

- **Walls**: `renderOrder = 0-1` (render first, behind everything)
- **Floors**: `renderOrder = 1000 + Math.floor(feetY) * 10` (based on depth)
- **Character**: `renderOrder = 1000 + Math.floor(feetY) * 10 + 5` (character bias)

## Character Integration Strategy

### 1. Character Positioning

The character needs a "feet" anchor point that determines its grid position and render order.

```typescript
interface CharacterPosition {
  // Grid-based position (can be fractional for smooth movement)
  gridX: number;  // column position (0-7 for 8x8 grid)
  gridY: number;  // row position (0-7 for 8x8 grid)

  // Optional sub-tile offset for fine positioning
  offsetX?: number; // -0.5 to 0.5 within tile
  offsetY?: number; // -0.5 to 0.5 within tile
}

function positionCharacter(character: SpineMesh, pos: CharacterPosition) {
  // Calculate effective grid position
  const effectiveX = pos.gridX + (pos.offsetX || 0);
  const effectiveY = pos.gridY + (pos.offsetY || 0);

  // Convert to isometric screen coordinates
  const iso = isoToScreenCentered(effectiveX, effectiveY);

  // Character "feet" should be at diamond bottom
  const feetY = iso.y + HALF_H;

  // Position in centered scene coordinates
  character.position.set(
    placeX(iso.x),
    placeY(feetY),
    0
  );

  // Set render order for proper depth sorting
  character.renderOrder = 1000 + Math.floor(feetY) * 10 + 5; // +5 character bias
}
```

### 2. Movement System

#### Grid-Based Movement

```typescript
class CharacterController {
  private currentPos: CharacterPosition = { gridX: 4, gridY: 4 }; // center of 8x8
  private targetPos: CharacterPosition = { gridX: 4, gridY: 4 };
  private moveSpeed = 2.0; // tiles per second
  private isMoving = false;

  // Move to specific grid tile
  moveToTile(col: number, row: number) {
    if (this.isValidPosition(col, row) && !this.isMoving) {
      this.targetPos = { gridX: col, gridY: row };
      this.isMoving = true;
    }
  }

  // Check if position is within walkable area
  private isValidPosition(col: number, row: number): boolean {
    // 8x8 grid bounds
    if (col < 0 || col >= 8 || row < 0 || row >= 8) return false;

    // Check against static colliders from room template
    const blockedTiles = [
      // Add wall tiles or furniture positions here
      // Example: { x: 0, y: 0 }, { x: 7, y: 0 }, etc.
    ];

    return !blockedTiles.some(tile => tile.x === col && tile.y === row);
  }

  // Update movement (call each frame)
  update(deltaTime: number, character: SpineMesh) {
    if (!this.isMoving) return;

    const dx = this.targetPos.gridX - this.currentPos.gridX;
    const dy = this.targetPos.gridY - this.currentPos.gridY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.1) {
      // Reached target
      this.currentPos = { ...this.targetPos };
      this.isMoving = false;
    } else {
      // Move towards target
      const moveDistance = this.moveSpeed * deltaTime;
      const progress = Math.min(moveDistance / distance, 1);

      this.currentPos.gridX += dx * progress;
      this.currentPos.gridY += dy * progress;
    }

    // Update character position
    positionCharacter(character, this.currentPos);

    // Update Spine animation based on movement
    if (this.isMoving) {
      this.setSpineAnimation(character, 'walk', dx, dy);
    } else {
      this.setSpineAnimation(character, 'idle', 0, 0);
    }
  }

  private setSpineAnimation(character: SpineMesh, animName: string, dx: number, dy: number) {
    // Set Spine animation and direction
    character.state.setAnimation(0, animName, true);

    // Flip character based on movement direction
    if (dx > 0) character.skeleton.scaleX = 1;  // facing right
    if (dx < 0) character.skeleton.scaleX = -1; // facing left
  }
}
```

#### Touch/Click Movement

```typescript
class InputHandler {
  // Convert screen touch to grid position
  screenToGrid(screenX: number, screenY: number, camera: THREE.Camera, scene: THREE.Scene): CharacterPosition | null {
    // Create raycaster from screen coordinates
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (screenX / screenWidth) * 2 - 1,
      -(screenY / screenHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    // Intersect with floor tiles
    const room = scene.getObjectByName('APARTMENT_ROOM');
    if (!room) return null;

    const floorTiles = room.children.filter(child =>
      child.renderOrder >= 1000 // floor render order range
    );

    const intersects = raycaster.intersectObjects(floorTiles);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const worldPos = hit.point;

    // Convert world position back to grid coordinates
    // This is approximate - you may need to refine based on your exact setup
    const sceneX = worldPos.x + roomCtr.x;
    const sceneY = roomCtr.y - worldPos.y;

    // Convert screen coords back to grid coords (inverse of isoToScreenCentered)
    const gridX = (sceneX / HALF_W + sceneY / HALF_H) / 2;
    const gridY = (sceneY / HALF_H - sceneX / HALF_W) / 2;

    return {
      gridX: Math.round(gridX),
      gridY: Math.round(gridY)
    };
  }
}
```

### 3. Camera Following

#### Static Camera (Current)
The current centered camera shows the entire room. Character moves within this fixed view.

#### Following Camera (Future Enhancement)

```typescript
class CameraController {
  private camera: THREE.OrthographicCamera;
  private target: CharacterPosition = { gridX: 4, gridY: 4 };
  private current: CharacterPosition = { gridX: 4, gridY: 4 };
  private followSpeed = 3.0; // camera follow speed

  constructor(camera: THREE.OrthographicCamera) {
    this.camera = camera;
  }

  // Set camera to follow character
  followCharacter(characterPos: CharacterPosition) {
    this.target = { ...characterPos };
  }

  // Update camera position (call each frame)
  update(deltaTime: number) {
    // Smooth camera movement towards target
    const dx = this.target.gridX - this.current.gridX;
    const dy = this.target.gridY - this.current.gridY;

    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      this.current.gridX += dx * this.followSpeed * deltaTime;
      this.current.gridY += dy * this.followSpeed * deltaTime;

      // Convert to scene coordinates and update camera
      const iso = isoToScreenCentered(this.current.gridX, this.current.gridY);
      const feetY = iso.y + HALF_H;

      // Update camera position (keeping Z unchanged)
      this.camera.position.x = placeX(iso.x);
      this.camera.position.y = placeY(feetY);
      this.camera.updateProjectionMatrix();
    }
  }

  // Constrain camera to room bounds
  private constrainToRoom() {
    const maxOffset = 2; // tiles from edge
    this.current.gridX = Math.max(maxOffset, Math.min(7 - maxOffset, this.current.gridX));
    this.current.gridY = Math.max(maxOffset, Math.min(7 - maxOffset, this.current.gridY));
  }
}
```

### 4. Integration Example

```typescript
// In your main housing component
export default function IsometricHousingThreeJS({
  width = 300,
  height = 250,
}: IsometricHousingThreeJSProps) {
  const characterController = useRef<CharacterController>(null);
  const cameraController = useRef<CameraController>(null);
  const spineCharacter = useRef<SpineMesh>(null);

  const handleContextCreate = async (gl: any) => {
    // ... existing setup code ...

    // Initialize character controller
    characterController.current = new CharacterController();
    cameraController.current = new CameraController(camera);

    // Load and setup Spine character
    const character = await loadSpineCharacter();
    spineCharacter.current = character;

    // Position character initially
    const initialPos = { gridX: 4, gridY: 4 }; // center of room
    positionCharacter(character, initialPos);

    // Add character to room
    const room = scene.getObjectByName('APARTMENT_ROOM');
    room?.add(character);

    // Game loop
    let lastTime = 0;
    const render = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      // Update character movement
      characterController.current?.update(deltaTime, character);

      // Update camera following
      const charPos = characterController.current?.getCurrentPosition();
      if (charPos) {
        cameraController.current?.followCharacter(charPos);
        cameraController.current?.update(deltaTime);
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
      requestAnimationFrame(render);
    };
    render(0);
  };

  // Handle touch input
  const handleTouch = (event: TouchEvent) => {
    const touch = event.touches[0];
    const gridPos = inputHandler.screenToGrid(touch.clientX, touch.clientY, camera, scene);

    if (gridPos) {
      characterController.current?.moveToTile(gridPos.gridX, gridPos.gridY);
    }
  };

  return (
    <View style={{ width, height }}>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={handleContextCreate}
        onTouchStart={handleTouch}
      />
    </View>
  );
}
```

## Key Benefits

1. **Deterministic Positioning**: Grid-based movement ensures character always aligns with tiles
2. **Proper Depth Sorting**: Character renders in correct order relative to floor tiles and walls
3. **Smooth Animation**: Fractional grid positions allow smooth movement between tiles
4. **Extensible**: Easy to add furniture, props, or multiple characters using same system
5. **Touch Interaction**: Direct tile-clicking for movement feels natural
6. **Camera Flexibility**: Can switch between fixed and following camera modes

## Next Steps

1. **Load Spine Character**: Integrate your existing Spine loading system
2. **Implement Movement**: Start with basic tile-to-tile movement
3. **Add Touch Input**: Convert screen touches to grid coordinates
4. **Character Animation**: Connect movement to Spine animation states
5. **Camera Following**: Implement smooth camera tracking (optional)
6. **Collision System**: Add furniture and wall collision detection
7. **Multiple Characters**: Extend system for multiple entities if needed

This system provides a solid foundation for character movement in the isometric apartment while maintaining proper visual ordering and smooth animations.