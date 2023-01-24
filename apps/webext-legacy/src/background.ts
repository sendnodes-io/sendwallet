/// <reference lib="webworker" />

(async () => {
	const browser = await import("webextension-polyfill");
	self.PROCESS_ID = `background-${Math.random()}.${new Date().getTime()}`;

	const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

	serviceWorker.addEventListener("install", (event: ExtendableEvent) => {
		event.waitUntil(serviceWorker.skipWaiting());
	});

	// this supports both manifest v2 and v3
	const { startApi } = await import("@sendnodes/pokt-wallet-background");
	await startApi();
})();
