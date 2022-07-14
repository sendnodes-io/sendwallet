import React, { ReactElement, useState } from "react"
import AccountsNotificationPanelAccounts from "./AccountsNotificationPanelAccounts"

type Props = {
  onCurrentAddressChange: (address: string) => void
}

export default function AccountsNotificationPanel({
  onCurrentAddressChange,
}: Props): ReactElement {
  return (
    <AccountsNotificationPanelAccounts
      onCurrentAddressChange={onCurrentAddressChange}
    />
  )
}
