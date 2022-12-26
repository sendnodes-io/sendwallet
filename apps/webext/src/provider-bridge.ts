(
  globalThis as any
).PROCESS_ID = `provider-bridge-${Math.random()}.${new Date().getTime()}`;

/**
 * Connect provider bridge after browser renders everything
 */
(async () => {
  const { injectPoktWalletWindowProvider, connectProviderBridge } =
    await import("@sendnodes/provider-bridge");
  injectPoktWalletWindowProvider();
  await connectProviderBridge();
})();
