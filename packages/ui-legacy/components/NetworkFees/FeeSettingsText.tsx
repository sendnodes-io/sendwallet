import { ESTIMATED_FEE_MULTIPLIERS_BY_TYPE } from "@sendnodes/pokt-wallet-background/constants/network-fees";
import {
  truncateDecimalAmount,
  weiToGwei,
} from "@sendnodes/pokt-wallet-background/lib/utils";
import {
  NetworkFeeSettings,
  selectDefaultNetworkFeeSettings,
  selectEstimatedFeesPerGas,
  selectFeeType,
} from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction";
import {
  selectCurrentAccount,
  selectMainCurrencyPricePoint,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { enrichAssetAmountWithMainCurrencyValues } from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils";
import { PricePoint } from "@sendnodes/pokt-wallet-background/assets";
import React, { ReactElement } from "react";
import { formatFixed } from "@ethersproject/bignumber";
import { useBackgroundSelector } from "../../hooks";
import usePocketNetworkFee from "../../hooks/pocket-network/use-network-fee";
import formatTokenAmount from "../../utils/formatTokenAmount";

const getFeeDollarValue = (
  currencyPrice: PricePoint | undefined,
  networkSettings: NetworkFeeSettings,
): string | undefined => {
  const {
    values: { maxFeePerGas, maxPriorityFeePerGas },
  } = networkSettings;
  const gasLimit =
    networkSettings.gasLimit ?? networkSettings.suggestedGasLimit;

  if (!(gasLimit && currencyPrice)) return undefined;

  const [asset] = currencyPrice.pair;
  const { localizedMainCurrencyAmount } =
    enrichAssetAmountWithMainCurrencyValues(
      {
        asset,
        amount: (maxFeePerGas + maxPriorityFeePerGas) * gasLimit,
      },
      currencyPrice,
      2,
    );

  return localizedMainCurrencyAmount;
};

export default function FeeSettingsText(): ReactElement {
  const selectedAccount = useBackgroundSelector(selectCurrentAccount);
  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas);
  const selectedFeeType = useBackgroundSelector(selectFeeType);
  const networkSettings = useBackgroundSelector(
    selectDefaultNetworkFeeSettings,
  );
  const mainCurrencyPricePoint = useBackgroundSelector(
    selectMainCurrencyPricePoint,
  );
  const { networkFee: poktNetworkFee } = usePocketNetworkFee();

  const estimatedGweiAmount =
    typeof estimatedFeesPerGas !== "undefined" &&
    typeof selectedFeeType !== "undefined"
      ? truncateDecimalAmount(
          weiToGwei(
            (estimatedFeesPerGas?.baseFeePerGas *
              ESTIMATED_FEE_MULTIPLIERS_BY_TYPE[selectedFeeType]) /
              10n,
          ),
          0,
        )
      : "";

  if (!selectedAccount) {
    return <>Unknown</>;
  }

  if (selectedAccount?.network?.family === "POKT") {
    return (
      <div>
        {formatTokenAmount(
          formatFixed(
            poktNetworkFee,
            selectedAccount.network.baseAsset.decimals,
          ),
        )}
        {" POKT"}
      </div>
    );
  }

  if (typeof estimatedFeesPerGas === "undefined") return <div>Unknown</div>;

  const gweiValue = `${estimatedGweiAmount} Gwei`;
  const dollarValue = getFeeDollarValue(
    mainCurrencyPricePoint,
    networkSettings,
  );

  if (!dollarValue) return <div>~{gweiValue}</div>;

  return (
    <div>
      ~{dollarValue}
      <span className="fee_gwei">({gweiValue})</span>
      <style jsx>{`
        .fee_gwei {
          color: var(--green-60);
          margin-left: 5px;
        }
      `}</style>
    </div>
  );
}
