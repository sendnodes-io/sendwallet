import path from "path";
import webpack, {
  Configuration as WebpackConfiguration,
  DefinePlugin,
  WebpackOptionsNormalized,
  WebpackPluginInstance,
} from "webpack";
import { merge as webpackMerge } from "webpack-merge";
import Dotenv from "dotenv-webpack";
import SizePlugin from "size-plugin";
import CopyPlugin, { ObjectPattern } from "copy-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import WebExtension from "webpack-target-webextension";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { getBranch, getRevision } from "build-utils/src/index";
import WebExtensionArchivePlugin from "build-utils/src/web-extension-archive-webpack-plugin";
import type { Configuration as WebpackDevServerConfiguration } from "webpack-dev-server";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import { ESBuildMinifyPlugin } from "esbuild-loader";

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

const isDevelopment = process.env.NODE_ENV !== "production";
const NODE_ENV = process.env.NODE_ENV || "development";
const target = "web";
const isProduction = NODE_ENV === "production";

const branch = getBranch();
const revision = getRevision();

const supportedBrowsers = [
  // "brave",
  "chrome",
  // "edge",
  "firefox",
  // "opera"
];

const outputDir = path.resolve(process.env.WEBPACK_OUTPUT_DIR || __dirname);
const uiLegacyRoot = path.resolve(
  __dirname,
  "..",
  "..",
  "packages",
  "ui-legacy"
);

const tamaguiOptions = {
  config: "./tamagui.config.ts",
  components: ["tamagui", "app", "@my/ui"],
  importsWhitelist: [],
  logTimings: false,
  disableExtraction: !isProduction,
};

const entry: { [key: string]: string | string[] } = {
  ui: "./src/ui.ts",
  "tab-ui": "./src/tab-ui.ts",
  "stake-ui": "./src/stake-ui.ts",
  background: "./src/background.ts",
  "background-ui": "./src/background-ui.ts",
  "window-provider": "./src/window-provider.ts",
  "provider-bridge": "./src/provider-bridge.ts",
};

// Replicated and adjusted for each target browser and the current build mode.
const baseConfig: Configuration = {
  devtool: !isDevelopment ? undefined : "eval-cheap-source-map",
  devServer: {
    hot: true,
    devMiddleware: {
      writeToDisk: true,
    },
  },
  watchOptions: {
    ignored: "**/node_modules",
  },
  stats: "errors-only",
  entry,
  module: {
    rules: [
      {
        oneOf: [
          /* FIXME: the goal is to remove this rule and use the one below it */
          {
            test: /.*\.[tj]sx?$/,
            include: /packages\/ui-legacy/,
            use: [
              {
                loader: "babel-loader",
                options: {
                  cacheDirectory: true,
                  rootMode: "upward",
                  plugins: [
                    isDevelopment && require.resolve("react-refresh/babel"),
                  ].filter(Boolean),
                },
              },
              {
                loader: "astroturf/loader",
                options: { extension: ".module.css" },
              },
            ],
          },

          // {
          // 	test: /.*\.[tj]s$/,
          // 	// exclude: /node_modules(?!\/@sendnodes)|webpack/,
          // 	exclude: /node_modules(?!\/@sendnodes)|webpack|packages\/ui-legacy/,
          // 	// exclude: /node_modules/,
          // 	use: [
          // 		// "thread-loader",
          // 		{
          // 			loader: "babel-loader",
          // 			options: {
          // 				cacheDirectory: true,
          // 				rootMode: "upward",
          // 				plugins: [
          // 					isDevelopment && require.resolve("react-refresh/babel"),
          // 				].filter(Boolean),
          // 			},
          // 		},
          // 	],
          // },

          {
            test: /.*\.[tj]s$/,
            use: [
              "thread-loader",
              {
                loader: "esbuild-loader",
                options: {
                  target: "es2020",
                  loader: "tsx",
                },
              },
            ],
          },
          {
            test: /.*\.[tj]sx?$/,
            use: [
              {
                loader: "esbuild-loader",
                options: {
                  target: "es2020",
                  loader: "tsx",
                },
              },
              {
                loader: "tamagui-loader",
                options: tamaguiOptions,
              },
            ],
          },

          {
            test: /\.css$/i,
            // exclude: /node_modules/,
            use: [
              // "thread-loader",
              MiniCssExtractPlugin.loader,
              {
                loader: "css-loader",
                options: {
                  importLoaders: 1,
                },
              },
              {
                loader: "postcss-loader",
                options: {
                  postcssOptions: {
                    config: path.resolve(__dirname, "postcss.config.js"),
                  },
                },
              },
            ],
          },

          {
            test: /\.(jpe?g|svg|png|gif|ico|eot|ttf|woff2?)(\?v=\d+\.\d+\.\d+)?$/i,
            type: "asset/resource",
          },
        ],
      },
    ],
  },
  output: {
    // path: is set browser-specifically below
    filename: "[name].js",
    globalObject: "globalThis",
    environment: { dynamicImport: true },
  },
  resolve: {
    mainFields: ["module:jsx", "browser", "module", "main"],

    extensions: [
      ".web.tsx",
      ".web.ts",
      ".web.jsx",
      ".web.js",
      ".tsx",
      ".ts",
      ".js",
      ".jsx",
    ],
    fallback: {
      stream: require.resolve("stream-browserify"),
      process: require.resolve("process/browser"),
      // these are required for @sendnodes/hd-keyring
      crypto: require.resolve("crypto-browserify"),
      path: require.resolve("path-browserify"),
      https: require.resolve("https-browserify"),
      http: require.resolve("stream-http"),
    },
    alias: {
      "react-native": require.resolve("react-native-web"),
      "react-native$": require.resolve("react-native-web"),
      "react-native-svg": require.resolve("@tamagui/react-native-svg"),
    },
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
    new Dotenv({
      path: "../../.env",
      defaults: "../../.env.defaults",
      systemvars: true,
      safe: "../../.env.example",
    }) as unknown as WebpackPluginInstance,
    // background runs in a service worker and needs a global window object
    new webpack.BannerPlugin({
      banner: "window = self;",
      test: "background",
      raw: true,
    }),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: path.resolve(__dirname, "tsconfig.json"),
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
        mode: "write-references",
      },
    }),
    // polyfill the process and Buffer APIs
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: ["process"],
    }),
    new SizePlugin({}),
    new CopyPlugin({
      patterns: [
        {
          context: uiLegacyRoot,
          from: "_locales",
          to: "_locales/",
          globOptions: {
            dot: true,
            gitignore: true,
            ignore: [".DS_Store"],
          },
        },
        {
          context: uiLegacyRoot,
          from: "./public",
          force: true,
          globOptions: {
            dot: true,
            gitignore: true,
            ignore: [".DS_Store"],
          },
        },
      ],
      // Forced cast below due to an incompatibility between the webpack version refed in @types/copy-webpack-plugin and our local webpack version.
    }) as unknown as WebpackPluginInstance,
    new DefinePlugin({
      "process.env.APP_NAME": JSON.stringify(process.env.npm_package_name),
      "process.env.GIT_BRANCH": JSON.stringify(branch),
      "process.env.GIT_COMMIT": JSON.stringify(revision),
      "process.env.__DEV__": NODE_ENV === "development" ? "true" : "false",
      "process.env.NODE_ENV": JSON.stringify(NODE_ENV),
      "process.env.TAMAGUI_TARGET": JSON.stringify(target),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(uiLegacyRoot, "pages", "base.html"),
      filename: "popup.html",
      chunks: ["ui"],
      inject: "body",
      minify: {
        ignoreCustomComments: [/<!-- inline_css_plugin -->/],
      },
      htmlCssClass: "popup",
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(uiLegacyRoot, "pages", "base.html"),
      filename: "popout.html",
      chunks: ["ui"],
      inject: "body",
      minify: {
        ignoreCustomComments: [/<!-- inline_css_plugin -->/],
      },
      htmlCssClass: "popup",
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(uiLegacyRoot, "pages", "base.html"),
      filename: "tab.html",
      chunks: ["tab-ui"],
      inject: "body",
      minify: {
        ignoreCustomComments: [/<!-- inline_css_plugin -->/],
      },
      htmlCssClass: "tab",
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(uiLegacyRoot, "pages", "base.html"),
      filename: "stake.html",
      chunks: ["stake-ui"],
      inject: "body",
      minify: {
        ignoreCustomComments: [/<!-- inline_css_plugin -->/],
      },
      htmlCssClass: "stake",
    }),
  ],
  optimization: {
    minimize: false,
    splitChunks: {
      minSize: 1e4,
      enforceSizeThreshold: 2.5e5,
      maxSize: 5e5,
    },
  },
};

// Configuration adjustments for specific build modes, customized by browser.
const modeConfigs: {
  [mode: string]: (browser: string) => Partial<Configuration>;
} = {
  development: () => {
    if (process.env.ENABLE_REACT_DEVTOOLS === "true") {
      entry["ui"] = ["react-devtools", "./src/ui.ts"];
      entry["tab-ui"] = ["react-devtools", "./src/tab-ui.ts"];
      entry["stake-ui"] = ["react-devtools", "./src/stake-ui.ts"];
    }

    return {
      entry,
    };
  },
  production: (browser) => {
    const date = new Date();
    const archiveName = `SendWallet-${branch.replaceAll(/[./]/gi, "-")}-${
      date.toISOString().split("T")[0]
    }-${revision}-${browser}`;
    return {
      devtool: false,
      plugins: [
        new WebExtensionArchivePlugin({
          filename: archiveName,
        }) as unknown as WebpackPluginInstance,
      ],
      optimization: {
        minimize: true,
        minimizer: [
          new ESBuildMinifyPlugin({
            css: true,
          }),
        ],
      },
    };
  },
};

// One config per supported browser, adjusted by mode.
export default (
  _: unknown,
  { mode }: WebpackOptionsNormalized
): webpack.Configuration[] =>
  supportedBrowsers.map((browser) => {
    const distPath = path.join(outputDir, "dist", browser);
    // Try to find a build mode config adjustment and call it with the browser.
    const modeSpecificAdjuster =
      typeof mode !== "undefined" ? modeConfigs[mode] : undefined;
    const modeSpecificAdjustment =
      typeof modeSpecificAdjuster !== "undefined"
        ? modeSpecificAdjuster(browser)
        : {};
    const mergedConfig = webpackMerge(baseConfig, modeSpecificAdjustment, {
      name: browser,
      output: {
        path: distPath,
      },
      plugins: [
        // Handle manifest adjustments. Adjustments are looked up and merged:
        //  - by mode (`manifest.<mode>.json`)
        //  - by browser (`manifest.<browser>.json`)
        //  - by mode and browser both (`manifest.<mode>.<browser>.json`)
        //
        // Files that don't exist are ignored, while files with invalid data
        // throw an exception. The merge order means that e.g. a mode+browser
        // adjustment will override a browser adjustment, which will override a
        // mode adjustment in turn.
        //
        // Merging currently only supports adding keys, overriding existing key
        // values if their values are not arrays, or adding entries to arrays.
        // It does not support removing keys or array values. webpackMerge is
        // used for this.
        new CopyPlugin({
          patterns: [
            {
              from: `manifest/manifest(|.${mode}|.${browser}|.${browser}.${mode}).json`,
              to: "manifest.json",
              transformAll: (
                assets: { data: Buffer; sourceFilename: string }[]
              ) => {
                const combinedManifest = webpackMerge(
                  {},
                  ...assets
                    .slice()
                    .sort((a, b) =>
                      b.sourceFilename.localeCompare(a.sourceFilename)
                    )
                    .map((asset) => asset.data.toString("utf8"))
                    // JSON.parse chokes on empty strings
                    .filter((assetData) => assetData.trim().length > 0)
                    .map((assetData) => JSON.parse(assetData))
                );
                // Add the browser-specific extension ID to the manifest.
                return JSON.stringify(combinedManifest, null, 2);
              },
            } as unknown as ObjectPattern, // ObjectPattern doesn't include transformAll in current types
          ],
          // Forced cast below due to an incompatibility between the webpack version refed in @types/copy-webpack-plugin and our local webpack version.
        }) as unknown as WebpackPluginInstance,
        new WebExtension({
          background: {
            entry: "background",
            // !! Add this to support manifest v3
            // manifest: browser === "chrome" ? 3 : 2,
            // manifest: 2,
            // classicLoader: true,
          },
          weakRuntimeCheck: true,
          // hmrConfig: false,
        }),
      ],
    });

    if (process.env.DEBUG?.includes("webpack")) {
      console.log(
        "Building for browser: ",
        browser,
        " in mode: ",
        mode,
        " to: ",
        distPath,
        " with config: ",
        mergedConfig
      );
    }

    return mergedConfig;
  });
