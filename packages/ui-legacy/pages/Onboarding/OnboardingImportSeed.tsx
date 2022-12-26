import React, {
  FormEvent,
  ReactElement,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  clearImporting,
  importKeyring,
} from "@sendnodes/pokt-wallet-background/redux-slices/keyrings";
import { isValidMnemonic } from "@ethersproject/hdnode";
import { useHistory } from "react-router-dom";
import { setSnackbarMessage } from "@sendnodes/pokt-wallet-background/redux-slices/ui";
import SharedButton from "../../components/Shared/SharedButton";
import OnboardingRecoveryPhrase from "../../components/Onboarding/OnboardingRecoveryPhrase";
import OnboardingAccountLayout from "../../components/Onboarding/OnboardingAccountLayout";
import {
  useBackgroundSelector,
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
} from "../../hooks";
import { OnboardingImportRecoveryPhraseIcon } from "../../components/Onboarding/Icons";
import SharedSplashScreen from "../../components/Shared/SharedSplashScreen";

export default function OnboardingImportSeed() {
  const rootRef = useRef<HTMLDivElement>(null);

  const areKeyringsUnlocked = useAreKeyringsUnlocked(true);

  const [importMnemonic, setImportMnemonic] = useState(Array(24).fill(""));
  const [errorMessage, setErrorMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const dispatch = useBackgroundDispatch();
  const keyringImport = useBackgroundSelector(
    (state) => state.keyrings.importing,
  );

  const history = useHistory();

  useEffect(() => {
    // always start fresh
    dispatch(clearImporting());
  }, [dispatch]);

  useEffect(() => {
    if (isImporting && keyringImport === "done") {
      dispatch(clearImporting()); // clean up
      // yay! account created
      history.push("/onboarding/account-created");
    }

    if (keyringImport === "failed") {
      dispatch(setSnackbarMessage("Something went wrong. Please try again."));
      setIsImporting(false);
    }
  }, [history, areKeyringsUnlocked, keyringImport, isImporting]);

  if (!areKeyringsUnlocked) return <SharedSplashScreen />;

  const onInput = (e: FormEvent, wordIndex: number) => {
    // clear error
    setErrorMessage("");

    // handle pastes first
    if (e.type === "paste") {
      const nativeEvent = e.nativeEvent as ClipboardEvent;
      // Stop data actually being pasted into div
      e.stopPropagation();
      e.preventDefault();

      // Get pasted data via clipboard API
      const { clipboardData } = nativeEvent;
      const pastedData = clipboardData?.getData("Text");
      if (pastedData === undefined || rootRef.current === null) {
        return;
      }
      const inputs = Array.from(rootRef.current.querySelectorAll("input"));
      setImportMnemonic((importMnemonic) => {
        pastedData
          .toLowerCase()
          .match(/([a-z]+)/g)
          ?.forEach((word, idx) => {
            if (importMnemonic[wordIndex + idx] !== undefined) {
              importMnemonic[wordIndex + idx] = word;
              inputs[wordIndex + idx].value = word;
            }
          });
        return importMnemonic;
      });
      return;
    }

    const nativeEvent = e.nativeEvent as InputEvent;

    switch (nativeEvent.data) {
      // space bar selects next input
      case " ":
        e.currentTarget
          .closest(".word")
          ?.nextElementSibling?.querySelector("input")
          ?.select();
    }
    if (importMnemonic[wordIndex] === undefined) {
      throw new Error(
        `Mnemonic index out of bounds, tried to update word ${wordIndex}`,
      );
    }
    const input = e.target as HTMLInputElement;
    const newValue = input.value.toLowerCase().replaceAll(/[^a-z]/g, "");
    setImportMnemonic((importMnemonic) => {
      input.value = importMnemonic[wordIndex] = newValue;
      return importMnemonic;
    });
  };

  const importWallet = useCallback(async () => {
    const trimmedRecoveryPhrase = importMnemonic
      .filter((w) => !!w && w.length > 0)
      .join(" ");
    const splitTrimmedRecoveryPhrase = trimmedRecoveryPhrase.split(" ");
    if (
      splitTrimmedRecoveryPhrase.length !== 12 &&
      splitTrimmedRecoveryPhrase.length !== 24
    ) {
      setErrorMessage("Must be a 12 or 24 word recovery phrase");
    } else if (isValidMnemonic(trimmedRecoveryPhrase)) {
      setIsImporting(true);
      dispatch(
        importKeyring({
          mnemonic: trimmedRecoveryPhrase,
          source: "import",
        }),
      );
    } else {
      setErrorMessage("Invalid recovery phrase");
    }
  }, [dispatch, importMnemonic]);

  return (
    <div ref={rootRef}>
      <OnboardingAccountLayout
        showCloseButton
        icon={<OnboardingImportRecoveryPhraseIcon />}
        title={
          <>
            <div className="stacked">
              <h1>Import Account</h1>
              <h2>
                Simply copy paste, or write down the 24 word secret recovery
                phrase
              </h2>
            </div>
          </>
        }
        body={<OnboardingRecoveryPhrase importing onInput={onInput} />}
        buttons={
          <div className="full_width">
            <p className="center_text">
              <small>Pressing space will jump to the next word input</small>
            </p>

            <div style={{ marginBottom: "1rem" }}>
              <span
                style={{
                  color: "var(--error)",
                  margin: "0.5rem 0",
                  display: "inline-block",
                  textAlign: "center",
                }}
              >
                {errorMessage || <br />}
              </span>
              <SharedButton
                type="primary"
                size="large"
                iconSize="large"
                isDisabled={isImporting}
                isLoading={isImporting}
                onClick={importWallet}
              >
                IMPORT ACCOUNT
              </SharedButton>
            </div>
          </div>
        }
      />
      <style jsx>
        {`
          div :global(.top) {
            margin-top: 4rem;
            height: 5.5rem;
          }
          div :global(.stacked) {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          div :global(.stacked h2) {
            color: var(--spanish-gray);
            font-size: 1rem;
            max-width: 20rem;
            margin: 1rem 0;
            line-height: 1.5rem;
          }
          div :global(.mnemonic) {
            margin-bottom: 2rem;
          }
          div :global(.buttons) {
            padding-bottom: 2rem !important;
          }
          div :global(.buttons p) {
            color: var(--spanish-gray);
          }
          div :global(.button.tertiary) {
            font-weight: 400;
          }
        `}
      </style>
    </div>
  );
}
