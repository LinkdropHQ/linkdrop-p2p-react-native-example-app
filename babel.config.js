module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ["@babel/plugin-transform-class-properties", { "loose": true }],
    ["@babel/plugin-transform-private-methods", { "loose": true }],
    ["@babel/plugin-transform-private-property-in-object", { "loose": true }],
    [ 'module-resolver',
     {
       alias: {
         'crypto': 'react-native-quick-crypto',
         'stream': 'stream-browserify',
         'buffer': '@craftzdog/react-native-buffer',
       },
     },
    ]
  ]
};
