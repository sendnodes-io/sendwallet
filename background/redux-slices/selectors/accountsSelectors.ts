import { createSelector } from "@reduxjs/toolkit"
import { selectHideDust } from "../ui"
import { RootState } from ".."
import { AccountData, CompleteAssetAmount } from "../accounts"
import { AccountType } from "../AccountType"
import { AssetsState, selectAssetPricePoint } from "../assets"
import {
  AssetDecimalAmount,
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  formatCurrencyAmount,
  heuristicDesiredDecimalsForUnitPrice,
} from "../utils/asset-utils"
import {
  AnyAsset,
  AnyAssetAmount,
  assetAmountToDesiredDecimals,
  convertAssetAmountViaPricePoint,
} from "../../assets"
import { Network } from "../../networks"
import { selectCurrentAccount, selectMainCurrencySymbol } from "./uiSelectors"
import { truncateAddress } from "../../lib/utils"
import { selectAddressSigningMethods } from "./signingSelectors"
import { SigningMethod } from "../../utils/signing"
import {
  selectKeyringsByAddresses,
  selectSourcesByAddress,
} from "./keyringsSelectors"
import { KeyringType } from "@sendnodes/hd-keyring"
import { BASE_ASSETS_BY_SYMBOL } from "../../constants"
import { AddressOnMaybeNetwork } from "../../accounts"

// TODO What actual precision do we want here? Probably more than 2
// TODO decimals? Maybe it's configurable?
const desiredDecimals = 2
// TODO Make this a setting.
const userValueDustThreshold = 2

const computeCombinedAssetAmountsData = (
  assetAmounts: AnyAssetAmount<AnyAsset>[],
  assets: AssetsState,
  mainCurrencySymbol: string,
  hideDust: boolean
): {
  combinedAssetAmounts: CompleteAssetAmount[]
  totalMainCurrencyAmount: number | undefined
} => {
  let totalMainCurrencyAmount: number | undefined

  // Derive account "assets"/assetAmount which include USD values using
  // data from the assets slice
  const combinedAssetAmounts = assetAmounts
    .map<CompleteAssetAmount>((assetAmount) => {
      const assetPricePoint = selectAssetPricePoint(
        assets,
        assetAmount.asset.symbol,
        mainCurrencySymbol
      )
      const mainCurrencyEnrichedAssetAmount =
        enrichAssetAmountWithMainCurrencyValues(
          assetAmount,
          assetPricePoint,
          desiredDecimals
        )
      const fullyEnrichedAssetAmount = enrichAssetAmountWithDecimalValues(
        mainCurrencyEnrichedAssetAmount,
        heuristicDesiredDecimalsForUnitPrice(
          desiredDecimals,
          mainCurrencyEnrichedAssetAmount.unitPrice
        )
      )
      if (typeof fullyEnrichedAssetAmount.mainCurrencyAmount !== "undefined") {
        totalMainCurrencyAmount ??= 0 // initialize if needed
        totalMainCurrencyAmount += fullyEnrichedAssetAmount.mainCurrencyAmount
      }
      return fullyEnrichedAssetAmount
    })
    .filter((assetAmount) => {
      const isNotDust =
        typeof assetAmount.mainCurrencyAmount === "undefined"
          ? true
          : assetAmount.mainCurrencyAmount > userValueDustThreshold
      const isPresent =
        assetAmount.decimalAmount > 0 ||
        BASE_ASSETS_BY_SYMBOL[assetAmount.asset.symbol]
      // Hide dust and missing amounts.
      return hideDust ? isNotDust && isPresent : isPresent
    })

  return { combinedAssetAmounts, totalMainCurrencyAmount }
}

export const getAccountState = (state: RootState) => state.account

export const getCurrentAccountState = (
  state: RootState
): AccountData | "loading" | undefined => {
  return state.account.accountsData[state.ui.selectedAccount.address]
}
export const getAssetsState = (state: RootState): AssetsState => state.assets

export const selectAccountAndTimestampedActivities = createSelector(
  getAccountState,
  getAssetsState,
  selectHideDust,
  selectMainCurrencySymbol,
  (account, assets, hideDust, mainCurrencySymbol) => {
    const { combinedAssetAmounts, totalMainCurrencyAmount } =
      computeCombinedAssetAmountsData(
        account.combinedData.assets,
        assets,
        mainCurrencySymbol,
        hideDust
      )

    return {
      combinedData: {
        assets: combinedAssetAmounts,
        totalMainCurrencyValue:
          totalMainCurrencyAmount !== undefined
            ? formatCurrencyAmount(
                mainCurrencySymbol,
                totalMainCurrencyAmount,
                desiredDecimals
              )
            : undefined,
      },
      accountData: account.accountsData,
    }
  }
)

export const getAccountData = createSelector(
  getAccountState,
  (_: RootState, address: string) => address,
  (accountState, address): AccountData | "loading" | undefined =>
    accountState.accountsData[address]
)

export const selectMainCurrencyPricePoint = createSelector(
  getCurrentAccountState,
  getAssetsState,
  (state) => selectMainCurrencySymbol(state),
  (currentAccount, assets, mainCurrencySymbol) => {
    if (
      currentAccount === "loading" ||
      currentAccount?.network.baseAsset.symbol === undefined
    ) {
      return undefined
    }
    // TODO: v0.2.0 Support multi-network base assets.
    return selectAssetPricePoint(
      assets,
      currentAccount?.network.baseAsset.symbol,
      mainCurrencySymbol
    )
  }
)

export const selectCurrentAccountBalances = createSelector(
  getCurrentAccountState,
  getAssetsState,
  selectHideDust,
  selectMainCurrencySymbol,
  (currentAccount, assets, hideDust, mainCurrencySymbol) => {
    if (typeof currentAccount === "undefined" || currentAccount === "loading") {
      return undefined
    }
    const assetAmounts = Object.values(currentAccount.balances).map(
      (balance) => balance.assetAmount
    )

    const { combinedAssetAmounts, totalMainCurrencyAmount } =
      computeCombinedAssetAmountsData(
        assetAmounts,
        assets,
        mainCurrencySymbol,
        hideDust
      )

    return {
      assetAmounts: combinedAssetAmounts,
      totalMainCurrencyValue: totalMainCurrencyAmount,
    }
  }
)

export type AccountTotal = AddressOnMaybeNetwork & {
  shortenedAddress: string
  accountType: AccountType
  keyringId: string | null
  keyringType: KeyringType
  signingMethod: SigningMethod | null
  name?: string
  defaultName?: string
  avatarURL?: string
  localizedTotalMainCurrencyAmount?: string
  networkTokenAmount?: AssetDecimalAmount
}

export type CategorizedAccountTotals = { [key in AccountType]?: AccountTotal[] }

const signingMethodTypeToAccountType: Record<
  SigningMethod["type"],
  AccountType
> = {
  keyring: AccountType.Imported,
  ledger: AccountType.Ledger,
}

const getAccountType = (
  address: string,
  signingMethod: SigningMethod,
  addressSources: {
    [address: string]: "import" | "internal"
  }
): AccountType => {
  if (signingMethod == null) {
    return AccountType.ReadOnly
  }
  if (signingMethodTypeToAccountType[signingMethod.type] === "ledger") {
    return AccountType.Ledger
  }
  if (addressSources[address] === "import") {
    return AccountType.Imported
  }
  return AccountType.Internal
}

export const selectAccountTotalsByCategory = createSelector(
  getAccountState,
  getAssetsState,
  selectAddressSigningMethods,
  selectKeyringsByAddresses,
  selectSourcesByAddress,
  selectMainCurrencySymbol,
  selectCurrentAccount,
  (
    accounts,
    assets,
    signingAccounts,
    keyringsByAddresses,
    sourcesByAddress,
    mainCurrencySymbol,
    currentAccount
  ): CategorizedAccountTotals => {
    return Object.entries(accounts.accountsData)
      .filter(
        ([_, accountData]) =>
          accountData !== "loading" &&
          accountData.network.family === currentAccount.network.family
      )
      .map(([address, accountData]): AccountTotal => {
        const shortenedAddress = truncateAddress(address)
        const signingMethod = signingAccounts[address] ?? null
        const keyringId = keyringsByAddresses[address]?.fingerprint
        const keyringType = keyringsByAddresses[address]?.keyringType
        const accountType = getAccountType(
          address,
          signingMethod,
          sourcesByAddress
        )

        if (accountData === "loading") {
          return {
            address,
            shortenedAddress,
            accountType,
            keyringId,
            signingMethod,
            network: undefined,
            keyringType,
          }
        }

        const totalMainCurrencyAmount = Object.values(accountData.balances)
          .map(({ assetAmount }) => {
            const assetPricePoint = selectAssetPricePoint(
              assets,
              assetAmount.asset.symbol,
              mainCurrencySymbol
            )

            if (typeof assetPricePoint === "undefined") {
              return 0
            }

            const convertedAmount = convertAssetAmountViaPricePoint(
              assetAmount,
              assetPricePoint
            )

            if (typeof convertedAmount === "undefined") {
              return 0
            }

            return assetAmountToDesiredDecimals(
              convertedAmount,
              desiredDecimals
            )
          })
          .reduce((total, assetBalance) => total + assetBalance, 0)

        const networkTokenAssetAmount =
          accountData.balances[currentAccount.network.baseAsset.symbol]
            .assetAmount
        const networkTokenAmount = enrichAssetAmountWithDecimalValues(
          networkTokenAssetAmount,
          2
        )
        return {
          address,
          shortenedAddress,
          accountType,
          keyringId,
          keyringType,
          signingMethod,
          defaultName: accountData.ens.name ?? accountData.defaultName,
          name: accountData.name,
          avatarURL: accountData.ens.avatarURL ?? accountData.defaultAvatar,
          localizedTotalMainCurrencyAmount: formatCurrencyAmount(
            mainCurrencySymbol,
            totalMainCurrencyAmount,
            desiredDecimals
          ),
          network: currentAccount.network,
          networkTokenAmount,
        }
      })
      .reduce<CategorizedAccountTotals>((acc, accountTotal) => {
        acc[accountTotal.accountType] ??= []
        acc[accountTotal.accountType]!.push(accountTotal)
        return acc
      }, {})
  }
)

function findAccountTotal(
  categorizedAccountTotals: CategorizedAccountTotals,
  accountAddress: string
): AccountTotal | undefined {
  return Object.values(categorizedAccountTotals)
    .flat()
    .find(
      ({ address }) => address.toLowerCase() === accountAddress.toLowerCase()
    )
}

export const getAccountTotal = (
  state: RootState,
  accountAddress: string
): AccountTotal | undefined =>
  findAccountTotal(selectAccountTotalsByCategory(state), accountAddress)

export const selectCurrentAccountTotal = createSelector(
  selectAccountTotalsByCategory,
  selectCurrentAccount,
  (categorizedAccountTotals, currentAccount): AccountTotal | undefined =>
    findAccountTotal(categorizedAccountTotals, currentAccount.address)
)
