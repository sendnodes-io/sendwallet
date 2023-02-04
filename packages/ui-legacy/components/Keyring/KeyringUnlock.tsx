import React, { ReactElement, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { unlockKeyrings } from "@sendnodes/pokt-wallet-background/redux-slices/keyrings";
import { rejectTransactionSignature } from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction";
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
  useIsDappPopup,
} from "../../hooks";
import SharedButton from "../Shared/SharedButton";
import SharedInput from "../Shared/SharedInput";

export default function KeyringUnlock(): ReactElement {
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // const isDappPopup = useIsDappPopup()
  const history = useHistory();

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false);
  const keyringUnlocking = useBackgroundSelector(
    (state) => state.keyrings.unlocking
  );

  const dispatch = useBackgroundDispatch();

  useEffect(() => {
    // keyrings unlocked, just go back
    if (areKeyringsUnlocked) {
      if (history.action !== "POP") {
        history.goBack();
      } else {
        history.push("/");
      }
      return;
    }

    if (keyringUnlocking === "failed") {
      // If keyring was unable to unlock, display error message
      setErrorMessage("Incorrect password");
    }
  }, [history, areKeyringsUnlocked, keyringUnlocking]);

  const dispatchUnlockWallet = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    await dispatch(unlockKeyrings(password));
  };

  // const handleReject = async () => {
  //   await dispatch(rejectTransactionSignature())
  // }

  return (
    <section className="">
      {/* {isDappPopup && (
        <div className="cancel_tx_button_wrap">
          <SharedButton
            type="tertiaryWhite"
            size="small"
            onClick={handleReject}
          >
            Cancel tx
          </SharedButton>
        </div>
      )} */}
      <div>
        <h1 className="">
          <b>Unlock</b> Your Wallet
        </h1>
      </div>
      <div className="illustration_unlock" />
      <form onSubmit={dispatchUnlockWallet}>
        <div className="input_wrap">
          <SharedInput
            type="password"
            label="ENTER PASSWORD"
            autoFocus
            onChange={(value) => {
              setPassword(value);
              // Clear error message on input change
              setErrorMessage("");
            }}
            errorMessage={errorMessage}
          />
        </div>
        <SharedButton
          type="primary"
          size="large"
          isFormSubmit
          isDisabled={keyringUnlocking === "pending"}
          isLoading={keyringUnlocking === "pending"}
        >
          Unlock
        </SharedButton>
      </form>
      <style jsx>
        {`
          .illustration_unlock {
            background: url("./images/illustration_unlock@2x.png");
            background-size: cover;
            width: calc(var(--popup-width) * 0.8);
            height: calc(var(--popup-width) * 0.8);
            margin-bottom: 1rem;
            flex-shrink: 0;
          }
          section {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding-top: 3rem;
            height: 100%;
          }

          form {
            width: 100%;
          }
          .input_wrap {
            width: 20rem;
          }
          section :global(.button) {
            width: 20rem;
            justify-content: center;
          }
          .cancel_tx_button_wrap {
            width: 100%;
            display: flex;
            justify-content: flex-end;
            opacity: 0.7;
            position: fixed;
            right: 0px;
            top: 0px;
          }
        `}
      </style>
    </section>
  );
}
