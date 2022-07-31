import useSWR from "swr"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { lowerCase } from "lodash"
import { fetcher, SENDNODES_ONCHAIN_API_URL } from "./constants"

export interface IUserStakingDataFormatted {
  staked: string
  unstaked: string
  pendingStaked: string
  pendingUnstaked: string
  compound: boolean
  userWalletAddress: string
  transactions: string
}

export function useStakingUserData(addressOnNetwork: AddressOnNetwork) {
  var raw = JSON.stringify({
    method: "pokt_getStakingUserData",
    id: 1,
    jsonrpc: "2.0",
    params: {
      cutoffHeight: "65930",
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

  const { data, error } = useSWR<IUserStakingDataFormatted[], unknown>(
    // TODO: support more than one network name
    [
      `${SENDNODES_ONCHAIN_API_URL}pocket.${addressOnNetwork.network.chainID}`,
      request,
    ],
    fetcher,
    {
      refreshInterval: 30 * 1000,
    }
  )

  return {
    data: data?.find(
      (user: any) =>
        lowerCase(user.userWalletAddress) ===
        lowerCase(addressOnNetwork.address)
    ),
    isLoading: !error && !data,
    isError: error,
  }
}
