/// <reference types="styled-jsx" />

// Although you would expect this file to be unnecessary, removing it will
// result in a handful of type errors. See PR #196.

declare module "styled-jsx/style"
interface Window {
  poktWallet?: {
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
