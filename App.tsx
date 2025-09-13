// App.tsx
import React from 'react';
import { SafeAreaView, View } from 'react-native';
import SkiaBootstrap from './SkiaBootstrap';
import GameCanvas from './view/GameCanvas';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SkiaBootstrap>
        <View style={{ flex: 1 }}>
          <GameCanvas />
        </View>
      </SkiaBootstrap>
    </SafeAreaView>
  );
}
