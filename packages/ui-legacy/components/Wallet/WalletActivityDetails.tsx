import React, { useCallback, ReactElement } from "react";
import { ActivityItem } from "@sendnodes/pokt-wallet-background/redux-slices/activities";
import { getRecipient } from "@sendnodes/pokt-wallet-background/redux-slices/utils/activity-utils";
import SharedButton from "../Shared/SharedButton";
import SharedAddress from "../Shared/SharedAddress";

interface DetailRowItemProps {
	label: string;
	value: unknown;
	valueDetail: string;
}

function DetailRowItem(props: DetailRowItemProps): ReactElement {
	const { label, value, valueDetail } = props;

	return (
		<li>
			{label}
			<div className="right">
				{value}
				<div className="value_detail">{valueDetail}</div>
			</div>
			<style jsx>
				{`
          li {
            width: 100%;
            border-bottom: 1px solid var(--eerie-black-100);
            display: flex;
            justify-content: space-between;
            padding: 7px 0px;
            height: 24px;
            align-items: center;
          }
          .right {
            float: right;
            display: flex;
            align-items: flex-end;
          }
          .value_detail {
            color: var(--spanish-gray);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-left: 8px;
          }
        `}
			</style>
		</li>
	);
}

interface DestinationCardProps {
	label: string;
	address: string;
	name?: string | undefined;
}

function DestinationCard(props: DestinationCardProps): ReactElement {
	const { label, address, name } = props;

	return (
		<div className="card_wrap">
			<div className="sub_info from">{label}:</div>
			<SharedAddress address={address} name={name} alwaysShowAddress />
			<div className="sub_info name" />
			<style jsx>
				{`
          .card_wrap {
            width: 160px;
            height: 96px;
            border-radius: 4px;
            background-color: var(--eerie-black-100);
            box-sizing: border-box;
            padding: 15px;
            flex-grow: 1;
            flex-shrink: 0;
          }
          .sub_info {
            width: 69px;
            height: 17px;
            color: var(--spanish-gray);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .from {
            margin-bottom: 3px;
          }
          .name {
            margin-top: 10px;
          }
        `}
			</style>
		</div>
	);
}

interface WalletActivityDetailsProps {
	activityItem: ActivityItem;
}
// Include this "or" type to handle existing placeholder data
// on the single asset page. TODO: Remove once single asset page
// has real data

export default function WalletActivityDetails(
	props: WalletActivityDetailsProps,
): ReactElement {
	const { activityItem } = props;

	// TODO: v0.2.0 decide if we still need this component
	const openExplorer = useCallback(() => {
		const baseUrl =
			activityItem.network.family === "POKT"
				? "https://explorer.pokt.network/tx/"
				: "https://etherscan.io/tx/";
		window.open(`${baseUrl}${activityItem.hash}`, "_blank")?.focus();
	}, [activityItem?.hash]);

	if (!activityItem) return <></>;

	let from = "";
	if ("from" in activityItem) from = activityItem.from;
	if ("txResult" in activityItem)
		from = activityItem.txResult?.signer as string;

	const recipient = getRecipient(activityItem);
	const { address: recipientAddress, name: recipientName } = recipient ?? {};

	return (
		<div className="wrap standard_width center_horizontal">
			<div className="header">
				<div className="header_button">
					<SharedButton
						type="tertiary"
						size="medium"
						icon="external"
						iconSize="large"
						onClick={openExplorer}
					>
						{activityItem.network.family === "POKT"
							? "POKT Explorer"
							: "Etherscan"}
					</SharedButton>
				</div>
			</div>
			<div className="destination_cards">
				<DestinationCard label="From" address={from} />
				<div className="icon_transfer" />
				<DestinationCard
					label="To"
					address={recipientAddress || "(Contract creation)"}
					name={recipientName}
				/>
			</div>
			<ul>
				{Object.entries(activityItem.infoRows).map(
					([key, { label, value }]) => {
						return (
							<DetailRowItem
								key={key}
								label={label}
								value={value}
								valueDetail=""
							/>
						);
					},
				)}
				<DetailRowItem
					label="Timestamp"
					value={
						typeof activityItem.timestamp !== "undefined"
							? new Date(activityItem.timestamp * 1000).toLocaleString()
							: "(Unknown)"
					}
					valueDetail=""
				/>
			</ul>
			<div className="activity_log_wrap">
				<div className="activity_log_title">Activity Log</div>
				<ul>
					<li className="activity_log_item">
						<div className="activity_log_icon plus" />
						Tx created at 03:00 on 14/4/2021
					</li>
					<li className="activity_log_item">
						<div className="activity_log_icon arrow" />
						Tx submitted 03:01 on 14/4/2021
					</li>
					<li className="activity_log_item">
						<div className="activity_log_icon check" />
						Tx confirmed at 03:03 on 14/4/2021
					</li>
				</ul>
			</div>
			<style jsx>
				{`
          .wrap {
            margin-top: -24px;
            height: 100%;
          }
          .destination_cards {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
          }
          .header {
            display: flex;
            align-items: top;
            justify-content: space-between;
            width: 304px;
            margin-bottom: 10px;
          }
          .header_button {
            margin-top: 10px;
          }
          .icon_transfer {
            background: url("./images/transfer@2x.png") center no-repeat;
            background-size: 11px 12px;
            width: 35px;
            height: 35px;
            border: 3px solid var(--cod-gray-200);
            background-color: var(--eerie-black-100);
            border-radius: 70%;
            margin: 0 auto;
            margin-left: -5px;
            margin-right: -5px;
            position: relative;
            flex-grow: 1;
            flex-shrink: 0;
          }
          .activity_log_title {
            height: 24px;
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            margin-top: 27px;
            margin-bottom: 6px;
          }
          .activity_log_item {
            width: 100%;
            display: flex;
            align-items: center;
            height: 24px;
            color: var(--spanish-gray);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            margin-bottom: 13px;
          }
          .activity_log_icon {
            mask-size: 12px 12px;
            width: 12px;
            height: 12px;
            margin-right: 8px;
            background-color: var(--dim-gray);
          }
          .plus {
            mask-image: url("./images/plus@2x.png");
            mask-size: cover;
            width: 17px;
            height: 17px;
            transform: translateX(-2.5px);
            margin-right: 3px;
          }
          .arrow {
            mask-image: url("./images/send@2x.png");
          }
          .check {
            mask-image: url("./images/check@2x.png");
            background-color: var(--success);
          }
          .activity_log_wrap {
            display: none;
          }
        `}
			</style>
		</div>
	);
}
