import React, { useState, useCallback, useEffect } from "react"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import { PermissionRequest } from "@sendnodes/provider-bridge-shared"
import AccountsNotificationPanel from "../AccountsNotificationPanel/AccountsNotificationPanel"
import { useBackgroundSelector } from "../../hooks"
import openPoktWalletTab from "../../helpers/open-pokt-wallet-tab"
import {
  getCurrentAccountState,
  selectAllowedPages,
  selectActiveTab,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import WalletSettings from "./WalletSettings"
import WalletConnectedDAppInfo from "./WalletConnectedDAppInfo"
import { Icon } from "@iconify/react"
import NetworkSelector from "../NetworkSelector"

function DappConnectivityButton(props: {
  title: string
  onClick: () => void
  connected: boolean
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Current dApp connection status"
        className="connection_button dashed_border_thin"
        onClick={props.onClick}
      >
        <span
          className={`connection_icon ${
            props.connected ? "connected" : "disconnected"
          }`}
        />
        <span className="connection_text">{props.title}</span>
      </button>
      <style jsx>{`
        .connection_button {
          border-radius: 16px;
          color: var(--white);
          padding: 5px 20px;
          margin: 0;
          font-size: 14px;
        }
        .connection_button:hover {
          background-color: var(--cod-gray-200);
        }

        .connection_icon {
          width: 16px;
          height: 16px;
          display: inline-block;
          position: relative;
          top: 4px;
          margin-right: 6px;
        }
        .connection_icon.connected {
          background: url("./images/connect@2x.png") center no-repeat;
          background-size: 16px 16px;
        }
        .connection_icon.disconnected {
          background: url("./images/disconnect@2x.png") center no-repeat;
          background-size: 16px 16px;
        }

        .connection_text {
          display: inline-block;
        }
      `}</style>
    </>
  )
}

export default function WalletHeader() {
  const [isWalletsOpen, setIsWalletsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isNetworksOpen, setIsNetworksOpen] = useState(false)
  const [isConnectedToDApp, setIsConnectedToDApp] = useState(false)
  const [isActiveDAppConnectionInfoOpen, setIsActiveDAppConnectionInfoOpen] =
    useState(false)
  const showNewTabButton = !window.location.pathname.includes("tab.html")
  const currentAccount = useBackgroundSelector(getCurrentAccountState)
  const currentAddress =
    !currentAccount || currentAccount === "loading"
      ? null
      : currentAccount.address
  const activeTab = useBackgroundSelector(selectActiveTab)
  const allowedPages = useBackgroundSelector(selectAllowedPages)
  const [currentPermission, setCurrentPermission] = useState<PermissionRequest>(
    {} as PermissionRequest
  )

  const initPermissionAndOrigin = useCallback(async () => {
    if (!currentAddress) return
    if (!activeTab || !activeTab.url) return
    const { origin } = new URL(activeTab.url)
    const allowPermission = allowedPages[`${origin}_${currentAddress}`]
    if (allowPermission) {
      setCurrentPermission(allowPermission)
      setIsConnectedToDApp(true)
    } else {
      setCurrentPermission({} as PermissionRequest)
      setIsConnectedToDApp(false)
    }
  }, [allowedPages, setCurrentPermission, currentAddress, activeTab])

  useEffect(() => {
    initPermissionAndOrigin()
  }, [initPermissionAndOrigin])
  return (
    <div className="header ">
      <div className="row">
        <div className="start">
          <a
            href="#_"
            title="Open manage wallets menu"
            className="icon_button "
            onClick={(e) => {
              e.preventDefault()
              setIsWalletsOpen(true)
            }}
          >
            <span className="icon accounts_button"> </span>
          </a>
          {showNewTabButton ? (
            <a
              href="#_"
              onClick={(e) => {
                e.preventDefault()
                openPoktWalletTab()
                window.close()
              }}
              title="Expanded Wallet view"
              className="icon_button"
            >
              <span className="icon icon_new_tab"> </span>
            </a>
          ) : null}
        </div>
        <div className="center">
          <DappConnectivityButton
            title={
              currentAccount !== "loading" &&
              currentAccount &&
              currentAccount.name
                ? currentAccount.name
                : "Your Wallet"
            }
            onClick={() => {
              setIsActiveDAppConnectionInfoOpen(!isActiveDAppConnectionInfoOpen)
            }}
            connected={isConnectedToDApp}
          />
        </div>
        <div className="end">
          {
            // TODO: v0.2.1 re-enable network selector
            process.env.NODE_ENV == "development" ? (
              <a
                href="#_"
                title="Open network menu"
                className="icon_button"
                onClick={(e) => {
                  e.preventDefault()
                  setIsNetworksOpen(true)
                }}
              >
                <Icon
                  width="1.25rem"
                  height="1.25rem"
                  icon="fluent:database-switch-20-regular"
                />
              </a>
            ) : undefined
          }
          <a
            href="#_"
            title="Open settings menu"
            className="icon_button"
            onClick={(e) => {
              e.preventDefault()
              setIsSettingsOpen(true)
            }}
          >
            <span className="icon settings_button"> </span>
          </a>
        </div>
        <SharedSlideUpMenu
          title={
            <DappConnectivityButton
              title="Connected dApps"
              onClick={() => {}}
              connected={isConnectedToDApp}
            />
          }
          size="full"
          isOpen={isActiveDAppConnectionInfoOpen}
          close={() => {
            setIsActiveDAppConnectionInfoOpen(false)
          }}
        >
          <WalletConnectedDAppInfo
            currentPermission={currentPermission}
            permissions={allowedPages}
            close={() => {}}
          />
        </SharedSlideUpMenu>

        <SharedSlideUpMenu
          title="Manage Wallets"
          size="full"
          isOpen={isWalletsOpen}
          close={() => {
            setIsWalletsOpen(false)
          }}
          closeOnClickOutside={!isNetworksOpen}
          // TODO: v0.2.1 re-enable network selector
          leftButton={
            process.env.NODE_ENV == "development" ? (
              <a
                href="#_"
                title="Open network menu"
                className="icon_button"
                onClick={(e) => {
                  e.preventDefault()
                  setIsNetworksOpen(true)
                }}
              >
                <Icon
                  width="1.25rem"
                  height="1.25rem"
                  icon="fluent:database-switch-20-regular"
                />
              </a>
            ) : undefined
          }
        >
          <AccountsNotificationPanel
            onCurrentAddressChange={() => setIsWalletsOpen(false)}
          />
        </SharedSlideUpMenu>

        <SharedSlideUpMenu
          isOpen={isSettingsOpen}
          size="full"
          title="Wallet Settings"
          close={() => {
            setIsSettingsOpen(false)
          }}
        >
          <WalletSettings />
        </SharedSlideUpMenu>

        {
          // TODO: v0.2.1 re-enable network selector
          process.env.NODE_ENV == "development" ? (
            <SharedSlideUpMenu
              isOpen={isNetworksOpen}
              size="full"
              title="Change Networks"
              close={() => {
                setIsNetworksOpen(false)
              }}
            >
              <NetworkSelector
                onAddressNetworkChange={() => setIsNetworksOpen(false)}
              />
            </SharedSlideUpMenu>
          ) : null
        }
      </div>
      <style jsx>{`
        .header {
          width: 100%;
          margin-bottom: 1rem;
        }

        .row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          padding: 1rem 0;
        }
        .header .row {
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .row .start {
          display: flex;
          gap: 0.25rem;
        }

        .row .center {
          text-align: center;
          width: 230px;
        }

        .row .end {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .header a {
          color: var(--aqua);
        }

        .header a:hover,
        .header a:active {
          color: var(--white);
        }

        .icon_button .icon {
          mask-size: cover;
          width: 1rem;
          height: 1rem;
          background-color: var(--aqua);
          display: inline-block;
          transition: all 0.2s;
        }

        .icon_button .icon:hover {
          background-color: var(--white);
        }

        .accounts_button {
          mask-image: url("./images/accounts@2x.png");
        }

        .settings_button {
          mask-image: url("./images/settings@2x.png");
        }

        h1 {
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
