import React, { ReactElement } from "react"
import { Provider } from "react-redux"
import { HashRouter, Redirect, Route, Switch } from "react-router-dom"
import { Store } from "@0xbigboss/webext-redux"
import { ErrorBoundary } from "react-error-boundary"
import Ledger from "./Ledger/Ledger"
import TabNotFound from "./TabNotFound"
import pageList from "../routes/routes"
import CorePopupPage from "../components/Core/CorePopupPage"
import ErrorFallback from "./ErrorFallback"

/**
 * Entry point for UI shown in browser tabs.
 */
export default function Tab({ store }: { store: Store }): ReactElement {
  return (
    <Provider store={store}>
      {/* HashRouter seems the only choice supporting safe page reloads. */}
      <HashRouter>
        <Switch>
          <Route path="/ledger" exact>
            <CorePopupPage hasTopBar={false}>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Ledger />
              </ErrorBoundary>
            </CorePopupPage>
          </Route>
          {pageList.map(({ path, Component, hasTopBar }) => {
            return (
              <Route key={path} path={path} exact>
                <CorePopupPage hasTopBar={hasTopBar}>
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Component />
                  </ErrorBoundary>
                </CorePopupPage>
              </Route>
            )
          })}
          <Route path="/*">
            <CorePopupPage hasTopBar={false}>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <TabNotFound />
              </ErrorBoundary>
            </CorePopupPage>
          </Route>
        </Switch>
      </HashRouter>
    </Provider>
  )
}
