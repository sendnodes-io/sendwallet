import "@sendnodes/pokt-wallet-ui/public/variables.css";
import "@sendnodes/pokt-wallet-ui/public/index.css";
import "@sendnodes/pokt-wallet-ui/public/popup.css";

// inject extension reload if dev
if (process.env.NODE_ENV === "development") {
  const liveReloadScript = document.createElement("script");
  liveReloadScript.src = "./dev-utils/extension-reload.js";
  document.body.appendChild(liveReloadScript);
}
(
  globalThis as unknown as Window & { PROCESS_ID: string }
).PROCESS_ID = `ui-${Math.random()}.${new Date().getTime()}`;

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
