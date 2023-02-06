import { Web3Provider } from "@ethersproject/providers";
import {
  EthereumWindowProvider,
  PocketWindowProvider,
} from "@sendnodes/window-provider";
import { Contract, ethers, ContractInterface } from "ethers";
import Emittery from "emittery";
import { emitteryDebugLogger } from "../../utils/emittery";

type InternalProviderPortEvents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-unknown
  message: unknown;
};

/* eslint-disable @typescript-eslint/no-explicit-unknown,@typescript-eslint/explicit-module-boundary-types */
// This is a compatibility shim that allows treating the internal provider as
// if it's communicating over a port, so that the PoktWalletWindowProvider can
// interact with it directly.
export const internalEthereumProviderPort = {
  listeners: [] as ((message: unknown) => unknown)[],
  emitter: new Emittery<InternalProviderPortEvents>({
    debug: {
      name: "redux-slices/utils/contract-utils/etherem-provider-port",
      logger: emitteryDebugLogger(),
    },
  }),
  addEventListener(listener: (message: unknown) => unknown): void {
    this.listeners.push(listener);
  },
  removeEventListener(toRemove: (message: unknown) => unknown): void {
    this.listeners.filter((listener) => listener !== toRemove);
  },
  origin: window.location.origin,
  postMessage(message: unknown): void {
    this.emitter.emit("message", message);
  },
  postResponse(message: unknown): void {
    this.listeners.forEach((listener) => listener(message));
  },
};

// This is a compatibility shim that allows treating the internal provider as
// if it's communicating over a port, so that the PoktWalletWindowProvider can
// interact with it directly.
export const internalPoktProviderPort = {
  listeners: [] as ((message: unknown) => unknown)[],
  emitter: new Emittery<InternalProviderPortEvents>({
    debug: {
      name: "redux-slices/utils/contract-utils/pokt-provider-port",
      logger: emitteryDebugLogger(),
    },
  }),
  addEventListener(listener: (message: unknown) => unknown): void {
    this.listeners.push(listener);
  },
  removeEventListener(toRemove: (message: unknown) => unknown): void {
    this.listeners.filter((listener) => listener !== toRemove);
  },
  origin: window.location.origin,
  postMessage(message: unknown): void {
    this.emitter.emit("message", message);
  },
  postResponse(message: unknown): void {
    this.listeners.forEach((listener) => listener(message));
  },
};
/* eslint-enable @typescript-eslint/no-explicit-unknown,@typescript-eslint/explicit-module-boundary-types */

export const internalEthereumProvider = new EthereumWindowProvider(
  internalEthereumProviderPort
);

export const internalPocketProvider = new PocketWindowProvider(
  internalPoktProviderPort
);

export function getProvider(this: unknown): Web3Provider {
  return new Web3Provider(internalEthereumProvider);
}

export const getContract = async (
  address: string,
  abi: ContractInterface
): Promise<Contract> => {
  const provider = getProvider();
  const signer = provider.getSigner();
  return new ethers.Contract(address, abi, signer);
};

export const getSignerAddress = async (): Promise<string> => {
  const provider = getProvider();
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();
  return signerAddress;
};
