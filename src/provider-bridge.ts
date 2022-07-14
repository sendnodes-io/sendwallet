/**
 * Connect provider bridge after browser renders everything
 */
(async () => {

  // attach UI to root element
  const { injectPoktWalletWindowProvider, connectProviderBridge } = await import("@sendnodes/provider-bridge")
  injectPoktWalletWindowProvider()
  await connectProviderBridge()
  
})()

