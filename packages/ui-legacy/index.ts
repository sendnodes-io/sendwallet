import CoreStartStore from "./components/Core/CoreStartStore";
import React, { FC } from "react";
import type { Store } from "@0xbigboss/webext-redux";
import logger from "@sendnodes/pokt-wallet-background/lib/logger";
import Popup from "./pages/Popup";
import Tab from "./pages/Tab";
import Stake from "./pages/Stake";

import "./public/variables.css";
import "./public/index.css";
import { createRoot } from "react-dom/client";

export { Popup, Tab, Stake };

logger.info(
	`Starting SendWallet UI in env:${process.env.NODE_ENV} branch:${process.env.GIT_BRANCH} commit:${process.env.GIT_COMMIT}`,
);

async function renderApp(component: FC<{ store: Store }>, attempts = 0) {
	const rootElement = document.getElementById("pokt-wallet-root");

	if (!rootElement) {
		throw new Error(
			"Failed to find #pokt-wallet-root element; page structure changed?",
		);
	}

	createRoot(rootElement).render(
		React.createElement(CoreStartStore, { Component: component }),
	);
}

export async function attachUiToRootElement(
	component: FC<{ store: Store }>,
): Promise<void> {
	await renderApp(component);
}
