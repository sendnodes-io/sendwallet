// Global config for all babel-affected SendWallet packages.
module.exports = {
  presets: [
    [
      "@babel/env",
      {
        targets: {
          browsers: ["chrome >= 100", "firefox >= 100", "safari >= 16"],
        },
      },
    ],
    // Because babel is used by Webpack to load the Webpack config, which is
    // TS.
    "@babel/typescript",
  ],
  babelrcRoots: [
    ".",
    "../../packages/ui/*",
    // "../../packages/background/*",
    // "../../packages/provider-bridge/*",
  ],
}
