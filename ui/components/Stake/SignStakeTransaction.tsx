import React, { ReactElement, useEffect, useState } from "react"
import {
  rejectTransactionSignature,
  selectIsTransactionLoaded,
  selectTransactionData,
  signTransaction,
} from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction"
import {
  AccountTotal,
  getAccountTotal,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useIsSigningMethodLocked,
} from "../../hooks"
import SignTransactionContainer from "../SignTransaction/SignTransactionContainer"
import SignTransactionInfoProvider from "../SignTransaction/SignTransactionInfoProvider"
import SignTransactionPanelSwitcher from "../SignTransaction/SignTransactionPanelSwitcher"
import { SigningMethod } from "@sendnodes/pokt-wallet-background/utils/signing"
import { POKTTransactionRequest } from "@sendnodes/pokt-wallet-background/networks"
import SharedSplashScreen from "../Shared/SharedSplashScreen"
import { Redirect, useHistory } from "react-router-dom"
import { isEqual } from "lodash"

export default function SignStakeTransaction(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const transactionDetails = useBackgroundSelector(
    selectTransactionData,
    isEqual
  )

  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded,
    isEqual
  )

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof transactionDetails !== "undefined") {
      return getAccountTotal(state, transactionDetails.from)
    }
    return undefined
  }, isEqual)

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  const signingMethod = signerAccountTotal?.signingMethod ?? null

  const isLocked = useIsSigningMethodLocked(signingMethod as SigningMethod)

  const handleReject = async () => {
    dispatch(rejectTransactionSignature())
  }
  const handleConfirm = async () => {
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
  }

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

  if (isLocked) return <SharedSplashScreen />

  if (
    typeof transactionDetails === "undefined" ||
    typeof signerAccountTotal === "undefined"
  ) {
    // TODO Some sort of unexpected state error if we end up here... Or do we
    // go back in history? That won't work for dApp popovers though.
    return <SharedSplashScreen />
  }

  return (
    <SignTransactionInfoProvider>
      {({
        title,
        infoBlock,
        textualInfoBlock,
        confirmButtonLabel,
        rejectButtonLabel,
      }) => (
        <SignTransactionContainer
          signerAccountTotal={signerAccountTotal as AccountTotal}
          title={title}
          rejectButtonLabel={rejectButtonLabel}
          confirmButtonLabel={confirmButtonLabel}
          handleConfirm={handleConfirm}
          handleReject={handleReject}
          detailPanel={infoBlock}
          reviewPanel={textualInfoBlock}
          extraPanel={<SignTransactionPanelSwitcher />}
          isTransactionSigning={isTransactionSigning}
          isArbitraryDataSigningRequired={
            "input" in transactionDetails && !!transactionDetails.input
          }
        />
      )}
    </SignTransactionInfoProvider>
  )
}
