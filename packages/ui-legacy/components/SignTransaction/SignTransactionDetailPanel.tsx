import React, { ReactElement, useState } from "react";
import {
	NetworkFeeSettings,
	selectEstimatedFeesPerGas,
	selectTransactionData,
	updateTransactionOptions,
} from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction";
import { EnrichedPOKTTransactionRequest } from "@sendnodes/pokt-wallet-background/services/enrichment";
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks";
import FeeSettingsText from "../NetworkFees/FeeSettingsText";
import NetworkSettingsChooser from "../NetworkFees/NetworkSettingsChooser";
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu";

export default function SignTransactionDetailPanel(): ReactElement {
	const dispatch = useBackgroundDispatch();
	const [networkSettingsModalOpen, setNetworkSettingsModalOpen] =
		useState(false);

	const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas);

	// TODO: v0.2.0 handle more than one kind of TX
	const transactionDetails = useBackgroundSelector(
		selectTransactionData,
	) as EnrichedPOKTTransactionRequest;

	if (transactionDetails === undefined) return <></>;

	const networkSettingsSaved = async (networkSetting: NetworkFeeSettings) => {
		dispatch(
			updateTransactionOptions({
				...transactionDetails,
				gasLimit:
					// "gasLimit" in transactionDetails
					//   ? transactionDetails.gasLimit
					//   :
					networkSetting.gasLimit,
			}),
		);

		setNetworkSettingsModalOpen(false);
	};

	return (
		<div className="detail_items_wrap width_full">
			<SharedSlideUpMenu
				size="custom"
				isOpen={networkSettingsModalOpen}
				close={() => setNetworkSettingsModalOpen(false)}
				customSize={`${3 * 56 + 320}px`}
			>
				<NetworkSettingsChooser
					estimatedFeesPerGas={estimatedFeesPerGas}
					onNetworkSettingsSave={networkSettingsSaved}
				/>
			</SharedSlideUpMenu>
			<div className="detail_item">
				Network fee
				<div className="detail_item_value">
					<FeeSettingsText />
				</div>
			</div>
			{transactionDetails.memo ? (
				<div className="detail_item flex_col">
					Memo{" "}
					<div className="detail_item_row">
						<pre title={transactionDetails.memo}>{transactionDetails.memo}</pre>
					</div>
				</div>
			) : (
				<></>
			)}
			<style jsx>
				{`
          .flex_col {
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-start;
          }
        `}
			</style>
		</div>
	);
}
