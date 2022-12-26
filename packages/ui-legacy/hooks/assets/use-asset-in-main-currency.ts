import { AssetAmount } from "@sendnodes/pokt-wallet-background/assets";
import { selectAssetPricePoint } from "@sendnodes/pokt-wallet-background/redux-slices/assets";
import { selectMainCurrencySymbol } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { enrichAssetAmountWithMainCurrencyValues } from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils";
import { isEqual } from "lodash";
import { useBackgroundSelector } from "../redux-hooks";

export default function useAssetInMainCurrency({
  assetAmount,
  desiredDecimals = 2,
}: {
  assetAmount: AssetAmount;
  desiredDecimals?: number;
}) {
  const mainCurrencySymbol = useBackgroundSelector(
    selectMainCurrencySymbol,
    isEqual,
  );
  const assetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(
      state.assets,
      assetAmount.asset.symbol,
      mainCurrencySymbol,
    ),
  );
  return enrichAssetAmountWithMainCurrencyValues(
    assetAmount,
    assetPricePoint,
    desiredDecimals,
  );
}
