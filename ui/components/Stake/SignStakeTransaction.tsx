import React, { ReactElement, useCallback, useEffect, useState } from "react"
import {
  rejectTransactionSignature,
  selectIsTransactionLoaded,
  selectIsTransactionPendingSignature,
  selectIsTransactionSigned,
  selectTransactionData,
  signTransaction,
} from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction"
import {
  getAccountTotal,
  selectCurrentAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useIsSigningMethodLocked,
} from "../../hooks"
import { SigningMethod } from "@sendnodes/pokt-wallet-background/utils/signing"
import { POKTTransactionRequest } from "@sendnodes/pokt-wallet-background/networks"
import SharedSplashScreen from "../Shared/SharedSplashScreen"
import { useHistory } from "react-router-dom"
import { useStakingPoktParams } from "../../hooks/staking-hooks"
import SharedButton from "../Shared/SharedButton"
import { isEqual } from "lodash"
import { Dialog } from "@headlessui/react"
import clsx from "clsx"
import { BigNumber, formatFixed } from "@ethersproject/bignumber"
import { EnrichedPOKTTransactionRequest } from "@sendnodes/pokt-wallet-background/services/enrichment"
import { truncateAddress } from "@sendnodes/pokt-wallet-background/lib/utils"
import dayjs from "dayjs"
import * as relativeTime from "dayjs/plugin/relativeTime"
import * as localizedFormat from "dayjs/plugin/localizedFormat"

dayjs.extend(localizedFormat.default)
dayjs.extend(relativeTime.default)

import { InformationCircleIcon, XIcon } from "@heroicons/react/outline"

export default function SignStakeTransaction(): ReactElement {
  const history = useHistory()
  const dispatch = useBackgroundDispatch()
  const transactionDetails = useBackgroundSelector(selectTransactionData)

  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded
  )

  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)
  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof transactionDetails !== "undefined") {
      return getAccountTotal(state, transactionDetails.from)
    }
    return undefined
  }, isEqual)

  const { isLoading: isStakingPoktParamsLoading } =
    useStakingPoktParams(currentAccount)

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  const signingMethod = signerAccountTotal?.signingMethod ?? null

  const isLocked = useIsSigningMethodLocked(signingMethod as SigningMethod)

  const isTransactionPendingSignature = useBackgroundSelector(
    selectIsTransactionPendingSignature
  )
  const isTransactionLoaded = useBackgroundSelector(selectIsTransactionLoaded)
  const isTransactionSigned = useBackgroundSelector(selectIsTransactionSigned)

  const handleReject = useCallback(async () => {
    dispatch(rejectTransactionSignature())
  }, [dispatch])
  const handleConfirm = useCallback(async () => {
    if (
      isTransactionDataReady &&
      transactionDetails &&
      signingMethod !== null
    ) {
      dispatch(
        signTransaction({
          transaction: transactionDetails as POKTTransactionRequest,
          method: signingMethod as SigningMethod,
        })
      )
      setIsTransactionSigning(true)
    }
  }, [dispatch, isTransactionDataReady, transactionDetails, signingMethod])

  // reject the transaction if the user navigates away from the page
  useEffect(() => {
    const reject = async () => {
      await handleReject()
      return true
    }
    window.addEventListener("beforeunload", reject)
    return () => {
      window.removeEventListener("beforeunload", reject)
    }
  }, [handleReject])

  useEffect(() => {
    if (isTransactionSigned) {
      history.push("/transactions")
    }
  }, [isTransactionSigned])

  if (
    isLocked ||
    isStakingPoktParamsLoading ||
    typeof transactionDetails === "undefined" ||
    typeof signerAccountTotal === "undefined"
  ) {
    return <SharedSplashScreen />
  }

  // about 24 hours or exactly 96 blocks
  const estStakedTime = dayjs().add(96 * 15, "minutes")

  return (
    <div>
      <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4">
        <button
          type="button"
          className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aqua focus:ring-offset-aqua"
          onClick={handleReject}
        >
          <span className="sr-only">Close</span>
          <XIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div>
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full">
          <div
            className={clsx("icon-mask h-10 w-10 bg-aqua")}
            css={`
              mask-image: url("../../public/images/stake@2x.png");
            `}
          />
        </div>
        <div className="mt-3 sm:mt-5">
          <Dialog.Title
            as="h3"
            className="text-lg leading-6 font-medium text-white text-center "
          >
            STAKE
          </Dialog.Title>
          <div className="mt-2">
            <p className="text-sm text-spanish-gray text-center ">
              You are about to stake your POKT with SendNodes. Please review the
              amount.
            </p>
            <div className="px-4 py-5 sm:p-0 rounded-sm">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
                  <dt className="text-sm font-medium text-spanish-gray">
                    STAKING
                  </dt>
                  <dd className="mt-1 text-lg text-white sm:mt-0 sm:col-span-2 text-right">
                    <img
                      src="/images/pokt_icon@2x.svg"
                      className="h-5 w-5 inline mr-2"
                      alt="POKT"
                    />
                    {formatFixed(
                      BigNumber.from(
                        (transactionDetails as EnrichedPOKTTransactionRequest)
                          .txMsg.value.amount
                      ),
                      currentAccount.network.baseAsset.decimals
                    )}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
                  <dt className="text-sm font-medium text-spanish-gray">
                    FROM
                  </dt>
                  <dd
                    title={signerAccountTotal.address}
                    className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2 text-right"
                  >
                    {signerAccountTotal.name
                      ? signerAccountTotal.name
                      : truncateAddress(signerAccountTotal.address)}
                  </dd>
                </div>

                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
                  <dt className="text-sm font-medium text-spanish-gray">TO</dt>
                  <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2 text-right">
                    <img
                      src="/images/sendnodes.png"
                      width={"558"}
                      height="84"
                      className="w-full inline-block mr-2 max-w-[5rem]"
                      alt="SendNodes"
                      title="SendNodes"
                    />
                    <span className="sr-only">SendNodes</span>
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center group">
                  <dt className="text-sm font-medium text-spanish-gray">
                    <a
                      href="https://docs.sendnodes.io/start-here/frequently-asked-questions#what-is-the-staking-schedule"
                      target={"_blank"}
                      className="hover:text-white"
                      title="What is the staking schedule?"
                    >
                      Stake ETA{" "}
                      <InformationCircleIcon className="inline h-4 w-4" />
                    </a>
                  </dt>
                  <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2 text-right ">
                    <p>
                      <span className="group-hover:hidden">
                        <time
                          dateTime={estStakedTime.format("L LT")}
                          title={estStakedTime.format("L LT")}
                        >
                          {estStakedTime.fromNow()}
                        </time>
                      </span>
                      <span className="hidden group-hover:inline">
                        <time
                          dateTime={estStakedTime.format("L LT")}
                          title={estStakedTime.format("L LT")}
                        >
                          {estStakedTime.format("L LT")}
                        </time>
                      </span>
                    </p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-sm text-spanish-gray text-center ">
          It takes around 24 hours (or exactly 96 blocks) for your POKT to
          become staked and start earning rewards.
        </p>
      </div>
      <div className="mt-5 sm:mt-6">
        <SharedButton
          size="medium"
          type="primary"
          onClick={handleConfirm}
          className="w-full"
          isDisabled={isTransactionSigning}
          isLoading={isTransactionSigning}
        >
          CONFIRM
        </SharedButton>
      </div>
    </div>
  )
}
