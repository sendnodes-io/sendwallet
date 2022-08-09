import React, { CSSProperties, ReactElement } from "react"
import { Provider } from "react-redux"
import { HashRouter, Redirect, Route, Switch } from "react-router-dom"
import { Store } from "webext-redux"
import TabNotFound from "./TabNotFound"
import ErrorFallback from "./ErrorFallback"
import { ErrorBoundary } from "react-error-boundary"

import OnboardingAddWallet from "./Onboarding/OnboardingAddWallet"
import SendStake from "../components/Stake/SendStake"
import SendUnstake from "../components/Stake/SendUnstake"
import CoreStakePage from "../components/Core/CoreStakePage"
import KeyringUnlock from "../components/Keyring/KeyringUnlock"
import SignTransaction from "./SignTransaction"
import StakeRequestsTransactions from "../components/Stake/StakeRequestsTransactions"
import StakeRewards from "../components/Stake/StakeRewards"

/**
 * Entry point for Stake UI
 */
export default function Stake({ store }: { store: Store }): ReactElement {
  return (
    <Provider store={store}>
      {/* HashRouter seems the only choice supporting safe page reloads. */}
      <HashRouter>
        <Switch>
          {/* {pageList.map(({ path, Component, hasTopBar }) => {
            return (
              <Route key={path} path={path} exact>
                <CorePopupPage hasTopBar={hasTopBar}>
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Component />
                  </ErrorBoundary>
                </CorePopupPage>
              </Route>
            )
          })} */}
          <Route path={"/keyring/unlock"} exact>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <div className="min-h-screen flex justify-center items-center mx-auto">
                <div
                  className="max-w-2xl base_texture p-1"
                  style={
                    {
                      "--popup-width": "20rem",
                    } as CSSProperties
                  }
                >
                  <div className="dashed_border">
                    <div className="p-4">
                      <KeyringUnlock />
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          </Route>
          <Route path={"/onboarding/add-wallet"} exact>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <div className="min-h-screen flex justify-center items-center mx-auto">
                <div
                  className="max-w-2xl base_texture p-1"
                  style={
                    {
                      "--popup-width": "20rem",
                    } as CSSProperties
                  }
                >
                  <div className="dashed_border">
                    <div className="p-4">
                      <OnboardingAddWallet />
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          </Route>
          <Route path={"/sign-transaction"} exact>
            <CoreStakePage>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <SignTransaction />
              </ErrorBoundary>
            </CoreStakePage>
          </Route>
          <Route path={"/rewards"} exact>
            <CoreStakePage>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <StakeRewards />
              </ErrorBoundary>
            </CoreStakePage>
          </Route>
          <Route path={"/transactions"} exact>
            <CoreStakePage>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <StakeRequestsTransactions />
              </ErrorBoundary>
            </CoreStakePage>
          </Route>
          <Route path={"/unstake"} exact>
            <CoreStakePage>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <SendUnstake />
              </ErrorBoundary>
            </CoreStakePage>
          </Route>
          <Route path={"/"} exact>
            <CoreStakePage>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <SendStake />
              </ErrorBoundary>
            </CoreStakePage>
          </Route>
          <Route path="/*">
            <CoreStakePage>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <TabNotFound />
              </ErrorBoundary>
            </CoreStakePage>
          </Route>
        </Switch>
      </HashRouter>
    </Provider>
  )
}
