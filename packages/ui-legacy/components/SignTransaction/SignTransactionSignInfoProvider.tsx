import { unitPricePointForPricePoint } from "@sendnodes/pokt-wallet-background/assets";
import { USD } from "@sendnodes/pokt-wallet-background/constants";
import { selectAssetPricePoint } from "@sendnodes/pokt-wallet-background/redux-slices/assets";
import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  heuristicDesiredDecimalsForUnitPrice,
} from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils";
import React, { ReactElement } from "react";
import { ActivityItem } from "@sendnodes/pokt-wallet-background/redux-slices/activities";
import { isEqual, startsWith } from "lodash";
import { useBackgroundSelector } from "../../hooks";
import TransactionDetailAddressValue from "../TransactionDetail/TransactionDetailAddressValue";
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer";
import TransactionDetailItem from "../TransactionDetail/TransactionDetailItem";
import SignTransactionBaseInfoProvider, {
  SignTransactionInfoProviderProps,
} from "./SignTransactionBaseInfoProvider";
import TransactionSendDetail from "../TransactionDetail/TransactionSendDetail";
import { useStakingPoktParamsForAddress } from "../../hooks/staking-hooks";

export default function SignTransactionSignInfoProvider({
  transactionDetails,
  annotation,
  inner,
}: SignTransactionInfoProviderProps): ReactElement {
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual);
  const { network } = currentAccount;
  const baseAssetPricePoint = useBackgroundSelector(
    (state) =>
      selectAssetPricePoint(state.assets, network.baseAsset.symbol, USD.symbol),
    isEqual,
  );

  const { data: stakingPoktData, isError } =
    useStakingPoktParamsForAddress(currentAccount);

  if (isError) {
    console.error("Error fetching staking params", isError);
  }

  let amount = BigInt(0);
  let to: string | undefined;
  let memo: string | undefined;
  if ("value" in transactionDetails) {
    amount = transactionDetails.value;
  }
  if ("txMsg" in transactionDetails) {
    amount = BigInt(transactionDetails.txMsg.value.amount);
    to = transactionDetails.txMsg.value.toAddress;
  }
  if ("to" in transactionDetails) {
    to = transactionDetails.to;
  }
  if ("memo" in transactionDetails) {
    memo = transactionDetails.memo;
  }

  const transactionAssetAmount = enrichAssetAmountWithDecimalValues(
    {
      asset: network.baseAsset,
      amount,
    },
    heuristicDesiredDecimalsForUnitPrice(
      network.baseAsset.decimals,
      typeof baseAssetPricePoint !== "undefined"
        ? unitPricePointForPricePoint(baseAssetPricePoint)
        : undefined,
    ),
  );

  const decimalPlaces = transactionAssetAmount.decimalAmount < 1 ? 6 : 2;
  const {
    decimalAmount: tokenValue,
    mainCurrencyAmount: dollarValue,
    localizedDecimalAmount: localizedTokenValue,
    localizedMainCurrencyAmount: localizedDollarValue,
  } = enrichAssetAmountWithMainCurrencyValues(
    transactionAssetAmount,
    baseAssetPricePoint,
    decimalPlaces,
  );

  let title = "Sign Transaction";
  let confirmButtonLabel = "SIGN";
  let rejectButtonLabel = "REJECT";

  if (to && to === stakingPoktData?.wallets?.siw) {
    if (startsWith(memo, "s")) {
      title = "Stake";
    }
    if (startsWith(memo, "u")) {
      title = "Unstake";
    }
    if (memo === "c:true") {
      title = "Compounding On";
    }
    if (memo === "c:false") {
      title = "Compounding Off";
    }

    confirmButtonLabel = title.toUpperCase();
    rejectButtonLabel = "CANCEL";
  }

  return (
    <SignTransactionBaseInfoProvider
      title={title}
      infoBlock={
        <TransactionSendDetail
          transaction={transactionDetails as unknown as ActivityItem}
        />
      }
      textualInfoBlock={
        <TransactionDetailContainer>
          <TransactionDetailItem name="Type" value={confirmButtonLabel} />
          <TransactionDetailItem name="Spend amount" value={tokenValue} />
          <TransactionDetailItem
            name="To:"
            value={to && <TransactionDetailAddressValue address={to} />}
          />
        </TransactionDetailContainer>
      }
      rejectButtonLabel={rejectButtonLabel}
      confirmButtonLabel={confirmButtonLabel}
      inner={inner}
    />
  );
}
