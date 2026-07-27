// Room shell rendered from real 3D primitives (see sceneBuilder3D.ts) with
// procedurally textured floor/walls, instead of flat sprite planes. No
// character/furniture yet -- that re-integration is a follow-up phase.
// Static scene: nothing animates, so there's no per-frame render loop, just
// a single render (plus one on resize).
import React, { useState } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { useHousingStore, ROOM_SIZE_TIERS } from '../../../data/stores/housingStore';
import { buildRoomScene3D } from '../render/sceneBuilder3D';

interface IsometricRoomView3DProps {
  width?: number;
  height?: number;
}

export default function IsometricRoomView3D({ width = 300, height = 250 }: IsometricRoomView3DProps) {
  const roomSizeTier = useHousingStore((s) => s.roomSizeTier);
  const activeFloorSet = useHousingStore((s) => s.activeFloorSet);
  const activeWallSet = useHousingStore((s) => s.activeWallSet);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleContextCreate = async (gl: any) => {
    try {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      gl.viewport(0, 0, w, h);

      const renderer = new Renderer({ gl });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.setViewport(0, 0, w, h);
      renderer.setClearColor(0x1a1c2c, 1);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1c2c);

      const dims = ROOM_SIZE_TIERS[roomSizeTier] ?? ROOM_SIZE_TIERS[0];
      const built = buildRoomScene3D({
        width: dims.width,
        height: dims.height,
        defaultFloor: { set: activeFloorSet },
        defaultWall: { set: activeWallSet },
      });
      scene.add(built.group);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const sun = new THREE.DirectionalLight(0xffffff, 0.8);
      sun.position.set(3, 5, 2);
      scene.add(sun);

      // True isometric camera: equal offset on all three axes + lookAt the
      // origin. No hand-derived projection math -- Three.js's own camera
      // matrix does the isometric projection for us.
      const maxHalfExtent = Math.max(built.halfWidth, built.halfDepth) + 1.5;
      const aspect = w / h;
      const camera = new THREE.OrthographicCamera(
        -maxHalfExtent * aspect,
        maxHalfExtent * aspect,
        maxHalfExtent,
        -maxHalfExtent,
        0.1,
        100
      );
      camera.position.set(10, 10, 10);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      gl.endFrameEXP();
    } catch (error) {
      console.error('Failed to initialize 3D room spike:', error);
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
            backgroundColor: 'rgba(26, 28, 44, 0.4)',
          }}
        />
      )}
    </View>
  );
}
