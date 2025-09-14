module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@/components': './components',
            '@/hooks': './hooks',
            '@/services': './services',
            '@/types': './types',
            '@/config': './config',
            '@/utils': './utils',
            '@/constants': './constants',
          },
        },
      ],
    ],
  };
};