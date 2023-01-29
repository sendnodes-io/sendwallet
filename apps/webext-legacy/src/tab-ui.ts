import "@sendnodes/pokt-wallet-ui/public/variables.css";
import "@sendnodes/pokt-wallet-ui/public/index.css";
import "@sendnodes/pokt-wallet-ui/public/tab.css";

self.PROCESS_ID = `tab-ui-${Math.random()}.${new Date().getTime()}`;

/**
 * Load main UI script after browser renders everything
 */
(async () => {
	// attach UI to root element
	const { attachUiToRootElement, Tab } = await import(
		"@sendnodes/pokt-wallet-ui"
	);
	await attachUiToRootElement(Tab);
})();
