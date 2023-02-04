import { browser } from "@sendnodes/pokt-wallet-background";

/**
 * Open tab UI using the poktwallet target.
 * Only callable via a user event handler such as click.
 * Closes current window if new target is used
 */
export default async function (path?: string) {
  const url = browser.runtime.getURL(`/tab.html${path ? `#${path}` : ""}`);

  if (window.location.href.includes("tab.html")) {
    window.location.href = url;
  } else {
    window.open(url, "poktwallet")?.focus();
    window.close();
  }
}
