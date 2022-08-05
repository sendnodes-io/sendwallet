import React, { ReactElement } from "react"
import {
  selectBlockExplorerForTxHash,
  selectCurrentAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"

import { useBackgroundSelector, useAreKeyringsUnlocked } from "../../hooks"
import SharedSplashScreen from "../Shared/SharedSplashScreen"
import {
  CalendarIcon,
  CollectionIcon,
  InformationCircleIcon,
  LocationMarkerIcon,
  UsersIcon,
} from "@heroicons/react/outline"

import { capitalize, isEqual } from "lodash"
import {
  ISnTransactionFormatted,
  SnAction,
  useStakingRequestsTransactions,
} from "../../hooks/staking-hooks/use-staking-requests-transactions"
import clsx from "clsx"
import { Link } from "react-router-dom"
import { CheckIcon, TrendingUpIcon } from "@heroicons/react/solid"
import { BigNumber, formatFixed } from "@ethersproject/bignumber"

import dayjs from "dayjs"
import * as relativeTime from "dayjs/plugin/relativeTime"
import * as updateLocale from "dayjs/plugin/updateLocale"
import * as utc from "dayjs/plugin/utc"

dayjs.extend(updateLocale.default)
dayjs.extend(relativeTime.default)
dayjs.extend(utc.default)

const snActionBg = {
  [SnAction.COMPOUND]: "bg-indigo",
  [SnAction.STAKE]: "bg-aqua",
  [SnAction.UNSTAKE]: "bg-white bg-opacity-75",
  [SnAction.REWARD]: "bg-emerald",
}

const snActionIcon: Record<SnAction, (props: any) => JSX.Element> = {
  [SnAction.COMPOUND]: CheckIcon,
  [SnAction.STAKE]: ({ className }: { className: string }) => (
    <div className={clsx("stake_icon", className)}></div>
  ),
  [SnAction.UNSTAKE]: ({ className }: { className: string }) => (
    <div
      className={clsx(className, "icon-mask")}
      css={`
        mask-image: url("../../public/images/unstake@2x.png");
      `}
    />
  ),
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
              <div className="max-h-[80vh] overflow-y-scroll rounded-md">
                <ul role="list" className="divide-y divide-spanish-gray">
                  {data?.map((tx, txIdx) => (
                    <StakeTransactionItem
                      key={tx.hash}
                      tx={tx}
                      color={snActionBg[tx.action]}
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
  )
}

type StakeTransactionItemProps = {
  color: string
  Icon: (props: any) => JSX.Element
  tx: ISnTransactionFormatted
}

function StakeTransactionItem({ color, Icon, tx }: StakeTransactionItemProps) {
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
    <li key={tx.hash} className="list-item hover:bg-gray-700 rounded-sm">
      <a
        href={blockExplorerUrl}
        target="_poktwatch"
        className="font-medium text-white"
      >
        <div className="px-4 py-4 sm:px-6 flex">
          <div className="flex items-center flex-shrink-0">
            <div
              className={clsx(
                "h-16 w-16 rounded-full flex items-center justify-center"
              )}
            >
              <Icon className={clsx("h-10 w-10", color)} aria-hidden="true" />
            </div>
          </div>
          <div className="flex-1 ml-4 sm:ml-6">
            <div className="flex items-center justify-between">
              <p className="text-sm sm:text-lg font-medium text-white truncate">
                {capitalize(tx.action)}
              </p>
              <div className="ml-2 flex-shrink-0 flex">
                <div
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
                  {formatFixed(
                    BigNumber.from(tx.amount),
                    currentAccount.network.baseAsset.decimals
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <div className="mt-2 flex items-center text-sm text-spanish-gray hover:text-white sm:mt-0 ">
                  <img
                    src="/images/pokt-watch.png"
                    className="h-4 w-4 mr-2"
                    width={"158"}
                    height={"158"}
                    alt="POKTWatch.io"
                  />
                  <span title={tx.hash}>
                    {tx.hash.substring(0, 5)}...
                    {tx.hash.substring(tx.hash.length - 4, tx.hash.length)}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center text-sm text-spanish-gray sm:mt-0">
                <p>
                  <time
                    dateTime={timestamp.format("YYYY-MM-DD HH:mm:ss [UTC]")}
                    title={timestamp.format("YYYY-MM-DD HH:mm:ss [UTC]")}
                  >
                    {relativeTimestamp}
                  </time>
                </p>
              </div>
            </div>
          </div>
        </div>
      </a>
    </li>
  )
}
