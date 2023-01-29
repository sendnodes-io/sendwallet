import { Store } from "@0xbigboss/webext-redux";
import { browser, newProxyStore } from "@sendnodes/pokt-wallet-background";
import { setActiveTab } from "@sendnodes/pokt-wallet-background/redux-slices/ui";
import React, { CSSProperties, useEffect, useState } from "react";

export default function StoreProvider({ children }) {
	const [store, setStore] = useState<Store | null>(null);

	async function init() {
		const backgroundStore = await newProxyStore();

		// always set the active tab
		const activeTab = await browser.tabs
			.query({
				active: true,
				lastFocusedWindow: true,
			})
			.then((tabs) => (tabs[0] ? tabs[0] : null));
		backgroundStore.dispatch(setActiveTab(activeTab));

		setStore(backgroundStore);
	}

	useEffect(() => {
		init();
	}, []);

	if (!store) {
		return (
			<div
				className="flex flex-col items-center justify-center h-full dashed_border"
				style={{ "--main-margin": 0 } as CSSProperties}
			>
				loading...
			</div>
		);
	} else {
		return <>{children}</>;
	}
}
