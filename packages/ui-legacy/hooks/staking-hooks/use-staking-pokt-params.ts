import useSWR from "swr";
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts";
import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { fetcher, SENDNODES_ONCHAIN_API_URL } from "./constants";
import { useBackgroundSelector } from "../redux-hooks";

export interface IStakingPoktParams {
  /** Can we stake at all? */
  stakingEnabled: boolean;
  /** BigNumber representing the minimum stake amount in uPOKT */
  stakingMinAmount: string;
  /** BigNumber representing the minimum number of blocks before a staking request TX is considered for rewards */
  stakingMinAge: string;
  /** BigNumber representing the minimum stake amount in uPOKT */
  lastRewardHeight: string;
  /** BigNumber representing the current height of the POKT network */
  currentHeight: string;
  /** BigNumber representing the amount of uPOKT left on a staked POKT node */
  nodeRewardsReserveAmount: string;
  wallets: {
    /** POKT Address to send stake amounts to */
    siw: string;
    /** POKT Address to rewards are sent to */
    riw: string;
  };
}

export function useStakingPoktParamsForAddress(
  addressOnNetwork: AddressOnNetwork,
) {
  const raw = JSON.stringify({
    method: "pokt_getParams",
    id: 1,
    jsonrpc: "2.0",
    params: {},
  });

  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: raw,
    redirect: "follow",
  };

  const { data, error } = useSWR<IStakingPoktParams, unknown>(
    // TODO: support more than one network name
    [
      `${SENDNODES_ONCHAIN_API_URL}pocket.${addressOnNetwork.network.chainID}`,
      request,
    ],
    fetcher,
    {
      refreshInterval: 60 * 1000,
    },
  );

  return {
    data,
    isLoading: !(error || data),
    isError: error,
  };
}

export default function useStakingPoktParams() {
  const { data, isLoading, isError } = useStakingPoktParamsForAddress(
    useBackgroundSelector(selectCurrentAccount),
  );

  return {
    data,
    isLoading,
    isError,
  };
}
