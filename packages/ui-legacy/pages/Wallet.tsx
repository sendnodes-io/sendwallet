import React, { ReactElement, useEffect, useState } from "react";
import { Redirect } from "react-router-dom";
import {
  selectCurrentAccountActivitiesWithTimestamps,
  selectCurrentAccountBalances,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { useBackgroundSelector, useAreKeyringsUnlocked } from "../hooks";
import WalletActivityList from "../components/Wallet/WalletActivityList";
import WalletAccountBalanceControl from "../components/Wallet/WalletAccountBalanceControl";
import WalletHeader from "../components/Wallet/WalletHeader";
import { isEqual } from "lodash";

export default function Wallet(): ReactElement {
  const isKeyringUnlocked = useAreKeyringsUnlocked(false);
  const hasAccounts = useBackgroundSelector(
    (state) => Object.keys(state.account.accountsData).length > 0
  );
  //  accountLoading, hasWalletErrorCode
  const accountData = useBackgroundSelector(
    selectCurrentAccountBalances,
    isEqual
  );

  const { assetAmounts, totalMainCurrencyValue } = accountData ?? {
    assetAmounts: [],
    totalMainCurrencyValue: undefined,
  };

  const currentAccountActivities = useBackgroundSelector(
    selectCurrentAccountActivitiesWithTimestamps,
    isEqual
  );

  const initializationLoadingTimeExpired = useBackgroundSelector(
    (background) => background.ui?.initializationLoadingTimeExpired
  );

  // If an account doesn't exist, display onboarding
  if (!hasAccounts) {
    return <Redirect to="/onboarding/info-intro" />;
  }

  if (!isKeyringUnlocked) {
    return <Redirect push to="/keyring/unlock" />;
  }

  return (
    <>
      <div className="page_content">
        <div className="section">
          <WalletHeader />
        </div>

        <div className="section">
          <WalletAccountBalanceControl
            assets={assetAmounts}
            balance={totalMainCurrencyValue}
            initializationLoadingTimeExpired={initializationLoadingTimeExpired}
          />
        </div>
        <div className="section" style={{ flexGrow: 1 }}>
          <WalletActivityList activities={currentAccountActivities ?? []} />
        </div>
      </div>
      <style jsx>
        {`
          .section {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: calc(100% - 1rem);
          }
          .panel {
            overflow-y: auto;
            padding-top: 1rem;
          }
          .panel::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </>
  );
}
