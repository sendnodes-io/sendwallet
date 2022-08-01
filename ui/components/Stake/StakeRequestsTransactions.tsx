import React, { ReactElement } from "react"
import {
  selectBlockExplorerForTxHash,
  selectCurrentAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"

import { useBackgroundSelector, useAreKeyringsUnlocked } from "../../hooks"
import SharedSplashScreen from "../Shared/SharedSplashScreen"
import { CollectionIcon } from "@heroicons/react/outline"

import { capitalize, isEqual } from "lodash"
import {
  ISnTransactionFormatted,
  SnAction,
  useStakingRequestsTransactions,
} from "../../hooks/staking-hooks/use-staking-requests-transactions"
import clsx from "clsx"
import { Link } from "react-router-dom"
import {
  CheckIcon,
  ReceiptRefundIcon,
  TrendingUpIcon,
} from "@heroicons/react/solid"
import { BigNumber, formatFixed } from "@ethersproject/bignumber"

import dayjs from "dayjs"
import * as relativeTime from "dayjs/plugin/relativeTime"
import * as updateLocale from "dayjs/plugin/updateLocale"
import * as utc from "dayjs/plugin/utc"

dayjs.extend(updateLocale.default)
dayjs.extend(relativeTime.default)
dayjs.extend(utc.default)

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
})

const snActionBg = {
  [SnAction.COMPOUND]: "bg-indigo",
  [SnAction.STAKE]: "bg-capri",
  [SnAction.UNSTAKE]: "bg-spanish-gray",
  [SnAction.REWARD]: "bg-emerald",
}

const snActionIcon: Record<SnAction, (props: any) => JSX.Element> = {
  [SnAction.COMPOUND]: CheckIcon,
  [SnAction.STAKE]: () => <div className="stake_icon h-5 w-5 bg-white"></div>,
  [SnAction.UNSTAKE]: ReceiptRefundIcon,
  [SnAction.REWARD]: TrendingUpIcon,
}

export default function StakeRequestsTransactions(): ReactElement {
  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)
  const { data, isLoading, isError } =
    useStakingRequestsTransactions(currentAccount)

  if (!areKeyringsUnlocked || isLoading) {
    return (
      <div className="flex-1 w-full relative flex justify-center items-center">
        <SharedSplashScreen />
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold">
              <CollectionIcon className="w-6 h-6 inline mr-2" />
              Staking Transactions
            </h1>
            <p className="mt-2 text-sm text-spanish-gray">
              A list of all staking transactions recorded on the POKT Network.
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
              <div className="shadow-sm ring-1 ring-black ring-opacity-5">
                <div className="flow-root max-h-[24rem] overflow-y-scroll">
                  <ul role="list" className="-mb-8 ">
                    {data?.map((tx, txIdx) => (
                      <StakeTransactionItem
                        key={tx.hash}
                        tx={tx}
                        isLast={txIdx !== data.length - 1}
                        bgColor={snActionBg[tx.action]}
                        Icon={snActionIcon[tx.action]}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type StakeTransactionItemProps = {
  bgColor: string
  Icon: (props: any) => JSX.Element
  isLast: boolean
  tx: ISnTransactionFormatted
}

function StakeTransactionItem({
  bgColor,
  Icon,
  isLast,
  tx,
}: StakeTransactionItemProps) {
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)
  const blockExplorerUrl = useBackgroundSelector(
    (_) =>
      selectBlockExplorerForTxHash({
        network: currentAccount.network,
        txHash: tx.hash,
      }),
    isEqual
  )

  const timestamp = dayjs.utc(tx.timestamp)
  const relativeTimestamp = timestamp.fromNow()
  return (
    <li key={tx.hash}>
      <div className="relative pb-8">
        {isLast ? (
          <span
            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-spanish-gray"
            aria-hidden="true"
          />
        ) : null}
        <div className="relative flex space-x-3">
          <div>
            <span
              className={clsx(
                bgColor,
                "h-8 w-8 rounded-full flex items-center justify-center"
              )}
            >
              <Icon className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
            <div>
              <p className="text-sm">
                <a
                  href={blockExplorerUrl}
                  target="_poktwatch"
                  className="font-medium text-white"
                >
                  {capitalize(tx.action)}{" "}
                  {formatFixed(
                    BigNumber.from(tx.amount),
                    currentAccount.network.baseAsset.decimals
                  )}{" "}
                  POKT
                </a>
              </p>
            </div>
            <div className="text-right text-sm whitespace-nowrap text-gray-500">
              <time dateTime={timestamp.format("YYYY-MM-DD HH:mm:ss [UTC]")}>
                {relativeTimestamp}
              </time>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
