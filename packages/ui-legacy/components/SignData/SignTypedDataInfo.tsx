import React, { ReactElement } from "react";
import {
	isProbablyEVMAddress,
	truncateAddress,
} from "@sendnodes/pokt-wallet-background/lib/utils";
import { EnrichedSignTypedDataRequest } from "@sendnodes/pokt-wallet-background/services/enrichment";
import capitalize from "../../utils/capitalize";

type SignTypedDataInfoProps = {
	typedDataRequest: EnrichedSignTypedDataRequest;
};

export default function SignTypedDataInfo({
	typedDataRequest,
}: SignTypedDataInfoProps): ReactElement {
	const { typedData, annotation } = typedDataRequest;

	const fieldsToDisplay =
		annotation.type !== "unrecognized"
			? annotation.displayFields
			: typedData.message;

	const keys = Object.keys(fieldsToDisplay);
	return (
		<div className="messages">
			<div className="message">
				<div className="key">Type</div>
				<div className="value">{typedData.primaryType}</div>
			</div>
			{keys.map((key) => {
				const value = fieldsToDisplay[key];
				if (typeof value === "string" && isProbablyEVMAddress(value)) {
					return (
						<div key={key} className="message">
							<div className="key">{capitalize(key)}</div>
							<div className="value">
								<span>
									{value.endsWith(".eth") ? value : truncateAddress(value)}
								</span>
								<button
									onClick={() => {
										window
											.open(`https://etherscan.io/address/${value}`, "_blank")
											?.focus();
									}}
									type="button"
									aria-label="View Address on Etherscan"
									className="icon_external"
								/>
							</div>
						</div>
					);
				}
				return (
					<div key={key} className="message">
						<div className="key">{capitalize(key)}</div>
						<div className="value">{`${fieldsToDisplay[key]}`}</div>
					</div>
				);
			})}
			<style jsx>
				{`
          .messages {
            display: flex;
            flex-flow: column;
            font-weight: 500;
            width: 100%;
            padding: 16px 0;
          }
          .icon_external {
            mask-image: url("./images/new-tab-s@2.png");
            mask-size: 16px 16px;
            width: 16px;
            margin-left: 4px;
            font-weight: bold;
            height: 16px;
            background-color: var(--aqua);
          }
          .message {
            display: flex;
            justify-content: space-between;
            padding-top: 8px;
            padding-right: 16px;
            padding-left: 16px;
          }
          .value {
            color: #ccd3d3;
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            align-items: center;
            color: var(--spanish-gray);
          }
          .key {
            color: var(--spanish-gray);
          }
        `}
			</style>
		</div>
	);
}
