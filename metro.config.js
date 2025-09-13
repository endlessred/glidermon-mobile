// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const config = getDefaultConfig(__dirname);

// Ensure Metro serves .wasm files as assets
config.resolver.assetExts.push('wasm');

module.exports = config;
