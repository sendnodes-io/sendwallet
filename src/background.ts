;(async () => {
  // this supports both manifest v2 and v3
  const { startApi } = await import("@sendnodes/pokt-wallet-background")
  await startApi()
})()
