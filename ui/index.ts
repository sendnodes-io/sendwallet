import { newProxyStore } from "@sendnodes/pokt-wallet-background"
import { setActiveTab } from "@sendnodes/pokt-wallet-background/redux-slices/ui"
import browser from "webextension-polyfill"
import React, { ComponentType } from "react"
import ReactDOM from "react-dom"
import { Store } from "webext-redux"
import Popup from "./pages/Popup"
import Tab from "./pages/Tab"
import Stake from "./pages/Stake"

import "./public/variables.css"
import "./public/index.css"
import logger from "@sendnodes/pokt-wallet-background/lib/logger"

export { Popup, Tab, Stake }

function invokeServiceWorkerUpdateFlow(
  registration: ServiceWorkerRegistration
) {
  // TODO implement your own UI notification element
  if (
    confirm(
      "A new version of the extension is available. Would you like to update?"
    )
  ) {
    browser.runtime.reload()
  } else {
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.unregister())
  }
}
export async function attachUiToRootElement(
  component: ComponentType<{ store: Store }>
): Promise<void> {
  // monitoring service worker lifecycle only applies to manifest version 3
  if (browser.runtime.getManifest().manifest_version === 3) {
    // register the service worker from the file specified
    const registration = await navigator.serviceWorker.getRegistration()

    if (registration === undefined) {
      console.warn("No regsitration found")
      browser.runtime.reload()
      return
    }

    // ensure the case when the updatefound event was missed is also handled
    // by re-invoking the prompt when there's a waiting Service Worker
    if (registration.waiting) {
      invokeServiceWorkerUpdateFlow(registration)
    }

    // detect Service Worker update available and wait for it to become installed
    registration.addEventListener("updatefound", () => {
      if (registration.installing) {
        // wait until the new Service worker is actually installed (ready to take over)
        registration.installing.addEventListener("statechange", () => {
          if (registration.waiting) {
            // if there's an existing controller (previous Service Worker), show the prompt
            if (navigator.serviceWorker.controller) {
              invokeServiceWorkerUpdateFlow(registration)
            }
            // otherwise it's the first install, nothing to do
          }
        })
      }
    })

    let refreshing = false

    // detect controller change and refresh the page
    navigator.serviceWorker.addEventListener("controllerchange", async () => {
      if (!refreshing) {
        browser.runtime.reload()
      }
    })
  }

  await renderApp(component)
}

async function renderApp(
  component: ComponentType<{ store: Store }>,
  attempts = 0
) {
  const rootElement = document.getElementById("pokt-wallet-root")

  if (!rootElement) {
    throw new Error(
      "Failed to find #pokt-wallet-root element; page structure changed?"
    )
  }

  try {
    const backgroundStore = await newProxyStore()

    if (!backgroundStore.getState().ui) {
      throw new Error("failed to parse data, trying again")
    }

    const activeTab = await browser.tabs
      .query({
        active: true,
        lastFocusedWindow: true,
      })
      .then((tabs) => (tabs[0] ? tabs[0] : null))
    backgroundStore.dispatch(setActiveTab(activeTab))

    ReactDOM.render(
      React.createElement(component, { store: backgroundStore }),
      rootElement
    )
  } catch (error) {
    logger.error("failed to start app", error)
    if (attempts < 3) {
      setTimeout(() => renderApp(component, attempts + 1), 1000)
    } else {
      if (process.env.NODE_ENV === "development") {
        throw error
      } else {
        browser.runtime.reload()
      }
    }
  }
}
