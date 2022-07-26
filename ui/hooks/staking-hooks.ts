import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import useSWR from "swr"
import { lowerCase } from "lodash"

export interface IUserStakingDataFormatted {
  staked: string
  unstaked: string
  pendingStaked: string
  pendingUnstaked: string
  compound: boolean
  userWalletAddress: string
  transactions: string
}

const parsedMinPoktAmount = parseFloat(
  process.env.SENDNODES_POKT_MIN_STAKING_AMOUNT ?? ""
)
if (
  !parsedMinPoktAmount ||
  isNaN(parsedMinPoktAmount) ||
  parsedMinPoktAmount < 1
) {
  throw new Error(
    "Missing or invalid SENDNODES_POKT_MIN_STAKING_AMOUNT environment variable"
  )
}

export const SENDNODES_POKT_SIW = process.env.SENDNODES_POKT_SIW!
export const SENDNODES_POKT_MIN_STAKING_AMOUNT = parsedMinPoktAmount
export const SENDNODES_ONCHAIN_API_URL =
  process.env.SENDNODES_ONCHAIN_API ?? "http://onchainapi.sendnodes.io/"

const fetcher = (url: string, request: RequestInit) =>
  window
    .fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...request,
    })
    .then((r) => r.json())

export function useStakingTransactions(address: string) {
  const myHeaders = new Headers()
  myHeaders.append("Content-Type", "application/json")

  const raw = JSON.stringify({
    method: "pokt_getStakingTransactions",
    id: 1,
    jsonrpc: "2.0",
    params: {},
  })

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  } as RequestInit

  const { data, error } = useSWR(
    [`${SENDNODES_ONCHAIN_API_URL}pocket.mainnet`, requestOptions],
    fetcher
  )

  return {
    transactions: data,
    isLoading: !error && !data,
    isError: error,
  }
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

  const { data, error } = useSWR(
    // TODO: support more than one network name
    [
      `${SENDNODES_ONCHAIN_API_URL}pocket.${addressOnNetwork.network.chainID}`,
      request,
    ],
    fetcher
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
