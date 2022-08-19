import React, { ReactElement, useEffect, useState } from "react"
import {
  selectBlockExplorerForTxHash,
  selectCurrentAccount,
  selectCurrentAccountActivitiesWithTimestamps,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"

import { useBackgroundSelector, useAreKeyringsUnlocked } from "../../hooks"
import SharedSplashScreen from "../Shared/SharedSplashScreen"
import { InformationCircleIcon } from "@heroicons/react/outline"

import { capitalize, isEqual, uniqBy } from "lodash"
import { useStakingRequestsTransactions } from "../../hooks/staking-hooks/use-staking-requests-transactions"
import clsx from "clsx"
import { Link } from "react-router-dom"
import { DownloadIcon, UploadIcon } from "@heroicons/react/solid"
import { BigNumber, formatFixed } from "@ethersproject/bignumber"

import dayjs from "dayjs"
import * as relativeTime from "dayjs/plugin/relativeTime"
import * as updateLocale from "dayjs/plugin/updateLocale"
import * as localizedFormat from "dayjs/plugin/localizedFormat"
import * as utc from "dayjs/plugin/utc"
import {
  ISnTransactionFormatted,
  SnAction,
  useStakingPoktParams,
} from "../../hooks/staking-hooks"
import { usePoktWatchLatestBlock } from "../../hooks/pokt-watch/use-latest-block"
import { useStakingRewardsTransactions } from "../../hooks/staking-hooks/use-staking-rewards-transactions"
import formatTokenAmount from "../../utils/formatTokenAmount"
import useStakingPendingTransactions from "../../hooks/staking-hooks/use-staking-pending-transactions"

dayjs.extend(updateLocale.default)
dayjs.extend(localizedFormat.default)
dayjs.extend(relativeTime.default)
dayjs.extend(utc.default)

const snActionBg = {
  [SnAction.COMPOUND]: "text-white",
  [SnAction.STAKE]: "bg-aqua",
  [SnAction.UNSTAKE]: "bg-white bg-opacity-75",
  [SnAction.REWARD]: "bg-aqua",
}

const snActionIcon: Record<SnAction, (props: any) => JSX.Element> = {
  [SnAction.COMPOUND]: ({
    className,
    pending,
  }: {
    className: string
    pending: boolean
  }) => {
    return className.includes("uncompound") ? (
      <UploadIcon
        className={clsx(className, "h-8 w-8 text-opacity-75", {
          "text-orange-500": pending,
        })}
      />
    ) : (
      <DownloadIcon
        className={clsx(className, "h-8 w-8", { "text-orange-500": pending })}
      />
    )
  },
  [SnAction.STAKE]: ({
    className,
    pending,
  }: {
    className: string
    pending: boolean
  }) => (
    <div
      className={clsx("stake_icon", className, { "bg-orange-500": pending })}
    ></div>
  ),
  [SnAction.UNSTAKE]: ({
    className,
    pending,
  }: {
    className: string
    pending: boolean
  }) => (
    <div
      className={clsx(className, "icon-mask", { "bg-orange-500": pending })}
      css={`
        mask-image: url("../../public/images/unstake@2x.png");
      `}
    />
  ),
  [SnAction.REWARD]: ({
    className,
    pending,
  }: {
    className: string
    pending: boolean
  }) => (
    <div
      className={clsx(className, "icon-mask", { "bg-orange-500": pending })}
      css={`
        mask-image: url("../../public/images/rewards@2x.png");
      `}
    />
  ),
}

export default function StakeRequestsTransactions(): ReactElement {
  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)
  const {
    data: stakingPoktParams,
    isLoading: isStakingParamsLoading,
    isError: isStakingParamsError,
  } = useStakingPoktParams(currentAccount)
  const {
    data: stakingTransactions,
    isLoading: isStakingTransactionsLoading,
    isError: isStakingTransactionsError,
  } = useStakingRequestsTransactions(currentAccount)
  const {
    data: rewardsTransactions,
    isLoading: isRewardsTransactionsLoading,
    isError: isRewardsTransactionsError,
  } = useStakingRewardsTransactions(currentAccount)
  const pendingTransactions = useStakingPendingTransactions()

  if (isStakingParamsError) throw isStakingParamsError
  if (isRewardsTransactionsError) throw isRewardsTransactionsError
  if (isStakingTransactionsError) throw isStakingTransactionsError

  if (
    !areKeyringsUnlocked ||
    isStakingParamsLoading ||
    isStakingTransactionsLoading ||
    isRewardsTransactionsLoading
  ) {
    return (
      <div className="grow w-full relative flex flex-col justify-center items-center">
        <SharedSplashScreen />
      </div>
    )
  }

  const allTransactions = uniqBy(
    [
      ...pendingTransactions,
      ...[...(stakingTransactions ?? []), ...(rewardsTransactions ?? [])].sort(
        (a, b) => {
          return dayjs.utc(b.timestamp).unix() - dayjs.utc(a.timestamp).unix()
        }
      ),
    ],
    (tx) => tx.hash
  )

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
                target={"_blank"}
                className="hover:text-white"
              >
                POKT Onchain Pool Staking (<b className="text-white">POPS</b>){" "}
                <InformationCircleIcon className="inline h-4 w-4" />
              </a>{" "}
              by SendNodes.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              to="/"
              className="relative inline-flex items-center justify-center px-4 py-1 overflow-hidden font-medium text-eerie-black rounded-lg shadow-2xl group"
            >
              <span className="absolute top-0 left-0 w-40 h-40 -mt-10 -ml-3 transition-all duration-700 bg-capri rounded-full blur-md ease"></span>
              <span className="absolute inset-0 w-full h-full transition duration-700 group-hover:rotate-180 ease">
                <span className="absolute bottom-0 left-0 w-24 h-24 -ml-10 bg-aqua rounded-full blur-md"></span>
                <span className="absolute bottom-0 right-0 w-24 h-24 -mr-10 bg-capri rounded-full blur-md"></span>
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
                      <StakeTransactionItem
                        key={tx.hash}
                        tx={tx}
                        color={snActionBg[tx.action]}
                        Icon={snActionIcon[tx.action]}
                      />
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
  color: string
  Icon: (props: any) => JSX.Element
  tx: ISnTransactionFormatted
}

function StakeTransactionItem({ color, Icon, tx }: StakeTransactionItemProps) {
  const { latestBlock: poktWatchLatestBlock } = usePoktWatchLatestBlock()
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)
  const blockExplorerUrl = useBackgroundSelector(
    (_) =>
      selectBlockExplorerForTxHash({
        network: currentAccount.network,
        txHash: tx.hash,
      }),
    isEqual
  )

  const isPending = !tx.timestamp
  let [timestamp, setTimestamp] = useState(
    !isPending
      ? dayjs.utc(tx.timestamp)
      : // the next block is committed 30 minutes after the start of the previous one
        dayjs.utc(poktWatchLatestBlock?.timestamp).add(30, "minute")
  )
  const rewardTimestamp = timestamp.clone().add(24, "hour")
  const earningRewards = dayjs.utc().isAfter(rewardTimestamp)
  const isCompound =
    tx.action === SnAction.COMPOUND && tx.memo?.split(":")[1] === "true"
  const isUncompound =
    tx.action === SnAction.COMPOUND && tx.memo?.split(":")[1] === "false"
  const isRewards = tx.action === SnAction.REWARD
  const isStake = tx.action === SnAction.STAKE
  const isUnstake = tx.action === SnAction.UNSTAKE

  if (!isPending && isStake) {
    timestamp = rewardTimestamp
  }
  const relativeTimestamp = timestamp.fromNow()
  const amount = BigNumber.from(
    (isPending && isUnstake ? tx.memo.split(":")[1] : tx.amount) ??
      BigNumber.from(0)
  )

  useEffect(() => {
    if (isPending) {
      setTimestamp(dayjs.utc(poktWatchLatestBlock?.timestamp).add(30, "minute"))
      const interval = setInterval(() => {
        setTimestamp(
          dayjs.utc(poktWatchLatestBlock?.timestamp).add(30, "minute")
        )
      }, 60 * 1e3)
      return () => clearInterval(interval)
    }
  }, [tx, poktWatchLatestBlock])

  return (
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
                {!(isUncompound || isCompound) &&
                  isStake &&
                  `${tx.reward ? "Reward" : ""} ${capitalize(tx.action)}`}
                {!(isUncompound || isCompound) &&
                  !isStake &&
                  capitalize(tx.action)}
                {isCompound && "Enable Compound "}
                {isUncompound && `Disable Compound`}
              </p>
              <div className="ml-2 flex-shrink-0 flex">
                {!(isUncompound || isCompound) && (
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
                    width={"158"}
                    height={"158"}
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
              </div>
              <div className="mt-2 flex items-center text-sm text-spanish-gray sm:mt-0">
                <p className="group">
                  <span className="inline group-hover:hidden">
                    {isPending && "awaiting confirmation "}
                    {!isPending &&
                      isStake &&
                      (earningRewards
                        ? "earning rewards since "
                        : "rewards start (estimated) ")}
                    {!isPending && isUnstake && "unstaked since "}
                    <time
                      dateTime={timestamp.format("YYYY-MM-DD HH:mm:ss [UTC]")}
                      title={timestamp.format("YYYY-MM-DD HH:mm:ss [UTC]")}
                    >
                      {relativeTimestamp}
                    </time>
                  </span>
                  <span className="hidden group-hover:inline">
                    <time
                      dateTime={timestamp.format("YYYY-MM-DD HH:mm:ss [UTC]")}
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
  )
}
