import { POKTActivityItem } from "@sendnodes/pokt-wallet-background/redux-slices/activities"
import {
  selectCurrentAccount,
  selectCurrentAccountActivitiesWithTimestamps,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import { isEqual } from "lodash"
import getSnActionFromMemo from "../../helpers/get-sn-action-from-memo"
import getTransactionResult from "../../helpers/get-transaction-result"
import { useBackgroundSelector } from "../redux-hooks"
import { ISnTransactionFormatted, SnAction } from "./constants"
import useStakingPoktParams from "./use-staking-pokt-params"

export default function useStakingPendingTransactions() {
  const { data: stakingPoktParams } = useStakingPoktParams()
  return (
    useBackgroundSelector(
      selectCurrentAccountActivitiesWithTimestamps,
      isEqual
    ) ?? []
  )
    .filter(
      (activity) =>
        getTransactionResult(activity).status === "pending" &&
        activity.to === stakingPoktParams?.wallets.siw
    )
    .map((activity) => {
      activity = activity as POKTActivityItem
      const action = getSnActionFromMemo(activity.memo)
      if (action === null) {
        return null
      }
      return {
        height: activity.blockHeight?.toString(),
        signer: activity.from,
        userWalletAddress: activity.from,
        hash: activity.hash,
        memo: activity.memo,
        amount: activity.txMsg.value.amount,
        action,
        index: "-1",
        compound: action === SnAction.COMPOUND,
        reward: action === SnAction.REWARD,
        timestamp: activity.unixTimestamp,
      } as ISnTransactionFormatted
    })
    .filter((activity) => activity !== null)
    .reverse() as ISnTransactionFormatted[]
}
