import React, { ReactElement } from "react"
import { Provider } from "react-redux"
import { HashRouter, Redirect, Route, Switch } from "react-router-dom"
import { Store } from "webext-redux"
import Ledger from "./Ledger/Ledger"
import TabNotFound from "./TabNotFound"
import pageList from "../routes/routes"
import CorePage from "../components/Core/CorePage"
import ErrorFallback from "./ErrorFallback"
import { ErrorBoundary } from "react-error-boundary"

/**
 * Entry point for UI shown in browser tabs.
 */
export default function Tab({ store }: { store: Store }): ReactElement {
  return (
    <Provider store={store}>
      {/* HashRouter seems the only choice supporting safe page reloads. */}
      <HashRouter>
        <Switch>
          <Route path={"/ledger"} exact>
            <CorePage hasTopBar={false}>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Ledger />
              </ErrorBoundary>
            </CorePage>
          </Route>
          {pageList.map(({ path, Component, hasTopBar }) => {
            return (
              <Route key={path} path={path} exact>
                <CorePage hasTopBar={hasTopBar}>
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <Component />
                  </ErrorBoundary>
                </CorePage>
              </Route>
            )
          })}
          <Route path="/*">
            <CorePage hasTopBar={false}>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <TabNotFound />
              </ErrorBoundary>
            </CorePage>
          </Route>
        </Switch>
      </HashRouter>
    </Provider>
  )
}
