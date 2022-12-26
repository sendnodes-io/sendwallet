import { SnAction } from "../hooks/staking-hooks";

const MEMO_TO_SNACTION: Record<string, SnAction> = {
  c: SnAction.COMPOUND,
  u: SnAction.UNSTAKE,
  s: SnAction.STAKE,
  r: SnAction.REWARD,
};

export default function getSnActionFromMemo(memo?: string): SnAction | null {
  if (!memo) {
    return null;
  }
  const [snAction] = memo.toString().split(":");
  if (snAction in MEMO_TO_SNACTION) {
    return MEMO_TO_SNACTION[snAction];
  }
  return null;
}
