import { abort } from "process"
import { useState, useEffect } from "react"

export type RemoteConfig = {
  easterEggs?: {
    lucky?: boolean
    zelda?: boolean
  }
}

export function useRemoteConfig() {
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null)
  useEffect(() => {
    const check = async () => {
      const controller = new AbortController()
      const signal = controller.signal
      const response = await fetch(
        `${process.env.SENDWALLET_IO}api/remote-config`,
        { signal }
      )
      if (response.status === 200) {
        const body: RemoteConfig = await response.json()
        if (body) {
          setRemoteConfig(body)
        }
      }
      return () => {
        controller.abort()
      }
    }

    check().catch((e) => console.error("failed to load remote config", e))
  }, [])

  return remoteConfig
}
