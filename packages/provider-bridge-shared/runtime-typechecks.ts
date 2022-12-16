import {
  RPCRequest,
  WindowResponseEvent,
  PortResponseEvent,
  PoktWalletConfigPayload,
  PoktWalletInternalCommunication,
  PoktWalletAccountPayload,
} from "./types"

export function getType(arg: unknown): string {
  return Object.prototype.toString.call(arg).slice("[object ".length, -1)
}

export function isObject(
  arg: unknown
): arg is Record<string | number | symbol, unknown> {
  return getType(arg) === "Object"
}

export function isArray(arg: unknown): arg is Array<unknown> {
  return Array.isArray(arg)
}

export function isUndefined(arg: unknown): arg is undefined {
  return typeof arg === "undefined"
}

export function isString(arg: unknown): arg is string {
  return getType(arg) === "String"
}

export function isNumber(arg: unknown): arg is number {
  return getType(arg) === "Number"
}

export function isMessageEvent(arg: unknown): arg is MessageEvent {
  return arg instanceof MessageEvent
}

export function isRPCRequestParamsType(
  arg: unknown
): arg is RPCRequest["params"] {
  return isObject(arg) || isArray(arg)
}

export function isWindowResponseEvent(
  arg: unknown
): arg is WindowResponseEvent {
  return (
    isMessageEvent(arg) &&
    isString(arg.origin) &&
    !isUndefined(arg.source) &&
    isObject(arg.data) &&
    isString(arg.data.id) &&
    isString(arg.data.target) &&
    !isUndefined(arg.data.result)
  )
}

export function isPortResponseEvent(arg: unknown): arg is PortResponseEvent {
  return isObject(arg) && isString(arg.id) && !isUndefined(arg.result)
}

export const AllowedQueryParamPage = {
  signTransaction: "/sign-transaction",
  dappPermission: "/dapp-permission",
  signData: "/sign-data",
  personalSignData: "/personal-sign",
} as const

export type AllowedQueryParamPageType =
  typeof AllowedQueryParamPage[keyof typeof AllowedQueryParamPage]

export function isAllowedQueryParamPage(
  url: unknown
): url is AllowedQueryParamPageType {
  // The typing for Array.includes in `lib.es.2016.array.include.ts` does not make any sense here -> Object.values<string>
  // interface Array<T> { ... includes(searchElement: T, fromIndex?: number): boolean; ...
  return Object.values<unknown>(AllowedQueryParamPage).includes(url)
}

export function isPoktWalletInternalCommunication(
  arg: unknown
): arg is PoktWalletInternalCommunication {
  return isObject(arg) && arg.id === "poktWallet"
}

export function isPoktWalletConfigPayload(
  arg: unknown
): arg is PoktWalletConfigPayload {
  return isObject(arg) && arg.method === "poktWallet_getConfig"
}

export function isPoktWalletAccountPayload(
  arg: unknown
): arg is PoktWalletAccountPayload {
  return (
    isObject(arg) &&
    arg.method === "poktWallet_accountChanged" &&
    isArray(arg.address)
  )
}
