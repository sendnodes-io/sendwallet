import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts";
import logger from "@sendnodes/pokt-wallet-background/lib/logger";
import { Network } from "@sendnodes/pokt-wallet-background/networks";
import { UnsLocation } from "@unstoppabledomains/resolution";
import { useEffect, useState } from "react";
import { resolution } from "../services/unstoppabledomains";

export function useResolvedAddr(addrNet: AddressOnNetwork) {
	const [name, setName] = useState<string | null>(null);
	const [error, setError] = useState<unknown>(null);

	useEffect(() => {
		if (!(addrNet?.address && addrNet.network)) {
			return;
		}

		logger.debug("Reverse resolving for address", addrNet);

		resolution
			.reverse(addrNet.address, { location: UnsLocation.Layer2 })
			.then((r) => {
				logger.info("Resolved name", r);
				setName(r);
			})
			.catch((e: Error) => setError(e));
	}, []);

	return {
		name,
		error,
		loading: !(name || error),
	};
}

export function useResolvedName(name: string, network: Network) {
	const [addr, setAddr] = useState<string | null>(null);
	const [error, setError] = useState<unknown>(null);

	useEffect(() => {
		if (!(name || name.length > 0)) {
			return;
		}
		resolution
			.addr(name, network.family)
			.then((r) => setAddr(r))
			.catch((e: Error) => setError(e));
	}, []);

	return {
		addr,
		error,
		loading: !(addr || error),
	};
}
