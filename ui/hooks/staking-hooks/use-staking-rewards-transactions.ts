import useSWR from "swr"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import {
  fetcher,
  ISnTransactionFormatted,
  SENDNODES_ONCHAIN_API_URL,
} from "./constants"
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
    fetcher,
    {
      refreshInterval: 60 * 1000,
    }
  )

  return {
    data:
      (data?.filter(
        (user: any) =>
          lowerCase(user.userWalletAddress) ===
          lowerCase(addressOnNetwork.address)
      ) as ISnTransactionFormatted[]) ?? [],
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
