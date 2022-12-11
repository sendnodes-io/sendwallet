import { NetworkFamily } from "@sendnodes/pokt-wallet-background/networks"
import {
  PROVIDER_BRIDGE_TARGET,
  WINDOW_PROVIDER_TARGET,
  ProviderTransport,
  isObject,
  isWindowResponseEvent,
  isPortResponseEvent,
  RequestArgument,
  EthersSendCallback,
  isPoktWalletConfigPayload,
  PoktWalletConfigPayload,
  isEIP1193Error,
  isPoktWalletInternalCommunication,
  PoktWalletAccountPayload,
  isPoktWalletAccountPayload,
} from "@sendnodes/provider-bridge-shared"
import { EventEmitter } from "events"

export class EthereumWindowProvider extends EventEmitter {
  // TODO: This should come from the background with onConnect when any interaction is initiated by the dApp.
  // onboard.js relies on this, or uses a deprecated api. It seemed to be a reasonable workaround for now.
  chainId = "0x1"

  selectedAddress: string | undefined

  isConnected(): boolean {
    return this.#isConnected
  }

  #isConnected = false

  isPoktWallet = true

  bridgeListeners = new Map()

  constructor(public transport: ProviderTransport) {
    super()

    const internalListener = (event: unknown) => {
      let result: PoktWalletConfigPayload | PoktWalletAccountPayload
      if (
        isWindowResponseEvent(event) &&
        isPoktWalletInternalCommunication(event.data)
      ) {
        if (
          event.origin !== this.transport.origin || // filter to messages claiming to be from the provider-bridge script
          event.source !== window || // we want to recieve messages only from the provider-bridge script
          event.data.target !== WINDOW_PROVIDER_TARGET
        ) {
          return
        }

        ;({ result } = event.data)
      } else if (
        isPortResponseEvent(event) &&
        isPoktWalletInternalCommunication(event)
      ) {
        ;({ result } = event)
      } else {
        return
      }

      if (isPoktWalletConfigPayload(result)) {
        // if (!result.defaultWallet) {
        //   // if poktWallet is NOT set to be default wallet
        //   // AND window.ethereum was taken
        //   if (window.oldEthereum) {
        //     // then let's reset window.ethereum to the original value
        //     window.ethereum = window.oldEthereum
        //   }
        //   // NOTE: we do not remove the PoktWalletWindowProvider from window.ethereum
        //   // if there is nothing else that want's to use it.
        // }
      } else if (isPoktWalletAccountPayload(result)) {
        this.handleAddressChange.bind(this)(result.address)
      }
    }

    this.transport.addEventListener(internalListener)
  }

  // deprecated EIP-1193 method
  async enable(): Promise<unknown> {
    return this.request({ method: "eth_requestAccounts" })
  }

  // deprecated EIP1193 send for web3-react injected provider Send type:
  // https://github.com/NoahZinsmeister/web3-react/blob/d0b038c748a42ec85641a307e6c588546d86afc2/packages/injected-connector/src/types.ts#L4
  send(method: string, params: Array<unknown>): Promise<unknown>
  // deprecated EIP1193 send for ethers.js Web3Provider > ExternalProvider:
  // https://github.com/ethers-io/ethers.js/blob/73a46efea32c3f9a4833ed77896a216e3d3752a0/packages/providers/src.ts/web3-provider.ts#L19
  send(
    request: RequestArgument,
    callback: (error: unknown, response: unknown) => void
  ): void
  send(
    methodOrRequest: string | RequestArgument,
    paramsOrCallback: Array<unknown> | EthersSendCallback
  ): Promise<unknown> | void {
    if (
      typeof methodOrRequest === "string" &&
      typeof paramsOrCallback !== "function"
    ) {
      return this.request({ method: methodOrRequest, params: paramsOrCallback })
    }

    if (isObject(methodOrRequest) && typeof paramsOrCallback === "function") {
      return this.request(methodOrRequest).then(
        (response) => paramsOrCallback(null, response),
        (error) => paramsOrCallback(error, null)
      )
    }

    return Promise.reject(new Error("Unsupported function parameters"))
  }

  // Provider-wide counter for requests.
  private requestID = 0n

  request(arg: RequestArgument): Promise<unknown> {
    const { method, params = [] } = arg
    if (typeof method !== "string") {
      return Promise.reject(new Error(`unsupported method type: ${method}`))
    }

    const sendData = {
      id: this.requestID.toString(),
      target: PROVIDER_BRIDGE_TARGET,
      request: {
        method,
        params,
      },
      network: NetworkFamily.EVM,
    }

    this.requestID += 1n

    this.transport.postMessage(sendData)

    return new Promise((resolve, reject) => {
      // TODO: refactor the listener function out of the Promise
      const listener = (event: unknown) => {
        let id
        let result: unknown

        if (isWindowResponseEvent(event)) {
          if (
            event.origin !== this.transport.origin || // filter to messages claiming to be from the provider-bridge script
            event.source !== window || // we want to recieve messages only from the provider-bridge script
            event.data.target !== WINDOW_PROVIDER_TARGET
          ) {
            return
          }

          ;({ id, result } = event.data)
        } else if (isPortResponseEvent(event)) {
          ;({ id, result } = event)
        } else {
          return
        }

        if (sendData.id !== id) return

        this.transport.removeEventListener(
          this.bridgeListeners.get(sendData.id)
        )
        this.bridgeListeners.delete(sendData.id)

        const { method: sentMethod } = sendData.request

        if (isEIP1193Error(result)) {
          return reject(result)
        }

        // let's emmit connected on the first successful response from background
        if (!this.#isConnected) {
          this.#isConnected = true
          this.emit("connect", { chainId: this.chainId })
        }

        if (sentMethod === "eth_chainId" || sentMethod === "net_version") {
          if (
            typeof result === "string" &&
            Number(this.chainId) !== Number(result)
          ) {
            this.chainId = `0x${Number(result).toString(16)}`
            this.emit("chainChanged", this.chainId)
            this.emit("networkChanged", Number(this.chainId).toString())
          }
        }

        if (
          (sentMethod === "eth_accounts" ||
            sentMethod === "eth_requestAccounts") &&
          Array.isArray(result) &&
          result.length !== 0
        ) {
          this.handleAddressChange.bind(this)(result)
        }

        resolve(result)
      }

      this.bridgeListeners.set(sendData.id, listener)
      this.transport.addEventListener(this.bridgeListeners.get(sendData.id))
    })
  }

  handleAddressChange(address: Array<string>): void {
    if (this.selectedAddress !== address[0]) {
      // eslint-disable-next-line prefer-destructuring
      this.selectedAddress = address[0]
      this.emit("accountsChanged", address)
    }
  }
}

export class PocketWindowProvider extends EventEmitter {
  // TODO: This should come from the background with onConnect when any interaction is initiated by the dApp.
  // onboard.js relies on this, or uses a deprecated api. It seemed to be a reasonable workaround for now.
  chainId = "mainnet"

  selectedAddress: string | undefined

  isConnected() {
    return this.#isConnected
  }

  #isConnected = false

  isPoktWallet = true

  bridgeListeners = new Map()

  constructor(public transport: ProviderTransport) {
    super()

    const internalListener = (event: unknown) => {
      let result: PoktWalletConfigPayload | PoktWalletAccountPayload
      if (
        isWindowResponseEvent(event) &&
        isPoktWalletInternalCommunication(event.data)
      ) {
        if (
          event.origin !== this.transport.origin || // filter to messages claiming to be from the provider-bridge script
          event.source !== window || // we want to recieve messages only from the provider-bridge script
          event.data.target !== WINDOW_PROVIDER_TARGET
        ) {
          return
        }

        ;({ result } = event.data)
      } else if (
        isPortResponseEvent(event) &&
        isPoktWalletInternalCommunication(event)
      ) {
        ;({ result } = event)
      } else {
        return
      }

      if (isPoktWalletAccountPayload(result)) {
        this.handleAddressChange.bind(this)(result.address)
      }
    }

    this.transport.addEventListener(internalListener)
  }

  send(
    methodOrRequest: string | RequestArgument,
    paramsOrCallback: Array<unknown> | EthersSendCallback
  ): Promise<unknown> | void {
    if (
      typeof methodOrRequest === "string" &&
      typeof paramsOrCallback !== "function"
    ) {
      return this.request({ method: methodOrRequest, params: paramsOrCallback })
    }

    if (isObject(methodOrRequest) && typeof paramsOrCallback === "function") {
      return this.request(methodOrRequest).then(
        (response) => paramsOrCallback(null, response),
        (error) => paramsOrCallback(error, null)
      )
    }

    return Promise.reject(new Error("Unsupported function parameters"))
  }

  // Provider-wide counter for requests.
  private requestID = 0n

  request(arg: RequestArgument): Promise<unknown> {
    const { method, params = [] } = arg
    if (typeof method !== "string") {
      return Promise.reject(new Error(`unsupported method type: ${method}`))
    }
    const sendData = {
      id: this.requestID.toString(),
      target: PROVIDER_BRIDGE_TARGET,
      request: {
        method,
        params,
      },
      network: "POKT",
    }

    this.requestID += 1n

    this.transport.postMessage(sendData)

    return new Promise((resolve, reject) => {
      // TODO: refactor the listener function out of the Promise
      const listener = (event: unknown) => {
        let id
        let result: unknown

        if (isWindowResponseEvent(event)) {
          if (
            event.origin !== this.transport.origin || // filter to messages claiming to be from the provider-bridge script
            event.source !== window || // we want to recieve messages only from the provider-bridge script
            event.data.target !== WINDOW_PROVIDER_TARGET
          ) {
            return
          }

          ;({ id, result } = event.data)
        } else if (isPortResponseEvent(event)) {
          ;({ id, result } = event)
        } else {
          return
        }

        if (sendData.id !== id) return

        this.transport.removeEventListener(
          this.bridgeListeners.get(sendData.id)
        )
        this.bridgeListeners.delete(sendData.id)

        const { method: sentMethod } = sendData.request

        if (isEIP1193Error(result)) {
          reject(result)
        }

        // let's emmit connected on the first successful response from background
        if (!this.#isConnected) {
          this.#isConnected = true
          this.emit("connect", { chainId: this.chainId })
        }

        if (
          (sentMethod === "pokt_accounts" ||
            sentMethod === "pokt_requestAccounts") &&
          Array.isArray(result) &&
          result.length !== 0
        ) {
          this.handleAddressChange.bind(this)(result)
        }

        resolve(result)
      }

      this.bridgeListeners.set(sendData.id, listener)
      this.transport.addEventListener(this.bridgeListeners.get(sendData.id))
    })
  }

  handleAddressChange(address: Array<string>): void {
    if (this.selectedAddress !== address[0]) {
      // eslint-disable-next-line prefer-destructuring
      this.selectedAddress = address[0]
      this.emit("accountsChanged", address)
    }
  }
}
