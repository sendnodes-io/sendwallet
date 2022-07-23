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
import { enrichAssetAmountWithMainCurrencyValues } from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils"
import { useHistory, useLocation } from "react-router-dom"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"
import {
  useAddressOrNameValidation,
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
} from "../hooks"
import SharedInput from "../components/Shared/SharedInput"
import SharedSplashScreen from "../components/Shared/SharedSplashScreen"
import SharedCheckbox from "../components/Shared/SharedCheckbox"

export default function SendStake(): ReactElement {
  const maxMemoLength = 75
  const location = useLocation<FungibleAsset>()
  const [selectedAsset, setSelectedAsset] = useState<FungibleAsset>(
    location.state ?? POKT
  )
  const [destinationAddress, setDestinationAddress] = useState<
    string | undefined
  >(undefined)
  const [amount, setAmount] = useState("")
  const [autoCompound, setAutoCompound] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isSendingTransactionRequest, setIsSendingTransactionRequest] =
    useState(false)
  const [hasError, setHasError] = useState(false)

  const history = useHistory()

  const dispatch = useBackgroundDispatch()
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

      // memo spec is s:autoCompound=[true|false]
      const memo = `s:${autoCompound}`

      dispatch(
        transferAsset({
          fromAddressNetwork: currentAccount,
          toAddressNetwork: {
            address: destinationAddress,
            network: currentAccount.network,
          },
          assetAmount,
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
    destinationAddress,
    dispatch,
    history,
    areKeyringsUnlocked,
  ])

  if (!areKeyringsUnlocked) {
    return <SharedSplashScreen />
  }

  return (
    <div className="page_content">
      <div className="section">
        <div className="header ">
          <div className="row">
            <div className="start">
              <div className="stake_icon_wrap">
                <div className="stake_icon" />
              </div>
            </div>
            <div className="center">
              <h1>Stake</h1>
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
          />
          <div className="value">
            ${assetAmount?.localizedMainCurrencyAmount ?? "-"}
          </div>
        </div>
      </div>

      <div className="section border-b-2 border-spanish-gray">
        <div className="form_input">
          <SharedCheckbox
            id="autoCompound"
            label="Auto Compound my rewards"
            checked={autoCompound}
            onChange={(e) => {
              setAutoCompound(e.currentTarget.checked)
            }}
          />
          <small>
            Auto Compound automatically stakes your rewards instead of sending
            it to your address. You can disable it at any time.
          </small>
        </div>
      </div>

      <div className="section border-b-2 border-spanish-gray">
        <div className="form_input">
          <small>
            By checking this box, you agree the{" "}
            <a href="https://docs.sendnodes.io/terms/" className="underline">
              terms of service
            </a>
            . <br />
          </small>
          <SharedCheckbox
            id="termsAccepted"
            label="I Agree to the Terms of Service"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.currentTarget.checked)
            }}
          />
        </div>
      </div>

      <div className="section">
        <div style={{ alignSelf: "flex-start", marginBottom: "1.5rem" }}>
          <p>
            <small>TX Fees - 0.01 POKT</small>
          </p>
        </div>
      </div>
      <div className="section stake_button_wrap">
        <div
          style={{ "--icon-color": "var(--eerie-black-100)" } as CSSProperties}
        >
          <SharedButton
            type="primary"
            size="large"
            icon="stake"
            iconPosition="left"
            iconSize="large"
            isDisabled={
              isSendingTransactionRequest ||
              Number(amount) === 0 ||
              destinationAddress === undefined ||
              !termsAccepted ||
              hasError
            }
            onClick={sendTransactionRequest}
            isFormSubmit
            isLoading={isSendingTransactionRequest}
          >
            STAKE
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

          .header a {
            color: var(--aqua);
          }

          .header a:hover,
          .header a:active {
            color: var(--white);
          }

          .stake_icon_wrap {
            height: 2rem;
            width: 2rem;
            border: 1px solid var(--aqua);
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .stake_icon {
            mask-image: url("./images/stake@2x.png");
            mask-size: contain;
            mask-repeat: no-repeat;
            mask-position: center;
            width: 1.25rem;
            height: 1.25rem;
            background-color: var(--aqua);
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

          .stake_button_wrap :global(.icon) {
            --icon-color: var(--eerie-black-100);
            background-color: var(--eerie-black-100);
          }

          .stake_button_wrap:hover :global(.icon) {
            --icon-color: var(--white);
            background-color: var(--white);
          }
        `}
      </style>
    </div>
  )
}
