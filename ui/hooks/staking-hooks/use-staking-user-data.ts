import useSWR from "swr"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { fetcher, SENDNODES_ONCHAIN_API_URL } from "./constants"

export interface ISnRewardStatsFormatted {
  startTimestamp: string
  endTimestamp: string
  startHeight: string
  endHeight: string
  blocksPerDay: string
  apy: number
  apy1d: number | null
  apy7d: number | null
  apyNoCompounding: number
  apyNoCompounding1d: number | null
  apyNoCompounding7d: number | null
  grossRewardsPerNodePerDay: string
  grossRewardsTotal: string
  netRewardsPerNodePerDay: string
  netRewardsPerPoktStakedPerDay: string
  netRewardsUsersTotal: string
  netRewardsUsersTotalCompound: string
  netRewardsUsersTotalSweep: string
  avgPoktPricePerUSD: string
  totalStaked: string
  totalUnstaked: string
  totalPendingStaked: string
  totalPendingUnstaked: string
  userStakeAvg: string
  userStakeMin: string
  userStakeMax: string
  stakedUsers: number
  parent?: string
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
  rewardsData: ISnRewardStatsFormatted
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
    fetcher,
    {
      refreshInterval: 60 * 1000,
    }
  )

  return {
    data,
    isLoading: !error && !data,
    isError: error,
  }
}
