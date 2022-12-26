export type PermissionRequest = {
  key: string;
  origin: string;
  faviconUrl: string;
  title: string;
  state: "request" | "allow" | "deny";
  accountAddress: string;
};

export type WindowResponseEvent = {
  origin: string;
  source: unknown;
  data: { id: string; target: string; result: unknown };
};
export type RPCRequest = {
  method: string;
  params: Array<unknown>; // This typing is required by ethers.js but is not EIP-1193 compatible
};

export type WindowRequestEvent = {
  id: string;
  target: unknown;
  request: RPCRequest;
};

export type PortResponseEvent = {
  id: string;
  result: unknown;
};

export type PortRequestEvent = {
  id: string;
  request: RPCRequest;
  network: string;
};

export type ProviderTransport = WindowTransport | PortTransport;

export type WindowListener = (event: WindowResponseEvent) => void;

export type WindowTransport = {
  postMessage: (data: WindowRequestEvent) => void;
  addEventListener: (listener: WindowListener) => void;
  removeEventListener: (listener: WindowListener) => void;
  origin: string;
};

export type PortListenerFn = (callback: unknown, ...params: unknown[]) => void;
export type PortListener = (listener: PortListenerFn) => void;
export type PortTransport = {
  postMessage: (data: unknown) => void;
  addEventListener: PortListener;
  removeEventListener: PortListener;
  origin: string;
};

export type EthersSendCallback = (error: unknown, response: unknown) => void;

export type PoktWalletInternalCommunication = {
  id: "poktWallet";
  result: PoktWalletConfigPayload | PoktWalletAccountPayload;
};

export type PoktWalletConfigPayload = {
  method: "poktWallet_getConfig";
  defaultWallet: boolean;
  [prop: string]: unknown;
};

export type PoktWalletAccountPayload = {
  method: "poktWallet_accountChanged";
  address: Array<string>;
};
