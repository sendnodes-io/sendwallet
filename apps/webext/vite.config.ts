import { defineConfig } from "vite"
import webExtension, { readJsonFile } from "vite-plugin-web-extension"
import { swcReactRefresh } from "vite-plugin-swc-react-refresh"
import { tamaguiPlugin } from "@tamagui/vite-plugin"
import reanimated from "@tamagui/vite-plugin-reanimated"

function loadWebExtConfig() {
  try {
    return require("./.web-ext.config.json")
  } catch {
    return undefined
  }
}

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json")
  const pkg = readJsonFile("package.json")
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  }
}

const tamaguiConfig = {
  components: ["sandbox-ui", "tamagui"],
  config: "tamagui.config.ts",
  useReactNativeWebLite: false,
}

export default defineConfig({
  clearScreen: true,
  esbuild: {
    jsx: "automatic",
  },
  plugins: [
    swcReactRefresh(),
    tamaguiPlugin(tamaguiConfig),
    webExtension({
      assets: "public",
      webExtConfig: loadWebExtConfig(),
      manifest: generateManifest,
    }),
  ],
  define: {
    global: "window",
  },
})
