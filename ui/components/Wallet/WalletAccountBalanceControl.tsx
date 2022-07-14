import React, { ReactElement, useCallback, useState } from "react"
import classNames from "classnames"
import { useDispatch } from "react-redux"
import { refreshBackgroundPage } from "@sendnodes/pokt-wallet-background/redux-slices/ui"
import {
  selectCurrentAccountSigningMethod,
  selectCurrentAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import { useBackgroundSelector, useLocalStorage } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import { setSnackbarMessage } from "@sendnodes/pokt-wallet-background/redux-slices/ui"
import t from "../../utils/i18n"
import { CompleteAssetAmount } from "@sendnodes/pokt-wallet-background/redux-slices/accounts"
import DollarSvg from "../Icons/DollarSvg"
import SharedAddress from "../Shared/SharedAddress"
import { POKT } from "@sendnodes/pokt-wallet-background/constants"
import formatTokenAmount from "../../utils/formatTokenAmount"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import SharedAssetIcon from "../Shared/SharedAssetIcon"

function ReadOnlyNotice(): ReactElement {
  return (
    <div className="notice_wrap">
      <div className="icon_eye" />
      {t("readOnlyNotice")}
      <style jsx>{`
        .notice_wrap {
          width: 177px;
          height: 40px;
          background: rgba(238, 178, 24, 0.1);
          border-radius: 2px;
          margin-top: 6px;
          font-weight: 500;
          font-size: 16px;
          display: flex;
          align-items: center;
          border-left: solid 2px var(--attention);
        }
        .icon_eye {
          background: url("./images/eye@2x.png");
          background-size: cover;
          width: 24px;
          height: 24px;
          margin: 0px 7px 0px 10px;
        }
      `}</style>
    </div>
  )
}

function BalanceReloader(): ReactElement {
  const dispatch = useDispatch()

  const [isSpinning, setIsSpinning] = useState(false)

  // 0 = never
  const [timeWhenLastReloaded, setTimeWhenLastReloaded] = useLocalStorage(
    "timeWhenLastReloaded",
    "0"
  )

  const loadingTimeMs = 15000
  const timeGapBetweenRunningReloadMs = 60000 * 2

  return (
    <button
      type="button"
      disabled={isSpinning}
      className={classNames("reload", { spinning: isSpinning })}
      onClick={() => {
        const currentTime = new Date().getTime()
        setIsSpinning(true)

        // Appear to spin regardless if too recent. Only refresh
        // background page if timeGapBetweenRunningReloadMs is met.
        if (
          Number(timeWhenLastReloaded) + timeGapBetweenRunningReloadMs <
          currentTime
        ) {
          setTimeWhenLastReloaded(`${currentTime}`)
          dispatch(refreshBackgroundPage())
        }
        setTimeout(() => {
          setIsSpinning(false)
          window.location.reload()
        }, loadingTimeMs)
      }}
    >
      <style jsx>{`
        .reload {
          mask-image: url("./images/reload@2x.png");
          mask-size: cover;
          background-color: #fff;
          width: 17px;
          height: 17px;
          margin-left: 10px;
        }
        .reload:hover {
          background-color: var(--aqua);
        }
        .reload:disabled {
          pointer-events: none;
        }
        .spinning {
          animation: spin 1s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .spinning:hover {
          background-color: #fff;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  )
}

interface Props {
  assets: CompleteAssetAmount[]
  balance?: string
  initializationLoadingTimeExpired: boolean
}

export default function WalletAccountBalanceControl(
  props: Props
): ReactElement {
  const dispatch = useDispatch()

  const selectedAccount = useBackgroundSelector(selectCurrentAccount)
  const { address: selectedAccountAddress, network } = selectedAccount
  const { assets, balance, initializationLoadingTimeExpired } = props
  const assetAmount = assets.find(a => a.asset.symbol === network.baseAsset.symbol)

  const shouldIndicateLoading =  typeof balance === "undefined"

  const copyBalance = (bal: string | undefined) => () => {
    navigator.clipboard.writeText(bal ?? "")
    dispatch(setSnackbarMessage("Balance copied to clipboard"))
  }

  return (
    <>
      <div className="wallet_summary">
        <div style={{position: 'absolute', padding: '0.25rem', margin: 'auto'}}>{network.name}</div>
        
        <div className="balance_summary">
          {shouldIndicateLoading || assetAmount === undefined ? (
            <>
              <SharedLoadingSpinner size="large" />
            </>
          ) : (
            <>
              <button
                onClick={copyBalance(assetAmount?.decimalAmount.toString())}
                title="Copy balance to clipboard"
                className={"balance main_balance"}
              >
                <SharedAssetIcon
                  size="large"
                  symbol={assetAmount.asset.symbol}
                />

                {formatTokenAmount(assetAmount?.decimalAmount, 7)}
              </button>
              <span className={"balance"}>
                <span>
                  <DollarSvg />
                </span>
                {formatTokenAmount(balance)}
              </span>
            </>
          )}
        </div>
        <div className="wallet_control">
          <div className="address_wrap">
            <SharedAddress address={selectedAccountAddress} showAvatar={true} />
          </div>

          <div className="send_wrap">
            <SharedButton
              icon="send"
              size="medium"
              type="tertiary"
              linkTo="/send"
              title="Send POKT"
            >
              {" "}
            </SharedButton>
          </div>
        </div>
      </div>
      <style jsx>
        {`
          h1 {
            font-weight: 500;
          }
          .wallet_summary {
            height: 12.5rem;
            width: 100%;
            padding: 0.5rem;
            margin-bottom: 1.25rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-direction: column;
            box-sizing: border-box;
            border: 1px solid var(--davys-gray);
            background: radial-gradient(
              100% 100% at 50% 0%,
              var(--onyx-200) 0%,
              var(--cod-gray-200) 100%
            );
            mix-blend-mode: normal;
            box-shadow: 0px 16px 4px rgb(0 0 0 / 25%);
            border-radius: 1.25rem;
          }

          div :global(.token_icon) {
            display: inline-block;
            background-color: var(--white);
            margin-right: 0.5rem;
          }
          .balance_summary {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 1rem;
            background-color: var(--cod-gray-100);
            width: 100%;
            height: 8rem;
            padding: 0.75rem 0;
            margin-bottom: 1rem;
          }
          .balance {
            color: var(--white);
            display: flex;
            align-items: center;
          }

          .main_balance {
            font-size: 2rem;
            line-height: 4rem;
            font-weight: 700;
          }

          .balance > span {
            display: inline-flex;
          }

          .balance :global(svg) {
            height: 1rem;
            width: 1rem;
            margin-right: 0.5rem;
          }

          .main_balance :global(svg) {
            height: 2rem;
            width: 2rem;
            margin-right: 0.5rem;
          }

          .wallet_control {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            width: 100%;
            padding: 0 0.25rem;
          }

          .address_wrap {
            width: 8.25rem;
          }

          .send_wrap :global(button) {
            height: 2rem;
            width: 2rem;
            border: 1px solid var(--aqua);
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .send_wrap :global(.tertiary.icon_button .icon) {
            margin: 0;
            background-color: var(--aqua);
          }

          .send_wrap :global(.tertiary:hover) {
            border-color: var(--white);
          }
          .send_wrap :global(.tertiary.icon_button:hover .icon) {
            background-color: var(--white);
          }
        `}
      </style>
    </>
  )
}
