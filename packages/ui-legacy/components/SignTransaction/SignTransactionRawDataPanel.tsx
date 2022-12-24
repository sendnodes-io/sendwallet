import React, { ReactElement } from "react"
import { useDispatch } from "react-redux"
import { setSnackbarMessage } from "@sendnodes/pokt-wallet-background/redux-slices/ui"
import { selectTransactionData } from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction"
import SharedButton from "../Shared/SharedButton"
import { useBackgroundSelector } from "../../hooks"

export default function SignTransactionRawDataPanel(): ReactElement {
  const dispatch = useDispatch()
  const transactionDetails = useBackgroundSelector(selectTransactionData)
  if (!transactionDetails) return <></>

  // TODO: v0.2.0 the TX should produce it's raw
  let data: string | null = ""
  if ("input" in transactionDetails) {
    data = transactionDetails.input
  }
  if ("txMsg" in transactionDetails) {
    data = JSON.stringify(transactionDetails.txMsg, null, 2)
  }

  const copyData = () => {
    navigator.clipboard.writeText(data ?? "")
    dispatch(setSnackbarMessage("Raw data copied to clipboard"))
  }

  return (
    <div className="width_full">
      <div className="button_wrap">
        <SharedButton
          type="tertiary"
          icon="copy"
          size="small"
          iconSize="secondaryMedium"
          iconPosition="left"
          onClick={copyData}
        >
          Copy
        </SharedButton>
      </div>
      <pre className="raw_data_text">{data}</pre>
      <style jsx>{`
        .width_full {
          height: 100%;
        }
        .raw_data_text {
          margin: 0.25rem 0;
          padding: 1rem;
          border-radius: 0.25rem;
          background-color: var(--eerie-black-100);
          color: var(--spanish-gray);
          overflow-wrap: break-word;
          width: 100%;
          height: 100%;
          overflow: scroll;
          font-size: 0.75rem;
        }

        .button_wrap {
          background-color: var(--eerie-black-100);
          border-radius: 0.25rem;
          position: absolute;
          right: 1rem;
        }

        .button_wrap :global(.button) {
          width: auto;
        }
      `}</style>
    </div>
  )
}
