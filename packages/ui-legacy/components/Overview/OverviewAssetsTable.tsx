import React, { ReactElement } from "react";
import { CompleteAssetAmount } from "@sendnodes/pokt-wallet-background/redux-slices/accounts";
import SharedAssetIcon from "../Shared/SharedAssetIcon";
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner";

interface Props {
  assets: CompleteAssetAmount[];
  initializationLoadingTimeExpired: boolean;
}

export default function OverviewAssetsTable(props: Props): ReactElement {
  const { assets, initializationLoadingTimeExpired } = props;
  if (!assets) return <></>;

  function assetSortCompare(a: CompleteAssetAmount, b: CompleteAssetAmount) {
    if (a.mainCurrencyAmount !== b.mainCurrencyAmount) {
      // Any mismatched undefined is ranked below its defined counterpart.
      if (a.mainCurrencyAmount === undefined) {
        return 1;
      }
      if (b.mainCurrencyAmount === undefined) {
        return -1;
      }

      return b.mainCurrencyAmount - a.mainCurrencyAmount;
    }

    // Fall back on symbol comparison.
    return a.asset.symbol.localeCompare(b.asset.symbol);
  }

  return (
    <table className="standard_width">
      <thead>
        <tr>
          <th>Asset</th>
          <th>Price</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        {assets.sort(assetSortCompare).map((asset) => (
          <tr key={asset.asset.metadata?.coinGeckoID || asset.asset.symbol}>
            <td>
              <div className="asset_descriptor">
                <SharedAssetIcon
                  size="small"
                  logoURL={asset?.asset?.metadata?.logoURL}
                  symbol={asset?.asset?.symbol}
                />
                <span className="asset_name">{asset.asset.symbol}</span>
              </div>
            </td>
            <td>
              {asset.localizedUnitPrice ? (
                <div>
                  <span className="lighter_color">$</span>
                  {asset.localizedUnitPrice}
                </div>
              ) : (
                <div className="loading_wrap">
                  {initializationLoadingTimeExpired ? (
                    <></>
                  ) : (
                    <SharedLoadingSpinner size="small" />
                  )}
                </div>
              )}
            </td>
            <td>
              {asset.localizedMainCurrencyAmount && (
                <div>{asset.localizedMainCurrencyAmount}</div>
              )}
              <div className="balance_token_amount">
                {asset.localizedDecimalAmount}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
      <style jsx>{`
        tr {
          height: 55px;
        }
        td,
        th {
          border-bottom: 1px solid var(--cod-gray-100);
          text-align: left;
        }
        thead {
          border-bottom: 1px solid var(--cod-gray-100);
        }
        th {
          color: var(--dim-gray);
          font-size: 12px;
          font-weight: 600;
          line-height: 16px;
          padding-bottom: 8px;
          vertical-align: bottom;
        }
        td:nth-child(1) {
          width: 40%;
        }
        th:nth-child(2),
        td:nth-child(2) {
          width: 25%;
          text-align: right;
        }
        th:nth-child(3),
        td:nth-child(3) {
          text-align: right;
        }
        .asset_descriptor {
          display: flex;
          align-items: center;
        }
        .balance_token_amount {
          color: var(--dim-gray);
          font-size: 14px;
          line-height: 16px;
          text-align: right;
          margin-top: 3px;
        }
        .lighter_color {
          color: var(--dim-gray);
        }
        .asset_name {
          margin-left: 7px;
        }
        .loading_wrap {
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </table>
  );
}
