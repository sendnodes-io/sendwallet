import path from "path"
import webpack, {
  Configuration,
  DefinePlugin,
  WebpackOptionsNormalized,
  WebpackPluginInstance,
} from "webpack"
import { merge as webpackMerge } from "webpack-merge"
import Dotenv from "dotenv-webpack"
import SizePlugin from "size-plugin"
import TerserPlugin from "terser-webpack-plugin"
import LiveReloadPlugin from "webpack-livereload-plugin"
import CopyPlugin, { ObjectPattern } from "copy-webpack-plugin"
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin"
import WebExtensionArchivePlugin from "./build-utils/web-extension-archive-webpack-plugin"
import HtmlWebpackPlugin from 'html-webpack-plugin'
import WebExtension from 'webpack-target-webextension'
const StatoscopeWebpackPlugin = require('@statoscope/webpack-plugin').default;
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import HTMLInlineCSSWebpackPlugin from "html-inline-css-webpack-plugin";

const supportedBrowsers = [
  "brave",
  "chrome",
  "edge",
  "firefox",
  "opera"
]

// Replicated and adjusted for each target browser and the current build mode.
const baseConfig: Configuration = {
  devtool: "source-map",
  watchOptions: {
    ignored: "**/node_modules",
  },
  stats: 'errors-only',
  entry: {
    ui: "./src/ui.ts",
    "tab-ui": "./src/tab-ui.ts",
    background: "./src/background.ts",
    "background-ui": "./src/background-ui.ts",
    // TODO: wen dapps.....
    // "window-provider": "./src/window-provider.ts",
    // "provider-bridge": "./src/provider-bridge.ts",
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx)?$/,
        exclude: /node_modules(?!\/@sendnodes)|webpack/,
        use: [
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  [
                    "postcss-preset-env",
                    {
                      // Options
                    },
                  ],
                ],
              },
            },
          }],
      }
    ],
  },
  output: {
    // path: is set browser-specifically below
    filename: "[name].js",
    globalObject: "globalThis",
    environment: { dynamicImport: true },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    fallback: {
      stream: require.resolve("stream-browserify"),
      process: require.resolve("process/browser"),
      // these are required for @sendnodes/hd-keyring
      crypto: require.resolve("crypto-browserify"),
      path: require.resolve("path-browserify"),
      https: require.resolve("https-browserify"),
      http: require.resolve("stream-http")
    },
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    }),
    new Dotenv({
      defaults: true,
      systemvars: true,
      safe: true,
    }) as unknown as WebpackPluginInstance,
    // background runs in a service worker and needs a global window object
    new webpack.BannerPlugin({
      banner: 'window = self;',
      test: 'background',
      raw: true
    }),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
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
      process: ["process"]
    }),
    new SizePlugin({}),
    new CopyPlugin({
      patterns: [
        {
          from: "./ui/_locales/",
          to: "_locales/",
          globOptions: {
            dot: true,
            gitignore: true
          },
        },
        {
          from: "./ui/public/",
          force: true,
          globOptions: {
            dot: true,
            gitignore: true
          },
        },
      ],
      // FIXME Forced cast below due to an incompatibility between the webpack
      // FIXME version refed in @types/copy-webpack-plugin and our local
      // FIXME webpack version.
    }) as unknown as WebpackPluginInstance,
    new DefinePlugin({
      "process.env.APP_NAME": JSON.stringify(process.env.npm_package_name),
      "process.env.VERSION": JSON.stringify(process.env.npm_package_version),
    }),
    new HtmlWebpackPlugin({
      template: 'ui/pages/popup.html',
      filename: 'popup.html',
      chunks: ['ui'],
      inject: 'body',
      minify: {
        ignoreCustomComments: [/<!-- inline_css_plugin -->/]
      },
      htmlCssClass: 'popup'
    }),
    new HtmlWebpackPlugin({
      template: 'ui/pages/popup.html',
      filename: 'popout.html',
      chunks: ['ui'],
      inject: 'body',
      minify: {
        ignoreCustomComments: [/<!-- inline_css_plugin -->/]
      },
      htmlCssClass: 'popup'
    }),
    new HtmlWebpackPlugin({
      template: 'ui/pages/popup.html',
      filename: 'tab.html',
      chunks: ['tab-ui'],
      inject: 'body',
      minify: {
        ignoreCustomComments: [/<!-- inline_css_plugin -->/]
      },
      htmlCssClass: 'tab',
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 1e4,
      enforceSizeThreshold: 2.5e5,
      maxSize: 5e5,
    },
  },
}

// Configuration adjustments for specific build modes, customized by browser.
const modeConfigs: {
  [mode: string]: (browser: string) => Partial<Configuration>
} = {
  development: () => ({
    entry:
      process.env.ENABLE_REACT_DEVTOOLS === "true"
        ? {
          ui: ["react-devtools", "./src/ui.ts"],
          "tab-ui": ["react-devtools", "./src/tab-ui.ts"],
        }
        : undefined,
    plugins: [
      new LiveReloadPlugin({
        useSourceHash: true,
        delay: 400
      }),
      new CopyPlugin({
        patterns: ["dev-utils/*.js"],
        // FIXME Forced cast below due to an incompatibility between the webpack
        // FIXME version refed in @types/copy-webpack-plugin and our local
        // FIXME webpack version.
      }) as unknown as WebpackPluginInstance,
      new StatoscopeWebpackPlugin()
    ],
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            mangle: false,
            compress: false,
            output: {
              beautify: true,
              indent_level: 2, // eslint-disable-line camelcase
            },
          },
        }),
      ],
    },
  }),
  production: (browser) => {
    const revision = require('child_process')
      .execSync('git rev-parse --short HEAD')
      .toString().trim()
    const branch = require('child_process')
      .execSync('git rev-parse --abbrev-ref HEAD')
      .toString().trim()
    const date = new Date()
    return ({
      devtool: false,
      plugins: [
        new HTMLInlineCSSWebpackPlugin({
          replace: {
            removeTarget: true,
            target: '<!-- inline_css_plugin -->',
          }
        }),
        new WebExtensionArchivePlugin({
          filename: `POKTWallet-${browser}-${branch.replaceAll(/[.\/]/gi, '-')}-${date.toISOString().split('T')[0]}-${revision}`,
        }),
      ],
      optimization: {
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              mangle: true,
              compress: true,
            },
          }),
        ],
      },
    })
  },
}

// One config per supported browser, adjusted by mode.
export default (
  _: unknown,
  { mode }: WebpackOptionsNormalized
): webpack.Configuration[] =>
  supportedBrowsers.map((browser) => {
    const distPath = path.join(__dirname, "dist", browser)

    // Try to find a build mode config adjustment and call it with the browser.
    const modeSpecificAdjuster =
      typeof mode !== "undefined" ? modeConfigs[mode] : undefined
    const modeSpecificAdjustment =
      typeof modeSpecificAdjuster !== "undefined"
        ? modeSpecificAdjuster(browser)
        : {}
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
              transformAll: (assets: { data: Buffer, sourceFilename: string }[]) => {
                const combinedManifest = webpackMerge(
                  {},
                  ...assets
                    .slice()
                    .sort((a, b) => b.sourceFilename.localeCompare(a.sourceFilename))
                    .map((asset) => asset.data.toString("utf8"))
                    // JSON.parse chokes on empty strings
                    .filter((assetData) => assetData.trim().length > 0)
                    .map((assetData) => JSON.parse(assetData))
                )
                return JSON.stringify(combinedManifest, null, 2)
              },
            } as unknown as ObjectPattern, // ObjectPattern doesn't include transformAll in current types
          ],
          // FIXME Forced cast below due to an incompatibility between the webpack
          // FIXME version refed in @types/copy-webpack-plugin and our local
          // FIXME webpack version.
        }) as unknown as WebpackPluginInstance,
        new WebExtension({
          background: {
            entry: 'background',
            // !! Add this to support manifest v3
            manifest: browser == 'chrome' ? 3 : 2,
            classicLoader: true
          },
          weakRuntimeCheck: true,
          hmrConfig: false
        }),
      ],
    })
    return mergedConfig
  })
