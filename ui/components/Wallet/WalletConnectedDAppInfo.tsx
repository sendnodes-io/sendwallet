import React, { useState, useEffect } from "react"
import { PermissionRequest } from "@sendnodes/provider-bridge-shared"
import { denyOrRevokePermission } from "@sendnodes/pokt-wallet-background/redux-slices/dapp-permission"
import { useBackgroundDispatch } from "../../hooks"
export default function (props: {
  currentPermission: PermissionRequest
  permissions: { [k: string]: PermissionRequest }
  close: () => void
}) {
  const dispatch = useBackgroundDispatch()
  const [permissions, setPermissions] = useState<PermissionRequest[]>([])

  const { permissions: unfiltered, currentPermission } = props
  const { key: pKey = "" } = currentPermission

  useEffect(() => {
    const filtered = Object.keys(unfiltered)
      .filter((o) => o !== pKey)
      .map((k) => unfiltered[k])
    const perms =
      pKey && unfiltered[pKey] ? [currentPermission, ...filtered] : filtered
    setPermissions(perms)
  }, [unfiltered, currentPermission])

  return (
    <div className="wrap">
      <ul>
        {permissions.map((p, i) => {
          const {
            key: k = "",
            origin: o = "",
            title: t = "",
            faviconUrl: u = "",
          } = p
          const bkgStyle: React.CSSProperties = {}
          if (u) bkgStyle.backgroundImage = `url("${u}")`
          return (
            <li
              key={`${o}-${i}`}
              className={`dApp ${
                k === pKey ? "active" : "inactive dashed_border_thin"
              }`}
            >
              <div className="left">
                <div className={`favicon`} style={bkgStyle} />
              </div>
              <div className="center">
                <h3 className="title">{t}</h3>
                <p className="url">{o}</p>
              </div>
              <div className="right">
                <button
                  onClick={() => {
                    dispatch(denyOrRevokePermission({ ...p, state: "deny" }))
                  }}
                >
                  <div className={`icon disconnect`} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {!permissions.length ? (
        <p>You have not connected POKT Wallet to any dApps.</p>
      ) : (
        <></>
      )}
      <style jsx>
        {`
          .wrap {
            flex-grow: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding: 0 0.5rem;
            overflow-y: auto;
          }
          .dApp {
            overflow: hidden;
            position: relative;
            display: flex;
            flex-direction: row;
            margin: 0.5rem 0;
            padding: 1rem 0.75rem;
            border-radius: 1rem;
          }
          .dApp:before,
          .dApp:after {
            content: "";
            display: block;
            position: absolute;
            left: 0;
            top: 48%;
            transform: translateY(-50%);
            height: 1.5rem;
            width: 0.25rem;
            border-radius: 0 0.1rem 0.1rem 0;
            z-index: 1;
          }
          .dApp:after {
            filter: blur(0.5rem);
          }

          .dApp.active {
            background-color: var(--black);
          }
          .dApp.active:before,
          .dApp.active:after {
            background: var(--success);
          }

          .dApp.inactive:before,
          .dApp.inactive:after {
            background: var(--error);
          }

          .left,
          .right {
            width: 36px;
            display: flex;
            flex-direction: column;
            justify-content: space-around;
          }
          .center {
            width: 100%;
            padding: 0 0.5rem;
          }
          .favicon {
            background: url("./images/dapp_favicon_default@2x.png");
            background-size: cover;
            width: 32px;
            height: 32px;
            border-radius: 16px;
            margin: auto;
          }
          .title {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            line-height: 22px;
          }
          .url {
            color: var(--spanish-gray);
            font-size: 12px;
          }
          .icon {
            background-position: center;
            background-repeat: no-repeat;
            background-size: cover;
            width: 32px;
            height: 32px;
          }
          .icon.connect {
            background-image: url("./images/connect@2x.png") center;
          }
          .icon.disconnect {
            background-image: url("./images/disconnect@2x.png");
          }
        `}
      </style>
    </div>
  )
}
