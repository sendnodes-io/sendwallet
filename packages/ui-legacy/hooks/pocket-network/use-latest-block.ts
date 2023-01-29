import { QueryHeightResponse } from "@sendnodes/pocket-js";
import { POCKET } from "@sendnodes/pokt-wallet-background/constants";
import logger from "@sendnodes/pokt-wallet-background/lib/logger";
import { RemoteConfig } from "@sendnodes/pokt-wallet-background/services/chain";
import _ from "lodash";
import useSWR from "swr";

let pocketRpcUrl = POCKET.rcpUrl;

function getPocketRPCUrl() {
	return pocketRpcUrl || POCKET.rcpUrl;
}

(async () => {
	console.debug("Attempting to fetch remote config");
	const response = await fetch(
		`${process.env.SENDWALLET_IO}api/remote-config`,
	).catch((e) => {
		logger.warn("Failed to fetch remote config", e);
		return {} as Response;
	});
	if (response.status === 200) {
		const body = await response.json();

		if (body?.POKT) {
			const remoteConfig = body as RemoteConfig;
			const pocketRPC = new URL(
				_.get(
					remoteConfig,
					`${POCKET.family}.${POCKET.chainID}.rpc`,
					POCKET.rcpUrl,
				) ?? POCKET.rcpUrl!,
			);
			pocketRpcUrl = pocketRPC.toString();
			logger.debug("Configuring with remote config", {
				remoteConfig,
				pocketRpcUrl,
				POCKET,
			});
		}
	}
})();

const fetcher = (url: string): Promise<QueryHeightResponse> =>
	fetch(url, {
		method: "POST",
		headers: {
			accept: "application/json",
		},
	}).then((res) => res.json());

export const usePoktNetworkBlockHeight = () => {
	const { data, error } = useSWR<QueryHeightResponse, unknown>(
		[`${getPocketRPCUrl()}v1/query/height`],
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
