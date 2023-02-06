import "@sendnodes/pokt-wallet-ui/public/variables.css";
import "@sendnodes/pokt-wallet-ui/public/index.css";
import "@sendnodes/pokt-wallet-ui/public/stake.css";

self.PROCESS_ID = `stake-ui-${Math.random()}.${new Date().getTime()}`;

/**
 * Load main UI script after browser renders everything
 */
(async () => {
  const { attachUiToRootElement, Stake } = await import(
    "@sendnodes/pokt-wallet-ui"
  );
  // attach UI to root element
  await attachUiToRootElement(Stake);
})();
