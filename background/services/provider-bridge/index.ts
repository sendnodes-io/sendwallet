import browser, { Runtime } from "webextension-polyfill"
import {
  EXTERNAL_PORT_NAME,
  PermissionRequest,
  AllowedQueryParamPage,
  PortRequestEvent,
  PortResponseEvent,
  EIP1193Error,
  RPCRequest,
  EIP1193_ERROR_CODES,
  isPoktWalletConfigPayload,
} from "@sendnodes/provider-bridge-shared"
import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"
import BaseService from "../base"
import { poktTransactionRequestFromPoktTransactionRPCRequest } from "../chain/utils"
import InternalEthereumProviderService from "../internal-ethereum-provider"
import InternalPoktProviderService from "../internal-pokt-provider"
import { getOrCreateDB, ProviderBridgeServiceDatabase } from "./db"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import PreferenceService from "../preferences"
import logger from "../../lib/logger"
import { POKTTransactionRPCRequest } from "../../networks"
import { POCKET } from "../../constants"
import {
  checkPermissionSignTypedData,
  checkPermissionSign,
  checkPermissionSignTransaction,
} from "./authorization"
import showExtensionPopup from "./show-popup"
import { HexString } from "../../types"

type Events = ServiceLifecycleEvents & {
  requestPermission: PermissionRequest
  initializeAllowedPages: Record<string, PermissionRequest>
}

/**
 * The ProviderBridgeService is responsible for the communication with the
 * provider-bridge (content-script).
 *
 * The main purpose for this service/layer is to provide a transition
 * between the untrusted communication from the window-provider - which runs
 * in shared dapp space and can be modified by other extensions - and our
 * internal service layer.
 *
 * The responsibility of this service is 2 fold.
 * - Provide connection interface - handle port communication, connect, disconnect etc
 * - Validate the incoming communication and make sure that what we receive is what we expect
 */
export default class ProviderBridgeService extends BaseService<Events> {
  #pendingPermissionsRequests: {
    [origin: string]: (value: unknown) => void
  } = {}

  openPorts: Array<Runtime.Port> = []

  static create: ServiceCreatorFunction<
    Events,
    ProviderBridgeService,
    [Promise<InternalEthereumProviderService>, Promise<InternalPoktProviderService>, Promise<PreferenceService>]
  > = async (internalEthereumProviderService, internalPoktProviderService, preferenceService) => {
    return new this(
      await getOrCreateDB(),
      await internalEthereumProviderService,
      await internalPoktProviderService,
      await preferenceService
    )
  }

  private constructor(
    private db: ProviderBridgeServiceDatabase,
    private internalEthereumProviderService: InternalEthereumProviderService,
    private internalPoktProviderService: InternalPoktProviderService,
    private preferenceService: PreferenceService
  ) {
    super()

    browser.runtime.onConnect.addListener(async (port) => {
      if (port.name === EXTERNAL_PORT_NAME && port.sender?.url) {
        port.onMessage.addListener((event) => {
          this.onMessageListener(port as Required<browser.Runtime.Port>, event)
        })
        port.onDisconnect.addListener(() => {
          this.openPorts = this.openPorts.filter(
            (openPort) => openPort !== port
          )
        })
        this.openPorts.push(port)
      }
    })

    // TODO: on internal provider handlers connect, disconnect, account change, network change
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService() // Not needed, but better to stick to the patterns

    this.emitter.emit(
      "initializeAllowedPages",
      await this.db.getAllPermission()
    )
  }

  async onMessageListener(
    port: Required<browser.Runtime.Port>,
    event: PortRequestEvent
  ): Promise<void> {
    const { url, tab } = port.sender
    if (typeof url === "undefined") {
      return
    }

    const { origin } = new URL(url)
    const completeTab =
      typeof tab !== "undefined" && typeof tab.id !== "undefined"
        ? {
            ...tab,
            // Firefox sometimes requires an extra query to get favicons,
            // unclear why but may be related to
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1417721 .
            ...(await browser.tabs.get(tab.id)),
          }
        : tab
    const faviconUrl = completeTab?.favIconUrl ?? ""
    const title = completeTab?.title ?? ""

    const response: PortResponseEvent = { id: event.id, result: [] }
    const originPermission = await this.checkPermission(origin)
    const { address: accountAddress, network } = await this.preferenceService.getSelectedAccount()
    if (isPoktWalletConfigPayload(event.request)) {
      // let's start with the internal communication
      response.id = "poktWallet"
      response.result = {
        method: event.request.method,
        defaultWallet: await this.preferenceService.getDefaultWallet(),
      }
    } else if (network.family !== event.network) {
      // the request network is different than the active account network
      response.result = new EIP1193Error(EIP1193_ERROR_CODES.chainDisconnected).toJSON()
    } else if (typeof originPermission !== "undefined") {
      // if it's not internal but dapp has permission to communicate we proxy the request
      // TODO: here comes format validation
      response.result = await this.routeContentScriptRPCRequest(
        originPermission,
        event.request.method,
        event.request.params,
        event.network
      )
    } 
    // TODO: this is a public method and required for eager loading of dapps, maybe allow user to block this?
    else if (event.request.method === "eth_chainId") {
      response.result = await this.routeContentScriptRPCRequest(
        {
          key: `${origin}_${accountAddress}`,
          origin,
          faviconUrl,
          title,
          state: "allow",
          accountAddress,
        },
        event.network === POCKET.family ? "eth_chainId" : "eth_chainId",
        event.request.params,
        event.network
      )
    } else if (event.request.method === "eth_requestAccounts" || event.request.method === "pokt_requestAccounts") {
      // if it's external communication AND the dApp does not have permission BUT asks for it
      // then let's ask the user what he/she thinks
      const permissionRequest: PermissionRequest = {
        key: `${origin}_${accountAddress}`,
        origin,
        faviconUrl,
        title,
        state: "request",
        accountAddress,
      }

      const blockUntilUserAction = await this.requestPermission(
        permissionRequest
      )

      await blockUntilUserAction

      const persistedPermission = await this.checkPermission(origin)
      if (typeof persistedPermission !== "undefined") {
        // if agrees then let's return the account data

        response.result = await this.routeContentScriptRPCRequest(
          persistedPermission,
          event.network === POCKET.family ?  "pokt_accounts" : "eth_accounts",
          event.request.params,
          event.network
        )
      } else {
        // if user does NOT agree, then reject

        response.result = new EIP1193Error(
          EIP1193_ERROR_CODES.userRejectedRequest
        ).toJSON()
      }
    } else {
      // sorry dear dApp, there is no love for you here
      response.result = new EIP1193Error(
        EIP1193_ERROR_CODES.unauthorized
      ).toJSON()
    }

    port.postMessage(response)
  }

  notifyContentScriptAboutConfigChange(newDefaultWalletValue: boolean): void {
    this.openPorts.forEach((p) => {
      p.postMessage({
        id: "poktWallet",
        result: {
          method: "poktWallet_getConfig",
          defaultWallet: newDefaultWalletValue,
        },
      })
    })
  }

  async notifyContentScriptsAboutAddressChange(
    newAddress?: string
  ): Promise<void> {
    this.openPorts.forEach(async (port) => {
      // we know that url exists because it was required to store the port
      const { origin } = new URL(port.sender?.url as string)
      if (await this.checkPermission(origin)) {
        port.postMessage({
          id: "poktWallet",
          result: {
            method: "poktWallet_accountChanged",
            address: [newAddress],
          },
        })
      } else {
        port.postMessage({
          id: "poktWallet",
          result: {
            method: "poktWallet_accountChanged",
            address: [],
          },
        })
      }
    })
  }

  async requestPermission(
    permissionRequest: PermissionRequest
  ): Promise<unknown> {
    this.emitter.emit("requestPermission", permissionRequest)
    await showExtensionPopup(AllowedQueryParamPage.dappPermission)

    return new Promise((resolve) => {
      this.#pendingPermissionsRequests[permissionRequest.origin] = resolve
    })
  }

  async grantPermission(permission: PermissionRequest): Promise<void> {
    // FIXME proper error handling if this happens - should not tho
    if (permission.state !== "allow" || !permission.accountAddress) return

    await this.db.setPermission(permission)

    if (this.#pendingPermissionsRequests[permission.origin]) {
      this.#pendingPermissionsRequests[permission.origin](permission)
      delete this.#pendingPermissionsRequests[permission.origin]
    }
  }

  async denyOrRevokePermission(permission: PermissionRequest): Promise<void> {
    // FIXME proper error handling if this happens - should not tho
    if (permission.state !== "deny" || !permission.accountAddress) return

    const { address } = await this.preferenceService.getSelectedAccount()

    // TODO make this multi-network friendly
    await this.db.deletePermission(permission.origin, address)

    if (this.#pendingPermissionsRequests[permission.origin]) {
      this.#pendingPermissionsRequests[permission.origin]("Time to move on")
      delete this.#pendingPermissionsRequests[permission.origin]
    }

    await this.notifyContentScriptsAboutAddressChange()
  }

  async checkPermission(
    origin: string,
    address?: string
  ): Promise<PermissionRequest | undefined> {
    const { address: selectedAddress } =
      await this.preferenceService.getSelectedAccount()
    const currentAddress = address ?? selectedAddress
    // TODO make this multi-network friendly
    return this.db.checkPermission(origin, currentAddress)
  }

  async routeSafeRequest(
    method: string,
    params: unknown[],
    network: string,
    popupPromise: Promise<browser.Windows.Window>
  ): Promise<unknown> {
    const provider = network === POCKET.family ? this.internalPoktProviderService : this.internalEthereumProviderService;
    const response = await provider
      .routeSafeRPCRequest(method, params)
      .finally(async () => {
        // Close the popup once we're done submitting.
        const popup = await popupPromise
        if (typeof popup.id !== "undefined") {
          browser.windows.remove(popup.id)
        }
      })
    return response
  }

  async routeContentScriptRPCRequest(
    enablingPermission: PermissionRequest,
    method: string,
    params: RPCRequest["params"],
    network: string
  ): Promise<unknown> {
    try {
      switch (method) {
        case "requestAccounts":
        case "pokt_requestAccounts":
        case "pokt_accounts":
        case "eth_requestAccounts":
        case "eth_accounts":
          return [enablingPermission.accountAddress]
        case "eth_signTypedData":
        case "eth_signTypedData_v1":
        case "eth_signTypedData_v3":
        case "eth_signTypedData_v4":
          checkPermissionSignTypedData(
            params[0] as HexString,
            enablingPermission
          )

          return await this.routeSafeRequest(
            method,
            params,
            network,
            showExtensionPopup(AllowedQueryParamPage.signData)
          )
        case "eth_sign":
        case "personal_sign":
          checkPermissionSign(params[1] as HexString, enablingPermission)

          return await this.routeSafeRequest(
            method,
            params,
            network,
            showExtensionPopup(AllowedQueryParamPage.personalSignData)
          )
        case "eth_signTransaction":
        case "eth_sendTransaction":
          checkPermissionSignTransaction(
            params[0] as EthersTransactionRequest,
            enablingPermission
          )

          return await this.routeSafeRequest(
            method,
            params,
            network,
            showExtensionPopup(AllowedQueryParamPage.signTransaction)
          )
        case "pokt_sendTransaction":
          checkPermissionSignTransaction(
            params[0] as POKTTransactionRPCRequest,
            enablingPermission
          )

          return await this.routeSafeRequest(
            method,
            [poktTransactionRequestFromPoktTransactionRPCRequest(params[0] as POKTTransactionRPCRequest)],
            network,
            showExtensionPopup(AllowedQueryParamPage.signTransaction)
          )

        default: {
          if (network === POCKET.family) {
            return await this.internalPoktProviderService.routeSafeRPCRequest(
              method,
              params
            )
          } else {
            return await this.internalEthereumProviderService.routeSafeRPCRequest(
              method,
              params
            )
          }
        }
      }
    } catch (error) {
      logger.log("error processing request", error)
      return new EIP1193Error(EIP1193_ERROR_CODES.userRejectedRequest).toJSON()
    }
  }
}