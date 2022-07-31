import useSWR from "swr"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { fetcher, SENDNODES_ONCHAIN_API_URL } from "./constants"

export interface IStakingPoktParams {
  /** BigNumber representing the minimum stake amount in uPOKT */
  minStakingAmount: string
  wallets: {
    /** POKT Address to send stake amounts to */
    siw: string
  }
}

export function useStakingPoktParams(addressOnNetwork: AddressOnNetwork) {
  var raw = JSON.stringify({
    method: "pokt_getParams",
    id: 1,
    jsonrpc: "2.0",
    params: {},
  })

  var request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: raw,
    redirect: "follow",
  }

  const { data, error } = useSWR<IStakingPoktParams, unknown>(
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
    data,
    isLoading: !error && !data,
    isError: error,
  }
}
