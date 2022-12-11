import browser from "webextension-polyfill"

/**
 * Track analytics using Google Analytics Measurement Platform
 * @see https://developers.google.com/analytics/devguides/collection/protocol/v1/devguide#overview
 */

const ANALYTICS_PATH =
  process.env.NODE_ENV === "development"
    ? "https://www.google-analytics.com/debug/collect"
    : "https://www.google-analytics.com/collect"

export async function clientId() {
  const { analytics } = await browser.storage.local.get("analytics")
  if (analytics && analytics.client_id) return analytics.client_id
  const client_id = `${Math.random()}.${new Date().getTime()}`
  await browser.storage.local.set({ analytics: { client_id } })
  return client_id
}

export async function baseGaParams(args: AnalyticsBaseParams) {
  const gaParams = new URLSearchParams()
  gaParams.append("v", "1")
  gaParams.append("tid", "UA-228488894-1")
  gaParams.append("cid", await clientId())
  gaParams.append("ds", "ext")
  gaParams.append("ua", navigator.userAgent)
  gaParams.append("ul", navigator.language)
  gaParams.append("an", "SendWallet")
  gaParams.append("av", browser.runtime.getManifest()?.version ?? `<unknown>`)
  if (args.session_control) {
    gaParams.append("sc", args.session_control)
  }
  return gaParams
}
export type AnalyticsBaseParams = AnalyticsSessionProps

export enum AnalyticsType {
  EVENT = "event",
  PAGEVIEW = "pageview",
  SCREENVIEW = "screenview",
  TRANSACTION = "transaction",
  ITEM = "item",
  SOCIAL = "social",
  EXCEPTION = "exception",
  TIMING = "timing",
}

export enum AnalyticsEventCategory {
  DEFAULT = "default",
}

export type AnalyticsTrackEvent = AnalyticsBaseParams & {
  category?: AnalyticsEventCategory
  action: string
  label?: string
  value?: string
}

export type AnalyticsTrackPageView = AnalyticsBaseParams & {
  doc_host: string
  doc_page: string
  doc_title: string
}

export type AnalyticsSessionProps = {
  session_control?: "start" | "end"
}

export async function trackEvent(args: AnalyticsTrackEvent) {
  const {
    category = AnalyticsEventCategory.DEFAULT,
    action,
    label,
    value,
  } = args
  const gaParams = await baseGaParams(args)
  gaParams.append("t", AnalyticsType.EVENT)
  gaParams.append("ec", category)
  gaParams.append("ea", action)
  if (label) {
    gaParams.append("el", label)
    gaParams.append("ev", value ?? "")
  }

  await postAnalytics(gaParams)
}

export async function trackPageView(args: AnalyticsTrackPageView) {
  const { doc_host, doc_page, doc_title } = args

  const gaParams = await baseGaParams(args)
  gaParams.append("t", AnalyticsType.PAGEVIEW)

  gaParams.append("dh", doc_host)
  gaParams.append("dp", doc_page)
  gaParams.append("dt", doc_title)

  await postAnalytics(gaParams)
}

async function postAnalytics(gaParams: URLSearchParams) {
  try {
    gaParams.set(
      "z",
      Math.random().toString() + new Date().getTime().toString()
    )
    const response = await fetch(ANALYTICS_PATH, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: gaParams,
    })

    if (process.env.NODE_ENV === "development") {
      console.debug("Sent analytics", {
        gaParams: Object.fromEntries(gaParams as unknown as Iterable<any>),
        response,
      })
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Failed sending analytics event", e)
    }
  }
}
