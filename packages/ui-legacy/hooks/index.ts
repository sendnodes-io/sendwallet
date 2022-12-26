import { isAllowedQueryParamPage } from "@sendnodes/provider-bridge-shared";
import * as browser from "webextension-polyfill";

import { useState, useEffect, useRef } from "react";
import { selectPopoutWindowId } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { setPopoutWindowId } from "@sendnodes/pokt-wallet-background/redux-slices/ui";
import { useBackgroundDispatch, useBackgroundSelector } from "./redux-hooks";

export * from "./redux-hooks";
export * from "./signing-hooks";
export * from "./dom-hooks";
export * from "./validation-hooks";

export function useIsDappPopup(): boolean {
  const [isDappPopup, setIsDappPopup] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const maybePage = params.get("page");

    if (isAllowedQueryParamPage(maybePage)) {
      setIsDappPopup(true);
    } else {
      setIsDappPopup(false);
    }
  }, []);

  return isDappPopup;
}

export function useRunOnFirstRender(func: () => void): void {
  const isFirst = useRef(true);

  if (isFirst.current) {
    isFirst.current = false;
    func();
  }
}

/**
 * Sniffs window location and if not running in tab.html
 * open in a new focused browser window.
 */
export function useIsInTab(path?: string): boolean {
  const popoutWindowId = useBackgroundSelector(selectPopoutWindowId);
  const isPopout = window.location.pathname.includes("/tab.html");
  useEffect(() => {
    const _openPopout = async () => {
      // not in a popout
      if (!isPopout) {
        await openInBrowserTab(path);
        window.close();
      }
      // that's it, now render a placeholder advising user to continue in popout
    };

    _openPopout().catch((e) => console.error(e));
  }, [popoutWindowId]);
  return isPopout;
}

async function openInBrowserTab(path?: string) {
  const popoutURL = browser.runtime.getURL("tab.html");

  const win = window.open(
    `${popoutURL}${path ? `#${path}` : ""}`,
    "poktwallet_tab",
  );
  win?.focus();
  return win;
}

/**
 * Opens the path in a new browser window sized as a popup, positioned over
 * the current window.
 */
async function openInBrowserWindow(path?: string) {
  const popoutURL = browser.runtime.getURL("popout.html");
  const height = 625;
  const width = 384;
  const { outerHeight, outerWidth, screenY, screenX } = window.top ?? {
    outerHeight: screen.height,
    outerWidth: screen.width,
    screenY: screen.height,
    screenX: screen.width,
  };
  const top = parseInt((outerHeight / 2 + screenY - height / 2).toString());
  const left = parseInt((outerWidth / 2 + screenX - width / 2).toString());
  return browser.windows.create({
    url: `${popoutURL}${path ? `#${path}` : ""}`,
    type: "popup",
    height,
    width,
    focused: true,
    left,
    top,
  });
}
