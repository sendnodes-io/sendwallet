import React, { ReactElement, useState } from "react";
import AccountsNotificationPanelAccounts from "./AccountsNotificationPanelAccounts";

type Props = {
	onCurrentAddressChange: (address: string) => void;
	showEasterEgg?: boolean;
};

export default function AccountsNotificationPanel({
	showEasterEgg = true,
	onCurrentAddressChange,
}: Props): ReactElement {
	return (
		<AccountsNotificationPanelAccounts
			showEasterEgg={showEasterEgg}
			onCurrentAddressChange={onCurrentAddressChange}
		/>
	);
}
