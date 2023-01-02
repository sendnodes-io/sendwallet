import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";

import React, { ReactElement } from "react";
import { useBackgroundSelector } from "../hooks";

import SendEVM from "../components/Send/SendEVM";
import SendPOKT from "../components/Send/SendPOKT";
import SharedSplashScreen from "../components/Shared/SharedSplashScreen";

// TODO: v0.2.0 handle multiple assets
export default function Send(): ReactElement {
	const currentAccount = useBackgroundSelector(selectCurrentAccount);

	if (currentAccount?.network?.family === "EVM") {
		return <SendEVM />;
	}
	if (currentAccount?.network?.family === "POKT") {
		return <SendPOKT />;
	}

	return <SharedSplashScreen />;
}
