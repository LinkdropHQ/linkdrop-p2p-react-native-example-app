const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
//const { getDefaultConfig } = require('metro-config');

const config = (async () => {
  const {
    resolver: { sourceExts, assetExts }
  } = await getDefaultConfig();
  return {
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: false,
        },
      }),
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'ts' && ext !== 'tsx'),
      sourceExts: [...sourceExts, 'ts', 'tsx'],
      extraNodeModules: new Proxy({}, {
        get: (target, name) => {
          return path.join(process.cwd(), `node_modules/${name}`);
        },
      }),
    },
  };
})();


module.exports = mergeConfig(getDefaultConfig(__dirname), config);
