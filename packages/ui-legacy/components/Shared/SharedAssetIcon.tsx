import classNames from "clsx";
import React, { CSSProperties, ReactElement } from "react";

interface Props {
  size: "small" | "medium" | "large";
  logoURL: string;
  symbol: string;
}

export default function SharedAssetIcon(props: Props): ReactElement {
  let { size, logoURL, symbol } = props;
  symbol = symbol.toLowerCase();
  const hardcodedIcons = ["eth", "pokt", "matic"];
  const hasHardcodedIcon = hardcodedIcons.includes(symbol);

  // Checks to see if it's an http(s) address because I've seen
  // strings get here like ipfs://QmYNz8J1h5yefkaAw6tZwUYoJyBTWmBXgAY28ZWZ5rPsLR
  // which won't load. Of if we have a hardcoded backup image
  const hasValidImage =
    (logoURL?.includes("http")) || hasHardcodedIcon;
  const tokenIconUrl = hasHardcodedIcon ? `./images/${symbol}@2x.png` : logoURL;

  return (
    <div className={`token_icon_wrap ${size}`}>
      {hasValidImage ? (
        <div className={classNames(["token_icon", `icon_${symbol}`])} />
      ) : (
        <div className={`token_icon_fallback ${size}`}>
          {symbol.slice(0)[0]}
        </div>
      )}
      <style jsx>
        {`
          .token_icon_wrap {
            display: flex;
          }
          .token_icon_fallback {
            width: 100%;
            height: 100%;
            color: var(--gray-web-100);
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .medium .token_icon_fallback {
            margin-top: 1px;
          }

          .small .token_icon {
            width: 0.8rem;
            height: 0.8rem;
          }

          .large .token_icon {
            width: 2rem;
            height: 2rem;
          }

          .token_icon {
            width: 1.5rem;
            height: 1.5rem;
            background-color: var(--token-icon-color, var(--white));
            display: flex;
            align-items: center;
            justify-content: center;
            mask-repeat: no-repeat;
            mask-size: contain;
          }

          /** ETH icon is not square 🤦‍♂️ */
          .large .icon_eth {
            width: 1rem;
            height: 2rem;
          }
          .medium .icon_eth {
            width: 1rem;
            height: 1.5rem;
          }
          .small .icon_eth {
            width: 0.4rem;
            height: 0.8rem;
          }
        `}
      </style>
      <style jsx>
        {`
          .token_icon {
            mask-image: url("${tokenIconUrl}");
          }
        `}
      </style>
    </div>
  );
}

SharedAssetIcon.defaultProps = {
  size: "medium",
  logoURL: null,
  symbol: "POKT",
};
