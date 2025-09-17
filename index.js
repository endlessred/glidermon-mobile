// index.js
import 'react-native-reanimated'; // MUST be first
import { registerRootComponent } from 'expo';
if (typeof window !== "undefined") {
  window.__SKIA_CANVASKIT_URL = "https://unpkg.com/canvaskit-wasm@0.39.1/bin/full/";
}
import App from './App';
registerRootComponent(App);
