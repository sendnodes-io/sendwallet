import React, { ReactElement } from "react"

import { AccountTotal } from "@sendnodes/pokt-wallet-background/redux-slices/selectors"

import formatTokenAmount from "../../utils/formatTokenAmount"
import { useBackgroundDispatch } from "../../hooks"
import SharedAddress from "./SharedAddress"

interface Props {
  isSelected?: boolean
  accountTotal: AccountTotal
  children?: React.ReactNode
}

export default function SharedAccountItemSummary(props: Props): ReactElement {
  const dispatch = useBackgroundDispatch()
  const { isSelected, accountTotal, children } = props
  const {
    shortenedAddress,
    name,
    defaultName,
    avatarURL,
    localizedTotalMainCurrencyAmount,
    address,
    network,
    networkTokenAmount,
  } = accountTotal

  const nameOrDefaultName = name || defaultName
  return (
    <div className="wrap">
      <div className="summary">
        <div className="left">
          <div className="avatar" />

          <div className="info">
            <div className="address_name">
              {typeof nameOrDefaultName === "undefined"
                ? shortenedAddress
                : nameOrDefaultName}
            </div>
            <div title={`${address}`} className="address">
              <SharedAddress address={address} />
            </div>
          </div>
        </div>
        <div className="right">
          <div className="balance_status">
            <div className="balance">
              <span className="token_icon" />
              {formatTokenAmount(networkTokenAmount?.decimalAmount, 5)}
            </div>
          </div>
          {children}
        </div>
      </div>

      <style jsx>
        {`
          .wrap {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0 auto;
            height: 3.25rem;
            width: 100%;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0 auto;
            flex-grow: 2;
            height: 3.25rem;
          }
          .avatar {
            background: url("${avatarURL || "./images/avatar@2x.png"}") center
              no-repeat;
            background-size: cover;
            width: 3rem;
            height: 3rem;
            border-radius: 2rem;
          }

          .left {
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }
          .address_name {
            color: var(--white);
            font-weight: 500;
            margin-bottom: 0.5rem;
            white-space: nowrap;
            width: 10rem;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .address {
            font-size: 0.75rem;
            color: var(--spanish-gray);
            font-weight: 300;
          }
          .address :global(button) {
            background-color: transparent;
          }
          .balance {
            text-align: right;
            color: var(--white);
            font-weight: 300;
          }
          .info {
            margin-left: 1rem;
          }
          .right {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .token_icon {
            mask-size: contain;
            mask-repeat: no-repeat;
            height: 0.8rem;
            width: 0.8rem;
            display: inline-block;
            background-color: var(--white);
            margin-right: 0.25rem;
            position: relative;
            text-align: center;
          }
        `}
      </style>
      <style jsx>
        {`
          .token_icon {
            mask-image: url("./images/${network?.baseAsset.symbol.toLocaleLowerCase()}@2x.png");
          }
        `}
      </style>
    </div>
  )
}

SharedAccountItemSummary.defaultProps = {
  isSelected: false,
}
