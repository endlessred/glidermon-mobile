// app/view/GameCanvas.tsx
import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions, Platform, Text } from 'react-native';

export default function GameCanvas() {
  const { width, height } = useWindowDimensions();
  const [SkiaMod, setSkiaMod] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // native can import immediately
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      setSkiaMod(require('@shopify/react-native-skia'));
      return;
    }
    // web: wait until CanvasKit is globally available, then import Skia
    const tryLoad = () => {
      if ((globalThis as any).CanvasKit) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        setSkiaMod(require('@shopify/react-native-skia'));
        return true;
      }
      return false;
    };
    if (!tryLoad()) {
      const id = setInterval(() => {
        if (tryLoad()) clearInterval(id);
      }, 30);
      return () => clearInterval(id);
    }
  }, []);

  if (!SkiaMod) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e2a38' }}>
        <Text style={{ color: '#9cc4e4' }}>Initializing Skia…</Text>
      </View>
    );
  }

  const { Canvas, Rect, Circle } = SkiaMod;

  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ width, height }}>
        <Rect x={0} y={0} width={width} height={height} color="#1e2a38" />
        <Circle cx={width / 2} cy={height / 2} r={80} color="#66d9ef" />
      </Canvas>
    </View>
  );
}
