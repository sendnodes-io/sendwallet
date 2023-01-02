import { unitPricePointForPricePoint } from "@sendnodes/pokt-wallet-background/assets";
import { POKT, USD } from "@sendnodes/pokt-wallet-background/constants";
import { POKTTransactionRequest } from "@sendnodes/pokt-wallet-background/networks";
import { ActivityItem } from "@sendnodes/pokt-wallet-background/redux-slices/activities";
import { selectAssetPricePoint } from "@sendnodes/pokt-wallet-background/redux-slices/assets";
import {
	getAccountData,
	selectCurrentAddressNetwork,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import {
	enrichAssetAmountWithDecimalValues,
	enrichAssetAmountWithMainCurrencyValues,
	heuristicDesiredDecimalsForUnitPrice,
} from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils";
import React, { ReactElement } from "react";
import { useBackgroundSelector } from "../../hooks";
import formatTokenAmount from "../../utils/formatTokenAmount";
import SharedAddress from "../Shared/SharedAddress";
import SharedAssetIcon from "../Shared/SharedAssetIcon";

export type TransactionSendDetailProps = {
	transaction: ActivityItem;
};

export default function TransactionSendDetail({
	transaction,
}: TransactionSendDetailProps): ReactElement {
	const { address, network } = useBackgroundSelector(
		selectCurrentAddressNetwork,
	);
	const baseAssetPricePoint = useBackgroundSelector((state) =>
		selectAssetPricePoint(state.assets, network.baseAsset.symbol, USD.symbol),
	);
	let amount = BigInt(0);
	let from = address;
	let to: string | undefined;

	if ("value" in transaction) {
		amount = transaction.value;
	}
	if ("txMsg" in transaction) {
		amount = BigInt(transaction.txMsg.value.amount);
		to = transaction.to;
		from = transaction.from;
	}
	if ("to" in transaction) to = transaction.to;
	const transactionAssetAmount = enrichAssetAmountWithDecimalValues(
		{
			asset: network.baseAsset,
			amount,
		},
		heuristicDesiredDecimalsForUnitPrice(
			network.baseAsset.decimals,
			typeof baseAssetPricePoint !== "undefined"
				? unitPricePointForPricePoint(baseAssetPricePoint)
				: undefined,
		),
	);

	const decimalPlaces = transactionAssetAmount.decimalAmount < 1 ? 6 : 2;
	const {
		decimalAmount: tokenValue,
		mainCurrencyAmount: dollarValue,
		localizedDecimalAmount: localizedTokenValue,
		localizedMainCurrencyAmount: localizedDollarValue,
	} = enrichAssetAmountWithMainCurrencyValues(
		transactionAssetAmount,
		baseAssetPricePoint,
		decimalPlaces,
	);

	const fromAccountData = useBackgroundSelector((state) =>
		getAccountData(state, from),
	);

	const toAccountData = useBackgroundSelector((state) =>
		getAccountData(state, to ?? ""),
	);

	return (
		<div className="sign_block">
			<div className="dashed_border width_full amount_row">
				<SharedAssetIcon
					symbol={transactionAssetAmount.asset.symbol}
					size="large"
				/>
				<span
					className="spend_amount"
					title={`${localizedTokenValue} ${transactionAssetAmount.asset.symbol}`}
				>
					{transactionAssetAmount.decimalAmount < 1
						? formatTokenAmount(tokenValue, 1, 6)
						: formatTokenAmount(tokenValue)}
				</span>
				<span className="dollar_amount" title={`${localizedDollarValue}`}>
					{localizedDollarValue}
				</span>
			</div>
			<div className="spacing" />
			<div className="width_full addresses_row">
				<div>
					{typeof address === "undefined" ? (
						<>
							<div className="label">Send to</div>
							<div className="send_to">Contract creation</div>
						</>
					) : (
						<>
							<div className="width_full">
								<h3 className="label">FROM</h3>
							</div>
							<div className="width_full">
								<div className="dashed_border" style={{ margin: 0 }}>
									<SharedAddress
										name={
											fromAccountData !== "loading"
												? (fromAccountData ?? undefined)?.name
												: undefined
										}
										address={from}
									/>
								</div>
							</div>
						</>
					)}
				</div>
				<div>
					{typeof to === "undefined" ? (
						<>
							<div className="label">Send to</div>
							<div className="send_to">Contract creation</div>
						</>
					) : (
						<>
							<div className="width_full">
								<h3 className="label">TO</h3>
							</div>
							<div className="width_full">
								<div className="dashed_border" style={{ margin: 0 }}>
									<SharedAddress
										name={
											toAccountData !== "loading"
												? (toAccountData ?? undefined)?.name
												: undefined
										}
										address={to}
									/>
								</div>
							</div>
						</>
					)}
				</div>
			</div>

			<div className="spacing" />

			<style jsx>
				{`
          .sign_block {
            display: flex;
            width: 100%;
            flex-direction: column;
            align-items: center;
          }
          .dashed_border {
            padding: 1rem;
          }
          .width_full {
            width: 100%;
          }
          .label {
            color: var(--spanish-gray);
            font-size: 0.75rem;
            margin-bottom: 0.25rem;
            margin-left: 1rem;
            line-height: 1rem;
          }
          .row {
            width: 100%;
            display: flex;
            flex-direction: row;
          }
          .amount_row {
            width: 100%;
            display: flex;
            align-items: center;
          }
          .amount_row :global(.token_icon_wrap) {
            display: inline-block;
            margin-right: 1rem;
            width: 2rem !important;
            height: 2rem !important;
          }
          .spend_amount {
            color: var(--white);
            font-size: 2rem;
            font-weight: 700;
            text-align: left;
            text-transform: uppercase;
            flex: 1;
          }

          .dollar_amount {
            color: var(--white);
            font-size: 1rem;
            text-align: right;
            text-transform: uppercase;
            float: right;
            margin-right: 0.5rem;
            font-weight: 300;
          }

          .addresses_row {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .addresses_row > div {
            flex: 1;
          }

          .addresses_row :global(button) {
            color: var(--white);
            background-color: transparent;
          }
          .addresses_row :global(small) {
            flex: 1;
          }
          .spacing {
            margin-bottom: 0.5rem;
          }
        `}
			</style>
		</div>
	);
}
