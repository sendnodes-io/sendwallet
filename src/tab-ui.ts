import "@sendnodes/pokt-wallet-ui/public/variables.css"
import "@sendnodes/pokt-wallet-ui/public/index.css"
import "@sendnodes/pokt-wallet-ui/public/tab.css"

// inject extension reload if dev
if (process.env.NODE_ENV === "development") {
  const liveReloadScript = document.createElement("script")
  liveReloadScript.src = "./dev-utils/extension-reload.js"
  document.body.appendChild(liveReloadScript)
}

/**
 * Load main UI script after browser renders everything
 */
;(async () => {
  // attach UI to root element
  const { attachUiToRootElement, Tab } = await import(
    "@sendnodes/pokt-wallet-ui"
  )
  await attachUiToRootElement(Tab)
})()
