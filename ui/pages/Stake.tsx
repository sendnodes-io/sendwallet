import React, { CSSProperties, ReactElement } from "react"
import { Provider } from "react-redux"
import { HashRouter, Redirect, Route, Switch } from "react-router-dom"
import { Store } from "webext-redux"
import TabNotFound from "./TabNotFound"
import pageList from "../routes/routes"
import ErrorFallback from "./ErrorFallback"
import { ErrorBoundary } from "react-error-boundary"
import SendStake from "./SendStake"
import CoreStakePage from "../components/Core/CoreStakePage"
import KeyringUnlock from "../components/Keyring/KeyringUnlock"
import CorePopupPage from "../components/Core/CorePopupPage"
import SignTransaction from "./SignTransaction"

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
          <Route path={"/sign-transaction"} exact>
            <CoreStakePage>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <SignTransaction />
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
