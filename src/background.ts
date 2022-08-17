import logger from "@sendnodes/pokt-wallet-background/lib/logger"
import browser from "webextension-polyfill"
const PROCESS_ID = ((globalThis as any).PROCESS_ID =
  "background-" + Math.random() + "." + new Date().getTime())

const serviceWorker = self as unknown as ServiceWorkerGlobalScope

serviceWorker.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(serviceWorker.skipWaiting())
})

browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "HEARTBEAT") {
    logger.debug("background received heartbeat message", message, sender)
    return Promise.resolve({ processId: PROCESS_ID })
  }
})
;(async () => {
  // this supports both manifest v2 and v3
  const { startApi } = await import("@sendnodes/pokt-wallet-background")
  await startApi()
})()
