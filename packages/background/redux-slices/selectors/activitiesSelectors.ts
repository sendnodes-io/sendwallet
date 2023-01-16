import { createSelector, current, EntityId } from "@reduxjs/toolkit";
import dayjs from "dayjs";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as updateLocale from "dayjs/plugin/updateLocale";
import * as utc from "dayjs/plugin/utc";
import { ActivityItem } from "../activities";
import { selectCurrentAccount } from "./uiSelectors";
import { sameNetwork } from "../../networks";
import { RootState } from "..";

dayjs.extend(updateLocale.default);
dayjs.extend(relativeTime.default);
dayjs.extend(utc.default);

dayjs.updateLocale("en", {
	relativeTime: {
		future: "in %s",
		past: "%s",
		s: "a few sec",
		m: "a min",
		mm: "%d min",
		h: "an hr",
		hh: "%d hrs",
		d: "a day",
		dd: "%d days",
		M: "a mon",
		MM: "%d mons",
		y: "a yr",
		yy: "%d yrs",
	},
});

export const selectCurrentAccountActivitiesWithTimestamps = createSelector(
	(state: RootState) => {
		const currentAccount = selectCurrentAccount(state);
		const { address, network } = currentAccount;
		return {
			currentAccount,
			currentAccountActivities:
				typeof address !== "undefined" ? state.activities[address] : undefined,
			blocks:
				state.networks[network.family === "EVM" ? "evm" : "pokt"][
					network.chainID
				]?.blocks ?? {},
		};
	},
	({ currentAccount, currentAccountActivities, blocks }) => {
		return currentAccountActivities?.ids
			.map((id: EntityId): ActivityItem | null => {
				// Guaranteed by the fact that we got the id from the ids collection.
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const activityItem = currentAccountActivities.entities[id]!;
				if (!sameNetwork(activityItem.network, currentAccount.network)) {
					return null;
				}

				const timestamp =
					activityItem.blockHeight === null
						? undefined
						: blocks[activityItem.blockHeight]?.timestamp;
				return {
					...activityItem,
					timestamp,
					unixTimestamp: timestamp
						? dayjs.unix(timestamp).utc().format("YYYY-MM-DD HH:mm:ss [UTC]")
						: undefined,
					relativeTimestamp: timestamp
						? dayjs.unix(timestamp).fromNow()
						: undefined,
				};
			})
			.filter((a) => a !== null) as ActivityItem[];
	},
);

export const selectCurrentAccountActivityForTxHash = createSelector(
	[
		selectCurrentAccountActivitiesWithTimestamps,
		(_: RootState, txHash: string) => txHash,
	],
	(activities, txHash) => {
		return activities?.find((a) => a.hash === txHash);
	},
);

export default selectCurrentAccountActivitiesWithTimestamps;
