// App.tsx
import React from "react";
import { SafeAreaView, View } from "react-native";
import AppNavigator from "./navigation/AppNavigator";
import SkiaBootstrap from "./SkiaBootstrap";
import { useAutoPruneToasts } from "./stores/useAutoPruneToasts";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  useAutoPruneToasts(600);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SkiaBootstrap>
        <ErrorBoundary>
        <View style={{ flex: 1 }}>
          <AppNavigator />
        </View>
        </ErrorBoundary>
      </SkiaBootstrap>
    </SafeAreaView>
  );
}
