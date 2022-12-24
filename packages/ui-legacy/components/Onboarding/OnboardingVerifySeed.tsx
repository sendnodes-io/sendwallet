import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import {
  clearImporting,
  importKeyring,
  KeyringMnemonic,
} from "@sendnodes/pokt-wallet-background/redux-slices/keyrings"
import { setSnackbarMessage } from "@sendnodes/pokt-wallet-background/redux-slices/ui"
import SharedButton from "../Shared/SharedButton"
import {
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../../hooks"
import OnboardingAccountLayout from "./OnboardingAccountLayout"
import OnboardingRecoveryPhrase from "./OnboardingRecoveryPhrase"
import { OnboardingNewAccountIcon } from "./Icons"
import SharedSplashScreen from "../Shared/SharedSplashScreen"

export default function OnboardingVerifySeed({
  freshKeyring,
}: {
  freshKeyring: KeyringMnemonic
}) {
  const dispatch = useBackgroundDispatch()
  const history = useHistory()
  const [selected, setSelected] = useState<number[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)
  const keyringImport = useBackgroundSelector(
    (state) => state.keyrings.importing
  )
  const freshMnemonic = freshKeyring.mnemonic

  if (!freshMnemonic) {
    throw new Error("Cannot verify without a mnemonic")
  }

  // A random set of 8 word indices from the mnemonic to verify
  const [randomWords] = useState(
    freshMnemonic
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 8)
      .map((item) => {
        return freshMnemonic.indexOf(item)
      })
  )

  // sort word indices to verify for easier checking
  const verify = randomWords.slice().sort((a, b) => a - b)

  // initialize the choices
  const [notSelected, setNotSelected] = useState(randomWords)

  const handleAdd = useCallback((item) => {
    setSelected((currentlySelected) => [...currentlySelected, item])
    setNotSelected((currentlyUnselected) =>
      currentlyUnselected?.filter((e) => e !== item)
    )
  }, [])

  const handleRemove = useCallback((selectedItem: number | undefined) => {
    if (selectedItem === undefined) return
    setNotSelected((currentlyUnselected) => [
      ...currentlyUnselected,
      selectedItem,
    ])
    setSelected((currentlySelected) =>
      currentlySelected?.filter((e) => e !== selectedItem)
    )
  }, [])

  function isVerified() {
    return (
      selected.length === verify.length &&
      selected.every((selectedIdx, i) => {
        const assignedNumber = (verify && verify[i]) || 0
        return freshMnemonic[assignedNumber] === freshMnemonic[selectedIdx]
      })
    )
  }

  useEffect(() => {
    // always start fresh
    dispatch(clearImporting())
  }, [dispatch])

  useEffect(() => {
    if (isVerified()) {
      // crypto initiated... save to keyring
      setIsImporting(true)
      dispatch(
        importKeyring({
          mnemonic: freshMnemonic.join(" "),
          source: "internal",
        })
      )
    }
  }, [selected])

  useEffect(() => {
    if (isImporting && keyringImport === "done") {
      dispatch(clearImporting()) // clean up
      // yay! account created
      history.push("/onboarding/account-created")
    }

    if (keyringImport === "failed") {
      dispatch(setSnackbarMessage("Something went wrong. Please try again."))

      setIsImporting(false)
    }
  }, [history, areKeyringsUnlocked, keyringImport, isImporting])

  if (!areKeyringsUnlocked) {
    return <SharedSplashScreen />
  }

  return (
    <div>
      <OnboardingAccountLayout
        showCloseButton
        icon={<OnboardingNewAccountIcon />}
        title={
          <h1>
            Verify secret
            <br />
            Recovery Phrase
          </h1>
        }
        body={
          <OnboardingRecoveryPhrase
            mnemonic={freshMnemonic}
            verify={verify}
            selected={selected}
            onClick={handleRemove}
          />
        }
        buttons={
          <>
            <h4>
              <small>
                Add the missing words in order <br />
                {notSelected.length === 0 && !isVerified() && (
                  <span className="error_message">Incorrect order</span>
                )}
              </small>
            </h4>

            {(notSelected.length === 0 && !isVerified()) || (
              <ul className="verify_words">
                {notSelected.map((item, idx) => (
                  <li key={`verify-word-${idx}`}>
                    <SharedButton
                      type="primary"
                      size="small"
                      onClick={() => {
                        handleAdd(item)
                      }}
                    >
                      {freshMnemonic[item]}
                    </SharedButton>
                  </li>
                ))}
              </ul>
            )}
          </>
        }
      />
      <style jsx>
        {`
          div :global(h4) {
            text-align: center;
            margin-top: -1rem;
            color: var(--spanish-gray);
            margin-bottom: 1rem;
          }
          div :global(.verify_words) {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
          }

          div :global(li) {
            display: flex;
            justify-content: center;
            width: 5rem;
          }

          div :global(.button, .button_content) {
            justify-content: center;
            width: 100%;
            padding: 0 0.5rem !important;
          }

          div :global(.button_content) {
            padding: 0 !important;
          }

          div :global(.error_message) {
            color: var(--error);
            width: 100%;
            margin-top: 2rem;
            display: block;
          }
          div :global(.buttons) {
            justify-content: flex-start !important;
            padding-top: 1rem !important;
            padding-bottom: 0 !important;
          }
        `}
      </style>
    </div>
  )
}
