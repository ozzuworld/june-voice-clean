const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for .cjs files
config.resolver.sourceExts.push('cjs');

// Add polyfills for Node.js modules
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'expo-crypto',
  stream: 'readable-stream',
  buffer: 'buffer',
};

module.exports = config;