export const SENDNODES_ONCHAIN_API_URL =
  process.env.SENDNODES_ONCHAIN_API_URL ?? "https://onchainapi.sendnodes.io/"
export enum SnAction {
  STAKE = "STAKE",
  UNSTAKE = "UNSTAKE",
  UNSTAKE_RECEIPT = "UNSTAKE_RECEIPT",
  COMPOUND = "COMPOUND",
  REWARD = "REWARD",
}

export interface ISnTransactionFormatted {
  height: string
  index: string
  signer: string
  userWalletAddress: string
  hash: string
  memo: string
  amount: string | null
  action: SnAction
  compound: boolean | null
  reward: boolean
  timestamp: string
}

export type SnTransaction = ISnTransactionFormatted & {
  unstakeStatus: "requested" | "filled"
  unstakeReceiptAt?: string
}

export const fetcher = async (url: string, request: RequestInit) => {
  const response = await window.fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...request,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`)
  } else {
    const data = await response.json()
    if (data.error) {
      throw new Error(
        data?.error?.message ?? `Failed to fetch data: ${JSON.stringify(data)}`
      )
    }
    return data
  }
}
