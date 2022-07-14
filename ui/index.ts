import { newProxyStore } from "@sendnodes/pokt-wallet-background"
import { setActiveTab } from "@sendnodes/pokt-wallet-background/redux-slices/ui"
import browser from "webextension-polyfill"
import React, { ComponentType } from "react"
import ReactDOM from "react-dom"
import { Store } from "webext-redux"
import Popup from "./pages/Popup"
import Tab from "./pages/Tab"

import "./public/variables.css"
import "./public/index.css"
import logger from "@sendnodes/pokt-wallet-background/lib/logger"

export { Popup, Tab }

function invokeServiceWorkerUpdateFlow(
  registration: ServiceWorkerRegistration
) {
  // TODO implement your own UI notification element
  browser.runtime.reload()
}
export async function attachUiToRootElement(
  component: ComponentType<{ store: Store }>
): Promise<void> {
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

  await renderApp(component)
}

async function renderApp(component: ComponentType<{ store: Store }>) {
  const rootElement = document.getElementById("pokt-wallet-root")

  if (!rootElement) {
    throw new Error(
      "Failed to find #pokt-wallet-root element; page structure changed?"
    )
  }

  const backgroundStore = await newProxyStore()

  if (!backgroundStore.getState().ui) {
    logger.warn("failed to parse data, trying again")
    browser.runtime.reload()
    return
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
}
