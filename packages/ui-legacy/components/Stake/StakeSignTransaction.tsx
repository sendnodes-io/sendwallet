import React, {
  CSSProperties,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  rejectTransactionSignature,
  selectIsTransactionLoaded,
  selectIsTransactionSigned,
  selectTransactionData,
  signTransaction,
} from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction";
import {
  AccountTotal,
  getAccountTotal,
  selectCurrentAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { SigningMethod } from "@sendnodes/pokt-wallet-background/utils/signing";
import { POKTTransactionRequest } from "@sendnodes/pokt-wallet-background/networks";
import { useHistory } from "react-router-dom";
import { capitalize, floor, isEqual } from "lodash";
import { Dialog } from "@headlessui/react";
import clsx from "clsx";
import { BigNumber, formatFixed } from "@ethersproject/bignumber";
import { EnrichedPOKTTransactionRequest } from "@sendnodes/pokt-wallet-background/services/enrichment";
import { truncateAddress } from "@sendnodes/pokt-wallet-background/lib/utils";
import dayjs from "dayjs";
import * as utc from "dayjs/plugin/utc";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as localizedFormat from "dayjs/plugin/localizedFormat";

import { InformationCircleIcon, XIcon } from "@heroicons/react/outline";
import SharedButton from "../Shared/SharedButton";
import { SnAction, useStakingUserData } from "../../hooks/staking-hooks";
import SharedSplashScreen from "../Shared/SharedSplashScreen";
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useIsSigningMethodLocked,
} from "../../hooks";
import getSnActionFromMemo from "../../helpers/get-sn-action-from-memo";
import usePocketNetworkFee from "../../hooks/pocket-network/use-network-fee";
import formatTokenAmount from "../../utils/formatTokenAmount";
import useStakingPoktParams from "../../hooks/staking-hooks/use-staking-pokt-params";
import useAssetInMainCurrency from "../../hooks/assets/use-asset-in-main-currency";
import type { RootState } from "@sendnodes/pokt-wallet-background";
import { AccountType } from "@sendnodes/pokt-wallet-background/redux-slices/AccountType";
import { usePoktNetworkBlock } from "@sendnodes/pokt-wallet-ui/hooks/pocket-network/use-latest-block";

dayjs.extend(utc.default);
dayjs.extend(localizedFormat.default);
dayjs.extend(relativeTime.default);

export default function StakeSignTransaction(): ReactElement {
  const history = useHistory();
  const dispatch = useBackgroundDispatch();
  const { data: latestBlock } = usePoktNetworkBlock();
  const transactionDetails = useBackgroundSelector(
    selectTransactionData,
    isEqual
  ) as EnrichedPOKTTransactionRequest | undefined;

  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded,
    isEqual
  );

  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual);
  const signerAccountTotal = useBackgroundSelector((state: RootState) => {
    if (typeof transactionDetails !== "undefined") {
      return getAccountTotal(state, transactionDetails.from);
    }
    return undefined;
  }, isEqual) as AccountTotal | undefined;

  const { isLoading: isStakingPoktParamsLoading } = useStakingPoktParams();

  const { data: stakingUserData } = useStakingUserData(currentAccount);
  const [isTransactionSigning, setIsTransactionSigning] = useState(false);
  const signingMethod = signerAccountTotal?.signingMethod ?? null;
  const isLocked = useIsSigningMethodLocked(signingMethod as SigningMethod);
  const isTransactionSigned = useBackgroundSelector(
    selectIsTransactionSigned,
    isEqual
  );

  const handleReject = useCallback(async () => {
    dispatch(rejectTransactionSignature());
  }, [dispatch]);
  const handleConfirm = useCallback(async () => {
    if (
      isTransactionDataReady &&
      transactionDetails &&
      signingMethod !== null
    ) {
      dispatch(
        signTransaction({
          transaction: transactionDetails as POKTTransactionRequest,
          method: signingMethod as SigningMethod,
        })
      );
      setIsTransactionSigning(true);
    }
  }, [dispatch, isTransactionDataReady, transactionDetails, signingMethod]);

  // reject the transaction if the user navigates away from the page
  useEffect(() => {
    const reject = async () => {
      await handleReject();
      return true;
    };
    window.addEventListener("beforeunload", reject);
    return () => {
      window.removeEventListener("beforeunload", reject);
    };
  }, [handleReject]);

  useEffect(() => {
    if (isTransactionSigned) {
      history.push("/transactions");
    }
  }, [isTransactionSigned]);

  const { networkFee } = usePocketNetworkFee();

  const action = getSnActionFromMemo(transactionDetails?.memo);
  const amount =
    action === SnAction.UNSTAKE
      ? transactionDetails?.memo?.split(":")[1]
      : transactionDetails?.txMsg.value.amount;

  const amountInMainCurrency = useAssetInMainCurrency({
    assetAmount: {
      amount: BigNumber.from(amount ?? 0).toBigInt(),
      asset: currentAccount.network.baseAsset,
    },
  });

  if (
    isLocked ||
    isStakingPoktParamsLoading ||
    typeof transactionDetails === "undefined" ||
    typeof signerAccountTotal === "undefined"
  ) {
    return <SharedSplashScreen />;
  }

  const signerComponent = (
    <dd
      title={signerAccountTotal.address}
      className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2 text-right"
    >
      {signerAccountTotal.name
        ? signerAccountTotal.name
        : truncateAddress(signerAccountTotal.address)}
    </dd>
  );
  const sendnodesComponent = (
    <dd
      title={transactionDetails.to}
      className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2 text-right"
    >
      <img
        src="/images/sendnodes.png"
        width="558"
        height="84"
        className="w-full inline-block mr-2 max-w-[5rem]"
        alt="SendNodes"
        title="SendNodes"
      />
      <span className="sr-only">SendNodes</span>
    </dd>
  );

  const isCompound =
    action === SnAction.COMPOUND &&
    transactionDetails.memo?.split(":")[1] === "true";
  const isUncompound =
    action === SnAction.COMPOUND &&
    transactionDetails.memo?.split(":")[1] === "false";
  const isStake = action === SnAction.STAKE;
  const isUnstake = action === SnAction.UNSTAKE;
  const { from, to } = isUnstake
    ? { from: sendnodesComponent, to: signerComponent }
    : { from: signerComponent, to: sendnodesComponent };

  const lastBlockOrNow = latestBlock?.header?.time
    ? dayjs.utc(latestBlock?.header?.time)
    : dayjs();
  const avgBlockTime = 15;
  const avgBlocksPerDay = 96;
  const estimatedDays = isUnstake ? 21 : 1;
  const estimatedDeliveryTime = lastBlockOrNow.add(
    estimatedDays * avgBlocksPerDay * avgBlockTime,
    "minutes"
  );

  const humanAction = capitalize(action?.toLowerCase());

  return (
    <div>
      <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4">
        <button
          type="button"
          className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aqua focus:ring-offset-aqua"
          onClick={handleReject}
        >
          <span className="sr-only">Close</span>
          <XIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div>
        {isStake ||
          (isUnstake && (
            <div
              className="mx-auto flex items-center justify-center h-12 w-12 rounded-full"
              style={
                {
                  "--stake-modal-icon": `url("/images/${action.toLowerCase()}@2x.png")`,
                } as CSSProperties
              }
            >
              <div
                className={clsx("icon-mask h-10 w-10 bg-white", {
                  "bg-aqua": isStake,
                })}
                css={`
                  mask-image: var(--stake-modal-icon);
                `}
              />
            </div>
          ))}
        <div className="mt-3 sm:mt-5">
          <Dialog.Title
            as="h3"
            className="text-lg leading-6 font-medium text-white text-center "
          >
            {isCompound && "Enable Compound"}
            {isUncompound && "Disable Compound"}
            {!(isUncompound || isCompound) && humanAction}
          </Dialog.Title>
          <div className="mt-2">
            <p className="text-sm text-spanish-gray text-center ">
              {isCompound || isUncompound ? (
                <span>
                  You are about to {isUncompound ? "disable" : "enable"}{" "}
                  {humanAction.toLowerCase()}ing of your POKT rewards with
                  SendNodes.
                </span>
              ) : (
                <span>
                  You are about to {humanAction.toLowerCase()} your POKT with
                  SendNodes. Please review the amount.
                </span>
              )}
            </p>

            <div className="px-4 py-5 sm:p-0 rounded-sm">
              <dl className="sm:divide-y sm:divide-gray-200">
                {(isCompound || isUncompound) && (
                  <>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
                      <dt className="text-sm font-medium text-spanish-gray whitespace-nowrap relative">
                        Compounding APY*
                      </dt>
                      <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2 text-right ">
                        {floor(
                          Number(stakingUserData?.rewardsData.apy),
                          2
                        ).toLocaleString()}{" "}
                        %
                      </dd>
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
                      <dt className="text-sm font-medium text-spanish-gray whitespace-nowrap relative">
                        No Compounding APY*
                      </dt>
                      <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2 text-right ">
                        {floor(
                          Number(stakingUserData?.rewardsData.apyNoCompounding),
                          2
                        ).toLocaleString()}
                        %
                      </dd>
                    </div>
                  </>
                )}
                {isStake || isUnstake ? (
                  <>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
                      <dt className="text-sm font-medium text-spanish-gray">
                        {action.toUpperCase().substring(0, action.length - 1)}
                        ING
                      </dt>
                      <dd
                        title={Number(
                          formatFixed(
                            BigNumber.from(amount),
                            currentAccount.network.baseAsset.decimals
                          )
                        ).toLocaleString()}
                        className="mt-1 text-lg text-white sm:mt-0 sm:col-span-2 text-right relative"
                      >
                        <img
                          src="/images/pokt_icon@2x.svg"
                          className="h-5 w-5 inline mr-2"
                          alt="POKT"
                        />
                        {formatTokenAmount(
                          formatFixed(
                            BigNumber.from(amount),
                            currentAccount.network.baseAsset.decimals
                          ),
                          9,
                          2
                        )}
                        {amountInMainCurrency && (
                          <small className="absolute left-0 right-0 top-6 text-spanish-gray text-xs">
                            {amountInMainCurrency.localizedMainCurrencyAmount}
                          </small>
                        )}
                      </dd>
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
                      <dt className="text-sm font-medium text-spanish-gray">
                        FROM
                      </dt>
                      {from}
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
                      <dt className="text-sm font-medium text-spanish-gray">
                        TO
                      </dt>
                      {to}
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center group">
                      <dt className="text-sm font-medium text-spanish-gray">
                        <a
                          href={
                            action === SnAction.UNSTAKE
                              ? "https://sendnodes.gitbook.io/sendnodes/start-here/frequently-asked-questions#how-do-i-unstake"
                              : "https://docs.sendnodes.io/start-here/frequently-asked-questions#what-is-the-staking-schedule"
                          }
                          target="_blank"
                          className="hover:text-white"
                          title={
                            action === SnAction.STAKE
                              ? "What is the staking schedule?"
                              : "How do I unstake?"
                          }
                          rel="noreferrer"
                        >
                          {capitalize(action.toLowerCase())} ETA{" "}
                          <InformationCircleIcon className="inline h-4 w-4" />
                        </a>
                      </dt>
                      <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-2 text-right ">
                        <p>
                          <span className="group-hover:hidden">
                            <time
                              dateTime={estimatedDeliveryTime.format("L LT")}
                              title={estimatedDeliveryTime.format("L LT")}
                            >
                              {estimatedDeliveryTime.fromNow()}
                            </time>
                          </span>
                          <span className="hidden group-hover:inline">
                            <time
                              dateTime={estimatedDeliveryTime.format("L LT")}
                              title={estimatedDeliveryTime.format("L LT")}
                            >
                              {estimatedDeliveryTime.format("L LT")}
                            </time>
                          </span>
                        </p>
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-sm text-spanish-gray text-center ">
          {isStake && (
            <span>
              It takes 24 hours for your POKT to become staked and start earning
              rewards.
            </span>
          )}
          {isUnstake && (
            <span>
              It takes 21-24 days for your POKT to become unstaked. You stop
              earning rewards on this amount immediately.
            </span>
          )}

          {isCompound && <span>Rewards will be automatically staked.</span>}
          {isUncompound && (
            <span>
              Rewards will no longer be automatically staked and instead sent to
              your wallet.
            </span>
          )}
          {(isCompound || isUncompound) && (
            <a
              href="https://docs.sendnodes.io/sendnodes/start-here/frequently-asked-questions/all-about-rewards"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="">
                <b>*</b>Estimated net rewards after fees. Actual rewards may be
                different. <InformationCircleIcon className="h-4 w-4 inline" />{" "}
              </span>
            </a>
          )}
        </p>
      </div>
      <div className="mt-3 sm:mt-4 relative">
        <small className="font-light mb-2 inline-block">
          TX Fee:{" "}
          {formatFixed(networkFee, currentAccount.network.baseAsset.decimals)}{" "}
          {currentAccount.network.baseAsset.symbol}
        </small>
        {signerAccountTotal.accountType === AccountType.ReadOnly && (
          <p className="mb-2">
            Unable to sign transactions with a read-only account.{" "}
          </p>
        )}
        <SharedButton
          size="medium"
          type="primary"
          onClick={handleConfirm}
          className="w-full"
          isDisabled={
            isTransactionSigning ||
            signerAccountTotal.accountType === AccountType.ReadOnly
          }
          isLoading={isTransactionSigning}
        >
          CONFIRM
        </SharedButton>
      </div>
    </div>
  );
}
