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
  useStakingUserData,
  useStakingPoktParams,
} from "../../hooks/staking-hooks"
import { BigNumber } from "ethers"
import { formatFixed, parseFixed } from "@ethersproject/bignumber"
import StatTotalStaked from "./Stat/StatTotalStaked"
import { isEqual } from "lodash"
import usePocketNetworkFee from "../../hooks/pocket-network/use-network-fee"
import StakePausedModal from "./StakePausedModal"
import StatAPY from "./Stat/StatAPY"

export default function SendStake(): ReactElement {
  const location = useLocation<FungibleAsset>()
  const [selectedAsset, setSelectedAsset] = useState<FungibleAsset>(
    location.state ?? POKT
  )
  const [amount, setAmount] = useState("")
  const [compound, setCompound] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isSendingTransactionRequest, setIsSendingTransactionRequest] =
    useState(false)
  const [hasError, setHasError] = useState(false)

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
  const {
    data: stakingPoktParamsData,
    isLoading: isStakingPoktParamsLoading,
    isError: isStakingPoktParamsError,
  } = useStakingPoktParams(currentAccount)

  const {
    data: userStakingData,
    isLoading: isUserStakingDataLoading,
    isError: isUserStakingDataError,
  } = useStakingUserData(currentAccount)

  const { networkFee } = usePocketNetworkFee()
  const isStakingEnabled = !!(
    stakingPoktParamsData && stakingPoktParamsData.stakingEnabled
  )
  const [isStakePausedModalOpen, setIsStakePausedModalOpen] = useState(
    !isStakingEnabled
  )

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
    if (
      assetAmount === undefined ||
      !areKeyringsUnlocked ||
      !stakingPoktParamsData?.wallets?.siw ||
      !isStakingEnabled
    ) {
      console.warn("Somethings not right", {
        assetAmount,
        areKeyringsUnlocked,
        stakingPoktParamsData,
      })
      return
    }
    try {
      setIsSendingTransactionRequest(true)

      // memo spec is s:compound=[true|false]
      const memo = `s:${compound}`

      dispatch(
        transferAsset({
          fromAddressNetwork: currentAccount,
          toAddressNetwork: {
            address: stakingPoktParamsData.wallets.siw,
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
  }, [
    assetAmount,
    currentAccount,
    stakingPoktParamsData,
    dispatch,
    history,
    areKeyringsUnlocked,
  ])

  if (!areKeyringsUnlocked || isStakingPoktParamsLoading) {
    return (
      <div className="grow w-full relative flex flex-col justify-center items-center">
        <SharedSplashScreen />
      </div>
    )
  }

  // throw to error fallback page
  if (isStakingPoktParamsError) {
    throw isStakingPoktParamsError
  }

  if (isUserStakingDataError) {
    throw isUserStakingDataError
  }

  if (!stakingPoktParamsData!.stakingMinAmount) {
    throw new Error("stakingMinAmount is not defined")
  }

  // validatation variables
  const isAmountLessThanStakeMin =
    !amount ||
    isNaN(Number(amount)) ||
    parseFixed(amount, selectedAsset.decimals).lt(
      BigNumber.from(stakingPoktParamsData!.stakingMinAmount)
    )

  return (
    <div className="grow h-full relative">
      <div className="flex gap-x-4 justify-center items-center mb-10">
        <div className="stake_icon bg-white w-12 h-12" />
        <h1>Stake</h1>
      </div>
      <div className="mt-6 flex flex-col mb-6">
        <div className="grid md:grid-cols-8 gap-4 gap-y-12 lg:gap-8">
          <div className="md:col-span-2" />
          <StatTotalStaked aon={currentAccount} asset={selectedAsset} />
          <StatAPY aon={currentAccount} asset={selectedAsset} />
        </div>
      </div>
      <div className="mt-8 md:mt-12 relative mb-2">
        <div className="mb-4">
          <SharedAssetInput
            autoFocus
            label="ENTER AMOUNT"
            onAssetSelect={setSelectedAsset}
            assetsAndAmounts={fungibleAssetAmounts}
            disableDropdown={true}
            isDisabled={!stakingPoktParamsData?.stakingEnabled}
            onAmountChange={(value, errorMessage) => {
              // truncate to selected asset decimals
              try {
                parseFixed(value, selectedAsset.decimals)
              } catch (e) {
                if (
                  (e as Error)
                    .toString()
                    .includes("fractional component exceeds decimals")
                ) {
                  value = value.substring(0, value.length - 1)
                }
              }

              setAmount(value)
              if (errorMessage) {
                setHasError(true)
                return
              }

              setHasError(false)
            }}
            selectedAsset={selectedAsset}
            amount={amount}
            networkFee={
              selectedAsset.symbol === "POKT"
                ? BigInt(networkFee).toString()
                : undefined
            }
          />
          <div className="value">
            {assetAmount?.localizedMainCurrencyAmount ?? "-"}
          </div>
        </div>
        {amount && isAmountLessThanStakeMin ? (
          <div className="text_error absolute left-0 -bottom-2 text-sm">
            Minimum stake amount is{" "}
            {formatTokenAmount(
              formatFixed(
                stakingPoktParamsData!.stakingMinAmount,
                selectedAsset.decimals
              ),
              undefined,
              0
            )}{" "}
            POKT
          </div>
        ) : undefined}
      </div>

      <div className=" border-b-2 border-spanish-gray border-opacity-25 mb-4 pb-2">
        <div className="form_input">
          <SharedCheckbox
            id="compound"
            label="Compound my rewards"
            checked={compound}
            onChange={(e) => {
              setCompound(e.currentTarget.checked)
            }}
          />
          <small>
            Compounding automatically stakes your rewards. This feature can be
            disabled at anytime.{" "}
            <a
              href="https://sendnodes.gitbook.io/sendnodes/start-here/frequently-asked-questions#how-do-i-get-my-rewards"
              title="How do I get my rewards?"
              className="inline text-aqua hover:text-white"
              target="_blank"
            >
              Read more<span className="sr-only">Information on Staking</span>
              <InformationCircleIcon className="ml-1 h-4 w-4 inline-block" />
            </a>
          </small>
        </div>
      </div>

      <div className=" border-b-2 border-spanish-gray border-opacity-25 mb-4 pb-2">
        <div className="form_input">
          <small className="mb-2 inline-block">
            By checking this box, you agree to the{" "}
            <a
              href="https://docs.sendnodes.io/legal/terms-of-service"
              className="underline text-aqua hover:text-white"
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

      <div className="">
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
      <div className=" stake_button_wrap max-w-xs mx-auto">
        <div
          style={{ "--icon-color": "var(--eerie-black-100)" } as CSSProperties}
        >
          {isStakingEnabled ? (
            <SharedButton
              type="primary"
              size="large"
              icon="stake"
              iconPosition="left"
              iconSize="large"
              isDisabled={
                isSendingTransactionRequest ||
                Number(amount) === 0 ||
                isStakingPoktParamsLoading ||
                !!isStakingPoktParamsError ||
                isAmountLessThanStakeMin ||
                !termsAccepted ||
                !stakingPoktParamsData?.stakingEnabled ||
                hasError
              }
              onClick={sendTransactionRequest}
              isFormSubmit
              isLoading={isSendingTransactionRequest}
            >
              STAKE
            </SharedButton>
          ) : (
            <SharedButton
              type="primary"
              size="large"
              icon="stake"
              iconPosition="left"
              iconSize="large"
              onClick={() => setIsStakePausedModalOpen(true)}
            >
              STAKE
            </SharedButton>
          )}
        </div>
      </div>

      <StakePausedModal
        open={isStakePausedModalOpen}
        setOpen={setIsStakePausedModalOpen}
      />
      <style jsx>
        {`
          .form_input {
            width: 100%;
            margin-bottom: 0.5rem;
            position: relative;
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
