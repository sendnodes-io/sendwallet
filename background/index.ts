import browser from "webextension-polyfill"

import { Store as ProxyStore } from "@0xbigboss/webext-redux"
import { AnyAction } from "@reduxjs/toolkit"

import Main from "./main"
import { encodeJSON, decodeJSON } from "./lib/utils"

import { RootState } from "./redux-slices"
import logger from "./lib/logger"

export { browser }

export type { RootState }

export type BackgroundDispatch = Main["store"]["dispatch"]

/**
 * Creates and returns a new webext-redux proxy store. This is a redux store
 * that works like any redux store, except that its contents and actions are
 * proxied to and from the master background store created when the API package
 * is first imported.
 *
 * The returned Promise resolves once the proxy store is ready and hydrated
 * with the current background store data.
 */
export async function newProxyStore(
  attempts = 0
): Promise<ProxyStore<RootState, AnyAction>> {
  if (attempts > 10) {
    logger.error("Failed to create proxy store", { attempts })
    throw new Error("Failed to create proxy store")
  }

  try {
    const proxyStore = new ProxyStore({
      serializer: encodeJSON,
      deserializer: decodeJSON,
      maxReconnects: 10,
    })
    await proxyStore.ready()

    return proxyStore
  } catch (e) {
    logger.warn("Failed to create proxy store", { attempts, e })
    return newProxyStore(attempts + 1)
  }
}

/**
 * Starts the API subsystems, including all services.
 */
export async function startApi(): Promise<Main> {
  const mainService = await Main.create()

  mainService.startService()
  return mainService.started()
}
