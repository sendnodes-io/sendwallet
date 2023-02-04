import "@sendnodes/pokt-wallet-ui/public/variables.css";
import "@sendnodes/pokt-wallet-ui/public/index.css";
import "@sendnodes/pokt-wallet-ui/public/popup.css";

self.PROCESS_ID = `ui-${Math.random()}.${new Date().getTime()}`;

/**
 * Load main UI script after browser renders everything
 */
(async () => {
  const { attachUiToRootElement, Popup } = await import(
    "@sendnodes/pokt-wallet-ui"
  );
  // attach UI to root element
  await attachUiToRootElement(Popup);
})();
