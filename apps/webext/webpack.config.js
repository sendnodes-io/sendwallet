const path = require("path")
const webpack = require("webpack")
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const { shouldExclude, TamaguiPlugin } = require("tamagui-loader")
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin
const MiniCSSExtractPlugin = require("mini-css-extract-plugin")

const NODE_ENV = process.env.NODE_ENV || "development"
const target = "web"
const isProduction = NODE_ENV === "production"

const boolVals = {
  true: true,
  false: false,
}
const disableExtraction =
  boolVals[process.env.DISABLE_EXTRACTION] ??
  process.env.NODE_ENV === "development"

console.log(
  "disableExtraction",
  disableExtraction,
  process.env.DISABLE_EXTRACTION
)

const tamaguiOptions = {
  config: "./tamagui.config.ts",
  components: ["tamagui", "app", "@my/ui"],
  importsWhitelist: ["constants.js"],
  disableExtraction,
  // disableExtractFoundComponents: true,
}

console.log("disableExtraction", disableExtraction)

module.exports = /** @type { import('webpack').Configuration } */ {
  context: __dirname,
  stats: "normal", // 'detailed'
  mode: NODE_ENV,
  entry: ["./src/popup.tsx"],
  devtool: "source-map",
  optimization: {
    concatenateModules: false,
    minimize: false,
  },
  resolve: {
    mainFields: ["module:jsx", "browser", "module", "main"],
    alias: {
      "react-native$": "react-native-web",
      // 'react-native/Libraries/Renderer/shims/ReactFabric': '@tamagui/proxy-worm',
      "react-native-reanimated": require.resolve("react-native-reanimated"),
      "react-native-reanimated$": require.resolve("react-native-reanimated"),
    },
  },
  devServer: {
    client: {
      overlay: false,
    },
    hot: true,
    static: {
      directory: path.join(__dirname, "public"),
    },
    compress: true,
    port: 9000,
  },
  module: {
    rules: [
      {
        oneOf: [
          // fix reanimated :/
          {
            test: /.*\.[tj]sx?$/,
            use: [
              {
                loader: "babel-loader",
                options: {
                  cacheDirectory: true,
                  // The 'metro-react-native-babel-preset' preset is recommended to match React Native's packager
                  presets: ["module:metro-react-native-babel-preset"],
                  // Re-write paths to import only the modules needed by the app
                  plugins: ["react-native-web"],
                },
              },
            ],
          },

          {
            test: /\.css$/,
            use: [MiniCSSExtractPlugin.loader, "css-loader"],
          },

          {
            test: /\.(gif|jpe?g|png|svg|woff|woff2)$/i,
            use: [
              {
                loader: "url-loader",
                options: {
                  limit: 8192,
                },
              },
            ],
            type: "javascript/auto",
          },
        ],
      },
    ],
  },
  plugins: [
    new TamaguiPlugin(tamaguiOptions),
    // new BundleAnalyzerPlugin(),
    new MiniCSSExtractPlugin({
      filename: "static/css/[name].[contenthash].css",
      ignoreOrder: true,
    }),
    // isProduction ? null : new ReactRefreshWebpackPlugin(),
    new webpack.DefinePlugin({
      process: {
        env: {
          __DEV__: NODE_ENV === "development" ? "true" : "false",
          IS_STATIC: '""',
          NODE_ENV: JSON.stringify(NODE_ENV),
          TAMAGUI_TARGET: JSON.stringify(target),
          DEBUG: JSON.stringify(process.env.DEBUG || "0"),
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: `./src/popup.html`,
    }),
  ].filter(Boolean),
}
