import { unitPricePointForPricePoint } from "@sendnodes/pokt-wallet-background/assets"
import { USD } from "@sendnodes/pokt-wallet-background/constants"
import { selectAssetPricePoint } from "@sendnodes/pokt-wallet-background/redux-slices/assets"
import { selectCurrentAddressNetwork } from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  heuristicDesiredDecimalsForUnitPrice,
} from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import TransactionDetailAddressValue from "../TransactionDetail/TransactionDetailAddressValue"
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../TransactionDetail/TransactionDetailItem"
import SignTransactionBaseInfoProvider, {
  SignTransactionInfoProviderProps,
} from "./SignTransactionBaseInfoProvider"
import TransactionSendDetail from "../TransactionDetail/TransactionSendDetail"
import { ActivityItem } from "@sendnodes/pokt-wallet-background/redux-slices/activities"

export default function SignTransactionSignInfoProvider({
  transactionDetails,
  annotation,
  inner,
}: SignTransactionInfoProviderProps): ReactElement {
  const { address, network } = useBackgroundSelector(
    selectCurrentAddressNetwork
  )
  const baseAssetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(state.assets, network.baseAsset.symbol, USD.symbol)
  )
  let amount: bigint = BigInt(0)
  let to: string | undefined
  if ("value" in transactionDetails) {
    amount = transactionDetails.value
  }
  if ("txMsg" in transactionDetails) {
    amount = BigInt(transactionDetails.txMsg.value.amount)
    to = transactionDetails.txMsg.value.toAddress
  }
  if ("to" in transactionDetails) to = transactionDetails.to
  const transactionAssetAmount = enrichAssetAmountWithDecimalValues(
    {
      asset: network.baseAsset,
      amount: amount,
    },
    heuristicDesiredDecimalsForUnitPrice(
      network.baseAsset.decimals,
      typeof baseAssetPricePoint !== "undefined"
        ? unitPricePointForPricePoint(baseAssetPricePoint)
        : undefined
    )
  )

  const decimalPlaces = transactionAssetAmount.decimalAmount < 1 ? 6 : 2
  const {
    decimalAmount: tokenValue,
    mainCurrencyAmount: dollarValue,
    localizedDecimalAmount: localizedTokenValue,
    localizedMainCurrencyAmount: localizedDollarValue,
  } = enrichAssetAmountWithMainCurrencyValues(
    transactionAssetAmount,
    baseAssetPricePoint,
    decimalPlaces
  )
  /**
   * TODO: v0.2.0 Handle different kinds of transactions and assets
   */
  return (
    <SignTransactionBaseInfoProvider
      title="Sign Transaction"
      infoBlock={
        <TransactionSendDetail
          transaction={transactionDetails as unknown as ActivityItem}
        />
      }
      textualInfoBlock={
        <TransactionDetailContainer>
          <TransactionDetailItem name="Type" value="SIGN" />
          <TransactionDetailItem name="Spend amount" value={tokenValue} />
          <TransactionDetailItem
            name="To:"
            value={to && <TransactionDetailAddressValue address={to} />}
          />
        </TransactionDetailContainer>
      }
      confirmButtonLabel="SIGN"
      inner={inner}
    />
  )
}
