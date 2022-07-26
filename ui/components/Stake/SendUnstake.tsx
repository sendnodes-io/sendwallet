import React, {
  CSSProperties,
  ReactElement,
  useCallback,
  useState,
} from "react"
import {
  selectCurrentAccount,
  selectCurrentAccountBalances,
  selectMainCurrencySymbol,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import {
  FungibleAsset,
  isFungibleAssetAmount,
} from "@sendnodes/pokt-wallet-background/assets"
import { POKT } from "@sendnodes/pokt-wallet-background/constants"
import {
  convertFixedPointNumber,
  parseToFixedPointNumber,
} from "@sendnodes/pokt-wallet-background/lib/fixed-point"
import {
  selectAssetPricePoint,
  transferAsset,
} from "@sendnodes/pokt-wallet-background/redux-slices/assets"
import { CompleteAssetAmount } from "@sendnodes/pokt-wallet-background/redux-slices/accounts"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
} from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils"
import { useHistory, useLocation } from "react-router-dom"
import SharedAssetInput from "../Shared/SharedAssetInput"
import SharedButton from "../Shared/SharedButton"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
} from "../../hooks"
import SharedSplashScreen from "../Shared/SharedSplashScreen"
import SharedCheckbox from "../Shared/SharedCheckbox"
import formatTokenAmount from "../../utils/formatTokenAmount"
import { InformationCircleIcon } from "@heroicons/react/solid"
import {
  SENDNODES_POKT_SIW,
  useStakingUserData,
} from "../../hooks/staking-hooks"
import { current } from "@reduxjs/toolkit"
import { BigNumber } from "ethers"
import { AnyAssetWithOptionalAmount } from "../Shared/SharedAssetItem"
import { isEqual } from "lodash"
import { ReceiptRefundIcon } from "@heroicons/react/outline"
import { truncateAddress } from "@sendnodes/pokt-wallet-background/lib/utils"

export default function SendUnstake(): ReactElement {
  const history = useHistory()

  const dispatch = useBackgroundDispatch()
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)
  const balanceData = useBackgroundSelector(
    selectCurrentAccountBalances,
    isEqual
  )
  const mainCurrencySymbol = useBackgroundSelector(
    selectMainCurrencySymbol,
    isEqual
  )
  const { data, isLoading, isError } = useStakingUserData(currentAccount)
  const [selectedAsset, setSelectedAsset] = useState<FungibleAsset>(
    currentAccount.network.baseAsset
  )
  const [amount, setAmount] = useState("")
  const [isSendingTransactionRequest, setIsSendingTransactionRequest] =
    useState(false)
  const [hasError, setHasError] = useState(false)

  const totalStakedBalance =
    BigInt(data?.pendingStaked ?? 0) * BigInt(1e6) +
    BigInt(data?.staked ?? 0) * BigInt(1e6) -
    BigInt(data?.unstaked ?? 0) * BigInt(1e6) -
    BigInt(data?.pendingUnstaked ?? 0) * BigInt(1e6)
  const totalStakedBalanceDecimals = BigNumber.from(
    BigInt(data?.pendingStaked ?? 0) * BigInt(1e6) +
      BigInt(data?.staked ?? 0) * BigInt(1e6) -
      BigInt(data?.unstaked ?? 0) * BigInt(1e6) -
      BigInt(data?.pendingUnstaked ?? 0) * BigInt(1e6)
  )
    .div(Math.pow(10, currentAccount.network.baseAsset.decimals))
    .toNumber()

  const assetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(
      state.assets,
      selectedAsset.symbol,
      mainCurrencySymbol
    )
  )

  const fungibleAssetAmount: AnyAssetWithOptionalAmount<FungibleAsset> =
    enrichAssetAmountWithMainCurrencyValues(
      enrichAssetAmountWithDecimalValues(
        {
          amount: totalStakedBalance,
          asset: currentAccount.network.baseAsset,
        },
        2
      ),
      assetPricePoint,
      2
    )

  const assetAmountFromForm = () => {
    const fixedPointAmount = parseToFixedPointNumber(amount)
    if (typeof fixedPointAmount === "undefined") {
      return undefined
    }

    const decimalMatched = convertFixedPointNumber(
      fixedPointAmount,
      selectedAsset.decimals
    )

    return enrichAssetAmountWithMainCurrencyValues(
      {
        asset: selectedAsset,
        amount: decimalMatched.amount,
        decimalAmount: decimalMatched.decimals,
      },
      assetPricePoint,
      2
    )
  }

  const assetAmount = assetAmountFromForm()
  const areKeyringsUnlocked = useAreKeyringsUnlocked(true)

  const sendTransactionRequest = useCallback(async () => {
    if (assetAmount === undefined || !areKeyringsUnlocked) {
      return
    }
    try {
      setIsSendingTransactionRequest(true)

      // memo spec is u:amount=[amount in uPOKT]
      const memo = `u:${amount}`

      dispatch(
        transferAsset({
          fromAddressNetwork: currentAccount,
          toAddressNetwork: {
            address: SENDNODES_POKT_SIW,
            network: currentAccount.network,
          },
          assetAmount: { amount: 1n, asset: selectedAsset },
          memo,
          gasLimit: undefined,
        })
      )
    } finally {
      setIsSendingTransactionRequest(false)
    }

    history.push("/sign-transaction")
  }, [
    assetAmount,
    currentAccount,
    SENDNODES_POKT_SIW,
    dispatch,
    history,
    areKeyringsUnlocked,
  ])

  if (!areKeyringsUnlocked || isLoading) {
    return <SharedSplashScreen />
  }

  return (
    <div className="page_content pb-4">
      <div className="flex gap-x-4 justify-center items-center pt-4 pb-8">
        <ReceiptRefundIcon className="w-8 h-8 text-white" />
        <h1>Unstake</h1>
      </div>
      <div className="flex pt-4 pb-8">
        <p className="text-lg">
          We're sad to see you go! To unstake, please enter an amount below (up
          to your staked amount). The amount will be sent back to the addres{" "}
          <span title={currentAccount.address}>
            {truncateAddress(currentAccount.address)}
          </span>{" "}
          within 21-24 days.{" "}
          <a
            href="https://docs.sendnodes.io/"
            title="More information on Auto Compound with SendNodes"
            className="inline hover:text-white"
            target="_blank"
          >
            <span className="sr-only">Information on Staking</span>
            <InformationCircleIcon className="ml-1 h-4 w-4 inline" />
          </a>
        </p>
      </div>
      <div className="section relative mb-4">
        <div className="form_input">
          <SharedAssetInput
            autoFocus
            label="ENTER AMOUNT"
            onAssetSelect={setSelectedAsset}
            assetsAndAmounts={[fungibleAssetAmount]}
            disableDropdown={true}
            onAmountChange={(value, errorMessage) => {
              setAmount(value)
              if (errorMessage) {
                setHasError(true)
                return
              }

              setHasError(false)
            }}
            selectedAsset={selectedAsset}
            amount={amount}
          />
          <div className="value">
            ${assetAmount?.localizedMainCurrencyAmount ?? "-"}
          </div>
        </div>
      </div>

      <div className="section">
        <div style={{ alignSelf: "flex-start", marginBottom: "1.5rem" }}>
          <p>
            <small>TX Fees - 0.01 POKT</small>
          </p>
        </div>
      </div>
      <div className="section py-4">
        <div
          style={{ "--icon-color": "var(--eerie-black-100)" } as CSSProperties}
        >
          <SharedButton
            type="secondary"
            size="large"
            isDisabled={
              isSendingTransactionRequest ||
              Number(amount) === 0 ||
              Number(amount) > totalStakedBalanceDecimals ||
              hasError
            }
            onClick={sendTransactionRequest}
            isFormSubmit
            isLoading={isSendingTransactionRequest}
          >
            UNSTAKE
          </SharedButton>
        </div>
      </div>
      <style jsx>
        {`
          .section {
            width: calc(100% - 1rem);
          }

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

          .row .center {
            text-align: center;
            width: 14.375rem;
          }

          .row .end {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-end;
            gap: 0.75rem;
          }
          .stake_icon {
            mask-image: url("./images/stake@2x.png");
            mask-size: contain;
            mask-repeat: no-repeat;
            mask-position: center;
            width: 3rem;
            height: 3rem;
            background-color: var(--white);
            display: inline-block;
          }
          .icon_close {
            width: 1rem;
            height: 1rem;
            position: unset;
          }

          .form_input {
            width: 100%;
            margin-bottom: 0.5rem;
            position: relative;
          }

          .address_form_input {
            font-size: 0.8rem;
          }

          .value {
            display: flex;
            justify-content: flex-end;
            position: relative;
            top: 0.15rem;
            right: 1rem;
            color: var(--spanish-gray);
            font-size: 0.75rem;
            line-height: 1rem;
          }

          .form_input :global(textarea) {
            height: 7.5rem;
          }
          .memo_validation {
            position: absolute;
            right: 0;
            bottom: -1.5rem;
          }

          :global(.page_content) {
            justify-content: space-evenly;
          }
        `}
      </style>
    </div>
  )
}
