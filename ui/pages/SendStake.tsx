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
import formatTokenAmount from "../utils/formatTokenAmount"
import { InformationCircleIcon } from "@heroicons/react/solid"

if (!process.env.SENDNODES_POKT_SIW) {
  throw new Error("Missing SENDNODES_POKT_SIW environment variable")
}
const parsedMinPoktAmount = parseFloat(
  process.env.SENDNODES_POKT_MIN_STAKING_AMOUNT ?? ""
)
if (
  !parsedMinPoktAmount ||
  isNaN(parsedMinPoktAmount) ||
  parsedMinPoktAmount < 1
) {
  throw new Error(
    "Missing or invalid SENDNODES_POKT_MIN_STAKING_AMOUNT environment variable"
  )
}

const SENDNODES_POKT_SIW = process.env.SENDNODES_POKT_SIW
const SENDNODES_POKT_MIN_STAKING_AMOUNT = parsedMinPoktAmount

export default function SendStake(): ReactElement {
  const location = useLocation<FungibleAsset>()
  const [selectedAsset, setSelectedAsset] = useState<FungibleAsset>(
    location.state ?? POKT
  )
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

      // memo spec is s:autoCompound=[true|false]
      const memo = `s:${autoCompound}`

      dispatch(
        transferAsset({
          fromAddressNetwork: currentAccount,
          toAddressNetwork: {
            address: SENDNODES_POKT_SIW,
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
    SENDNODES_POKT_SIW,
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
            <div className="start"></div>
            <div className="center">
              <div className="flex gap-x-4 justify-center items-center">
                <div className="stake_icon w-8 h-8" />
                <h1>Stake</h1>
              </div>
            </div>
            <div className="end"></div>
          </div>
        </div>
      </div>
      <div className="section relative mb-2">
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
        {amount && Number(amount) * 10e6 < SENDNODES_POKT_MIN_STAKING_AMOUNT ? (
          <div className="text_error absolute left-0 bottom-0 text-sm">
            Minimum stake amount is{" "}
            {formatTokenAmount(SENDNODES_POKT_MIN_STAKING_AMOUNT / 10e6)} POKT
          </div>
        ) : undefined}
      </div>

      <div className="section border-b-2 border-spanish-gray border-opacity-25 mb-4 pb-2">
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
          <a
            href="https://docs.sendnodes.io/"
            title="More information on Auto Compound with SendNodes"
            className="inline hover:text-white"
            target="_blank"
          >
            <span className="sr-only">Information on Staking</span>
            <InformationCircleIcon className="ml-1 h-4 w-4 inline" />
          </a>
        </div>
      </div>

      <div className="section border-b-2 border-spanish-gray border-opacity-25 mb-4 pb-2">
        <div className="form_input">
          <small className="pb-1 inline-block">
            By checking this box, you agree the{" "}
            <a
              href="https://docs.sendnodes.io/terms/"
              className="underline"
              target={"_blank"}
            >
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
              Number(amount) >= SENDNODES_POKT_MIN_STAKING_AMOUNT ||
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
