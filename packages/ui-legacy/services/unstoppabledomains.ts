import { Resolution } from "@unstoppabledomains/resolution";

const resolution = new Resolution({
	sourceConfig: {
		uns: {
			locations: {
				Layer1: {
					url: process.env.ETH_MAINNET_RPC_URL,
					network: "mainnet",
				},
				Layer2: {
					url: process.env.POLYGON_MAINNET_RPC_URL,
					network: "polygon-mainnet",
				},
			},
		},
	},
});

export { resolution };
