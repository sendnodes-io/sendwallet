import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { BigNumber } from "ethers";
import { isEqual } from "lodash";
import usePocketNetworkFee from "../pocket-network/use-network-fee";
import { useBackgroundSelector } from "../redux-hooks";
import { SnAction } from "./constants";
import useStakingPendingTransactions from "./use-staking-pending-transactions";
import { useStakingUserData } from "./use-staking-user-data";

export const useStakingTotalStakedBalance = (): BigNumber | undefined => {
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual);

  const {
    data: userStakingData,
    isLoading: isUserStakingDataLoading,
    isError: isUserStakingDataError,
  } = useStakingUserData(currentAccount);

  const pendingUnstakeTransactions = useStakingPendingTransactions().filter(
    (activity) => activity !== null && activity.action === SnAction.UNSTAKE,
  );

  if (isUserStakingDataLoading || isUserStakingDataError) {
    return undefined;
  }

  const totalStakedBalance = BigNumber.from(
    userStakingData?.userStakingData[0]?.staked ?? 0,
  )
    .add(userStakingData?.userStakingData[0]?.pendingStaked ?? 0)
    .sub(userStakingData?.userStakingData[0]?.pendingUnstaked ?? 0)
    .sub(
      pendingUnstakeTransactions.reduce((pendingUnstaked, transaction) => {
        return pendingUnstaked.add(
          BigNumber.from(transaction.memo.split(":")[1]),
        );
      }, BigNumber.from(0)),
    );

  return totalStakedBalance;
};
