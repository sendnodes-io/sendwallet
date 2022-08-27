import React, { ReactElement } from "react"
import classNames, { clsx } from "clsx"
import { ActivityItem } from "@sendnodes/pokt-wallet-background/redux-slices/activities"
import {
  isMaxUint256,
  sameEVMAddress,
} from "@sendnodes/pokt-wallet-background/lib/utils"
import { HexString } from "@sendnodes/pokt-wallet-background/types"
import { getRecipient } from "@sendnodes/pokt-wallet-background/redux-slices/utils/activity-utils"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import formatTokenAmount from "../../utils/formatTokenAmount"
import getTransactionResult, {
  TransactionStatus,
} from "../../helpers/get-transaction-result"
import { formatFixed } from "@ethersproject/bignumber"
import useStakingAllTransactions from "../../hooks/staking-hooks/use-staking-all-transactions"
import StakeTransactionInfo from "../Stake/StakeTransactionInfo"
import TransactionDetailSlideUpMenuBody from "../TransactionDetail/TransactionDetailSlideUpMenuBody"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { isEmpty, lowerCase } from "lodash"

interface Props {
  activity: ActivityItem
  asAccount: string
}

function isReceiveActivity(activity: ActivityItem, account: string): boolean {
  return (
    activity.annotation?.type === "asset-transfer" &&
    sameEVMAddress(activity.annotation?.recipientAddress, account)
  )
}

function isSendActivity(activity: ActivityItem, account: string): boolean {
  return activity.annotation?.type === "asset-transfer"
    ? sameEVMAddress(activity.annotation?.senderAddress, account)
    : true
}

type WalletActivityListRenderDetails = {
  icon: (props: any) => JSX.Element
  label: string
  recipient:
    | {
        address: HexString | undefined
        name?: string | undefined
      }
    | undefined
  assetLogoURL: string | undefined
  assetSymbol: string
  assetValue: string
}

function WalletActivityListIcon({
  label,
  iconClass,
}: {
  label?: string
  iconClass?: string
}) {
  return (
    <div title={label} className={classNames("activity_icon", iconClass)} />
  )
}

export function renderDetailsForActivity(
  activity: ActivityItem,
  asAddressOnNetwork: AddressOnNetwork
) {
  const txResult = getTransactionResult(activity)
  const { address: asAccount, network } = asAddressOnNetwork

  let label =
    activity.to === asAccount
      ? txResult.status === "pending"
        ? "Receiving"
        : "Received"
      : txResult.status === "pending"
      ? "Sending"
      : "Send"
  let renderDetails: WalletActivityListRenderDetails = {
    icon: () => (
      <WalletActivityListIcon
        label={label}
        iconClass={activity.to === asAccount ? "receive_icon" : "send_icon"}
      />
    ),
    label: label,
    recipient: getRecipient(activity),
    assetLogoURL: undefined,
    assetSymbol: activity.asset.symbol,
    assetValue: activity.localizedDecimalValue,
  }

  if (network.family === "EVM") {
    switch (activity.annotation?.type) {
      case "asset-transfer":
        renderDetails = {
          ...renderDetails,
          icon: () => (
            <WalletActivityListIcon
              label={
                isReceiveActivity(activity, asAccount) ? "Received" : "Send"
              }
              iconClass={
                isReceiveActivity(activity, asAccount)
                  ? "receive_icon"
                  : "send_icon"
              }
            />
          ),
          label: isReceiveActivity(activity, asAccount) ? "Received" : "Send",
          assetLogoURL: activity.annotation.transactionLogoURL,
          assetSymbol: activity.annotation.assetAmount.asset.symbol,
          assetValue: activity.annotation.assetAmount.localizedDecimalAmount,
        }
        break
      case "asset-approval":
        renderDetails = {
          label: "Token approval",
          icon: () => (
            <WalletActivityListIcon
              label={"Token approval"}
              iconClass={"approve_icon"}
            />
          ),
          recipient: {
            address: activity.annotation.spenderAddress,
            name: activity.annotation.spenderName,
          },
          assetLogoURL: activity.annotation.transactionLogoURL,
          assetSymbol: activity.annotation.assetAmount.asset.symbol,
          assetValue: isMaxUint256(activity.annotation.assetAmount.amount)
            ? "Infinite"
            : activity.annotation.assetAmount.localizedDecimalAmount,
        }
        break
      case "asset-swap":
        renderDetails = {
          icon: () => (
            <WalletActivityListIcon label={"Swap"} iconClass={"swap_icon"} />
          ),
          label: "Swap",
          recipient: getRecipient(activity),
          assetLogoURL: activity.annotation.transactionLogoURL,
          assetSymbol: activity.asset.symbol,
          assetValue: activity.localizedDecimalValue,
        }
        break
      case "contract-deployment":
      case "contract-interaction":
      default:
        renderDetails = {
          icon: () => (
            <WalletActivityListIcon
              label={"Contract Interaction"}
              iconClass={"contract_interaction_icon"}
            />
          ),
          label: "Contract Interaction",
          recipient: getRecipient(activity),
          // TODO fall back to the asset URL we have in metadata
          assetLogoURL: activity.annotation?.transactionLogoURL,
          assetSymbol: activity.asset.symbol,
          assetValue: activity.localizedDecimalValue,
        }
    }
  }
  return renderDetails
}

export default function WalletActivityListItem(props: Props): ReactElement {
  const [isOpen, setIsOpen] = React.useState(false)
  const { data: allStakingTransactions } = useStakingAllTransactions()
  const { activity, asAccount } = props
  const { network } = activity

  let from
  if ("from" in activity) from = activity.from
  if ("txResult" in activity) from = activity.txResult?.signer
  const txResult = getTransactionResult(activity)

  let stakingTransaction = allStakingTransactions.find(
    (tx) => tx.hash === activity.hash
  )

  const renderDetails = renderDetailsForActivity(activity, {
    address: asAccount,
    network,
  })

  return stakingTransaction ? (
    <StakeTransactionInfo transaction={stakingTransaction}>
      {(stakingTransaction) => (
        <>
          <WalletActivityListItemComponent
            status={txResult.status}
            onClick={() => setIsOpen(true)}
            activity={activity}
            renderDetails={{
              ...renderDetails,
              icon: () => (
                <stakingTransaction.Icon
                  pending={txResult.status === "pending"}
                  className={clsx("h-5 w-5", stakingTransaction.color, {
                    uncompound: stakingTransaction.isUncompound,
                  })}
                  aria-hidden="true"
                />
              ),
              label: stakingTransaction.humanReadableAction,
              assetValue: formatTokenAmount(
                stakingTransaction.tokenValue,
                6,
                2
              ),
            }}
          />

          <SharedSlideUpMenu
            title={
              stakingTransaction?.humanReadableAction ?? "Signed Transaction"
            }
            isOpen={isOpen}
            close={() => setIsOpen(false)}
            size="full"
          >
            <TransactionDetailSlideUpMenuBody activity={activity} />
          </SharedSlideUpMenu>
        </>
      )}
    </StakeTransactionInfo>
  ) : (
    <>
      <WalletActivityListItemComponent
        status={txResult.status}
        renderDetails={renderDetails}
        activity={activity}
        onClick={() => setIsOpen(true)}
      />
      <SharedSlideUpMenu
        title={"Signed Transaction"}
        isOpen={isOpen}
        close={() => setIsOpen(false)}
        size="full"
      >
        <TransactionDetailSlideUpMenuBody activity={activity} />
      </SharedSlideUpMenu>
    </>
  )
}

type WalletActivityListItemComponentProps = {
  status: TransactionStatus
  onClick: () => void
  renderDetails: WalletActivityListRenderDetails
  activity: ActivityItem
}

function WalletActivityListItemComponent({
  status,
  onClick,
  renderDetails,
  activity,
}: WalletActivityListItemComponentProps): ReactElement {
  return (
    <li className={`${status}`}>
      <button type="button" onClick={onClick}>
        <div className="row">
          <div className="left">
            <div className="activity_icon_wrap">
              <renderDetails.icon />
            </div>

            <SharedAssetIcon
              // TODO this should come from a connected component that knows
              // about all of our asset metadata
              logoURL={renderDetails.assetLogoURL}
              symbol={renderDetails.assetSymbol}
              size="small"
            />
            <div className="amount">{renderDetails.assetValue}</div>
          </div>
          <div className="right">
            {isEmpty(renderDetails.label)
              ? status
              : lowerCase(renderDetails.label)}
            {activity.timestamp ? (
              <>
                &nbsp;-&nbsp;
                <span title={activity.unixTimestamp}>
                  {activity.relativeTimestamp}
                </span>
              </>
            ) : (
              <></>
            )}
          </div>
        </div>
      </button>
      <style jsx>
        {`
          li {
            overflow: hidden;
            position: relative;
          }
          li:before,
          li:after {
            content: "";
            display: block;
            position: absolute;
            left: 0;
            top: 48%;
            transform: translateY(-50%);
            height: 1.5rem;
            width: 0.25rem;
            border-radius: 0 0.1rem 0.1rem 0;
            z-index: 1;
          }
          li:after {
            filter: blur(0.5rem);
          }

          li.success:before,
          li.success:after {
            background: var(--success);
          }
          li.pending:before,
          li.pending:after {
            background: var(--attention);
          }

          li.failed:before,
          li.failed:after {
            background: var(--error);
          }

          button {
            width: 100%;
            height: 4rem;
            border-radius: 1.25rem;
            display: flex;
            flex-direction: column;
            padding: 0 1rem;
            margin-bottom: 0.25rem;
            justify-content: space-between;
            align-items: center;
            position: relative;
          }

          button:before {
            content: "";
            width: 100%;
            height: 100%;
            position: absolute;
            left: 0;
            background-color: var(--onyx-100);
            opacity: 0.33;
            border-radius: 1.25rem;
            transition: background-color 0.2s, opacity 0.2s;
          }

          button:hover:before {
            background-color: var(--onyx-200);
            opacity: 0.66;
          }

          button:hover {
            color: var(--white);
          }

          button:hover :global(.activity_icon) {
            background-color: var(--white);
            border-color: var(--white);
          }

          .row {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 1;
          }
          .left {
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .right {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: right;
            font-size: 0.75rem;
          }
          .activity_icon_wrap {
            border: 1px solid var(--gray-web-200);
            height: 2rem;
            width: 2rem;
            margin-right: 1rem;
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .activity_icon_wrap :global(.activity_icon) {
            /* background: url("./images/activity_contract_interaction@2x.png"); */
            background-size: cover;
            width: 0.75rem;
            height: 0.75rem;
          }
          .activity_icon_wrap :global(.send_icon),
          .activity_icon_wrap :global(.receive_icon) {
            mask-image: url("./images/send@2x.png");
            mask-size: cover;
            background-color: var(--gray-web-200);
          }
          .activity_icon_wrap :global(.receive_icon) {
            transform: rotate(180deg);
          }
          .activity_icon_wrap :global(.approve_icon) {
            background: url("./images/activity_approve@2x.png");
            background-size: cover;
          }
          .activity_icon_wrap :global(.swap_icon) {
            background: url("./images/activity_swap@2x.png");
            background-size: cover;
          }
          .activity_icon_wrap :global(.contract_interaction_icon) {
            background: url("./images/activity_contract_interaction@2x.png");
            background-size: cover;
          }
          .status:before {
            content: "•";
            margin: 0 3px;
          }

          :global(.token_icon_wrap) {
            background-color: transparent !important;
            border-radius: 1rem;
            margin-right: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .amount {
            font-weight: 600;
            color: var(--white);
          }
          .icon_send_asset {
            background: url("./images/send_asset.svg");
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
          .icon_swap_asset {
            background: url("./images/swap_asset.svg");
            background-size: 12px 12px;
            width: 12px;
            height: 12px;
          }
        `}
      </style>
    </li>
  )
}
