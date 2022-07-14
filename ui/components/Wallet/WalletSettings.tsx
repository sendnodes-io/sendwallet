import React, { useState } from "react"
import { Icon } from "@iconify/react"
import { lockKeyrings } from "@sendnodes/pokt-wallet-background/redux-slices/keyrings"
import { CgLock } from "react-icons/cg"
import { useBackgroundDispatch } from "../../hooks"

export default function () {
  const dispatch = useBackgroundDispatch()
  return (
    <div className="wrap">
      <nav>
        <ul style={{ flex: "1", height: "100%" }}>
          <li>
            <a target="_blank" href="https://docs.poktwallet.io/">
              <div className="icon">
                <Icon
                  width="1.5rem"
                  height="1.5rem"
                  icon="clarity:help-info-line"
                />
              </div>
              <div>
                <h3>About Wallet</h3>
              </div>
            </a>
          </li>
          <li>
            <a
              target="_blank"
              href="https://docs.poktwallet.io/the-wallet/frequently-asked-questions"
            >
              <div className="icon">
                <Icon
                  width="1.5rem"
                  height="1.5rem"
                  icon="fluent:question-48-regular"
                />
              </div>
              <div>
                <h3>FAQs</h3>
              </div>
            </a>
          </li>
          <li>
            <a target="_blank" href="https://discord.gg/Gh76tPkjTn">
              <div className="icon">
                <Icon
                  width="1.5rem"
                  height="1.5rem"
                  icon="clarity:bubble-exclamation-line"
                />
              </div>
              <div>
                <h3>Send Feedback</h3>
              </div>
            </a>
          </li>
        </ul>
      </nav>

      <div
        style={{
          justifySelf: "flex-end",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <span style={{ color: "var(--davys-gray)" }}>
          Version: {process.env.VERSION}
        </span>
      </div>

      <div className="footer base_texture">
        <div className="dashed_border">
          <a
            href="#_"
            className="text_attention"
            title="Lock wallet"
            onClick={(e) => {
              e.preventDefault()
              dispatch(lockKeyrings())
            }}
            style={{ display: "flex", gap: "1rem" }}
          >
            <CgLock style={{ width: "1.5rem", height: "1.5rem" }} /> Lock Wallet
          </a>
        </div>
      </div>

      <style jsx>
        {`
          .wrap {
            flex-grow: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          nav {
            flex-grow: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          li {
            padding: 1rem 2rem;
            display: block;
          }

          li > a {
            display: flex;
            align-items: center;
            height: 2rem;
            gap: 1rem;
          }

          li div,
          li h3 {
            color: var(--aqua);
          }

          li:hover div,
          li:hover h3 {
            color: var(--white);
          }

          .footer {
            justify-self: flex-end;
            display: flex;
            justify-content: center;
            color: var(--attention);
            height: 6rem;
            font-size: 1.25rem;
            align-items: center;
            margin: calc(var(--main-padding) * -1);
            width: calc(var(--main-padding) * 2 + 100%);
          }

          .footer .dashed_border {
            display: flex;
            justify-content: center;
            color: var(--attention);
            height: 6rem;
            font-size: 1.25rem;
            align-items: center;
            margin: 0 calc(var(--main-padding) * -1);
            padding: 0;
            width: 100%;
          }

          .text_attention:hover {
            color: var(--white);
          }
        `}
      </style>
    </div>
  )
}
