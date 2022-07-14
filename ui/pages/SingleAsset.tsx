import React, { ReactElement } from "react"
import { useParams } from "react-router-dom"
import {
  selectCurrentAccountActivitiesWithTimestamps,
  selectCurrentAccountBalances,
  selectCurrentAccountSigningMethod,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import { normalizeEVMAddress } from "@sendnodes/pokt-wallet-background/lib/utils"
import {
  AnyAsset,
  isSmartContractFungibleAsset,
} from "@sendnodes/pokt-wallet-background/assets"
import { useBackgroundSelector } from "../hooks"
import SharedAssetIcon from "../components/Shared/SharedAssetIcon"
import SharedButton from "../components/Shared/SharedButton"
import WalletActivityList from "../components/Wallet/WalletActivityList"
import SharedBackButton from "../components/Shared/SharedBackButton"
import SharedTooltip from "../components/Shared/SharedTooltip"

type SingleAssetRouteParams = {
  asset: string
  contractAddress: string
}

export default function SingleAsset(): ReactElement {
  const { asset: symbol, contractAddress } = useParams <SingleAssetRouteParams>()
  const currentAccountSigningMethod = useBackgroundSelector(
    selectCurrentAccountSigningMethod
  )

  const filteredActivities = useBackgroundSelector((state) =>
    (selectCurrentAccountActivitiesWithTimestamps(state) ?? []).filter(
      (activity) => {
        if (activity.network.family === "POKT") {
          if ("txMsg" in activity) {
            return activity.txMsg.type === "pos/Send"
          }
          return false
        }
        if (
          typeof contractAddress !== "undefined" &&
          "to" in activity &&
          contractAddress === activity.to
        ) {
          return true
        }
        switch (activity.annotation?.type) {
          case "asset-transfer":
          case "asset-approval":
            return activity.annotation.assetAmount.asset.symbol === symbol
          case "asset-swap":
            return (
              activity.annotation.fromAssetAmount.asset.symbol === symbol ||
              activity.annotation.toAssetAmount.asset.symbol === symbol
            )
          case "contract-interaction":
          case "contract-deployment":
          default:
            return false
        }
      }
    )
  )

  const { asset, localizedMainCurrencyAmount, localizedDecimalAmount } =
    useBackgroundSelector((state) => {
      const balances = selectCurrentAccountBalances(state)

      if (typeof balances === "undefined") {
        return undefined
      }

      return balances.assetAmounts.find(({ asset: candidateAsset }) => {
        if (typeof contractAddress !== "undefined") {
          return (
            isSmartContractFungibleAsset(candidateAsset) &&
            normalizeEVMAddress(candidateAsset.contractAddress) ===
              normalizeEVMAddress(contractAddress)
          )
        }
        return candidateAsset.symbol === symbol
      })
    }) ?? {
      asset: undefined,
      localizedMainCurrencyAmount: undefined,
      localizedDecimalAmount: undefined,
    }

  return (
    <>
      <div className="back_button_wrap standard_width_padded">
        <SharedBackButton />
      </div>
      {typeof asset === "undefined" ? (
        <></>
      ) : (
        <div className="header standard_width_padded">
          <div className="left">
            <div className="asset_wrap">
              <SharedAssetIcon
                logoURL={asset?.metadata?.logoURL}
                symbol={asset?.symbol}
              />
              <span className="asset_name">{symbol}</span>
              {contractAddress ? (
                <SharedTooltip
                  width={155}
                  IconComponent={() => (
                    <a
                      className="new_tab_link"
                      href={`https://etherscan.io/token/${contractAddress}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="icon_new_tab" />
                    </a>
                  )}
                >
                  View asset on Etherscan
                </SharedTooltip>
              ) : (
                <></>
              )}
            </div>
            <div className="balance">{localizedDecimalAmount}</div>
            {typeof localizedMainCurrencyAmount !== "undefined" ? (
              <div className="usd_value">${localizedMainCurrencyAmount}</div>
            ) : (
              <></>
            )}
          </div>
          <div className="right">
            {currentAccountSigningMethod ? (
              <>
                <SharedButton
                  type="primary"
                  size="medium"
                  icon="send"
                  linkTo={{
                    pathname: "/send",
                    state: asset,
                  }}
                >
                  Send
                </SharedButton>
              </>
            ) : (
              <></>
            )}
          </div>
        </div>
      )}
      <div className="sub_info_separator_wrap standard_width_padded">
        <div className="left">Asset is on: Arbitrum</div>
        <div className="right">Move to Ethereum</div>
      </div>
      <WalletActivityList activities={filteredActivities} />
      <style jsx>
        {`
          .back_button_wrap {
            margin-bottom: 4px;
          }
          .sub_info_separator_wrap {
            display: none; // TODO asset network location and transfer for later
            border: 1px solid var(--cod-gray-100);
            border-left: 0px;
            border-right: 0px;
            padding-top: 8px;
            padding-bottom: 8px;
            box-sizing: border-box;
            color: var(--dim-gray);
            font-size: 14px;
            line-height: 16px;
            justify-content: space-between;
            margin-top: 23px;
            margin-bottom: 16px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 24px;
          }
          .header .right {
            height: 95px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .asset_name {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            text-transform: uppercase;
            margin-left: 8px;
          }
          .asset_wrap {
            display: flex;
            align-items: center;
          }
          .balance {
            color: #fff;
            font-size: 36px;
            font-weight: 500;
            line-height: 48px;
          }
          .usd_value {
            width: 112px;
            color: var(--spanish-gray);
            font-size: 16px;
            font-weight: 600;
            line-height: 24px;
          }
          .label_light {
            color: var(--spanish-gray);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-bottom: 8px;
          }
        `}
      </style>
    </>
  )
}
