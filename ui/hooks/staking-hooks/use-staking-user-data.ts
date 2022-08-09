import useSWR from "swr"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { lowerCase } from "lodash"
import { SENDNODES_ONCHAIN_API_URL } from "./constants"

export interface IRewardsData {
  startHeight: string
  endHeight: string
  apy: number
  apyNoCompounding: number
  netRewardsPerNodePerDay: string
  netRewardsPerPoktStakedPerDay: string
  netRewardsUsersTotal: string
  avgPoktPricePerUSD: string
}

export interface IUserStakingDataFormatted {
  staked: string
  unstaked: string
  pendingStaked: string
  pendingUnstaked: string
  rewards: string
  pendingRewards: string
  rewardsAPY: string
  compound: boolean
  stakedWeight: string
  userWalletAddress: string
}

export interface IGetStakingUserData {
  rewardsData: IRewardsData
  userStakingData: IUserStakingDataFormatted[]
}

export function useStakingUserData(addressOnNetwork: AddressOnNetwork) {
  var raw = JSON.stringify({
    method: "pokt_getStakingUserData",
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

  const { data, error } = useSWR<IGetStakingUserData, unknown>(
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
          "Failed to fetch user staking data: " + response.statusText
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
    data,
    isLoading: !error && !data,
    isError: error,
  }
}