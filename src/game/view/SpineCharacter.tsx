import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import {
  createSpineCharacterController,
  SpineCharacterController,
} from '../../spine/createSpineCharacterController';
import { useCosmeticsStore } from '../../data/stores/cosmeticsStore';
import { OutfitSlot } from '../../data/types/outfitTypes';

interface SpineCharacterProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  scale?: number;
  animation?: string;
  outfit?: OutfitSlot | null;
}

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 200;
const DEFAULT_SCALE = 0.3;

export default function SpineCharacter({
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  x,
  y,
  scale = DEFAULT_SCALE,
  animation = 'idle',
  outfit,
}: SpineCharacterProps) {
  const catalog = useCosmeticsStore((state) => state.catalog);

  const initializedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controllerRef = useRef<SpineCharacterController | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const targetRef = useRef({ x: x ?? width / 2, y: y ?? height * 0.25 });
  const scaleRef = useRef(scale);
  const animationRef = useRef(animation);
  const outfitRef = useRef<OutfitSlot | undefined>(outfit ?? undefined);

  useEffect(() => {
    targetRef.current = { x: x ?? width / 2, y: y ?? height * 0.25 };
  }, [x, y, width, height]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    animationRef.current = animation;
    if (controllerRef.current) {
      controllerRef.current.setAnimation(animation, true);
    }
  }, [animation]);

  useEffect(() => {
    outfitRef.current = outfit ?? undefined;
    if (controllerRef.current) {
      controllerRef.current.applyOutfit(outfitRef.current);
    }
  }, [outfit]);

  useEffect(() => () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    rendererRef.current?.dispose();
  }, []);

  const updateCharacter = (deltaSeconds: number) => {
    const controller = controllerRef.current;
    if (!controller) return;

    controller.update(deltaSeconds);

    const target = targetRef.current;
    const currentScale = scaleRef.current;
    const feet = controller.getFeetLocalPosition();

    const posX = target.x - feet.x * currentScale;
    const posY = target.y - feet.y * currentScale;

    const mesh = controller.mesh;
    mesh.position.set(posX, posY, 0);
    mesh.scale.set(currentScale, currentScale, currentScale);
    mesh.updateMatrix();
    mesh.matrixWorldNeedsUpdate = true;
  };

  const handleContextCreate = async (gl: any) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;

    targetRef.current = { x: x ?? w / 2, y: y ?? h * 0.25 };

    const renderer = new Renderer({ gl });
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, w, h, 0, -1000, 1000);
    camera.position.z = 1;

    try {
      const controller = await createSpineCharacterController({
        animation: animationRef.current,
        outfit: outfitRef.current,
        catalog,
      });

      controller.mesh.frustumCulled = false;
      scene.add(controller.mesh);

      rendererRef.current = renderer;
      controllerRef.current = controller;
      lastTimeRef.current = null;

      const render = () => {
        const now = performance.now();
        const last = lastTimeRef.current ?? now;
        const deltaSeconds = Math.min((now - last) / 1000, 1 / 15);
        lastTimeRef.current = now;

        updateCharacter(deltaSeconds);

        renderer.render(scene, camera);
        gl.endFrameEXP();
        rafRef.current = requestAnimationFrame(render);
      };

      render();
    } catch (error) {
      console.error('Failed to initialize Spine character:', error);
    }
  };

  return (
    <View style={{ width, height, overflow: 'hidden', borderRadius: 8 }}>
      <GLView style={{ flex: 1 }} onContextCreate={handleContextCreate} />
    </View>
  );
}
