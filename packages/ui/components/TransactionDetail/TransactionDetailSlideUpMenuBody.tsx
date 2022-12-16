import {
  EVMActivityItem,
  POKTActivityItem,
} from "@sendnodes/pokt-wallet-background/redux-slices/activities"
import React, { ReactElement, useCallback, useState } from "react"
import {
  selectBlockExplorerForTxHash,
  selectCurrentAccountActivityForTxHash,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import classNames from "clsx"
import TransactionSendDetail from "./TransactionSendDetail"
import SharedButton from "../Shared/SharedButton"
import { useBackgroundSelector } from "../../hooks"
import useStakingAllTransactions from "../../hooks/staking-hooks/use-staking-all-transactions"
import StakeTransactionInfo from "../Stake/StakeTransactionInfo"
import WalletStakeTransactionSendDetail from "../Wallet/WalletStakeTransactionSendDetail"

export type TransactionDetailSlideUpMenuBodyProps = {
  activity: POKTActivityItem | EVMActivityItem
}

export default function TransactionDetailSlideUpMenuBody({
  activity,
}: TransactionDetailSlideUpMenuBodyProps): ReactElement {
  const { data: allStakingTransactions } = useStakingAllTransactions()

  const stakingTransaction = allStakingTransactions.find(
    (tx) => tx.hash === activity.hash
  )
  const blockExplorerUrl = useBackgroundSelector((_) =>
    selectBlockExplorerForTxHash({
      network: activity.network,
      txHash: activity.hash,
    })
  )
  const openExplorer = useCallback(() => {
    window.open(blockExplorerUrl, "_blank")?.focus()
  }, [blockExplorerUrl])

  const currentActivity = useBackgroundSelector((state) =>
    selectCurrentAccountActivityForTxHash(state, activity.hash)
  )

  const [showUtcTimestamp, setShowUtcTimestamp] = useState(false)

  if (!currentActivity) {
    return <></>
  }

  const memo =
    currentActivity.network.family == "POKT" && !stakingTransaction
      ? (currentActivity as POKTActivityItem).memo
      : null

  return (
    <div className="tx_detail_wrap">
      {stakingTransaction && (
        <StakeTransactionInfo transaction={stakingTransaction}>
          {(stakingTransaction) => (
            <WalletStakeTransactionSendDetail
              transaction={stakingTransaction}
            />
          )}
        </StakeTransactionInfo>
      )}
      {!stakingTransaction && (
        <TransactionSendDetail transaction={currentActivity} />
      )}
      <div
        className={classNames("detail_items_wrap width_full", {
          has_memo: !!memo,
        })}
      >
        <div className="detail_item">
          Transaction ID{" "}
          <div className="detail_item_value">
            <span title={currentActivity.hash}>
              {currentActivity?.hash?.slice(0, 4)}...
              {currentActivity?.hash?.slice(-4)}
            </span>
          </div>
        </div>
        <div className="detail_item">
          Block Height{" "}
          <div className="detail_item_value">
            {activity.blockHeight !== null && activity.blockHeight > 0 ? (
              <span title={activity.blockHeight.toString()}>
                {activity.blockHeight}
              </span>
            ) : (
              <span className="text_attention">pending</span>
            )}
          </div>
        </div>
        <div className="detail_item">
          Timestamp{" "}
          <div className="detail_item_value">
            {currentActivity.timestamp ? (
              showUtcTimestamp ? (
                <span
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowUtcTimestamp(!showUtcTimestamp)}
                  title={currentActivity.relativeTimestamp}
                >
                  {currentActivity.unixTimestamp}
                </span>
              ) : (
                <span
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowUtcTimestamp(!showUtcTimestamp)}
                  title={currentActivity.unixTimestamp}
                >
                  {currentActivity.relativeTimestamp}
                </span>
              )
            ) : (
              <span>soon</span>
            )}
          </div>
        </div>

        {!stakingTransaction &&
          (memo ? (
            <div className="detail_item flex_col">
              Memo{" "}
              <div className="detail_item_row">
                <pre title={memo}>{memo}</pre>
              </div>
            </div>
          ) : (
            <div className="detail_item flex_col">No Memo Set</div>
          ))}
      </div>
      <div className="buttons">
        <SharedButton type="primaryGhost" size="medium" onClick={openExplorer}>
          {activity.network.family == "POKT" ? "POKT Watch" : "Etherscan"}
        </SharedButton>
      </div>
      <style jsx>
        {`
          .tx_detail_wrap {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .detail_items_wrap {
            background-color: var(--black);
            max-height: 14rem;
            overflow-y: scroll;
            padding: 1rem;
          }
          .flex_col {
            justify-content: flex-start;
            align-items: flex-start;
          }

          .buttons {
            margin: 1rem auto;
            display: flex;
            justify-content: center;
            width: 100%;
          }

          .buttons :global(button) {
            flex-grow: 1;
            max-width: 12rem;
            justify-content: center;
          }

          .text_attention {
            color: var(--attention);
          }
        `}
      </style>
    </div>
  )
}
