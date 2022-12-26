import { QueryHeightResponse } from "@pokt-network/pocket-js";
import { POCKET } from "@sendnodes/pokt-wallet-background/constants";
import useSWR from "swr";

const fetcher = (url: string): Promise<QueryHeightResponse> =>
  fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
    },
  }).then((res) => res.json());

export const usePoktNetworkBlockHeight = () => {
  const { data, error } = useSWR<QueryHeightResponse, unknown>(
    [`${POCKET.rcpUrl}/v1/query/height`],
    fetcher,
    {
      refreshInterval: 15 * 1000,
    },
  );

  return {
    data,
    isLoading: !(error || data),
    isError: error,
  };
};
