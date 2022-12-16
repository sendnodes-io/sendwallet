import React, { ReactElement } from "react"
import {
  selectBlockExplorerForAddress,
  selectCurrentAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import { ActivityItem } from "@sendnodes/pokt-wallet-background/redux-slices/activities"
import css from "styled-jsx/css"
import { useBackgroundSelector } from "../../hooks"
import WalletActivityListItem from "./WalletActivityListItem"
import useStakingAllTransactions from "../../hooks/staking-hooks/use-staking-all-transactions"
import SharedSplashScreen from "../Shared/SharedSplashScreen"

type Props = {
  activities: ActivityItem[]
}

const walletActivityCss = css`
  .wrap {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    height: 16rem;
    padding-bottom: 0.5rem;
    width: 100%;
    overflow-y: hidden;
  }
  h2 {
    font-weight: 300;
  }
  h2 small {
    display: inline-block;
  }
  .row {
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }
`

export default function WalletActivityList({
  activities,
}: Props): ReactElement {
  const { isLoading } = useStakingAllTransactions()
  const currentAccount = useBackgroundSelector(selectCurrentAccount)
  const blockExplorerUrl = useBackgroundSelector((_) =>
    selectBlockExplorerForAddress(currentAccount)
  )

  if (!activities || activities.length === 0)
    return (
      <div className="wrap">
        <div className="row">
          <h2>
            <small>YOUR ACTIVITY</small>
            <br />
            <span>
              no activities
              <br />
              to show
            </span>
          </h2>
        </div>
        <div className="row">
          <ul className="legend">
            <li>
              <div
                className="legend_color"
                style={{ backgroundColor: "var(--attention)" }}
              />{" "}
              - pending
            </li>
            <li>
              <div
                className="legend_color"
                style={{ backgroundColor: "var(--success)" }}
              />{" "}
              - success
            </li>
            <li>
              <div
                className="legend_color"
                style={{ backgroundColor: "var(--error)" }}
              />{" "}
              - failure
            </li>
          </ul>
          <img
            src="./images/calculator@2x.png"
            alt="No activities to show"
            width="121"
            height="71"
            style={{ width: "7.5625rem", height: "4.4375rem" }}
          />
        </div>
        <style jsx>{walletActivityCss}</style>
        <style jsx>
          {`
            .wrap {
              display: flex;
              flex-direction: column;
              flex: 1;
            }
            .row {
              flex-grow: 1;
            }
            h2 span {
              display: inline-block;
              font-weight: 100;
              font-size: 3.25rem;
              line-height: 3.25rem;
              margin-bottom: 1rem;
              color: var(--gray-web-100);
            }

            .legend {
              margin-left: 0.5rem;
              padding-bottom: 0.5rem;
            }

            .legend li {
              display: block;
              position: relative;
              margin-bottom: 0.25rem;
            }

            .legend_color {
              display: block;
              position: absolute;
              left: -0.5rem;
              top: 0.45rem;
              height: 0.5rem;
              width: 0.25rem;
              border-radius: 1rem;
            }
          `}
        </style>
      </div>
    )

  return (
    <>
      <div className="wrap">
        <div className="row">
          <h2>
            <small>YOUR ACTIVITY</small>
          </h2>
          <a
            href={blockExplorerUrl}
            title="See All Activity"
            target="_blank"
            rel="noreferrer"
          >
            See All
          </a>
        </div>
        <div className="row activites">
          {isLoading && (
            <div className="h-full flex relative w-full">
              <SharedSplashScreen />
            </div>
          )}
          {!isLoading && (
            <ul>
              {activities.map((activityItem) => {
                if (activityItem) {
                  return (
                    <WalletActivityListItem
                      key={activityItem?.hash}
                      activity={activityItem}
                      asAccount={currentAccount.address}
                    />
                  )
                }
                return <></>
              })}
            </ul>
          )}
        </div>
      </div>

      <style jsx>{walletActivityCss}</style>
      <style jsx>
        {`
          .row {
            margin-bottom: 0.5rem;
            align-items: center;
          }
          a {
            color: var(--aqua);
            text-align: right;
            font-size: 0.75rem;
          }
          a:hover {
            color: var(--white);
          }
          .activites {
            flex-grow: 1;
            height: 14.5rem;
            margin-bottom: 0;
            overflow-y: auto;
            justify-content: flex-start;
            align-items: flex-start;
          }
          .wrap {
            width: 100%;
          }
          h2 {
            font-weight: 300;
          }
          h2 small {
            display: inline-block;
          }
          ul,
          ul :global(li) {
            display: flex;
            width: 100%;
          }

          ul {
            flex-direction: column;
            gap: 0.25rem;
          }
        `}
      </style>
    </>
  )
}
