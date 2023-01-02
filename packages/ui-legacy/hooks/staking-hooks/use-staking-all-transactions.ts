import dayjs from "dayjs";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as updateLocale from "dayjs/plugin/updateLocale";
import * as localizedFormat from "dayjs/plugin/localizedFormat";
import * as utc from "dayjs/plugin/utc";
import { uniqBy } from "lodash";
import { SnTransaction } from "./constants";
import useStakingPendingTransactions from "./use-staking-pending-transactions";
import useStakingRequestsTransactions from "./use-staking-requests-transactions";
import useStakingRewardsTransactions from "./use-staking-rewards-transactions";

dayjs.extend(updateLocale.default);
dayjs.extend(localizedFormat.default);
dayjs.extend(relativeTime.default);
dayjs.extend(utc.default);

export default function useStakingAllTransactions() {
	const {
		data: stakingTransactions,
		isLoading: isStakingTransactionsLoading,
		isError: isStakingTransactionsError,
	} = useStakingRequestsTransactions();
	const {
		data: rewardsTransactions,
		isLoading: isRewardsTransactionsLoading,
		isError: isRewardsTransactionsError,
	} = useStakingRewardsTransactions();
	const pendingTransactions = useStakingPendingTransactions();

	const allTransactions = uniqBy(
		[
			...pendingTransactions,
			...[...(stakingTransactions ?? []), ...(rewardsTransactions ?? [])].sort(
				(a, b) => {
					return dayjs.utc(b.timestamp).unix() - dayjs.utc(a.timestamp).unix();
				},
			),
		],
		(tx) => tx.hash,
	) as SnTransaction[];

	const isError = isStakingTransactionsError || isRewardsTransactionsError;
	return {
		data: allTransactions ?? ([] as SnTransaction[]),
		isLoading:
			!isError &&
			(isStakingTransactionsLoading || isRewardsTransactionsLoading),
		isError,
	};
}
