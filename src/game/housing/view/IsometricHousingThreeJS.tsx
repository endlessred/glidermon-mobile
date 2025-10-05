import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as THREE from 'three';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { loadHousingTextureAtlas, TextureAtlas } from '../assets/textureAtlas';
import { roomSmallTemplate } from '../templates/room_s';
import { TILE_W, TILE_H, TILE_SKIRT, WALL_W, WALL_H, WALL_SKIRT, HALF_W, HALF_H, isoToScreen, zFromFeetScreenY } from '../coords';

interface IsometricHousingThreeJSProps {
  width?: number;
  height?: number;
  characterX?: number;
  characterY?: number;
}

function makeFloorTopOnlyMaterial(map: THREE.Texture) {
  map.flipY = false;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.generateMipmaps = false;
  map.minFilter = THREE.LinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.needsUpdate = true;

  const FLOOR_FRAME_H = 500;
  const TILE_H = 202;
  const FLOOR_CONTACT_FROM_BOTTOM = 296;

  const uniforms = {
    map: { value: map },
    vCutMin: { value: FLOOR_CONTACT_FROM_BOTTOM / FLOOR_FRAME_H },
    vCutMax: { value: (FLOOR_CONTACT_FROM_BOTTOM + TILE_H) / FLOOR_FRAME_H },
  };

  console.log("🎯 Shader cut values:", {
    FLOOR_CONTACT_FROM_BOTTOM,
    TILE_H,
    FLOOR_FRAME_H,
    vCutMin: FLOOR_CONTACT_FROM_BOTTOM / FLOOR_FRAME_H,
    vCutMax: (FLOOR_CONTACT_FROM_BOTTOM + TILE_H) / FLOOR_FRAME_H
  });

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D map;
      uniform float vCutMin;
      uniform float vCutMax;
      void main() {
        // Disable cutting - full texture
        // if (vUv.y < vCutMin || vUv.y > vCutMax) discard;
        vec4 c = texture2D(map, vUv);
        if (c.a < 0.01) discard;
        gl_FragColor = c;
      }
    `,
  });

  return mat;
}

function makeBottomPivotPlaneFull(w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h, 1, 1);
  g.translate(0, h/2, 0); // bottom-center pivot
  return g;
}

function makeFullFrameBottomPivot(
  map: THREE.Texture,
  frameW: number, frameH: number,
  contactFromBottom: number
) {
  // Force consistent texture convention
  map.flipY = false;
  map.offset.set(0, 0);
  map.repeat.set(1, 1);
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.generateMipmaps = false;
  map.minFilter = THREE.LinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.needsUpdate = true;

  const geo = makeBottomPivotPlaneFull(frameW, frameH);
  const mat = new THREE.MeshBasicMaterial({
    map, transparent: true, side: THREE.DoubleSide, alphaTest: 0.0
  });

  const mesh = new THREE.Mesh(geo, mat);
  (mesh as any).__apartmentObject = true;
  (mesh as any).__contactFromBottom = contactFromBottom;
  return mesh;
}

function buildApartmentScene(scene: THREE.Scene, atlas: TextureAtlas, w: number, h: number) {
  // clear old
  for (let i = scene.children.length - 1; i >= 0; i--) {
    const c = scene.children[i];
    if ((c as any).__apartmentObject) scene.remove(c);
  }

  const rows = 8, cols = 8;

  // Textures + full frame sizes
  const floorTex = atlas["floor_wood_sides1"];
  const wallTex  = atlas["wall_wood_sides1"];
  if (!floorTex?.image || !wallTex?.image) return;
  const floorFW = floorTex.image.width;  // 500
  const floorFH = floorTex.image.height; // 500
  const wallFW  = wallTex.image.width;   // 500
  const wallFH  = wallTex.image.height;  // 1000

  // Contact line distances from frame bottom (measured from your analysis)
  const FLOOR_CONTACT_FROM_BOTTOM = 296;  // 500 - 204 (where diamond floor touches ground)
  const WALL_CONTACT_FROM_BOTTOM = 391;   // 1000 - 609 (where wall base meets floor)

  // Isometric constants for tile spacing (using original coords.ts values)
  const HALF_W = TILE_W / 2;  // 202
  const HALF_H = TILE_H / 2;  // 101

  const isoToScreenLocal = (x: number, y: number) => ({
    x: (x - y) * HALF_W,  // Back to original
    y: (x + y) * HALF_H
  });

  // ---------- FLOORS ----------
  const floorGeom = makeBottomPivotPlaneFull(500, 500);

  // Neighbor-mask floor variant picker using 4-bit mask (N|E|S|W)
  const getFloorTexture = (col: number, row: number, cols: number, rows: number) => {
    // Check if we have a floor neighbor in each direction
    const hasN = row > 0;           // North neighbor exists
    const hasE = col < cols - 1;    // East neighbor exists
    const hasS = row < rows - 1;    // South neighbor exists
    const hasW = col > 0;           // West neighbor exists

    // Create 4-bit mask: N|E|S|W (1=neighbor exists, 0=edge)
    const mask = (hasN ? 8 : 0) | (hasE ? 4 : 0) | (hasS ? 2 : 0) | (hasW ? 1 : 0);

    // Map masks to texture variants
    switch (mask) {
      // Corners (2 neighbors)
      case 0b0110: return atlas["floor_wood_corner_top"];     // E+S (top-right visual corner)
      case 0b0011: return atlas["floor_wood_corner_right"];   // S+W (bottom-right visual corner)
      case 0b1001: return atlas["floor_wood_corner_bottom"];  // N+W (bottom-left visual corner)
      case 0b1100: return atlas["floor_wood_corner_left"];    // N+E (top-left visual corner)

      // Edges (3 neighbors, missing one direction)
      case 0b0111: return atlas["floor_wood_side_top_left"];     // Missing N (top edge)
      case 0b1011: return atlas["floor_wood_side_bottom_left"];  // Missing E (right edge)
      case 0b1101: return atlas["floor_wood_side_bottom_right"]; // Missing S (bottom edge)
      case 0b1110: return atlas["floor_wood_side_top_right"];    // Missing W (left edge)

      // Interior (4 neighbors) or fallback
      case 0b1111:
      default:
        return atlas["floor_wood_sides2"]; // Interior tile with no outlines
    }
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const floorTexture = getFloorTexture(col, row, cols, rows);
      const floorMat = makeFloorTopOnlyMaterial(floorTexture);
      const mesh = new THREE.Mesh(floorGeom, floorMat);
      (mesh as any).__apartmentObject = true;

      // Log texture dimensions for debugging differences
      if (row === 7 && col === 1) {
        console.log(`🎯 Bottom edge tile texture:`, {
          textureKey: Object.keys(atlas).find(key => atlas[key] === floorTexture),
          width: floorTexture.image?.width,
          height: floorTexture.image?.height
        });
      }

      // Place by diamond bottom ("feet")
      const c = isoToScreenLocal(col, row);
      const feetY = c.y + HALF_H;
      mesh.position.set(c.x, feetY, zFromFeetScreenY(feetY) - 0.002);
      scene.add(mesh);

      // Debug first tile position
      if (row === 0 && col === 0) {
        console.log("🎯 First tile position:", {
          col, row,
          isoToScreen: c,
          feetY,
          finalPosition: { x: c.x, y: feetY, z: zFromFeetScreenY(feetY) - 0.002 }
        });
      }
    }
  }

  // ---------- BACK WALLS ----------
  // Ensure wall texture settings
  wallTex.flipY = false;
  wallTex.wrapS = THREE.ClampToEdgeWrapping;
  wallTex.wrapT = THREE.ClampToEdgeWrapping;
  wallTex.generateMipmaps = false;
  wallTex.minFilter = THREE.LinearFilter;
  wallTex.magFilter = THREE.LinearFilter;
  wallTex.needsUpdate = true;

  // top strip
  for (let col = 0; col < cols; col++) {
    const g = makeBottomPivotPlaneFull(500, 1000); // full wall frame
    const m = new THREE.MeshBasicMaterial({ map: wallTex, transparent: true });
    const mesh = new THREE.Mesh(g, m);
    (mesh as any).__apartmentObject = true;

    const c = isoToScreenLocal(col, 0);
    const topEdgeY = c.y - HALF_H;
    mesh.position.set(c.x, topEdgeY - WALL_CONTACT_FROM_BOTTOM, zFromFeetScreenY(topEdgeY) - 0.01);
    scene.add(mesh);
  }
  // left strip (skip corner), no mirroring
  for (let row = 1; row < rows; row++) {
    const g = makeBottomPivotPlaneFull(500, 1000);
    const m = new THREE.MeshBasicMaterial({ map: wallTex, transparent: true });
    const mesh = new THREE.Mesh(g, m);
    // No mirroring for left wall
    (mesh as any).__apartmentObject = true;

    const c = isoToScreenLocal(0, row);
    const topEdgeY = c.y - HALF_H;
    mesh.position.set(c.x, topEdgeY - WALL_CONTACT_FROM_BOTTOM, zFromFeetScreenY(topEdgeY) - 0.01);
    scene.add(mesh);
  }

  // ---------- scale & center ----------
  const roomW = (cols + rows - 1) * HALF_W;
  const roomH = (cols + rows - 1) * HALF_H;
  const scale  = Math.min((w * 0.8) / roomW, (h * 0.8) / roomH, 1);
  scene.scale.set(scale, scale, scale);

  // For Y-down coordinates: center horizontally, position in upper portion vertically
  const scaledRoomW = roomW * scale;
  const scaledRoomH = roomH * scale;
  scene.position.set(
    (w - scaledRoomW) / 2 + scaledRoomW / 2,   // Center horizontally
    scaledRoomH / 2 + h * 0.1,                 // Position in upper portion
    0
  );

  // No rotation - standard orientation

  console.log("✅ Full-frame isometric apartment", {
    floorFrame: { w: floorFW, h: floorFH }, wallFrame: { w: wallFW, h: wallFH },
    contactOffsets: { floor: FLOOR_CONTACT_FROM_BOTTOM, wall: WALL_CONTACT_FROM_BOTTOM },
    spacing: { HALF_W, HALF_H },
    roomW, roomH, scale,
    scaledRoom: { w: scaledRoomW, h: scaledRoomH },
    scenePosition: {
      x: (w - scaledRoomW) / 2 + scaledRoomW / 2,
      y: scaledRoomH / 2 + h * 0.1
    },
    screenSize: { w, h }
  });

}

export default function IsometricHousingThreeJS({
  width = 300,
  height = 250,
  characterX = 4,
  characterY = 4
}: IsometricHousingThreeJSProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);

  const handleContextCreate = async (gl: any) => {
    try {
      // Get screen dimensions
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;

      const renderer = new Renderer({ gl });
      renderer.setSize(w, h, false);
      renderer.setClearColor(0x000000, 0); // Transparent background

      const scene = new THREE.Scene();
      scene.background = null;

      // screen-space ortho: left=0, right=w, top=0, bottom=h  (y increases downward)
      const camera = new THREE.OrthographicCamera(0, w, 0, h, -1000, 1000);
      camera.position.set(0, 0, 10); // any z in front of scene
      camera.updateProjectionMatrix();

      console.log('Camera setup debug:', {
        screenSize: { w, h },
        cameraFrustum: { left: 0, right: w, top: h, bottom: 0 },
        cameraPosition: camera.position
      });

      // Load texture atlas
      const atlas = await loadHousingTextureAtlas();

      // Store references first
      rendererRef.current = renderer;
      cameraRef.current = camera;
      sceneRef.current = scene;

      // Build the apartment scene with exact positioning
      buildApartmentScene(scene, atlas, w, h);

      setIsLoaded(true);

      // Start render loop
      const render = () => {
        renderer.render(scene, camera);
        gl.endFrameEXP();
        requestAnimationFrame(render);
      };
      render();

    } catch (error) {
      console.error('Failed to initialize isometric housing:', error);
    }
  };


  return (
    <View style={{ width, height, backgroundColor: 'transparent' }}>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={handleContextCreate}
      />


      {!isLoaded && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          {/* Loading indicator */}
        </View>
      )}
    </View>
  );
}