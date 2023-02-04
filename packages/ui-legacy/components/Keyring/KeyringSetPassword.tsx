import { createPassword } from "@sendnodes/pokt-wallet-background/redux-slices/keyrings";
import React, { ReactElement, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useBackgroundDispatch, useAreKeyringsUnlocked } from "../../hooks";
import SharedButton from "../Shared/SharedButton";
import SharedInput from "../Shared/SharedInput";
import OnboardingAccountLayout from "../Onboarding/OnboardingAccountLayout";
import { OnboardingNewAccountIcon } from "../Onboarding/Icons";

export default function KeyringSetPassword(): ReactElement {
  const [password, setPassword] = useState("");
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const history = useHistory();

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false);

  const dispatch = useBackgroundDispatch();

  useEffect(() => {
    if (areKeyringsUnlocked) {
      history.push("/onboarding/add-wallet");
    }
  }, [history, areKeyringsUnlocked]);

  const validatePassword = (): boolean => {
    if (password.length < 8) {
      setPasswordErrorMessage("Must be at least 8 characters");
      return false;
    }
    if (password !== passwordConfirmation) {
      setPasswordErrorMessage("Passwords don't match");
      return false;
    }
    return true;
  };

  const handleInputChange = (
    f: (value: string) => void
  ): ((value: string) => void) => {
    return (value: string) => {
      // If the input field changes, remove the error.
      setPasswordErrorMessage("");
      return f(value);
    };
  };

  const dispatchCreatePassword = (): void => {
    if (validatePassword()) {
      dispatch(createPassword(password));
    }
  };

  return (
    <div>
      <OnboardingAccountLayout
        icon={<OnboardingNewAccountIcon />}
        title={
          <>
            <h1>
              <b>Set</b> password
            </h1>
          </>
        }
        body={
          <div className="form_wrap">
            <img
              src="./images/fingerprint@2x.png"
              alt="Wallet Fingerprint"
              height="82"
              width="82"
            />

            <p>
              Lets secure your wallet first. Please note that you will NOT be
              able to change this password (for now).
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                dispatchCreatePassword();
              }}
            >
              <div className="input_wrap">
                <SharedInput
                  type="password"
                  label="ENTER PASSWORD"
                  onChange={handleInputChange(setPassword)}
                  errorMessage={passwordErrorMessage}
                  autoFocus
                  focusedLabelBackgroundColor="var(--eerie-black-200)"
                />
              </div>
              <div className="input_wrap">
                <SharedInput
                  type="password"
                  label="CONFIRM PASSWORD"
                  onChange={handleInputChange(setPasswordConfirmation)}
                  errorMessage={passwordErrorMessage}
                  focusedLabelBackgroundColor="var(--eerie-black-200)"
                />
              </div>
              <SharedButton
                type="primary"
                size="large"
                onClick={dispatchCreatePassword}
                showLoadingOnClick={!passwordErrorMessage}
                disableOnClick
                isFormSubmit
              >
                NEXT STEP
              </SharedButton>
            </form>
          </div>
        }
        buttons={<></>}
      />
      <style jsx>
        {`
          div :global(.top) {
            margin-top: 3.5rem;
          }

          div :global(.form_wrap img) {
            margin: 1rem 0 2rem;
            width: 5rem;
            height: 5rem;
          }

          div :global(p) {
            text-align: center;
            max-width: 19rem;
            margin-bottom: 2rem;
          }

          div :global(.form_wrap) {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          div :global(form) {
            width: 100%;
          }

          div :global(.input_wrap) {
            margin-bottom: 1.25rem;
            width: 100%;
          }
        `}
      </style>
    </div>
  );
}
