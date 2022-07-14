import {
  WindowListener,
  WindowRequestEvent,
} from "@sendnodes/provider-bridge-shared"

(async () => {
  const { PocketWindowProvider, EthereumWindowProvider } = await import("@sendnodes/window-provider")

  // The window object is considered unsafe, because other extensions could have modified them before this script is run.
  // For 100% certainty we could create an iframe here, store the references and then destoroy the iframe.
  //   something like this: https://speakerdeck.com/fransrosen/owasp-appseceu-2018-attacking-modern-web-technologies?slide=95
  window.poktWallet = new PocketWindowProvider({
    postMessage: (data: WindowRequestEvent) => {
      console.log('post message', data)
      return window.postMessage(data, window.location.origin)
    },
    addEventListener: (fn: WindowListener) =>
      window.addEventListener("message", fn, false),
    removeEventListener: (fn: WindowListener) =>
      window.removeEventListener("message", fn, false),
    origin: window.location.origin,
  })

  // let's be a bit more pushy but stable: if window.ethereum is occupied let's make a backup
  // so we can reset to the original if poktWallet is NOT set to be the default wallet
  if (window.ethereum) {
    window.oldEthereum = window.ethereum
  }

  // and set window.ethereum by default, so it's available from the very beginning
  window.ethereum = new EthereumWindowProvider({
    postMessage: (data: WindowRequestEvent) => {
      console.log("post message", data)
      return window.postMessage(data, window.location.origin)
    },
    addEventListener: (fn: WindowListener) =>
      window.addEventListener("message", fn, false),
    removeEventListener: (fn: WindowListener) =>
      window.removeEventListener("message", fn, false),
    origin: window.location.origin,
  })

})()