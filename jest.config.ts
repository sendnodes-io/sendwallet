import type { Config } from "@jest/types"

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  setupFilesAfterEnv: ["./jest.setup.ts"],
}
export default config
