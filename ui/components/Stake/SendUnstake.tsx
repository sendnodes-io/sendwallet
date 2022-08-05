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
import { FungibleAsset } from "@sendnodes/pokt-wallet-background/assets"
import { POKT } from "@sendnodes/pokt-wallet-background/constants"
import {
  convertFixedPointNumber,
  parseToFixedPointNumber,
} from "@sendnodes/pokt-wallet-background/lib/fixed-point"
import {
  selectAssetPricePoint,
  transferAsset,
} from "@sendnodes/pokt-wallet-background/redux-slices/assets"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
} from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils"
import { useHistory } from "react-router-dom"
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
  useStakingPoktParams,
  useStakingUserData,
} from "../../hooks/staking-hooks"
import { BigNumber } from "ethers"
import { AnyAssetWithOptionalAmount } from "../Shared/SharedAssetItem"
import { isEqual } from "lodash"
import { ReceiptRefundIcon } from "@heroicons/react/outline"
import { truncateAddress } from "@sendnodes/pokt-wallet-background/lib/utils"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import StatTotalStaked from "./Stat/StatTotalStaked"
import StatTotalPendingStaked from "./Stat/StatTotalPendingStaked"
import { formatFixed, parseFixed } from "@ethersproject/bignumber"
import SharedModal from "../Shared/SharedModal"
import { selectTransactionData } from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction"
import { stylesheet } from "astroturf"
import SignTransaction from "../../pages/SignTransaction"

const styles = stylesheet`
  .accountsModal :global(.switcher_wrap) {
    @apply rounded-none -mx-4 sm:-mx-6 !important;
  }
  .accountsModalScrollbar :global(.switcher_wrap:-webkit-scrollbar-track) {
    @apply bg-eerie-black;
  }
`

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
  const transactionDetails = useBackgroundSelector(
    selectTransactionData,
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

  // TODO: write a network data hook
  const networkFee = 1e4

  const [selectedAsset, setSelectedAsset] = useState<FungibleAsset>(
    currentAccount.network.baseAsset
  )
  const [amount, setAmount] = useState("")
  const [isSendingTransactionRequest, setIsSendingTransactionRequest] =
    useState(false)
  const [hasError, setHasError] = useState(false)

  const totalStakedBalance = BigNumber.from(userStakingData?.staked ?? 0)
    .add(userStakingData?.pendingStaked ?? 0)
    .sub(BigNumber.from(userStakingData?.pendingUnstaked ?? 0))

  const totalStakedBalanceDecimals = Number(
    formatFixed(totalStakedBalance, selectedAsset.decimals)
  )

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
          amount: totalStakedBalance.toBigInt(),
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
    if (
      assetAmount === undefined ||
      !areKeyringsUnlocked ||
      !stakingPoktParamsData?.wallets?.siw
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

      // memo spec is u:amount=[amount in uPOKT]
      const memo = `u:${parseFixed(amount, selectedAsset.decimals)}`

      dispatch(
        transferAsset({
          fromAddressNetwork: currentAccount,
          toAddressNetwork: {
            address: stakingPoktParamsData.wallets.siw,
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
  }, [
    assetAmount,
    currentAccount,
    stakingPoktParamsData,
    dispatch,
    history,
    areKeyringsUnlocked,
  ])

  if (!areKeyringsUnlocked) {
    return (
      <div className="flex-1 w-full relative flex justify-center items-center">
        <SharedSplashScreen />
      </div>
    )
  }

  return (
    <div className=" pb-4">
      <div className="flex gap-x-4 justify-center items-center pt-4 pb-8">
        <ReceiptRefundIcon className="w-8 h-8 text-white" />
        <h1>Unstake</h1>
      </div>
      <div>
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative pt-5 px-4 pb-6 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
            <dt>
              <div className="absolute bg-spanish-gray rounded-md p-3">
                <div className="stake_icon bg-white w-8 h-8 inline-block" />
              </div>
              <p className="ml-16 text-sm font-medium text-spanish-gray truncate">
                Total Unstaked
              </p>
            </dt>
            {isUserStakingDataLoading ? (
              <SharedLoadingSpinner />
            ) : (
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                {isUserStakingDataError ? (
                  (isUserStakingDataError as any).toString()
                ) : isUserStakingDataLoading ? (
                  <SharedLoadingSpinner />
                ) : (
                  <p className="text-2xl font-semibold text-white">
                    {formatTokenAmount(
                      formatFixed(
                        userStakingData?.unstaked ?? 0,
                        selectedAsset.decimals
                      )
                    )}
                  </p>
                )}
              </dd>
            )}
          </div>

          <div className="relative pt-5 px-4 pb-6 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
            <dt>
              <div className="absolute bg-spanish-gray rounded-md p-3">
                <div className="stake_icon bg-white w-8 h-8 inline-block" />
              </div>
              <p className="ml-16 text-sm font-medium text-spanish-gray truncate">
                Pending Unstaked
              </p>
            </dt>
            {isUserStakingDataLoading ? (
              <SharedLoadingSpinner />
            ) : (
              <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                {isUserStakingDataError ? (
                  (isUserStakingDataError as any).toString()
                ) : isUserStakingDataLoading ? (
                  <SharedLoadingSpinner />
                ) : (
                  <p className="text-2xl font-semibold text-white">
                    {formatTokenAmount(
                      formatFixed(
                        userStakingData?.pendingUnstaked ?? 0,
                        selectedAsset.decimals
                      )
                    )}
                  </p>
                )}
              </dd>
            )}
          </div>

          <StatTotalStaked aon={currentAccount} asset={selectedAsset} />
          <StatTotalPendingStaked aon={currentAccount} asset={selectedAsset} />
        </dl>
      </div>
      <div className="flex pt-4 pb-8">
        <p className="text-lg">
          We're sad to see you go! To unstake, please enter an amount below (up
          to your staked amount). The amount will be sent back to the address{" "}
          <span title={currentAccount.address}>
            {truncateAddress(currentAccount.address)}
          </span>{" "}
          within 21-24 days.{" "}
          <a
            href="https://docs.sendnodes.io/start-here/frequently-asked-questions#how-do-i-unstake"
            title="More information on unstaking with SendNodes"
            className="inline hover:text-white"
            target="_blank"
          >
            <span className="sr-only">Information on Unstaking</span>
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
          />
          <div className="value">
            ${assetAmount?.localizedMainCurrencyAmount ?? "-"}
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

      <div className="section py-4 max-w-xs mx-auto">
        <div
          style={{ "--icon-color": "var(--eerie-black-100)" } as CSSProperties}
        >
          <SharedButton
            type="secondary"
            size="large"
            isDisabled={
              isSendingTransactionRequest ||
              isStakingPoktParamsLoading ||
              !!isStakingPoktParamsError ||
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
      <SharedModal
        isOpen={
          !!transactionDetails &&
          stakingPoktParamsData?.wallets?.siw === transactionDetails?.to
        }
        onClose={() => {
          /**ignored */
        }}
        className={styles.accountsModal}
      >
        <div className="z-0">
          <SignTransaction />
        </div>
      </SharedModal>
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

          .form_input :global(textarea) {
            height: 7.5rem;
          }

          .form_input :global(.slide_up_menu_wrap) {
            display: none;
          }
        `}
      </style>
    </div>
  )
}
