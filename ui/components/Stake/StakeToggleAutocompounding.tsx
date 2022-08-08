import { Switch } from "@headlessui/react"
import { POKTActivityItem } from "@sendnodes/pokt-wallet-background/redux-slices/activities"
import { transferAsset } from "@sendnodes/pokt-wallet-background/redux-slices/assets"
import {
  selectCurrentAccount,
  selectCurrentAccountActivitiesWithTimestamps,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import clsx from "clsx"
import { isEqual } from "lodash"
import React, { useCallback, useState } from "react"
import getSnActionFromMemo from "../../helpers/get-sn-action-from-memo"
import getTransactionResult from "../../helpers/get-transaction-result"
import {
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../../hooks"
import {
  ISnTransactionFormatted,
  SnAction,
  useStakingPoktParams,
  useStakingUserData,
} from "../../hooks/staking-hooks"
import SharedSplashScreen from "../Shared/SharedSplashScreen"

export default function StakeToggleAutocompounding() {
  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)
  const dispatch = useBackgroundDispatch()
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)
  const [isSendingTransactionRequest, setIsSendingTransactionRequest] =
    useState(false)
  const {
    data: stakingPoktParamsData,
    isLoading: isStakingPoktParamsLoading,
    isError: isStakingPoktParamsError,
  } = useStakingPoktParams(currentAccount)

  const {
    data: userStakingData,
    isLoading: isUserStakingDataLoading,
    isError: isUserStakingDataError,
  } = useStakingUserData(currentAccount)

  const pendingCompoundTransactions = useBackgroundSelector(
    selectCurrentAccountActivitiesWithTimestamps,
    isEqual
  )
    .filter(
      (activity) =>
        getTransactionResult(activity).status === "pending" &&
        activity.to === stakingPoktParamsData?.wallets.siw
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
    .filter((activity) => activity !== null && activity.compound === true)
    .reverse() as ISnTransactionFormatted[]

  if (isStakingPoktParamsError) throw isStakingPoktParamsError
  if (isUserStakingDataError) throw isUserStakingDataError

  if (
    !areKeyringsUnlocked ||
    isStakingPoktParamsLoading ||
    isUserStakingDataLoading
  ) {
    return (
      <div className="grow w-full relative flex flex-col justify-center items-center">
        <SharedSplashScreen />
      </div>
    )
  }

  const sendTransactionRequest = useCallback(async () => {
    if (
      !areKeyringsUnlocked ||
      !stakingPoktParamsData?.wallets?.siw ||
      !userStakingData
    ) {
      console.warn("Somethings not right", {
        areKeyringsUnlocked,
        stakingPoktParamsData,
      })
      return
    }
    try {
      setIsSendingTransactionRequest(true)

      // memo spec is c:compound=[true|false]
      const memo = `c:${!userStakingData?.userStakingData[0]?.compound}`

      dispatch(
        transferAsset({
          fromAddressNetwork: currentAccount,
          toAddressNetwork: {
            address: stakingPoktParamsData?.wallets.siw,
            network: currentAccount.network,
          },
          assetAmount: {
            amount: 1n,
            asset: currentAccount.network.baseAsset,
          },
          memo,
          gasLimit: undefined,
        })
      )
    } finally {
      setIsSendingTransactionRequest(false)
    }
  }, [
    currentAccount,
    stakingPoktParamsData,
    userStakingData,
    dispatch,
    areKeyringsUnlocked,
  ])

  const isDisabled =
    isSendingTransactionRequest || pendingCompoundTransactions.length > 0

  return (
    <Switch.Group
      as={"div"}
      title={
        userStakingData?.userStakingData[0]?.compound
          ? "Click to disable autocompounding"
          : "Click to enable autocompounding"
      }
    >
      <div className="flex items-center justify-center gap-x-2">
        <span className="font-medium inline-block align-baseline">
          <Switch.Label>Autocompounding</Switch.Label>
        </span>
        <Switch
          checked={!!userStakingData?.userStakingData[0]?.compound}
          disabled={isDisabled}
          onChange={sendTransactionRequest}
          className={clsx(
            isDisabled ? "cursor-not-allowed" : "cursor-pointer",
            userStakingData?.userStakingData[0]?.compound
              ? "bg-capri"
              : "bg-gray-200",
            "relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none outline-transparent focus:ring-2 focus:ring-offset-2 focus:ring-aqua"
          )}
        >
          <span className="sr-only">Use setting</span>
          <span
            className={clsx(
              userStakingData?.userStakingData[0]?.compound
                ? "translate-x-5"
                : "translate-x-0",
              "pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
            )}
          >
            <span
              className={clsx(
                userStakingData?.userStakingData[0]?.compound
                  ? "opacity-0 ease-out duration-100"
                  : "opacity-100 ease-in duration-200",
                "absolute inset-0 h-full w-full flex items-center justify-center transition-opacity"
              )}
              aria-hidden="true"
            >
              <svg
                className="h-3 w-3 text-gray-400"
                fill="none"
                viewBox="0 0 12 12"
              >
                <path
                  d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              className={clsx(
                userStakingData?.userStakingData[0]?.compound
                  ? "opacity-100 ease-in duration-200"
                  : "opacity-0 ease-out duration-100",
                "absolute inset-0 h-full w-full flex items-center justify-center transition-opacity"
              )}
              aria-hidden="true"
            >
              <svg
                className="h-3 w-3 text-capri"
                fill="currentColor"
                viewBox="0 0 12 12"
              >
                <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
              </svg>
            </span>
          </span>
        </Switch>
      </div>
      {isDisabled && (
        <p className="text-xs font-light text-center mt-2">
          Awaiting TX confirmation
        </p>
      )}
    </Switch.Group>
  )
}
