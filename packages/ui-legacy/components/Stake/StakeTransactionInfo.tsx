import React, { useEffect, useState } from "react";
import {
  selectBlockExplorerForTxHash,
  selectCurrentAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors";

import { camelCase, isEqual, startCase } from "lodash";
import clsx from "clsx";
import { DownloadIcon, UploadIcon } from "@heroicons/react/solid";
import { BigNumber } from "@ethersproject/bignumber";

import dayjs from "dayjs";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as updateLocale from "dayjs/plugin/updateLocale";
import * as localizedFormat from "dayjs/plugin/localizedFormat";
import * as utc from "dayjs/plugin/utc";
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts";
import { POKTWatchBlock } from "@sendnodes/pokt-wallet-background/services/chain/utils";
import { selectAssetPricePoint } from "@sendnodes/pokt-wallet-background/redux-slices/assets";
import { USD } from "@sendnodes/pokt-wallet-background/constants";
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
} from "@sendnodes/pokt-wallet-background/redux-slices/utils/asset-utils";
import { usePoktWatchLatestBlock } from "../../hooks/pokt-watch/use-latest-block";
import { SnAction, SnTransaction } from "../../hooks/staking-hooks";
import { useBackgroundSelector } from "../../hooks";

dayjs.extend(updateLocale.default);
dayjs.extend(localizedFormat.default);
dayjs.extend(relativeTime.default);
dayjs.extend(utc.default);

const snActionBg = {
  [SnAction.COMPOUND]: "text-white",
  [SnAction.STAKE]: "bg-aqua",
  [SnAction.UNSTAKE]: "bg-white bg-opacity-50",
  [SnAction.UNSTAKE_RECEIPT]: "bg-white",
  [SnAction.REWARD]: "bg-aqua",
};

export type SnActionIconProps = {
  className?: string;
  pending?: boolean;
};

const snActionIcon: Record<SnAction, (props: any) => JSX.Element> = {
  [SnAction.COMPOUND]: ({ className, pending }: SnActionIconProps) => {
    return className?.includes("uncompound") ? (
      <UploadIcon
        className={clsx(className, "h-8 w-8 text-opacity-75", {
          "text-orange-500": pending,
        })}
      />
    ) : (
      <DownloadIcon
        className={clsx(className, "h-8 w-8", { "text-orange-500": pending })}
      />
    );
  },
  [SnAction.STAKE]: ({ className, pending }: SnActionIconProps) => (
    <div
      className={clsx("stake_icon", className, { "bg-orange-500": pending })}
    />
  ),
  [SnAction.UNSTAKE]: ({ className, pending }: SnActionIconProps) => (
    <div
      className={clsx(className, "icon-mask", { "bg-orange-500": pending })}
      css={`
        mask-image: url("../../public/images/unstake@2x.png");
      `}
    />
  ),
  [SnAction.UNSTAKE_RECEIPT]: ({ className, pending }: SnActionIconProps) => (
    <div
      className={clsx(className, "icon-mask", { "bg-orange-500": pending })}
      css={`
        mask-image: url("../../public/images/unstake@2x.png");
      `}
    />
  ),
  [SnAction.REWARD]: ({ className, pending }: SnActionIconProps) => (
    <div
      className={clsx(className, "icon-mask", { "bg-orange-500": pending })}
      css={`
        mask-image: url("../../public/images/rewards@2x.png");
      `}
    />
  ),
};

export type StakeTransactionItemState = {
  latestBlock?: POKTWatchBlock;
  currentAccount: AddressOnNetwork;
  blockExplorerUrl: string;
  isPending: boolean;
  rewardTimestamp: dayjs.Dayjs;
  isEarningRewards: boolean;
  isCompound: boolean;
  isUncompound: boolean;
  isCompoundUpdate: boolean;
  isRewards: boolean;
  isStake: boolean;
  isUnstake: boolean;
  isUnstakeReceipt: boolean;
  unstakeReceiptHash: string | false;
  unstakeReceiptAt?: string | false;
  humanReadableAction: string;
  relativeTimestamp: string;
  timestamp: dayjs.Dayjs;
  amount: BigNumber;
  color: string;
  Icon: (props: any) => JSX.Element;
  signer: string;
  userWalletAddress: string;
  height: string;
  hash: string;
  tokenValue: number;
  dollarValue?: number;
  localizedTokenValue: string;
  localizedDollarValue?: string;
};

type StakeTransactionInfoProps = {
  transaction: SnTransaction;
  children: (props: StakeTransactionItemState) => JSX.Element;
};

export function getStakeTransactionInfo({
  transaction: tx,
}: {
  transaction: SnTransaction;
}) {
  const isPending = !tx.timestamp;

  let timestamp = dayjs.utc(tx.timestamp);
  const rewardTimestamp = timestamp.clone().add(24, "hour");
  const isEarningRewards = dayjs.utc().isAfter(rewardTimestamp);
  const isCompound =
    tx.action === SnAction.COMPOUND && tx.memo?.split(":")[1] === "true";
  const isUncompound =
    tx.action === SnAction.COMPOUND && tx.memo?.split(":")[1] === "false";
  const isCompoundUpdate = isUncompound || isCompound;
  const isRewards = tx.action === SnAction.REWARD;
  const isStake = tx.action === SnAction.STAKE;
  const isUnstake = tx.action === SnAction.UNSTAKE;
  const isUnstakeReceipt = tx.action === SnAction.UNSTAKE_RECEIPT;
  const unstakeReceiptHash = isUnstakeReceipt && tx.memo?.split(":")[1];
  const unstakeReceiptAt = isUnstake && tx.unstakeReceiptAt;
  if (unstakeReceiptAt) timestamp = dayjs.utc(unstakeReceiptAt); // use the timestamp of the unstake receipt
  let humanReadableAction = startCase(camelCase(tx.action));
  if (isCompoundUpdate && isCompound) {
    humanReadableAction = "Enable Compound";
  }
  if (isCompoundUpdate && isUncompound) {
    humanReadableAction = "Disable Compound";
  }

  if (!isPending && isStake) {
    timestamp = rewardTimestamp;
  }
  const relativeTimestamp = timestamp.fromNow();
  const amount = BigNumber.from(
    (isPending && isUnstake ? tx.memo.split(":")[1] : tx.amount) ??
      BigNumber.from(0),
  );
  return {
    isPending,
    rewardTimestamp,
    isEarningRewards,
    isCompound,
    isUncompound,
    isCompoundUpdate,
    isRewards,
    isStake,
    isUnstake,
    isUnstakeReceipt,
    unstakeReceiptHash,
    unstakeReceiptAt,
    humanReadableAction,
    relativeTimestamp,
    timestamp,
    amount,
    signer: tx.signer,
    userWalletAddress: tx.userWalletAddress,
    height: tx.height,
    hash: tx.hash,
  };
}

export default function StakeTransactionInfo({
  transaction: tx,
  children,
}: StakeTransactionInfoProps) {
  const {
    isPending,
    rewardTimestamp,
    isEarningRewards,
    isCompound,
    isUncompound,
    isCompoundUpdate,
    isRewards,
    isStake,
    isUnstake,
    isUnstakeReceipt,
    unstakeReceiptHash,
    unstakeReceiptAt,
    humanReadableAction,
    relativeTimestamp,
    timestamp: txTimestamp,
    amount,
    signer,
    userWalletAddress,
    height,
    hash,
  } = getStakeTransactionInfo({ transaction: tx });

  const { latestBlock } = usePoktWatchLatestBlock();
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual);
  const blockExplorerUrl = useBackgroundSelector(
    (_) =>
      selectBlockExplorerForTxHash({
        network: currentAccount.network,
        txHash: tx.hash,
      }),
    isEqual,
  );
  const [timestamp, setTimestamp] = useState(
    !isPending
      ? txTimestamp
      : // the next block is committed 30 minutes after the start of the previous one
        dayjs
          .utc(latestBlock?.timestamp)
          .add(30, "minute"),
  );

  const baseAssetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(
      state.assets,
      currentAccount.network.baseAsset.symbol,
      USD.symbol,
    ),
  );

  const decimalPlaces = 2;
  const transactionAssetAmount = enrichAssetAmountWithDecimalValues(
    {
      asset: currentAccount.network.baseAsset,
      amount: amount.toBigInt(),
    },
    decimalPlaces,
  );

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

  useEffect(() => {
    if (isPending) {
      setTimestamp(dayjs.utc(latestBlock?.timestamp).add(30, "minute"));
      const interval = setInterval(() => {
        setTimestamp(dayjs.utc(latestBlock?.timestamp).add(30, "minute"));
      }, 60 * 1e3);
      return () => clearInterval(interval);
    }
  }, [tx, latestBlock]);

  return children({
    latestBlock,
    currentAccount,
    blockExplorerUrl,
    isPending,
    rewardTimestamp,
    isEarningRewards,
    isCompound,
    isUncompound,
    isCompoundUpdate,
    isRewards,
    isStake,
    isUnstake,
    isUnstakeReceipt,
    unstakeReceiptHash,
    unstakeReceiptAt,
    humanReadableAction,
    relativeTimestamp,
    timestamp,
    amount,
    color: snActionBg[tx.action],
    Icon: snActionIcon[tx.action],
    signer: tx.signer,
    userWalletAddress: tx.userWalletAddress,
    height: tx.height,
    hash: tx.hash,
    tokenValue,
    dollarValue,
    localizedTokenValue,
    localizedDollarValue,
  });
}
