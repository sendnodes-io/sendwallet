import React, { ReactElement, useState } from "react";
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher";
import SignTransactionDetailPanel from "./SignTransactionDetailPanel";
import SignTransactionRawDataPanel from "./SignTransactionRawDataPanel";

export default function SignTransactionPanelSwitcher(): ReactElement {
	const [panelNumber, setPanelNumber] = useState(0);

	return (
		<div className="wrap">
			<SharedPanelSwitcher
				setPanelNumber={setPanelNumber}
				panelNumber={panelNumber}
				panelNames={["Details", "Raw data"]}
			/>
			<div className="panels">
				{panelNumber === 0 ? <SignTransactionDetailPanel /> : null}
				{panelNumber === 1 ? <SignTransactionRawDataPanel /> : null}
			</div>
			<style jsx>
				{`
          .wrap {
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            background-color: var(--black);
            margin-top: 0.5rem;
          }
          .panels {
            padding: 1rem;
            height: 8rem;
            margin-bottom: 0.5rem;
          }
        `}
			</style>
		</div>
	);
}
