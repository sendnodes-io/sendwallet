import useSWR from "swr";
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts";
import { isEqual, lowerCase } from "lodash";
import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import {
  fetcher,
  ISnTransactionFormatted,
  SENDNODES_ONCHAIN_API_URL,
} from "./constants";
import { useBackgroundSelector } from "../redux-hooks";

export function useStakingRewardsTransactionsForAddress(
  addressOnNetwork: AddressOnNetwork
) {
  const raw = JSON.stringify({
    method: "pokt_getStakingRewardsTransactions",
    id: 1,
    jsonrpc: "2.0",
    params: {
      userWalletAddress: addressOnNetwork.address,
    },
  });
  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: raw,
    redirect: "follow",
  };

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
  );

  return {
    data:
      (data?.filter(
        (user: ISnTransactionFormatted) =>
          lowerCase(user.userWalletAddress) ===
          lowerCase(addressOnNetwork.address)
      ) as ISnTransactionFormatted[]) ?? [],
    isLoading: !(error || data),
    isError: error,
  };
}

export default function useStakingRewardsTransactions() {
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual);

  const { data, isLoading, isError } =
    useStakingRewardsTransactionsForAddress(currentAccount);

  return {
    data,
    isLoading,
    isError,
  };
}
