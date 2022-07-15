import { HIDE_EARN_PAGE } from "@sendnodes/pokt-wallet-background/features/features"

const tabs: string[] = ["overview", "wallet", "menu"].filter((tab) => {
  if (tab === "earn" && HIDE_EARN_PAGE) {
    return false
  }
  return true
})

export default tabs
