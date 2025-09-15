// metro.config.js (Expo)
const { getDefaultConfig } = require("@expo/metro-config");

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // Force CJS for packages that sometimes resolve to ESM on web
  config.resolver.alias = {
    ...(config.resolver.alias || {}),
    "@shopify/react-native-skia": require.resolve(
      "@shopify/react-native-skia/lib/commonjs"
    ),
    // If your bundle search shows canvaskit-wasm using import.meta, uncomment:
    // "canvaskit-wasm": require.resolve("canvaskit-wasm/bin/canvaskit.js"),
  };

  return config;
})();
