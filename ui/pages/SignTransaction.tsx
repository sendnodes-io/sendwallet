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
  selectCurrentAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useIsSigningMethodLocked,
} from "../hooks"
import SignTransactionContainer from "../components/SignTransaction/SignTransactionContainer"
import SignTransactionInfoProvider from "../components/SignTransaction/SignTransactionInfoProvider"
import SignTransactionPanelSwitcher from "../components/SignTransaction/SignTransactionPanelSwitcher"
import { SigningMethod } from "@sendnodes/pokt-wallet-background/utils/signing"
import { POKTTransactionRequest } from "@sendnodes/pokt-wallet-background/networks"
import SharedSplashScreen from "../components/Shared/SharedSplashScreen"
import { Redirect, useHistory } from "react-router-dom"
import SharedButton from "../components/Shared/SharedButton"
import { browser } from "@sendnodes/pokt-wallet-background"
import { isEqual } from "lodash"
import useStakingPoktParams from "../hooks/staking-hooks/use-staking-pokt-params"

export default function SignTransaction(): ReactElement {
  const history = useHistory()
  const dispatch = useBackgroundDispatch()
  const transactionDetails = useBackgroundSelector(selectTransactionData)

  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded
  )

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof transactionDetails !== "undefined") {
      return getAccountTotal(state, transactionDetails.from)
    }
    return undefined
  }, isEqual)

  const { data: stakingPoktData } = useStakingPoktParams()

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  const signingMethod = signerAccountTotal?.signingMethod ?? null

  const isLocked = useIsSigningMethodLocked(signingMethod as SigningMethod)

  const handleReject = async () => {
    dispatch(rejectTransactionSignature())
    history.push("/")
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

      if (signingMethod.type === "keyring") {
        history.push("/")
      }
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

  // if staking, go to staking
  if (
    window.location.pathname !== "/stake.html" &&
    stakingPoktData?.wallets.siw === transactionDetails.to
  ) {
    return (
      <div className="h-full min-h-[20rem] flex flex-col items-center justify-center">
        <h3>Please continue in the Staking app</h3>
        <SharedButton
          size="medium"
          type="primaryGhost"
          onClick={async (e) => {
            e.preventDefault()
            const tab = await browser.tabs.query({
              url: "chrome-extension://*/stake.html",
            })
            if (tab.length > 0) {
              await browser.tabs.update(tab[0].id, { active: true })
              if (tab[0].windowId)
                await browser.windows.update(tab[0].windowId, { focused: true })
            } else {
              // this should never happen but why not in case
              window.open(
                browser.runtime.getURL("stake.html"),
                "poktwallet_stake"
              )
            }
          }}
        >
          Take me there
        </SharedButton>
      </div>
    )
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
