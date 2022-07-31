export const SENDNODES_POKT_SIW = process.env.SENDNODES_POKT_SIW!
export const SENDNODES_ONCHAIN_API_URL =
  process.env.SENDNODES_ONCHAIN_API_URL ?? "http://onchainapi.sendnodes.io/"

export const fetcher = (url: string, request: RequestInit) =>
  window
    .fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...request,
    })
    .then((r) => r.json())
