import useSWR from "swr"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { isEmpty, isEqual, lowerCase } from "lodash"
import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import {
  fetcher,
  SENDNODES_ONCHAIN_API_URL,
  SnAction,
  SnTransaction,
} from "./constants"
import { useBackgroundSelector } from "../redux-hooks"

const enrichWithUnstakeInfo = (
  tx: SnTransaction,
  allTransactions: SnTransaction[]
) => {
  if (tx.action === SnAction.UNSTAKE && isEmpty(tx.unstakeStatus)) {
    tx.unstakeStatus = "requested"
    return true
  }

  const isUnstakeReceipt = tx.action === SnAction.UNSTAKE_RECEIPT
  const unstakeReceiptHash = isUnstakeReceipt && tx.memo?.split(":")[1]
  const unstakeRequest = allTransactions.find(
    (tx) => tx.hash === unstakeReceiptHash
  )
  if (unstakeRequest) {
    unstakeRequest.unstakeStatus = "filled"
    unstakeRequest.unstakeReceiptAt = tx.timestamp
  }
}

export function useStakingRequestsTransactionsForAddress(
  addressOnNetwork: AddressOnNetwork
) {
  const raw = JSON.stringify({
    method: "pokt_getStakingRequestsTransactions",
    id: 1,
    jsonrpc: "2.0",
    params: {
      userWalletAddress: addressOnNetwork.address,
    },
  })
  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: raw,
    redirect: "follow",
  }

  const { data, error } = useSWR<SnTransaction[], unknown>(
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

  const allTransactions = (data ?? []).filter(
    (user: any) =>
      lowerCase(user.userWalletAddress) === lowerCase(addressOnNetwork.address)
  )

  // enrich all staking request txs with the status of the unstake receipt tx
  allTransactions.forEach((tx) => enrichWithUnstakeInfo(tx, allTransactions))

  return {
    data: allTransactions,
    isLoading: !error && !data,
    isError: error,
  }
}

export default function useStakingRequestsTransactions() {
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)

  const { data, isLoading, isError } =
    useStakingRequestsTransactionsForAddress(currentAccount)

  return {
    data,
    isLoading,
    isError,
  }
}
