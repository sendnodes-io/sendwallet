import { SnAction } from "../hooks/staking-hooks/use-staking-requests-transactions"

const MEMO_TO_SNACTION: Record<string, SnAction> = {
  c: SnAction.COMPOUND,
  u: SnAction.UNSTAKE,
  s: SnAction.STAKE,
}

export default function getSnActionFromMemo(memo?: string): SnAction | null {
  if (!memo) {
    return null
  }
  const [snAction] = memo.toString().split(":")
  if (snAction.length !== 1) {
    throw new Error(`Invalid memo: ${memo}`)
  }
  if (snAction in MEMO_TO_SNACTION) {
    return MEMO_TO_SNACTION[snAction]
  }
  return null
}
