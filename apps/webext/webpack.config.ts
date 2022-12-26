// this webpack config more or less works! but it's not optimized for production and it's not optimized for tamagui
// it's just a starting point for you to build your own webpack config
// continue from here https://necolas.github.io/react-native-web/docs/multi-platform/
// then figure out tamagui stuff: https://tamagui.dev/docs/intro/compiler-install#webpack

import path from "path";
import webpack, { DefinePlugin } from "webpack";
import type {
	Configuration as WebpackConfiguration,
	WebpackOptionsNormalized,
	WebpackPluginInstance,
} from "webpack";
import type { Configuration as WebpackDevServerConfiguration } from "webpack-dev-server";
import HtmlWebpackPlugin from "html-webpack-plugin";
import type { TamaguiOptions } from "@tamagui/helpers-node";
import MiniCSSExtractPlugin from "mini-css-extract-plugin";
import { merge as webpackMerge } from "webpack-merge";
import Dotenv from "dotenv-webpack";
import CopyPlugin, { ObjectPattern } from "copy-webpack-plugin";
import WebExtension from "webpack-target-webextension";
import childProcess from "child_process";
import WebExtensionArchivePlugin from "build-utils/src/web-extension-archive-webpack-plugin";
import type { Manifest } from "webextension-polyfill";
const { ESBuildMinifyPlugin } = require("esbuild-loader");

interface Configuration extends WebpackConfiguration {
	devServer?: WebpackDevServerConfiguration;
}

const supportedBrowsers = [
	// "brave",
	"chrome",
	// "edge",
	"firefox",
	// "opera"
];

const NODE_ENV = process.env.NODE_ENV || "development";
const target = "web";
const isProduction = NODE_ENV === "production";

const uiRoot = path.resolve(__dirname, "..", "..", "packages", "ui-legacy");
const outputDir = path.resolve(process.env.WEBPACK_OUTPUT_DIR || __dirname);

const tamaguiOptions: TamaguiOptions = {
	config: "./tamagui.config.ts",
	components: ["tamagui", "app", "@my/ui"],
	importsWhitelist: [],
	logTimings: false,
	disableExtraction: !isProduction,
};

// Replicated and adjusted for each target browser and the current build mode.
const baseConfig: Configuration = {
	context: __dirname,
	devtool: "source-map",
	devServer: {
		static: {
			directory: path.join(__dirname, "dist"),
		},
		compress: true,
		port: 9000,
	},
	stats: "errors-only",
	entry: {
		popup: "./src/popup.tsx",
		// "tab-ui": "./src/tab-ui.ts",
		// "stake-ui": "./src/stake-ui.ts",
		background: "./src/background.ts",
		// "background-ui": "./src/background-ui.ts",
		// "window-provider": "./src/window-provider.ts",
		"provider-bridge": "./src/provider-bridge.ts",
	},
	module: {
		rules: [
			{
				oneOf: [
					{
						test: /.*\.[tj]s$/,
						use: [
							"thread-loader",
							{
								loader: "esbuild-loader",
								options: {
									loader: "tsx",
								},
							},
						],
					},
					{
						test: /.*\.[tj]sx$/,
						use: [
							"thread-loader",
							{
								loader: "esbuild-loader",
								options: {
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
						test: /\.css$/,
						use: [MiniCSSExtractPlugin.loader, "css-loader"],
					},

					{
						test: /\.(gif|jpe?g|png|svg|woff|woff2)$/i,
						use: {
							loader: "url-loader",
							options: {
								name: "[name].[ext]",
								esModule: false,
							},
						},
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
			"react-native$": require.resolve("react-native-web"),
			"react-native-svg": require.resolve("@tamagui/react-native-svg"),
		},
	},
	plugins: [
		new MiniCSSExtractPlugin({
			filename: "static/css/[name].[contenthash].css",
			ignoreOrder: true,
		}),
		new Dotenv({
			path: "../../.env",
			defaults: "../../.env.defaults",
			systemvars: true,
			safe: "../../.env.example",
		}) as unknown as WebpackPluginInstance,
		// polyfill the process and Buffer APIs
		new webpack.ProvidePlugin({
			Buffer: ["buffer", "Buffer"],
			process: ["process"],
		}),
		new CopyPlugin({
			patterns: [
				{
					context: uiRoot,
					from: "_locales",
					to: "_locales/",
					globOptions: {
						dot: true,
						gitignore: true,
					},
				},
				{
					context: uiRoot,
					from: "./public",
					force: true,
					globOptions: {
						dot: true,
						gitignore: true,
						ignore: [".DS_Store"],
					},
				},
			],
		}),
		new DefinePlugin({
			"process.env.APP_NAME": JSON.stringify(process.env.npm_package_name),
			"process.env.__DEV__": NODE_ENV === "development" ? "true" : "false",
			"process.env.NODE_ENV": JSON.stringify(NODE_ENV),
			"process.env.TAMAGUI_TARGET": JSON.stringify(target),
		}),
		new HtmlWebpackPlugin({
			template: "./src/index.html",
			filename: "index.html",
			chunks: ["popup"],
			inject: "body",
			minify: {
				ignoreCustomComments: [/<!-- inline_css_plugin -->/],
			},
			htmlCssClass: "popup",
		}),
	].filter(Boolean),
	optimization: {
		splitChunks: {
			chunks: "all",
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
	development: () => ({
		entry:
			process.env.ENABLE_REACT_DEVTOOLS === "true"
				? {
						popup: ["react-devtools", "./src/popup.tsx"],
				  }
				: undefined,
		plugins: [],
		optimization: {
			minimizer: [
				new ESBuildMinifyPlugin({
					css: true,
				}),
			],
		},
	}),
	production: (browser) => {
		const revision = childProcess
			.execSync("git rev-parse --short HEAD")
			.toString()
			.trim();
		const branch = childProcess
			.execSync("git rev-parse --abbrev-ref HEAD")
			.toString()
			.trim();
		const date = new Date();
		return {
			devtool: false,
			plugins: [
				new WebExtensionArchivePlugin({
					filename: `SendWallet-${branch.replaceAll(/[./]/gi, "-")}-${
						date.toISOString().split("T")[0]
					}-${revision}-${browser}`,
				}) as unknown as WebpackPluginInstance, // fixes ci for some reason
			],
			optimization: {
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
	{ mode }: WebpackOptionsNormalized,
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
							from: `src/manifest/manifest(|.${mode}|.${browser}|.${browser}.${mode}).json`,
							to: "manifest.json",
							transformAll: (
								assets: { data: Buffer; sourceFilename: string }[],
							) => {
								const combinedManifest = webpackMerge(
									{},
									...assets
										.slice()
										.sort((a, b) =>
											b.sourceFilename.localeCompare(a.sourceFilename),
										)
										.map((asset) => asset.data.toString("utf8"))
										// JSON.parse chokes on empty strings
										.filter((assetData) => assetData.trim().length > 0)
										.map((assetData) => JSON.parse(assetData)),
								) as Manifest.WebExtensionManifest;

								// Always add the version number to the manifest based on the package.json version.
								combinedManifest.version = process.env.npm_package_version!;

								// Add the browser-specific extension ID to the manifest.
								return JSON.stringify(combinedManifest, null, 2);
							},
						} as unknown as ObjectPattern, // ObjectPattern doesn't include transformAll in current types
					],
					// Forced cast below due to an incompatibility between the webpack version refed in @types/copy-webpack-plugin and our local webpack version.
				}),
				new WebExtension({
					background: {
						entry: "background",
						// !! Add this to support manifest v3
						manifest: browser === "chrome" ? 3 : 2,
						// classicLoader: true,
					},
					weakRuntimeCheck: true,
					// hmrConfig: false,
				}),
			],
		});
		// console.log(
		//   "Building for browser: ",
		//   browser,
		//   " in mode: ",
		//   mode,
		//   " to: ",
		//   distPath,
		//   " with config: ",
		//   mergedConfig
		// )
		return mergedConfig;
	});
