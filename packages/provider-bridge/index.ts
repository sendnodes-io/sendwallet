import browser, { runtime } from "webextension-polyfill";
import {
	EXTERNAL_PORT_NAME,
	PROVIDER_BRIDGE_TARGET,
	WINDOW_PROVIDER_TARGET,
} from "@sendnodes/provider-bridge-shared";

const windowOriginAtLoadTime = window.location.origin;

const INJECTED_WINDOW_PROVIDER_SOURCE = "@@@WINDOW_PROVIDER@@@";

export async function connectProviderBridge(): Promise<void> {
	let port: browser.Runtime.Port | null = null;

	function windowListener(event: MessageEvent<Record<string, unknown>>) {
		if (
			port &&
			event.origin === windowOriginAtLoadTime && // we want to recieve msgs only from the in-page script
			event.source === window && // we want to recieve msgs only from the in-page script
			event.data.target === PROVIDER_BRIDGE_TARGET
		) {
			// TODO: replace with better logging before v1. Now it's invaluable in debugging.
			// eslint-disable-next-line no-console
			console.log(
				`%c content: inpage > background: ${JSON.stringify(event.data)}`,
				"background: #bada55; color: #222",
			);

			port.postMessage(event.data);
		}
	}

	function portListener(data: Record<string, unknown>) {
		// TODO: replace with better logging before v1. Now it's invaluable in debugging.
		// eslint-disable-next-line no-console
		console.log(
			`%c content: background > inpage: ${JSON.stringify(data)}`,
			"background: #222; color: #bada55",
		);
		window.postMessage(
			{
				...data,
				target: WINDOW_PROVIDER_TARGET,
			},
			windowOriginAtLoadTime,
		);
	}

	async function connectPort(): Promise<browser.Runtime.Port> {
		try {
			if (port) {
				window.removeEventListener("message", windowListener);
				port.onMessage.removeListener(portListener);
			}
			console.log(browser.runtime.lastError);
			port = browser.runtime.connect({ name: EXTERNAL_PORT_NAME });
			window.addEventListener("message", windowListener);
			port.onMessage.addListener(portListener);
			port.onDisconnect.addListener(async (data) => {
				port = await connectPort();
			});
			return port;
		} catch (e) {
			port = await connectPort();
		}
		return port;
	}

	port = await connectPort();

	// let's grab the internal config
	port.postMessage({ request: { method: "poktWallet_getConfig" } });

	// Service workers shut down after 5 min,
}

export function injectPoktWalletWindowProvider(): void {
	try {
		const ID = "poktwallet_inpage";
		const container = document.head || document.documentElement;
		const scriptTag = document.createElement("script");
		scriptTag.setAttribute("id", ID);
		scriptTag.setAttribute("async", "false");

		const existing = document.getElementById(ID);
		if (existing) {
			existing.parentElement?.removeChild(existing);
		}
		// this makes the script loading blocking which is good for us
		// bc we want to load before anybody has a chance to temper w/ the window obj
		scriptTag.src = runtime.getURL("window-provider.js");
		scriptTag.async = false;

		if (container.children.length === 0) {
			throw new Error(
				"PoktWallet: no children in the container to insert the script tag",
			);
		}

		container.insertBefore(scriptTag, container.children[0]!);
	} catch (e) {
		throw new Error(
			`PoktWallet: oh nos the content-script failed to initilaize the PoktWallet window provider.
        ${e}
        It's time for a seppuku...🗡`,
		);
	}
}
