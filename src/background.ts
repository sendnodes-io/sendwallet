;(globalThis as any).PROCESS_ID =
  "background-" + Math.random() + "." + new Date().getTime()

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})
;(async () => {
  // this supports both manifest v2 and v3
  const { startApi } = await import("@sendnodes/pokt-wallet-background")
  await startApi()
})()
