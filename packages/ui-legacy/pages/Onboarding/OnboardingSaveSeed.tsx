import React, { ReactElement, useCallback, useEffect, useState } from "react";
import {
  EventNames,
  GenerateKeyringResponse,
  generateNewKeyring,
  KeyringMnemonic,
} from "@sendnodes/pokt-wallet-background/redux-slices/keyrings";
import { useHistory } from "react-router-dom";
import { setSnackbarMessage } from "@sendnodes/pokt-wallet-background/redux-slices/ui";
import { browser } from "@sendnodes/pokt-wallet-background";
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks";
import SharedButton from "../../components/Shared/SharedButton";
import OnboardingRecoveryPhrase from "../../components/Onboarding/OnboardingRecoveryPhrase";
import OnboardingAccountLayout from "../../components/Onboarding/OnboardingAccountLayout";
import OnboardingVerifySeed from "../../components/Onboarding/OnboardingVerifySeed";
import { OnboardingNewAccountIcon } from "../../components/Onboarding/Icons";
import SharedLoadingSpinner from "../../components/Shared/SharedLoadingSpinner";
import SharedSplashScreen from "../../components/Shared/SharedSplashScreen";

export default function OnboardingSaveSeed() {
  const dispatch = useBackgroundDispatch();

  const areKeyringsUnlocked = useAreKeyringsUnlocked(true);

  const [savedMnemonic, setSavedMnemonic] = useState(false);
  const [freshKeyring, setFreshKeyring] = useState<KeyringMnemonic | null>(
    null,
  );

  const generateFreshMnemonicMessageHandler = (message: any) => {
    const { [EventNames.GENERATE_NEW_KEYRING]: freshKeyring } =
      message as GenerateKeyringResponse;
    if (!freshKeyring) {
      return;
    }

    // stop listening
    browser.runtime.onMessage.removeListener(
      generateFreshMnemonicMessageHandler,
    );

    // set the new keyring
    setFreshKeyring(freshKeyring);
  };

  useEffect(() => {
    if (!freshKeyring) {
      // ready to receive
      browser.runtime.onMessage.addListener(
        generateFreshMnemonicMessageHandler,
      );

      // request new keyring
      dispatch(generateNewKeyring());

      // ensure no listeners left behind
      return () => {
        browser.runtime.onMessage.removeListener(
          generateFreshMnemonicMessageHandler,
        );
      };
    }
  }, []);

  if (!areKeyringsUnlocked) {
    return <SharedSplashScreen />;
  }

  return !savedMnemonic || freshKeyring === null ? (
    <div>
      <OnboardingAccountLayout
        showCloseButton
        icon={<OnboardingNewAccountIcon />}
        title={
          <h1>
            Write down your
            <br />
            Recovery Phrase
          </h1>
        }
        body={
          <>
            {freshKeyring ? (
              <OnboardingRecoveryPhrase
                mnemonic={freshKeyring.mnemonic}
                verify={[]}
              />
            ) : (
              <div className="loading">
                <SharedLoadingSpinner size="large" />
              </div>
            )}
          </>
        }
        buttons={
          <>
            <div style={{ marginBottom: "1em" }}>
              <SharedButton
                type="primaryGhost"
                size="large"
                iconSize="large"
                onClick={() => setSavedMnemonic(true)}
              >
                I WROTE IT DOWN
              </SharedButton>
            </div>
            <SharedButton
              type="tertiary"
              size="medium"
              icon="copy"
              iconSize="large"
              onClick={() => {
                if (freshKeyring) {
                  navigator.clipboard.writeText(
                    freshKeyring.mnemonic
                      ?.map((w, i) => `${i + 1}.\t${w}\n`)
                      .join("") ?? "",
                  );
                  dispatch(setSnackbarMessage("Copied!"));
                }
              }}
            >
              Copy to Clipboard
            </SharedButton>
          </>
        }
      />
      <style jsx>
        {`
          div {
            height: 100%;
            width: 100%;
          }
          div :global(.buttons) {
            padding-bottom: 2rem !important;
          }
          div :global(.button.tertiary) {
            font-weight: 400;
          }

          div :global(.loading) {
            height: 20rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
        `}
      </style>
    </div>
  ) : (
    <OnboardingVerifySeed freshKeyring={freshKeyring} />
  );
}
