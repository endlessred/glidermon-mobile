import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { loadHousingTextureAtlas, TextureAtlas } from '../assets/textureAtlas';
import { HALF_W, HALF_H, zFromFeetScreenY } from '../coords';
import {
  createSpineCharacterController,
  SpineCharacterController,
} from '../../../spine/createSpineCharacterController';
import { useCosmeticsStore } from '../../../data/stores/cosmeticsStore';
import { OutfitSlot } from '../../../data/types/outfitTypes';
interface IsometricHousingThreeJSProps {
  width?: number;
  height?: number;
  characterX?: number;
  characterY?: number;
  characterScale?: number;
  animation?: string;
  outfit?: OutfitSlot | null;
}

function makeBottomPivotPlaneFull(w: number, h: number) {
  const geom = new THREE.PlaneGeometry(w, h, 1, 1);
  geom.translate(0, h / 2, 0);
  return geom;
}

const ROOM_NODE_NAME = 'APARTMENT_ROOM';
const HALF_WIDTH_NUDGE = -20;
const HALF_HEIGHT_NUDGE = 0;
const CHARACTER_RENDER_ORDER_BASE = 2000;
const DEFAULT_CHARACTER_SCALE = 0.32;
const FLOOR_ROWS = 8;
const FLOOR_COLS = 8;
const DEBUG_HIDE_ENVIRONMENT = false;

type IsoFeetToSceneFn = (x: number, y: number) => { x: number; y: number; feetY: number };

type ApartmentBuild = {
  room: THREE.Group;
  isoFeetToScene: IsoFeetToSceneFn;
  roomScale: number;
};

const BEVEL = 170;



function buildApartmentScene(
  scene: THREE.Scene,
  atlas: TextureAtlas,
  w: number,
  h: number
): ApartmentBuild {
  const old = scene.getObjectByName(ROOM_NODE_NAME);
  if (old) scene.remove(old);

  const room = new THREE.Group();
  room.name = ROOM_NODE_NAME;
  scene.add(room);

  const isoToScreenCentered = (x: number, y: number) => ({
    x: (x - y) * (HALF_W + HALF_WIDTH_NUDGE),
    y: (x + y) * (HALF_H + HALF_HEIGHT_NUDGE),
  });

  const roomCtr = isoToScreenCentered((FLOOR_COLS - 1) / 2, (FLOOR_ROWS - 1) / 2);
  const placeX = (sx: number) => sx - roomCtr.x;
  const placeY = (sy: number) => roomCtr.y - sy;

  const isoFeetToScene: IsoFeetToSceneFn = (x: number, y: number) => {
    const c = isoToScreenCentered(x, y);
    const feetY = c.y + (HALF_H + HALF_HEIGHT_NUDGE);
    return { x: placeX(c.x), y: placeY(feetY), feetY };
  };

  const floorGeom = makeBottomPivotPlaneFull(500, 500);
  const wallGeom = makeBottomPivotPlaneFull(500, 1000);

  const makeMaterial = (tex: THREE.Texture, colorFallback: number) => {
    tex.flipY = false;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return new THREE.MeshBasicMaterial({
      map: tex,
      color: colorFallback,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  };

  const wallTex = atlas['wall_wood_sides1'];

  for (let row = 0; row < FLOOR_ROWS; row++) {
    for (let col = 0; col < FLOOR_COLS; col++) {
      const key = pickFloorKeyByRect(row, col, FLOOR_ROWS, FLOOR_COLS);
      const tex = atlas[key] ?? atlas['floor_wood_sides2'] ?? atlas['floor_wood_sides1'];
      if (!tex) continue;
      const mesh = new THREE.Mesh(floorGeom, makeMaterial(tex, 0x7d5a3c));
      mesh.name = `floor_${row}_${col}`;
      const c = isoToScreenCentered(col, row);
      const feetY = c.y + (HALF_H + HALF_HEIGHT_NUDGE);
      mesh.position.set(placeX(c.x), placeY(feetY), 0);
      mesh.renderOrder = 1000 + Math.floor(feetY) * 10;
      room.add(mesh);
    }
  }

  if (wallTex) {
    const wallMat = makeMaterial(wallTex, 0x6d6863);
    for (let col = 0; col < FLOOR_COLS; col++) {
      const m = new THREE.Mesh(wallGeom, wallMat);
      const c = isoToScreenCentered(col, -1);
      const topEdgeY = c.y - (HALF_H + HALF_HEIGHT_NUDGE);
      m.position.set(placeX(c.x), placeY(topEdgeY) - BEVEL, 0);
      m.renderOrder = 0;
      room.add(m);
    }

    for (let row = 0; row < FLOOR_ROWS; row++) {
      const m = new THREE.Mesh(wallGeom, wallMat);
      const c = isoToScreenCentered(-1, row);
      const topEdgeY = c.y - (HALF_H + HALF_HEIGHT_NUDGE);
      m.position.set(placeX(c.x), placeY(topEdgeY) - BEVEL, 0);
      m.scale.x = -1;
      m.renderOrder = 1;
      room.add(m);
    }
  }

  if (room.children.length === 0) {
    const placeholder = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 200),
      new THREE.MeshBasicMaterial({ color: 0x2c2f44, side: THREE.DoubleSide })
    );
    placeholder.position.set(0, -40, 0);
    room.add(placeholder);
  }

  const roomW = (FLOOR_COLS + FLOOR_ROWS - 1) * (HALF_W + HALF_WIDTH_NUDGE);
  const roomH = (FLOOR_COLS + FLOOR_ROWS - 1) * (HALF_H + HALF_HEIGHT_NUDGE);
  const scale = Math.min((w * 0.8) / roomW, (h * 0.8) / roomH, 1);
  room.scale.set(scale, scale, scale);

  room.userData.isoFeetToScene = isoFeetToScene;
  
  if (DEBUG_HIDE_ENVIRONMENT) {
    room.children.forEach((child) => {
      child.visible = false;
    });
  }

  return { room, isoFeetToScene, roomScale: scale };
}

function pickFloorKeyByRect(row: number, col: number, rows: number, cols: number): string {
  const atTop = row === 0;
  const atBottom = row === rows - 1;
  const atLeft = col === 0;
  const atRight = col === cols - 1;

  if (atTop && atLeft) return 'floor_wood_corner_left';
  if (atTop && atRight) return 'floor_wood_corner_top';
  if (atBottom && atRight) return 'floor_wood_corner_right';
  if (atBottom && atLeft) return 'floor_wood_corner_bottom';

  if (atTop) return (col & 1) ? 'floor_wood_side_top_right' : 'floor_wood_side_top_left';
  if (atBottom) return (col & 1) ? 'floor_wood_side_bottom_right' : 'floor_wood_side_bottom_left';
  if (atLeft) return (row & 1) ? 'floor_wood_side_top_left' : 'floor_wood_side_bottom_left';
  if (atRight) return (row & 1) ? 'floor_wood_side_top_right' : 'floor_wood_side_bottom_right';

  return 'floor_wood_sides2';
}

export default function IsometricHousingThreeJS({
  width = 300,
  height = 250,
  characterX = 3.5,
  characterY = 3.5,
  characterScale = DEFAULT_CHARACTER_SCALE,
  animation = 'idle',
  outfit,
}: IsometricHousingThreeJSProps) {
  const catalog = useCosmeticsStore((state) => state.catalog);

  const [isLoaded, setIsLoaded] = useState(false);
  const initializedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const isoFeetToSceneRef = useRef<IsoFeetToSceneFn | null>(null);
  const roomRef = useRef<THREE.Group | null>(null);
  const roomScaleRef = useRef(1);
  const spineRef = useRef<SpineCharacterController | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const missingLogRef = useRef(false);
  const frameLogRef = useRef(false);
  const invalidTransformLogRef = useRef(false);

  const characterPosRef = useRef({ x: characterX, y: characterY });
  useEffect(() => {
    characterPosRef.current = { x: characterX, y: characterY };
  }, [characterX, characterY]);

  const scaleRef = useRef(characterScale);
  useEffect(() => {
    scaleRef.current = characterScale;
  }, [characterScale]);

  const animationRef = useRef(animation);
  useEffect(() => {
    animationRef.current = animation;
    if (spineRef.current) {
      spineRef.current.setAnimation(animation, true);
    }
  }, [animation]);

  const outfitRef = useRef<OutfitSlot | undefined>(outfit ?? undefined);
  useEffect(() => {
    outfitRef.current = outfit ?? undefined;
    if (spineRef.current) {
      spineRef.current.applyOutfit(outfitRef.current);
    }
  }, [outfit]);

  useEffect(() => () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    rendererRef.current?.dispose();
  }, []);

  const updateCharacterForFrame = (deltaSeconds: number) => {
    try {
      const controller = spineRef.current;
      const isoFeetToScene = isoFeetToSceneRef.current;
      const room = roomRef.current;
      if (!controller || !isoFeetToScene || !room) {
        if (__DEV__ && !missingLogRef.current) {
          console.log('Housing update missing deps', {
            hasController: !!controller,
            hasIso: !!isoFeetToScene,
            hasRoom: !!room,
          });
          missingLogRef.current = true;
        }
        return;
      }

      controller.update(deltaSeconds);

      const target = isoFeetToScene(characterPosRef.current.x, characterPosRef.current.y);
      const roomScale = roomScaleRef.current || 1;
      const desiredWorldScale = scaleRef.current;
      const appliedLocalScale = desiredWorldScale / roomScale;
      const feet = controller.getFeetLocalPosition();

      if (!Number.isFinite(appliedLocalScale)) {
        if (__DEV__ && !invalidTransformLogRef.current) {
          console.warn('Housing character scale invalid', {
            desiredWorldScale,
            roomScale,
            appliedLocalScale,
          });
          invalidTransformLogRef.current = true;
        }
        return;
      }

      const posX = target.x - feet.x * appliedLocalScale;
      const posY = target.y - feet.y * appliedLocalScale;
      const targetZ = zFromFeetScreenY(target.y);

      if (!Number.isFinite(posX) || !Number.isFinite(posY)) {
        if (__DEV__ && !invalidTransformLogRef.current) {
          console.warn('Housing character position invalid', {
            target,
            feet,
            appliedLocalScale,
            posX,
            posY,
          });
          invalidTransformLogRef.current = true;
        }
        return;
      }

      const mesh = controller.mesh;
      mesh.position.set(posX, posY, targetZ);
      mesh.scale.set(appliedLocalScale, appliedLocalScale, appliedLocalScale);
      mesh.updateMatrix();
      mesh.matrixWorldNeedsUpdate = true;

      if (invalidTransformLogRef.current) {
        invalidTransformLogRef.current = false;
      }

      const sortFeetY = target.feetY ?? target.y;
      const roomChildren = room.children;
      const maxRoomOrder = roomChildren.reduce((max, child) => {
        if (child === mesh) return max;
        const order = child.renderOrder ?? 0;
        return order > max ? order : max;
      }, 0);
      const desiredOrder = CHARACTER_RENDER_ORDER_BASE + Math.floor(sortFeetY) * 10;
      const meshOrder = Math.max(desiredOrder, maxRoomOrder + 10);
      mesh.renderOrder = meshOrder;

      const baseOrder = mesh.renderOrder;
      mesh.traverse((obj) => {
        if (obj === mesh) return;
        const object3D = obj as THREE.Object3D & { isMesh?: boolean; material?: any };
        const baseSlotOrder = object3D.userData?.baseRenderOrder ?? object3D.renderOrder ?? 0;
        object3D.userData.baseRenderOrder = baseSlotOrder;
        object3D.renderOrder = baseOrder + baseSlotOrder * 0.01;

        if (object3D.isMesh) {
          const materials = Array.isArray(object3D.material)
            ? object3D.material
            : [object3D.material];
          materials.forEach((material: THREE.Material | null | undefined) => {
            if (!material) return;
            const m: any = material;
            if (typeof m.depthTest === 'boolean') m.depthTest = false;
            if (typeof m.depthWrite === 'boolean') m.depthWrite = false;
            if (typeof m.transparent === 'boolean') m.transparent = true;
            if (typeof m.needsUpdate === 'boolean') m.needsUpdate = true;
          });
        }
      });

      if (__DEV__ && !frameLogRef.current) {
        console.log('Housing character placement', {
          target,
          roomScale,
          appliedLocalScale,
          posX,
          posY,
        });
        frameLogRef.current = true;
      }

      if (__DEV__) {
        console.log('Housing character renderOrder', {
          meshOrder,
          desiredOrder,
          maxRoomOrder,
          sortFeetY,
        });
      }
    } catch (err) {
      console.error('Housing update error', err);
    }
  };

  const handleContextCreate = async (gl: any) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      gl.viewport(0, 0, w, h);

      const renderer = new Renderer({ gl });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.setViewport(0, 0, w, h);
      renderer.autoClear = true;
      renderer.setClearColor(0x1a1c2c, 1);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1c2c);
      const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 2000);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      const atlas = await loadHousingTextureAtlas();
      const { room, isoFeetToScene, roomScale } = buildApartmentScene(scene, atlas, w, h);
      console.log('Housing scene meshes', room.children.length);
      isoFeetToSceneRef.current = isoFeetToScene;
      roomRef.current = room;
      roomScaleRef.current = roomScale;

      const controller = await createSpineCharacterController({
        animation: animationRef.current,
        outfit: outfitRef.current,
        catalog,
      });

      controller.mesh.frustumCulled = false;
      room.add(controller.mesh);

      rendererRef.current = renderer;
      spineRef.current = controller;
      lastTimeRef.current = null;

      const render = () => {
        try {
          const now = performance.now();
          const last = lastTimeRef.current ?? now;
          const deltaSeconds = Math.min((now - last) / 1000, 1 / 15);
          lastTimeRef.current = now;

          updateCharacterForFrame(deltaSeconds);

          renderer.render(scene, camera);
          gl.endFrameEXP();
          rafRef.current = requestAnimationFrame(render);
        } catch (err) {
          console.error('Housing render error', err);
        }
      };

      render();
    } catch (error) {
      console.error('Failed to initialize isometric housing:', error);
    } finally {
      setIsLoaded(true);
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
            backgroundColor: 'rgba(26, 28, 44, 0.4)',
          }}
        />
      )}
    </View>
  );
}













