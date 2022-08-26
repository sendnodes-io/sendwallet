export const SENDNODES_ONCHAIN_API_URL =
  process.env.SENDNODES_ONCHAIN_API_URL ?? "http://onchainapi.sendnodes.io/"
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
