import React, { ReactElement } from "react"
import { InformationCircleIcon } from "@heroicons/react/outline"
import { isEmpty } from "lodash"
import clsx from "clsx"
import { Link } from "react-router-dom"
import { formatFixed } from "@ethersproject/bignumber"
import { formatUnits } from "@ethersproject/units"
import { useAreKeyringsUnlocked } from "../../hooks"
import SharedSplashScreen from "../Shared/SharedSplashScreen"
import formatTokenAmount from "../../utils/formatTokenAmount"
import useStakingAllTransactions from "../../hooks/staking-hooks/use-staking-all-transactions"
import StakeTransactionInfo, {
  getStakeTransactionInfo,
} from "./StakeTransactionInfo"
import { SnTransaction } from "../../hooks/staking-hooks"

export default function StakeRequestsTransactions(): ReactElement {
  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)
  const {
    data: allTransactions,
    isLoading,
    isError,
  } = useStakingAllTransactions()

  if (isError) throw isError
  if (!areKeyringsUnlocked || isLoading) {
    return (
      <div className="grow w-full relative flex flex-col justify-center items-center">
        <SharedSplashScreen />
      </div>
    )
  }

  return (
    <div className="w-full grow">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold">
              <div
                className={clsx(
                  "icon-mask h-10 w-10 bg-white inline-block align-middle"
                )}
                css={`
                  mask-image: url("../../public/images/transactions@2x.png");
                `}
              />
              Staking Transactions
            </h1>
            <p className="mt-2 text-sm text-spanish-gray">
              A list of all staking transactions recorded on the POKT Network
              for{" "}
              <a
                href="https://docs.sendnodes.io/"
                target="_blank"
                className="hover:text-white"
                rel="noreferrer"
              >
                POKT Onchain Pool Staking (<b className="text-white">POPS</b>){" "}
                <InformationCircleIcon className="inline h-4 w-4" />
              </a>{" "}
              by SendNodes.
            </p>
            {/* export transactions button */}
            <button
              type="button"
              className="flex items-center justify-center mt-2 px-2 py-1 text-sm font-medium text-eerie-black bg-aqua rounded-md hover:bg-aqua-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-aqua hover:bg-white hover:text-eerie-black"
              onClick={() => {
                const rows = [
                  [
                    "Transaction Hash",
                    "Transaction Height",
                    "Transaction Type",
                    "Transaction Token",
                    "Transaction Amount",
                    "Transaction Date",
                  ],
                  ...allTransactions
                    .filter((tx) => !!tx.timestamp)
                    .map((transaction) => {
                      const txInfo = getStakeTransactionInfo({ transaction })
                      return [
                        transaction.hash,
                        transaction.height,
                        txInfo.humanReadableAction,
                        "POKT", // wishful thinking
                        formatUnits(txInfo.amount, 6),
                        txInfo.timestamp.toISOString(),
                      ]
                    }),
                ]

                const csvContent = `data:text/csv;charset=utf-8,${rows
                  .map((e) => e.join(","))
                  .join("\n")}`
                window.open(encodeURI(csvContent))
              }}
            >
              Export CSV
            </button>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              to="/"
              className="relative inline-flex items-center justify-center px-4 py-1 overflow-hidden font-medium text-eerie-black rounded-lg shadow-2xl group"
            >
              <span className="absolute top-0 left-0 w-40 h-40 -mt-10 -ml-3 transition-all duration-700 bg-capri rounded-full blur-md ease" />
              <span className="absolute inset-0 w-full h-full transition duration-700 group-hover:rotate-180 ease">
                <span className="absolute bottom-0 left-0 w-24 h-24 -ml-10 bg-aqua rounded-full blur-md" />
                <span className="absolute bottom-0 right-0 w-24 h-24 -mr-10 bg-capri rounded-full blur-md" />
              </span>
              <span className="relative ">Stake</span>
            </Link>
          </div>
        </div>
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle">
              <div className="flex max-h-[60vh] h-full overflow-y-scroll rounded-sm">
                {allTransactions.length === 0 ? (
                  <div className="relative flex items-center justify-center flex-1 h-full w-full border-2 border-gray-300 border-dashed p-12 text-center hover:border-gray-400">
                    <span className="mt-2 block text-sm font-medium text-spanish-gray">
                      No staking transactions found for this account
                    </span>
                  </div>
                ) : (
                  <ul
                    role="list"
                    className="divide-y divide-spanish-gray w-full h-full flex-1"
                  >
                    {allTransactions.map((tx, txIdx) => (
                      <StakeTransactionItem key={tx.hash} tx={tx} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type StakeTransactionItemProps = {
  tx: SnTransaction
}
function StakeTransactionItem({ tx }: StakeTransactionItemProps) {
  return (
    <StakeTransactionInfo transaction={tx}>
      {({
        latestBlock,
        currentAccount,
        blockExplorerUrl,
        isPending,
        rewardTimestamp,
        isEarningRewards,
        isCompound,
        isUncompound,
        isCompoundUpdate,
        isRewards,
        isStake,
        isUnstake,
        isUnstakeReceipt,
        unstakeReceiptHash,
        unstakeReceiptAt,
        humanReadableAction,
        relativeTimestamp,
        timestamp,
        amount,
        color,
        Icon,
      }) => (
        <li key={tx.hash} className="list-item hover:bg-gray-700 rounded-sm">
          <a href={blockExplorerUrl} target="_poktwatch" className="text-white">
            <div className="px-4 py-4 sm:px-6 flex">
              <div className="flex items-center flex-shrink-0">
                <div
                  className={clsx(
                    "h-16 w-16 rounded-full flex items-center justify-center"
                  )}
                >
                  <Icon
                    pending={isPending}
                    className={clsx("h-10 w-10", color, {
                      uncompound: isUncompound,
                    })}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="flex-1 ml-4 sm:ml-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm sm:text-lg font-medium text-white truncate">
                    {!isCompoundUpdate &&
                      isStake &&
                      `${tx.reward ? "Reward" : ""} ${humanReadableAction}`}
                    {!isCompoundUpdate && !isStake && humanReadableAction}
                    {isCompoundUpdate && humanReadableAction}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    {!isCompoundUpdate && (
                      <div
                        title={formatFixed(
                          amount,
                          currentAccount.network.baseAsset.decimals
                        )}
                        className={clsx(
                          "px-2 inline-flex items-center gap-2 text-sm sm:text-lg leading-5 font-semibold rounded-full"
                        )}
                      >
                        <div className="inline">
                          <img
                            src="/images/pokt_icon@2x.svg"
                            className="h-5 w-5"
                            alt="POKT"
                          />
                        </div>
                        {formatTokenAmount(
                          formatFixed(
                            amount,
                            currentAccount.network.baseAsset.decimals
                          ),
                          7,
                          2
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex gap-4">
                    <div className="mt-2 flex items-center text-sm text-spanish-gray hover:text-white sm:mt-0 ">
                      <img
                        src="/images/pokt-watch.png"
                        className="h-4 w-4 mr-2"
                        width="158"
                        height="158"
                        alt="https://pokt.watch/"
                      />
                      <span title={tx.hash}>
                        {tx.hash.substring(0, 4)}...
                        {tx.hash.substring(tx.hash.length - 4, tx.hash.length)}
                      </span>
                    </div>
                    {isStake && tx.compound && (
                      <div className="mt-2 flex items-center text-sm text-spanish-gray sm:mt-0 ">
                        <div
                          className={clsx(
                            "icon-mask",
                            "h-4 w-4 inline bg-white mr-2"
                          )}
                          css={`
                            mask-image: url("../../public/images/rewards@2x.png");
                          `}
                        />
                        <span>Compounding</span>
                      </div>
                    )}
                    {isUnstakeReceipt &&
                      unstakeReceiptHash &&
                      !isEmpty(unstakeReceiptHash) && (
                        <div className="mt-2 flex items-center text-sm text-spanish-gray sm:mt-0 ">
                          <span title={unstakeReceiptHash}>
                            Original tx: {unstakeReceiptHash.substring(0, 4)}...
                            {unstakeReceiptHash.substring(
                              unstakeReceiptHash.length - 4,
                              unstakeReceiptHash.length
                            )}{" "}
                          </span>
                        </div>
                      )}
                  </div>
                  <div className="mt-2 flex items-center text-sm text-spanish-gray sm:mt-0">
                    <p className="group">
                      <span className="inline group-hover:hidden">
                        {isPending && "awaiting confirmation "}
                        {!isPending &&
                          isStake &&
                          (isEarningRewards
                            ? "earning rewards since "
                            : "rewards start (estimated) ")}
                        {!isPending &&
                          isUnstake &&
                          ` ${tx.unstakeStatus} since `}
                        <time
                          dateTime={timestamp.format(
                            "YYYY-MM-DD HH:mm:ss [UTC]"
                          )}
                          title={timestamp.format("YYYY-MM-DD HH:mm:ss [UTC]")}
                        >
                          {relativeTimestamp}
                        </time>
                      </span>
                      <span className="hidden group-hover:inline">
                        <time
                          dateTime={timestamp.format(
                            "YYYY-MM-DD HH:mm:ss [UTC]"
                          )}
                          title={timestamp.format("YYYY-MM-DD HH:mm:ss [UTC]")}
                        >
                          {timestamp.format("YYYY-MM-DD HH:mm:ss [UTC]")}
                        </time>
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </li>
      )}
    </StakeTransactionInfo>
  )
}
