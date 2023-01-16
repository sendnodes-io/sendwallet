import logger from "@sendnodes/pokt-wallet-background/lib/logger";
import type { RemoteConfig } from "@sendnodes/pokt-wallet-background/services/chain";
import { useState, useEffect } from "react";

export default function useRemoteConfig(): RemoteConfig | null {
	const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);
	useEffect(() => {
		const check = async () => {
			const controller = new AbortController();
			const { signal } = controller;
			const response = await fetch(
				`${process.env.SENDWALLET_IO}api/remote-config`,
				{ signal },
			);
			if (response.status === 200) {
				const body: RemoteConfig = await response.json();
				if (body) {
					setRemoteConfig(body);
				}
			}
			return () => {
				controller.abort();
			};
		};

		check().catch((e) => logger.error("failed to load remote config", e));
	}, []);

	return remoteConfig;
}
