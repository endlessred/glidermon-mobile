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

  // Add Spine asset extensions
  config.resolver.assetExts = [
    ...config.resolver.assetExts,
    'atlas',  // Spine atlas files
    'skel',   // Spine binary skeleton files (if you use them)
    'lottie', // dotLottie animation bundles
  ];

  // react-native-svg-transformer: import .svg files as React components
  config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
  config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
  config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

  return config;
})();
