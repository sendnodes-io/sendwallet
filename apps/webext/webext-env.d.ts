interface Window {
  pocketNetwork?: {
    isPoktWallet: boolean;
    on: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown;
    removeListener: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown;
  };
  ethereum?: {
    isMetaMask?: boolean;
    isPoktWallet?: boolean;
    on?: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown;
    removeListener?: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown;
    autoRefreshOnNetworkChange?: boolean;
  };
  oldEthereum?: {
    isMetaMask?: boolean;
    isPoktWallet?: boolean;
    on?: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown;
    removeListener?: (
      eventName: string | symbol,
      listener: (...args: unknown[]) => void
    ) => unknown;
    autoRefreshOnNetworkChange?: boolean;
  };
  // rome-ignore lint/suspicious/noExplicitAny: TODO: future cleanup
  ga: any; // google analytics
  PROCESS_ID: string;
}
