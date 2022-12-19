interface Window {
  pocketNetwork?: {
    isPoktWallet: boolean
    on: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown
    removeListener: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown
  }
  ethereum?: {
    isMetaMask?: boolean
    isPoktWallet?: boolean
    on?: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown
    removeListener?: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown
    autoRefreshOnNetworkChange?: boolean
  }
  oldEthereum?: {
    isMetaMask?: boolean
    isPoktWallet?: boolean
    on?: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown
    removeListener?: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown
    autoRefreshOnNetworkChange?: boolean
  }
  ga: any // google analytics
}
