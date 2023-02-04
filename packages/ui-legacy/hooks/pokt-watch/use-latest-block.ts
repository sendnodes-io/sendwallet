import { POKTWatchBlock } from "@sendnodes/pokt-wallet-background/services/chain/utils";
import useSWR from "swr";

const fetcher = () =>
  fetch("https://api.pokt.watch/block?order=id.desc&limit=1", {
    headers: {
      accept: "application/json",
    },
  }).then((res) => res.json());

export const usePoktWatchLatestBlock = () => {
  const { data, error } = useSWR(
    ["https://api.pokt.watch/block?order=id.desc&limit=1"],
    fetcher,
    {
      refreshInterval: 60 * 1000,
    }
  );

  return {
    latestBlock: ((data ?? [])[0] as POKTWatchBlock) || undefined,
    isLoading: !(error || data),
    isError: error,
  };
};
