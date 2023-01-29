/// <reference lib="webworker" />

import browser from "webextension-polyfill";

self.PROCESS_ID = `background-${Math.random()}.${new Date().getTime()}`;

(async () => {
	const { startApi } = await import("@sendnodes/pokt-wallet-background");
	const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

	console.log("Hello from the background!", {
		manifest: browser.runtime.getManifest(),
	});

	if (browser.runtime.getManifest().manifest_version === 3)
		serviceWorker.addEventListener("install", (event: ExtendableEvent) => {
			event.waitUntil(
				serviceWorker
					.skipWaiting()
					.then(() => console.log("Service worker installed"))
					.then(() => startApi()),
			);
		});
	else {
		browser.runtime.onInstalled.addListener(async (details) => {
			console.log("Extension installed:", details);
			const { startApi } = await import("@sendnodes/pokt-wallet-background");

			// Initialize the background script
			await startApi();
		});
	}
})();
