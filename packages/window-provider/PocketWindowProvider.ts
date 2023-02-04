import {
  PROVIDER_BRIDGE_TARGET,
  WINDOW_PROVIDER_TARGET,
  ProviderTransport,
  isObject,
  isWindowResponseEvent,
  isPortResponseEvent,
  RequestArgument,
  EthersSendCallback,
  PoktWalletConfigPayload,
  isEIP1193Error,
  isPoktWalletInternalCommunication,
  PoktWalletAccountPayload,
  isPoktWalletAccountPayload,
} from "@sendnodes/provider-bridge-shared";
import { EventEmitter } from "events";

export default class PocketWindowProvider extends EventEmitter {
  // TODO: This should come from the background with onConnect when any interaction is initiated by the dApp.
  // onboard.js relies on this, or uses a deprecated api. It seemed to be a reasonable workaround for now.
  chainId = "mainnet";

  selectedAddress: string | undefined;

  isConnected(): boolean {
    return this.#isConnected;
  }

  #isConnected = false;

  isPoktWallet = true;

  bridgeListeners = new Map();

  constructor(public transport: ProviderTransport) {
    super();

    const internalListener = (event: unknown) => {
      let result: PoktWalletConfigPayload | PoktWalletAccountPayload;
      if (
        isWindowResponseEvent(event) &&
        isPoktWalletInternalCommunication(event.data)
      ) {
        if (
          event.origin !== this.transport.origin || // filter to messages claiming to be from the provider-bridge script
          event.source !== window || // we want to recieve messages only from the provider-bridge script
          event.data.target !== WINDOW_PROVIDER_TARGET
        ) {
          return;
        }
        ({ result } = event.data);
      } else if (
        isPortResponseEvent(event) &&
        isPoktWalletInternalCommunication(event)
      ) {
        ({ result } = event);
      } else {
        return;
      }

      if (isPoktWalletAccountPayload(result)) {
        this.handleAddressChange.bind(this)(result.address);
      }
    };

    this.transport.addEventListener(internalListener);
  }

  send(
    methodOrRequest: string | RequestArgument,
    paramsOrCallback: Array<unknown> | EthersSendCallback
  ): Promise<unknown> | void {
    if (
      typeof methodOrRequest === "string" &&
      typeof paramsOrCallback !== "function"
    ) {
      return this.request({
        method: methodOrRequest,
        params: paramsOrCallback,
      });
    }

    if (isObject(methodOrRequest) && typeof paramsOrCallback === "function") {
      return this.request(methodOrRequest).then(
        (response) => paramsOrCallback(null, response),
        (error) => paramsOrCallback(error, null)
      );
    }

    return Promise.reject(new Error("Unsupported function parameters"));
  }

  // Provider-wide counter for requests.
  private requestID = 0n;

  request(arg: RequestArgument): Promise<unknown> {
    const { method, params = [] } = arg;
    if (typeof method !== "string") {
      return Promise.reject(new Error(`unsupported method type: ${method}`));
    }
    const sendData = {
      id: this.requestID.toString(),
      target: PROVIDER_BRIDGE_TARGET,
      request: {
        method,
        params,
      },
      network: "POKT",
    };

    this.requestID += 1n;

    this.transport.postMessage(sendData);

    return new Promise((resolve, reject) => {
      // TODO: refactor the listener function out of the Promise
      const listener = (event: unknown) => {
        let id;
        let result: unknown;

        if (isWindowResponseEvent(event)) {
          if (
            event.origin !== this.transport.origin || // filter to messages claiming to be from the provider-bridge script
            event.source !== window || // we want to recieve messages only from the provider-bridge script
            event.data.target !== WINDOW_PROVIDER_TARGET
          ) {
            return;
          }
          ({ id, result } = event.data);
        } else if (isPortResponseEvent(event)) {
          ({ id, result } = event);
        } else {
          return;
        }

        if (sendData.id !== id) return;

        this.transport.removeEventListener(
          this.bridgeListeners.get(sendData.id)
        );
        this.bridgeListeners.delete(sendData.id);

        const { method: sentMethod } = sendData.request;

        if (isEIP1193Error(result)) {
          reject(result);
        }

        // let's emmit connected on the first successful response from background
        if (!this.#isConnected) {
          this.#isConnected = true;
          this.emit("connect", { chainId: this.chainId });
        }

        if (
          (sentMethod === "pokt_accounts" ||
            sentMethod === "pokt_requestAccounts") &&
          Array.isArray(result) &&
          result.length !== 0
        ) {
          this.handleAddressChange.bind(this)(result);
        }

        resolve(result);
      };

      this.bridgeListeners.set(sendData.id, listener);
      this.transport.addEventListener(this.bridgeListeners.get(sendData.id));
    });
  }

  handleAddressChange(address: Array<string>): void {
    if (this.selectedAddress !== address[0]) {
      // eslint-disable-next-line prefer-destructuring
      this.selectedAddress = address[0];
      this.emit("accountsChanged", address);
    }
  }
}
