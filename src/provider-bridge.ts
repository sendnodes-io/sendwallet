/**
 * Connect provider bridge after browser renders everything
 */
;(async () => {
  const { injectPoktWalletWindowProvider, connectProviderBridge } =
    await import("@sendnodes/provider-bridge")
  injectPoktWalletWindowProvider()
  await connectProviderBridge()
})()
