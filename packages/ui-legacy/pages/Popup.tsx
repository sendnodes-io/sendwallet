import { ReactElement, useEffect } from "react";
import {
  MemoryRouter as Router,
  Switch,
  Route,
  useHistory,
  useLocation,
  Redirect,
} from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import {
  setRouteHistoryEntries,
  Location,
  trackPageView,
} from "@sendnodes/pokt-wallet-background/redux-slices/ui";

import { Store } from "@0xbigboss/webext-redux";
import { Provider } from "react-redux";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import { isAllowedQueryParamPage } from "@sendnodes/provider-bridge-shared";
import { PERSIST_UI_LOCATION } from "@sendnodes/pokt-wallet-background/features/features";
import { runtime } from "webextension-polyfill";
import { popupMonitorPortName } from "@sendnodes/pokt-wallet-background/main";
import { selectKeyringStatus } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { selectIsTransactionPendingSignature } from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction";
import {
  useIsDappPopup,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../hooks";

import {
  animationStyles,
  useAnimationConditions,
  AnimationConditions,
} from "../utils/pageTransition";

import TabBar from "../components/TabBar/TabBar";
import TopMenu from "../components/TopMenu/TopMenu";
import CorePopupPage from "../components/Core/CorePopupPage";
import ErrorFallback from "./ErrorFallback";

import pageList from "../routes/routes";
import SharedSplashScreen from "../components/Shared/SharedSplashScreen";

const pagePreferences = Object.fromEntries(
  pageList.map(({ path, hasTabBar, hasTopBar, persistOnClose }) => [
    path,
    { hasTabBar, hasTopBar, persistOnClose },
  ])
);

function transformLocation(
  inputLocation: Location,
  isTransactionPendingSignature: boolean,
  keyringStatus: "locked" | "unlocked" | "uninitialized"
): Location {
  // The inputLocation is not populated with the actual query string — even though it should be
  // so I need to grab it from the window
  const params = new URLSearchParams(window.location.search);
  const maybePage = params.get("page");

  let { pathname } = inputLocation;
  if (
    isAllowedQueryParamPage(maybePage) &&
    !inputLocation.pathname.includes("/keyring/")
  ) {
    pathname = maybePage;
  }

  if (isTransactionPendingSignature) {
    pathname =
      keyringStatus === "unlocked" ? "/sign-transaction" : "/keyring/unlock";
  }

  return {
    ...inputLocation,
    pathname,
  };
}

function useConnectPopupMonitor() {
  useEffect(() => {
    const port = runtime.connect(undefined, { name: popupMonitorPortName });

    return () => {
      port.disconnect();
    };
  }, []);
}

function RouteWrapper(props: {
  render: (
    animConditions: AnimationConditions & {
      showTabBar: boolean;
      transformedLocation: Location;
      normalizedPathname: string;
    }
  ) => ReactElement;
}): ReactElement<Route> {
  const dispatch = useBackgroundDispatch();
  const location = useLocation();
  const history = useHistory() as {
    entries?: {
      state: {
        isBack: boolean;
      };
      pathname: string;
    }[];
  };
  const isTransactionPendingSignature = useBackgroundSelector(
    selectIsTransactionPendingSignature
  );
  const keyringStatus = useBackgroundSelector(selectKeyringStatus);
  const transformedLocation = transformLocation(
    location,
    isTransactionPendingSignature,
    keyringStatus
  );

  const normalizedPathname =
    transformedLocation.pathname !== "/wallet"
      ? transformedLocation.pathname
      : "/";
  const animationConditions = useAnimationConditions(
    {
      history,
      location,
    },
    pagePreferences
  );

  const showTabBar = pagePreferences[normalizedPathname]!.hasTabBar;

  useEffect(() => {
    const pageView = async () => {
      await dispatch(
        trackPageView({
          doc_host: window.location.host,
          doc_page: normalizedPathname,
          doc_title: document.title,
        })
      );
    };
    pageView().catch(() => {});
  }, [normalizedPathname]);

  return props.render({
    ...animationConditions,
    showTabBar,
    transformedLocation,
    normalizedPathname,
  });
}

export function Main(): ReactElement {
  const dispatch = useBackgroundDispatch();
  const isDappPopup = useIsDappPopup();

  const isUiStateLoaded = useBackgroundSelector((state) => {
    return !!state.ui;
  });

  const routeHistoryEntries = useBackgroundSelector((state) => {
    return state.ui?.routeHistoryEntries;
  });

  // See comment above call of saveHistoryEntries
  function saveHistoryEntries(routeHistoryEntities: Location[] | undefined) {
    if (!routeHistoryEntities) {
      return;
    }
    const entries = routeHistoryEntities
      .reduce((agg: Partial<Location>[], entity) => {
        const { ...entityCopy } = entity as Partial<Location>;
        entityCopy.hash = undefined;
        entityCopy.key = undefined;
        agg.push(entityCopy);
        return agg;
      }, [])
      .reverse();

    if (JSON.stringify(routeHistoryEntries) !== JSON.stringify(entries)) {
      dispatch(setRouteHistoryEntries(entries));
    }
  }

  // no longer needed now that webext-redux automatically reconnects ports
  // useConnectPopupMonitor()

  if (!isUiStateLoaded) {
    return <SharedSplashScreen />;
  }

  return (
    <>
      {/*  FIXME: broken on firefox, what does TopMenu even do?
      <div className="top_menu_wrap_decoy">
        <TopMenu />
      </div> */}
      <Router initialEntries={routeHistoryEntries}>
        <RouteWrapper
          render={({
            shouldDisplayDecoy,
            isDirectionRight,
            showTabBar,
            transformedLocation,
            normalizedPathname,
          }) => {
            return (
              <>
                <Route
                  render={(routeProps) => {
                    // redirect to hash if set
                    const path = window.location.hash.replace("#", "");
                    if (
                      window.location.pathname.includes("popout.html") &&
                      path.length > 1 &&
                      pageList.find((p) => p.path === path)
                    ) {
                      window.location.hash = "";
                      return <Redirect to={path} />;
                    }

                    // `initialEntries` needs to be a reversed version of route history
                    // entities. Without avoiding the initial load, entries will keep reversing.
                    // Given that restoring our route history is a "POP" `history.action`,
                    // by specifying "PUSH" we know that the most recent navigation change is by
                    // the user or explicitly added. That said, we can still certainly "POP" via
                    // history.goBack(). This case is not yet accounted for.
                    if (
                      PERSIST_UI_LOCATION &&
                      pagePreferences[normalizedPathname]!.persistOnClose &&
                      routeProps.history.action === "PUSH"
                    ) {
                      // @ts-expect-error TODO: fix the typing
                      saveHistoryEntries(routeProps.history.entries);
                    }

                    return (
                      <TransitionGroup>
                        <CSSTransition
                          timeout={300}
                          classNames="page-transition"
                          key={
                            routeProps.location.pathname.includes(
                              "onboarding"
                            ) ||
                            routeProps.location.pathname.includes("keyring")
                              ? ""
                              : transformedLocation.key
                          }
                        >
                          <div>
                            {/* FIXME: broken on firefox, what does TopMenu even do?
                            <div
                              className={classNames("top_menu_wrap", {
                                anti_animation: shouldDisplayDecoy,
                                hide: !pagePreferences[normalizedPathname]
                                  .hasTopBar,
                              })}
                            >
                              <TopMenu />
                            </div> */}
                            {/* @ts-expect-error TODO: fix the typing when the feature works */}
                            <Switch location={transformedLocation}>
                              {pageList.map(
                                ({ path, Component, hasTopBar }) => {
                                  return (
                                    <Route path={path} key={path}>
                                      <CorePopupPage hasTopBar={hasTopBar}>
                                        <ErrorBoundary
                                          FallbackComponent={ErrorFallback}
                                        >
                                          <Component
                                            location={transformedLocation}
                                          />
                                        </ErrorBoundary>
                                      </CorePopupPage>
                                    </Route>
                                  );
                                }
                              )}
                            </Switch>
                          </div>
                        </CSSTransition>
                      </TransitionGroup>
                    );
                  }}
                />
                {showTabBar && (
                  <div className="tab_bar_wrap">
                    <TabBar />
                  </div>
                )}
                <style jsx global>
                  {`
                    /** DOT NOT REMOVE: required for styled-jsx to convert dynamic string to css */
                    div.dummy {
                      background-color: red;
                    }
                    ${animationStyles(shouldDisplayDecoy, isDirectionRight)}
                    /** DOT NOT REMOVE: required for styled-jsx to convert dynamic string to css */
                    div.dummy2 {
                      background-color: red;
                    }
                  `}
                </style>
                <style jsx global>
                  {`
                    html {
                      width: var(--popup-width);
                      height: var(--popup-height);
                      max-width: var(--popup-width);
                      max-height: var(--popup-height);
                    }
                    ::-webkit-scrollbar {
                      width: 0px;
                      background: transparent;
                    }
                    .tab_bar_wrap {
                      position: fixed;
                      bottom: 0px;
                      width: 100%;
                    }
                    .top_menu_wrap {
                      margin: 0 auto;
                      width: max-content;
                      display: block;
                      justify-content: center;
                      z-index: 0;
                      margin-top: 5px;
                    }
                    .hide {
                      display: none;
                    }
                  `}
                </style>
              </>
            );
          }}
        />
      </Router>
      {isDappPopup && (
        <style jsx global>
          {`
            body {
              height: 100%;
            }
          `}
        </style>
      )}
    </>
  );
}

export default function Popup({ store }: { store: Store }): ReactElement {
  return (
    <Provider store={store}>
      <Main />
    </Provider>
  );
}
