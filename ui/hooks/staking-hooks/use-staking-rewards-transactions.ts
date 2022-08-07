import useSWR from "swr"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { lowerCase } from "lodash"
import { SENDNODES_ONCHAIN_API_URL } from "./constants"

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

export function useStakingRewardsTransactions(
  addressOnNetwork: AddressOnNetwork
) {
  var raw = JSON.stringify({
    method: "pokt_getStakingRewardsTransactions",
    id: 1,
    jsonrpc: "2.0",
    params: {
      userWalletAddress: addressOnNetwork.address,
    },
  })
  var request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: raw,
    redirect: "follow",
  }

  const { data, error } = useSWR<ISnTransactionFormatted[], unknown>(
    // TODO: support more than one network name
    [
      `${SENDNODES_ONCHAIN_API_URL}pocket.${addressOnNetwork.network.chainID}`,
      request,
    ],
    async (url: string, request: RequestInit) => {
      const response = await window.fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...request,
      })

      if (!response.ok) {
        throw new Error(
          "Failed to fetch transaction data: " + response.statusText
        )
      } else {
        return response.json()
      }
    },
    {
      refreshInterval: 30 * 1000,
    }
  )

  return {
    data: data?.filter(
      (user: any) =>
        lowerCase(user.userWalletAddress) ===
        lowerCase(addressOnNetwork.address)
    ),
    isLoading: !error && !data,
    isError: error,
  }
}
