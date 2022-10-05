import React, { ReactElement, useCallback, useState } from "react"
import {
  selectCurrentAccount,
  selectCurrentAccountBalances,
  selectMainCurrencySymbol,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import {
  NetworkFeeSettings,
  selectEstimatedFeesPerGas,
  setFeeType,
} from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction"
import {
  FungibleAsset,
  isFungibleAssetAmount,
} from "@sendnodes/pokt-wallet-background/assets"
import { ETH, POKT } from "@sendnodes/pokt-wallet-background/constants"
import {
  convertFixedPointNumber,
  parseToFixedPointNumber,
} from "@sendnodes/pokt-wallet-background/lib/fixed-point"
import {
  selectAssetPricePoint,
  transferAsset,
} from "@sendnodes/pokt-wallet-background/redux-slices/assets"
import { CompleteAssetAmount } from "@sendnodes/pokt-wallet-background/redux-slices/accounts"
import { enrichAssetAmountWithMainCurrencyValues } from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils"
import { useHistory, useLocation } from "react-router-dom"
import SharedAssetInput from "../Shared/SharedAssetInput"
import SharedButton from "../Shared/SharedButton"
import {
  useAddressOrNameValidation,
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
} from "../../hooks"
import SharedInput from "../Shared/SharedInput"
import SharedSplashScreen from "../Shared/SharedSplashScreen"
import usePocketNetworkFee from "../../hooks/pocket-network/use-network-fee"
import formatTokenAmount from "../../utils/formatTokenAmount"
import { formatFixed } from "@ethersproject/bignumber"

// TODO: v0.2.0 handle multiple assets
export default function Send(): ReactElement {
  const poktNetworkFeeDecimalAmount = 0.01
  const maxMemoLength = 75
  const location = useLocation<FungibleAsset>()
  const [selectedAsset, setSelectedAsset] = useState<FungibleAsset>(
    location.state ?? POKT
  )
  const [destinationAddress, setDestinationAddress] = useState<
    string | undefined
  >(undefined)
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("Sent with SendWallet.net")
  const [memoError, setMemoError] = useState("")
  const [gasLimit, setGasLimit] = useState<bigint | undefined>(undefined)
  const [isSendingTransactionRequest, setIsSendingTransactionRequest] =
    useState(false)
  const [hasError, setHasError] = useState(false)
  const [networkSettingsModalOpen, setNetworkSettingsModalOpen] =
    useState(false)

  const history = useHistory()

  const dispatch = useBackgroundDispatch()
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const currentAccount = useBackgroundSelector(selectCurrentAccount)
  const balanceData = useBackgroundSelector(selectCurrentAccountBalances)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)

  const fungibleAssetAmounts =
    // Only look at fungible assets.
    balanceData?.assetAmounts?.filter(
      (assetAmount): assetAmount is CompleteAssetAmount<FungibleAsset> =>
        isFungibleAssetAmount(assetAmount)
    )
  const assetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(
      state.assets,
      selectedAsset.symbol,
      mainCurrencySymbol
    )
  )

  const assetAmountFromForm = () => {
    const fixedPointAmount = parseToFixedPointNumber(amount.toString())
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
    if (
      assetAmount === undefined ||
      destinationAddress === undefined ||
      !areKeyringsUnlocked
    ) {
      return
    }
    try {
      setIsSendingTransactionRequest(true)

      await dispatch(
        transferAsset({
          fromAddressNetwork: currentAccount,
          toAddressNetwork: {
            address: destinationAddress,
            network: currentAccount.network,
          },
          assetAmount,
          gasLimit,
          memo,
        })
      )
    } finally {
      setIsSendingTransactionRequest(false)
    }

    history.push("/sign-transaction")
  }, [
    assetAmount,
    currentAccount,
    destinationAddress,
    dispatch,
    gasLimit,
    history,
    areKeyringsUnlocked,
  ])

  const networkSettingsSaved = (networkSetting: NetworkFeeSettings) => {
    setGasLimit(networkSetting.gasLimit)
    dispatch(setFeeType(networkSetting.feeType))
    setNetworkSettingsModalOpen(false)
  }

  const { networkFee } = usePocketNetworkFee()

  const {
    errorMessage: addressErrorMessage,
    isValidating: addressIsValidating,
    handleInputChange: handleAddressChange,
  } = useAddressOrNameValidation(setDestinationAddress)

  if (!areKeyringsUnlocked) {
    return <SharedSplashScreen />
  }

  return (
    <div className="page_content">
      <div className="section">
        <div className="header ">
          <div className="row">
            <div className="start">
              <div className="send_icon_wrap">
                <div className="send_icon" />
              </div>
            </div>
            <div className="center">
              <h1>Send POKT</h1>
            </div>
            <div className="end">
              <button
                type="button"
                aria-label="close"
                className="icon_close"
                onClick={() => {
                  history.push("/")
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="section">
        <div className="form_input">
          <SharedAssetInput
            autoFocus
            label="ENTER AMOUNT"
            onAssetSelect={setSelectedAsset}
            assetsAndAmounts={fungibleAssetAmounts}
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
            networkFee={networkFee.toString()}
          />
          <div className="value">
            {assetAmount?.localizedMainCurrencyAmount ?? "-"}
          </div>
        </div>
      </div>
      <div className="section">
        <div className="form_input address_form_input">
          <SharedInput
            label="ENTER ADDRESS"
            errorMessage={addressErrorMessage}
            onChange={(val) => handleAddressChange(val)}
          />
        </div>
        <div className="form_input">
          <SharedInput
            label="TX MEMO"
            type="textarea"
            maxLength={maxMemoLength}
            errorMessage={memoError}
            value={memo}
            onChange={(val) => {
              setMemoError("")
              setMemo(val)
              if (val.length > maxMemoLength) {
                setMemoError(
                  `Memo cannot be longer than ${maxMemoLength} characters`
                )
              }
            }}
          />
          <div className="memo_validation">
            <small>
              {memo.length} / {maxMemoLength}
            </small>
          </div>
        </div>
      </div>
      <div className="section">
        <div style={{ alignSelf: "flex-start", marginBottom: "1.5rem" }}>
          <p>
            <small>
              TX Fees -{" "}
              {formatTokenAmount(
                formatFixed(networkFee, selectedAsset.decimals)
              )}{" "}
              POKT
            </small>
          </p>
        </div>
      </div>
      <div className="section">
        <SharedButton
          type="primary"
          size="large"
          isDisabled={
            isSendingTransactionRequest ||
            Number(amount) === 0 ||
            destinationAddress === undefined ||
            memoError !== "" ||
            hasError
          }
          onClick={sendTransactionRequest}
          isFormSubmit
          isLoading={isSendingTransactionRequest}
        >
          Send
        </SharedButton>
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

          .header a {
            color: var(--aqua);
          }

          .header a:hover,
          .header a:active {
            color: var(--white);
          }

          .send_icon_wrap {
            height: 2rem;
            width: 2rem;
            border: 1px solid var(--pink-lavender);
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .send_icon {
            mask-image: url("./images/send@2x.png");
            mask-size: cover;
            width: 0.75rem;
            height: 0.75rem;
            background-color: var(--pink-lavender);
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
