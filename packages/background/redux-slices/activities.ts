import {
	createEntityAdapter,
	createSlice,
	EntityState,
} from "@reduxjs/toolkit";
import {
	keysMap,
	keysMapPokt,
	adaptForUI,
	ActivityItem,
	POKTActivityItem,
	EVMActivityItem,
} from "./utils/activity-utils";
import { truncateAddress } from "../lib/utils";

import { assetAmountToDesiredDecimals } from "../assets";
import {
	EnrichedEVMTransaction,
	EnrichedPOKTTransaction,
} from "../services/enrichment";

export { ActivityItem, POKTActivityItem, EVMActivityItem };

const desiredDecimals = 2; /* TODO Make desired decimals configurable? */

const activitiesAdapter = createEntityAdapter<ActivityItem>({
	selectId: (activityItem) => activityItem.hash,
	sortComparer: (a, b) => {
		if (
			(a.blockHeight === null ||
				b.blockHeight === null ||
				a.blockHeight === b.blockHeight) &&
			a.network.name === b.network.name &&
			a.network.family === "EVM"
		) {
			// Sort by nonce if a block height is missing or equal between two
			// transactions, as long as the two activities are on the same network;
			// otherwise, sort as before.
			return (
				(b as EnrichedEVMTransaction).nonce -
				(a as EnrichedEVMTransaction).nonce
			);
		}
		// null means pending or dropped, these are always sorted above everything
		// if networks don't match.
		if (a.blockHeight === null && b.blockHeight === null) {
			return 0;
		}
		if (a.blockHeight === null) {
			return -1;
		}
		if (b.blockHeight === null) {
			return 1;
		}
		return b.blockHeight - a.blockHeight;
	},
});

export type ActivitiesState = {
	[address: string]: EntityState<ActivityItem>;
};

export const initialState: ActivitiesState = {};

const activitiesSlice = createSlice({
	name: "activities",
	initialState,
	reducers: {
		activityEncountered: (
			immerState,
			{
				payload: { transaction, forAccounts },
			}: {
				payload: {
					transaction: EnrichedEVMTransaction | EnrichedPOKTTransaction;
					forAccounts: string[];
				};
			},
		) => {
			if (transaction.network.family === "EVM") {
				const infoRows = adaptForUI(keysMap, transaction);
				const tx = transaction as EnrichedEVMTransaction;
				forAccounts.forEach((account) => {
					const address = account.toLowerCase();

					const activityItem = {
						...tx,
						infoRows,
						localizedDecimalValue: assetAmountToDesiredDecimals(
							{
								asset: tx.asset,
								amount: tx.value,
							},
							desiredDecimals,
						).toLocaleString(undefined, {
							maximumFractionDigits: desiredDecimals,
						}),
						fromTruncated: truncateAddress(tx.from),
						toTruncated: truncateAddress(tx.to ?? ""),
					};

					if (typeof immerState[address] === "undefined") {
						immerState[address] = activitiesAdapter.setOne(
							activitiesAdapter.getInitialState(),
							activityItem,
						);
					} else {
						activitiesAdapter.upsertOne(immerState[address], activityItem);
					}
				});
			}
			// TODO Activity Item for POKT
			if (transaction.network.family === "POKT") {
				const infoRows = adaptForUI(keysMapPokt, transaction);
				const tx = transaction as EnrichedPOKTTransaction;

				forAccounts.forEach((account) => {
					const address = account.toLowerCase();
					const activityItem = {
						...tx,
						infoRows,
						localizedDecimalValue: assetAmountToDesiredDecimals(
							{
								asset: tx.asset,
								amount: BigInt(tx.txMsg.value.amount),
							},
							desiredDecimals,
						).toLocaleString(undefined, {
							maximumFractionDigits: desiredDecimals,
						}),
						fromTruncated: truncateAddress(tx.from),
						toTruncated: truncateAddress(tx.to ?? ""),
						blockHeight: tx.height || tx.targetHeight,
					};
					if (typeof immerState[address] === "undefined") {
						immerState[address] = activitiesAdapter.setOne(
							activitiesAdapter.getInitialState(),
							activityItem,
						);
					} else {
						activitiesAdapter.upsertOne(immerState[address], activityItem);
					}
				});
			}
		},
	},
});

export const { activityEncountered } = activitiesSlice.actions;
export default activitiesSlice.reducer;
