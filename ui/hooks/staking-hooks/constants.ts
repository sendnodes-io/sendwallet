export const SENDNODES_ONCHAIN_API_URL =
  process.env.SENDNODES_ONCHAIN_API_URL ?? "http://onchainapi.sendnodes.io/"
export enum SnAction {
  STAKE = "STAKE",
  UNSTAKE = "UNSTAKE",
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
  compound: boolean
  reward: boolean
  timestamp: string
}
