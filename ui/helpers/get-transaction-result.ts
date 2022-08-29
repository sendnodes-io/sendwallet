import { ActivityItem } from "@sendnodes/pokt-wallet-background/redux-slices/activities"

export enum TransactionStatus {
  Failed = "failed",
  Success = "success",
  Pending = "pending",
}

interface TransactionResult {
  status: TransactionStatus
  description?: string
}

export default function getTransactionResult(
  activity: ActivityItem
): TransactionResult {
  if (activity.network.family === "EVM") {
    if ("status" in activity && activity.blockHash !== null) {
      if (activity.status === 0) {
        return {
          status: TransactionStatus.Failed,
          description: "Dropped",
        }
      }
    }
    if (
      !("status" in activity) &&
      "blockHash" in activity &&
      activity.blockHash === null
    ) {
      return {
        status: TransactionStatus.Pending,
      }
    }
  }

  if (activity.network.family === "POKT") {
    if ("height" in activity) {
      if (
        "txResult" in activity &&
        activity.txResult &&
        activity.txResult.code === 10
      ) {
        return {
          status: TransactionStatus.Failed,
        }
      }
      if (activity.height === 0) {
        return {
          status: TransactionStatus.Pending,
        }
      }
    }
  }

  return {
    status: TransactionStatus.Success,
  }
}
