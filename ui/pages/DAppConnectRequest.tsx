import React, { ReactElement, useCallback, useEffect } from "react"
import {
  selectCurrentPendingPermission,
  selectCurrentAccountTotal,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import {
  denyOrRevokePermission,
  grantPermission,
} from "@sendnodes/pokt-wallet-background/redux-slices/dapp-permission"

import SharedButton from "../components/Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector, useAreKeyringsUnlocked } from "../hooks"
import SharedAccountItemSummary from "../components/Shared/SharedAccountItemSummary"

function RequestingDAppBlock(props: {
  title: string
  url: string
  faviconUrl: string
}) {
  const { title, url, faviconUrl } = props
  return (
    <div className="request_wrap">
      <div className="dapp_favicon" />
      <div className="info">
        <div className="dapp_title">{title}</div>
        <div className="dapp_url">{url}</div>
      </div>
      <style jsx>{`
        .request_wrap {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .dapp_favicon {
          background: url("${faviconUrl === ""
            ? "./images/dapp_favicon_default@2x.png"
            : faviconUrl}");
          background-size: cover;
          width: 48px;
          height: 48px;
          border-radius: 12px;
        }
        .dapp_title {
          color: #fff;
          font-size: 16px;
          font-weight: 500;
        }
        .dapp_url {
          color: var(--spanish-gray);
          font-size: 16px;
        }
        .info {
          margin-left: 16px;
        }
      `}</style>
    </div>
  )
}
export default function DAppConnectRequest(): ReactElement {
  useAreKeyringsUnlocked(true)
  const currentAccountTotal = useBackgroundSelector(selectCurrentAccountTotal)

  const permission = useBackgroundSelector(selectCurrentPendingPermission)

  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    window.onbeforeunload = () => {
      if (typeof permission !== "undefined") {
        dispatch(
          denyOrRevokePermission({
            ...permission,
            state: "deny",
          })
        )
      }
    }
  }, [dispatch, permission])

  const grant = useCallback(async () => {
    if (typeof permission !== "undefined") {
      dispatch(
        grantPermission({
          ...permission,
          state: "allow",
        })
      )
    }
    window.onbeforeunload = null
    window.close()
  }, [dispatch, permission])

  const deny = useCallback(async () => {
    // The denyOrRevokePermission will be dispatched in the onbeforeunload effect
    window.close()
  }, [])

  if (
    typeof permission === "undefined" ||
    permission.accountAddress !== currentAccountTotal?.address
  ) {
    // FIXME What do we do if we end up in a weird state here? Dismiss the
    // FIXME popover? Show an error?
    return (
      <div>
        You do not seem to have an account, which is sad for a wallet :(
      </div>
    )
  }

  return (
    <div className="page">
      <section className="standard_width">
        <h1>Connect to dApp</h1>
        <div className="connection_destination">
          <div className="row">
            <RequestingDAppBlock
              title={permission.title}
              url={permission.origin}
              faviconUrl={permission.faviconUrl}
            />
          </div>
        </div>
        <div className="icon_connection" />
        <div className="connection_destination">
          <div className="row">
            <SharedAccountItemSummary
              key={permission.accountAddress}
              accountTotal={currentAccountTotal}
            />
          </div>
        </div>
        <ul className="permissions_list">
          <li className="permissions_list_title">
            dApp would get permission to:
          </li>
          <li>
            <ul>
              <li>View address of connected account</li>
              <li>Create but not sign transactions for you</li>
            </ul>
          </li>
        </ul>
      </section>
      <div className="footer_actions">
        <SharedButton
          iconSize="large"
          size="large"
          type="secondary"
          onClick={deny}
        >
          Reject
        </SharedButton>
        <div className="button_spacer"></div>
        <SharedButton
          type="primary"
          iconSize="large"
          size="large"
          onClick={grant}
        >
          Connect
        </SharedButton>
      </div>
      <style jsx>{`
        section {
          display: flex;
          flex-direction: column;
          height: 100vh;
          margin: 0 auto;
        }
        .page {
          height: 100vh;
          width: 100vw;
          z-index: 1000;
        }
        h1 {
          color: var(--aqua);
          margin-top: 45px;
          margin-bottom: 25px;
          text-align: center;
        }
        .permissions_list {
          margin-left: 16px;
        }
        ul {
          display: flex;
          flex-direction: column;
        }
        li {
          font-size: 14px;
          line-height: 20px;
          color: var(--spanish-gray);
          margin-bottom: 4px;
          margin-left: 5px;
        }
        .permissions_list_title {
          color: #fff;
          margin-bottom: 8px;
          margin-top: 15px;
          margin-left: 0px;
        }
        .connection_destination {
          width: 100%;
          height: 88px;
          border-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 16px;
          box-sizing: border-box;
          margin-bottom: 8px;
          position: relative;
        }
        .connection_destination:before {
          content: "";
          width: 100%;
          height: 100%;
          position: absolute;
          left: 0;
          background-color: var(--onyx-100);
          opacity: 0.33;
          border-radius: 1.25rem;
          -webkit-transition: background-color 0.2s,opacity 0.2s;
          transition: background-color 0.2s,opacity 0.2s;
        }
        .row {
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1;
        }
        .icon_connection {
          background: url("./images/connect@2x.png") center no-repeat;
          background-color: var(--cod-gray-200);
          border-radius: 4px;
          background-size: 18px 18px;
          border: solid 3px var(--eerie-black-100);
          width: 24px;
          height: 24px;
          margin-left: 28px;
          margin-top: -19px;
          margin-bottom: -10px;
          z-index: 3;
        }
        .footer_actions {
          position: fixed;
          bottom: 0px;
          display: flex;
          width: 100%;
          padding: 0px 16px;
          box-sizing: border-box;
          align-items: center;
          height: 80px;
          justify-content: space-between;
          box-shadow: 0 0 5px rgba(0, 20, 19, 0.5);
        }

        .button_spacer {
          width: 1rem;
        }
      `}</style>
      <style jsx global>{`
        body {
          background-color: var(--cod-gray-200);
        }
      `}</style>
    </div>
  )
}
