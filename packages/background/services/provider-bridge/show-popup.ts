import browser from "webextension-polyfill";
import { AllowedQueryParamPageType } from "@sendnodes/provider-bridge-shared";

export default async function showExtensionPopup(
  url: AllowedQueryParamPageType,
): Promise<browser.Windows.Window> {
  const currWindow = await browser.windows.getCurrent();
  const { left = 0, top, width = 1920 } = currWindow;
  const popupWidth = 384;
  const popupHeight = 625;
  return browser.windows.create({
    url: `${browser.runtime.getURL("popup.html")}?page=${url}`,
    type: "popup",
    left: left + width - popupWidth,
    top,
    width: popupWidth,
    height: popupHeight,
    focused: true,
  });
}
