import React, { ReactElement } from "react";
import { Link, useHistory } from "react-router-dom";
import {
  useAreKeyringsUnlocked,
  useBackgroundSelector,
  useIsInTab,
} from "../../hooks";
import {
  OnboardingImportKeyfileIcon,
  OnboardingImportRecoveryPhraseIcon,
  OnboardingNewAccountIcon,
} from "../../components/Onboarding/Icons";
import styles from "../../components/Onboarding/styles";
import SharedPopoutOpen from "../../components/Shared/SharedPopoutOpen";
import SharedSplashScreen from "../../components/Shared/SharedSplashScreen";

export default function OnboardingAddAccount(): ReactElement {
  const history = useHistory();

  const hasAccounts = useBackgroundSelector(
    (state) => Object.keys(state.account.accountsData).length > 0,
  );

  if (!useIsInTab("/onboarding/add-wallet")) {
    return <SharedPopoutOpen />;
  }

  // ensure wallet password is set before accepting any accounts
  if (!useAreKeyringsUnlocked(true)) {
    return <SharedSplashScreen />;
  }

  return (
    <section className="start_wrap">
      <div className="top">
        <h1>
          <b>Add / Import</b> Accounts
        </h1>

        {hasAccounts && (
          <button
            type="button"
            aria-label="close"
            className="icon_close"
            onClick={() => {
              if (history.action !== "POP") history.goBack();
              else history.push("/");
            }}
          />
        )}
      </div>
      <div className="add_account_section">
        <div className="add_account_row_wrap">
          <div className="add_account_row">
            <div className="add_account_icon">
              <Link to="/onboarding/save-seed">
                <OnboardingNewAccountIcon />
              </Link>
            </div>
            <div className="add_account_text">
              <Link to="/onboarding/save-seed">
                <h2>+ New Account</h2>
              </Link>
              <p>Create a new account by generating a new recovery phrase</p>
            </div>
          </div>
        </div>
        <div className="add_account_row_wrap">
          <div className="add_account_row">
            <div className="add_account_icon">
              <Link to="/onboarding/import-seed">
                <OnboardingImportRecoveryPhraseIcon />
              </Link>
            </div>
            <div className="add_account_text">
              <Link to="/onboarding/import-seed">
                <h2>Using Recovery Phrase</h2>
              </Link>
              <p>Recover an existing wallet by entering the recovery phrase</p>
            </div>
          </div>
        </div>
        <div className="add_account_row_wrap">
          <div className="add_account_row">
            <div className="add_account_icon">
              <Link to="/onboarding/import-keyfile">
                <OnboardingImportKeyfileIcon />
              </Link>
            </div>
            <div className="add_account_text">
              <Link to="/onboarding/import-keyfile">
                <h2>Using Keyfile or Private Key</h2>
              </Link>
              <p>
                Add a POKT keyfile wallet created on the official POKT network
                or a private key.
              </p>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{styles}</style>
      <style jsx>
        {`
          .start_wrap {
            background-image: url(./images/textures/wallet_texture@2x.png);
            background-position: center 0;
            background-size: var(--popup-width) calc(var(--popup-width) * 0.58);
            background-repeat: no-repeat;
          }

          .icon_close {
            right: 1.7em;
            top: 1.5em;
          }

          h1 {
            color: #fff;
            font-size: 1.5em;
            font-weight: 300;
            line-height: 32px;
          }
          .add_account_section {
            flex: 1;
            height: 80%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            margin-bottom: -2em;
            width: var(--popup-width);
            margin: 2em -1em -2em;
          }

          .add_account_row_wrap {
            display: flex;
            width: 100%;
            background-image: url(./images/add_wallet/stitched_slots@2x.png);
            width: var(--popup-width);
            height: 33%;
            background-size: 100%;
            background-position: center top;
            background-repeat: no-repeat;
            padding: 1.5em 1.25em 3em;
            margin-bottom: -15%;
            flex-grow: 1;
          }

          .add_account_row_wrap:nth-child(n + 2) {
            margin-top: -1em;
          }

          .add_account_row_wrap:last-child {
            background-image: url(./images/add_wallet/stitched_slots_last@2x.png);
          }

          .add_account_row {
            display: flex;
            width: 100%;
            flex-direction: row;
            column-gap: 1em;
          }

          .add_account_text {
            max-width: calc(var(--popup-width) * 0.55);
          }

          .add_account_row a {
            display: inline-block;
          }

          .add_account_text h2 {
            width: 100%;
            margin: 0.5em 0 0.75em;
            display: block;
            color: var(--capri);
            font-size: 1rem;
            line-height: 1.25rem;
            font-weight: 400;
            display: flex;
            align-items: center;
            transition: 0.2s color;
          }

          .add_account_row h2:hover {
            color: var(--white);
          }
          .add_account_text p {
            font-weight: 400;
            font-size: 0.85rem;
          }

          .add_account_icon :global(img) {
            width: 2.75rem;
            height: 2.75rem;
          }
        `}
      </style>
    </section>
  );
}
