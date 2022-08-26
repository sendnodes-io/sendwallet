import useSWR from "swr"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { ISnTransactionFormatted, SENDNODES_ONCHAIN_API_URL } from "./constants"
import { isEqual, lowerCase } from "lodash"
import { useBackgroundSelector } from "../redux-hooks"
import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors"

export function useStakingRewardsTransactionsForAddress(
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

export default function useStakingRewardsTransactions() {
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)

  const { data, isLoading, isError } =
    useStakingRewardsTransactionsForAddress(currentAccount)

  return {
    data,
    isLoading,
    isError,
  }
}
