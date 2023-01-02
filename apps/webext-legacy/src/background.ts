(async () => {
	const browser = await import("webextension-polyfill");
	self.PROCESS_ID = `background-${Math.random()}.${new Date().getTime()}`;

	const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

	serviceWorker.addEventListener("install", (event: ExtendableEvent) => {
		event.waitUntil(serviceWorker.skipWaiting());
	});

	browser.runtime.onMessage.addListener((message, sender) => {
		if (message.type === "HEARTBEAT") {
			return Promise.resolve({ processId: self.PROCESS_ID });
		}
	});

	// this supports both manifest v2 and v3
	const { startApi } = await import("@sendnodes/pokt-wallet-background");
	await startApi();
})();
