self.PROCESS_ID = `background-${Math.random()}.${new Date().getTime()}`;
import { startApi } from "@sendnodes/pokt-wallet-background";
startApi();

// (async () => {
// 	const browser = await import("webextension-polyfill");

// 	const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

// 	serviceWorker.addEventListener("install", (event: ExtendableEvent) => {
// 		event.waitUntil(serviceWorker.skipWaiting());
// 	});

// 	console.log("background.ts", browser);

// 	// this supports both manifest v2 and v3
// 	const { startApi } = await import("@sendnodes/pokt-wallet-background");
// 	await startApi();
// })();
