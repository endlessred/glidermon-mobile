import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { loadHousingTextureAtlas, TextureAtlas } from '../assets/textureAtlas';
import { TILE_W, TILE_H, HALF_W, HALF_H } from '../coords';

interface IsometricHousingThreeJSProps {
  width?: number;
  height?: number;
  characterX?: number;
  characterY?: number;
}

// ---------- floor tile picker (rectangle-based: corners/edges/interior) ----------
function pickFloorKeyByRect(row: number, col: number, rows: number, cols: number): string {
  const atTop    = row === 0;
  const atBottom = row === rows - 1;
  const atLeft   = col === 0;
  const atRight  = col === cols - 1;

  // Corners (visual orientation noted)
  if (atTop && atLeft)     return 'floor_wood_corner_left';   // visual back-left
  if (atTop && atRight)    return 'floor_wood_corner_top';    // visual back-right
  if (atBottom && atRight) return 'floor_wood_corner_right';  // visual front-right
  if (atBottom && atLeft)  return 'floor_wood_corner_bottom'; // visual front-left

  // Edges (alternate matching pairs to avoid visible micro gaps)
  if (atTop)    return (col & 1) ? 'floor_wood_side_top_right'    : 'floor_wood_side_top_left';
  if (atBottom) return (col & 1) ? 'floor_wood_side_bottom_right' : 'floor_wood_side_bottom_left';
  if (atLeft)   return (row & 1) ? 'floor_wood_side_top_left'     : 'floor_wood_side_bottom_left';
  if (atRight)  return (row & 1) ? 'floor_wood_side_top_right'    : 'floor_wood_side_bottom_right';

  // Interior
  return 'floor_wood_sides2';
}

// Simple bottom-pivot plane (full Sprite frame)
function makeBottomPivotPlaneFull(w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h, 1, 1);
  g.translate(0, h / 2, 0); // bottom-center pivot
  return g;
}

// Name for the room container group (so we can replace it atomically)
const ROOM_NODE_NAME = 'APARTMENT_ROOM';

const HALF_WIDTH_NUDGE = -20;
const HALF_HEIGHT_NUDGE = 0;

// Build whole room into a single Group and replace previous one
function buildApartmentScene(scene: THREE.Scene, atlas: TextureAtlas, w: number, h: number) {
  // Remove previous build, if any
  const old = scene.getObjectByName(ROOM_NODE_NAME);
  if (old) scene.remove(old);

  const room = new THREE.Group();
  room.name = ROOM_NODE_NAME;
  scene.add(room);

  const rows = 8, cols = 8;

  // Centered iso → screen using imported HALF_W/H
  const isoToScreenCentered = (x: number, y: number) => ({
    x: (x - y) * (HALF_W + HALF_WIDTH_NUDGE),
    y: (x + y) * (HALF_H + HALF_HEIGHT_NUDGE),
  });

  // Room center in screen space (center tile)
  const roomCtr = isoToScreenCentered((cols - 1) / 2, (rows - 1) / 2);

  // Place relative to a (0,0) scene origin (camera is centered)
  const placeX = (sx: number) => sx - roomCtr.x;
  const placeY = (sy: number) => roomCtr.y - sy; // y-down screen ⇒ subtract

  // Texture frames (all exported frames are 500x500 for floor, 500x1000 for wall)
  const floorGeom = makeBottomPivotPlaneFull(500, 500);
  const wallGeom  = makeBottomPivotPlaneFull(500, 1000);

  // Materials: render-order painter (no depth) to keep ordering deterministic
  const matFor = (tex: THREE.Texture) => {
    tex.flipY = false;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  };

  const wallTex = atlas['wall_wood_sides1'];
  if (!wallTex) return;

  const wallMat = matFor(wallTex);

  // ---------- FLOORS ----------
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = pickFloorKeyByRect(row, col, rows, cols);
      const tex = atlas[key] ?? atlas['floor_wood_sides2'] ?? atlas['floor_wood_sides1'];
      if (!tex) continue;
      const mesh = new THREE.Mesh(floorGeom, matFor(tex));

      // Tile center → “feet” is the diamond bottom (center.y + HALF_H)
      const c = isoToScreenCentered(col, row);
      const feetY = c.y + (HALF_H + HALF_HEIGHT_NUDGE);

      mesh.position.set(placeX(c.x), placeY(feetY), 0);
      mesh.renderOrder = 1000 + Math.floor(feetY) * 10; // floors after walls
      room.add(mesh);
    }
  }

  // ---------- BACK WALLS (virtual ring) ----------
  // A tiny bevel so the line sits on the floor seam (tweak 12–18 as needed)
  // You found ~170 works well with your export; keep that.
  const BEVEL = 170;

  // Back strip along virtual row -1 (one row “behind” the back floor edge)
  for (let col = 0; col < cols; col++) {
    const m = new THREE.Mesh(wallGeom, wallMat);
    const c = isoToScreenCentered(col, -1);
    const topEdgeY = c.y - (HALF_H + HALF_HEIGHT_NUDGE); // top edge of that virtual tile
    m.position.set(placeX(c.x), placeY(topEdgeY) - BEVEL, 0);
    m.renderOrder = 0; // draw before floors
    room.add(m);
  }

  // Left strip along virtual col -1 (one column “left” of the left floor edge)
  // ✅ Start at row = 0 so we DON'T miss the back-left panel.
  // Give it a slightly higher renderOrder so the shared corner looks clean.
  for (let row = 0; row < rows; row++) {
    const m = new THREE.Mesh(wallGeom, wallMat);
    const c = isoToScreenCentered(-1, row);
    const topEdgeY = c.y - (HALF_H + HALF_HEIGHT_NUDGE);
    m.position.set(placeX(c.x), placeY(topEdgeY) - BEVEL, 0);
    m.scale.x = -1;         // face inward
    m.renderOrder = 1;      // draw after back strip to avoid any corner artifact
    room.add(m);
  }

  // ---------- scale & center ----------
  const roomW = (cols + rows - 1) * (HALF_W + HALF_WIDTH_NUDGE);
  const roomH = (cols + rows - 1) * (HALF_H + HALF_HEIGHT_NUDGE);
  const scale  = Math.min((w * 0.8) / roomW, (h * 0.8) / roomH, 1);
  room.scale.set(scale, scale, scale);

  // Scene stays at (0,0) because the camera is centered; room is centered by placeX/placeY
  // Nothing else to do here.
}

export default function IsometricHousingThreeJS({
  width = 300,
  height = 250,
}: IsometricHousingThreeJSProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const initializedRef = useRef(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);

  const handleContextCreate = async (gl: any) => {
    if (initializedRef.current) return; // guard against dev double-invoke
    initializedRef.current = true;

    try {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;

      const renderer = new Renderer({ gl });
      renderer.setSize(w, h, false);
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      scene.background = null;

      // Centered, Y-down orthographic frustum
      const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 2000);
      camera.position.set(0, 0, 10);
      camera.updateProjectionMatrix();

      const atlas = await loadHousingTextureAtlas();

      rendererRef.current = renderer;
      cameraRef.current = camera;
      sceneRef.current = scene;

      buildApartmentScene(scene, atlas, w, h);
      setIsLoaded(true);

      const render = () => {
        renderer.render(scene, camera);
        gl.endFrameEXP();
        requestAnimationFrame(render);
      };
      render();
    } catch (e) {
      console.error('Failed to initialize isometric housing:', e);
    }
  };

  return (
    <View style={{ width, height, backgroundColor: 'transparent' }}>
      <GLView style={{ flex: 1 }} onContextCreate={handleContextCreate} />
      {!isLoaded && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.05)',
          }}
        />
      )}
    </View>
  );
}
