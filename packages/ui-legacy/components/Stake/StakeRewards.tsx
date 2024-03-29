import React, { ReactElement, useState } from "react";
import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";

import { InformationCircleIcon } from "@heroicons/react/outline";

import { groupBy, isEqual, last, reduce, uniqBy } from "lodash";
import clsx from "clsx";
import { Link } from "react-router-dom";

import { BigNumber, formatFixed } from "@ethersproject/bignumber";

import dayjs from "dayjs";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as updateLocale from "dayjs/plugin/updateLocale";
import * as localizedFormat from "dayjs/plugin/localizedFormat";
import * as utc from "dayjs/plugin/utc";
import * as isSameOrBefore from "dayjs/plugin/isSameOrBefore";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataset,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { SnAction, useStakingUserData } from "../../hooks/staking-hooks";
import SharedSplashScreen from "../Shared/SharedSplashScreen";
import { useBackgroundSelector, useAreKeyringsUnlocked } from "../../hooks";
import StakeToggleCompounding from "./StakeToggleCompounding";
import StatAPY from "./Stat/StatAPY";
import StatTotalStaked from "./Stat/StatTotalStaked";
import StatTotalUpcomingRewards from "./Stat/StatTotalUpcomingRewards";
import StatTotalRewards from "./Stat/StatTotalRewards";
import useStakingPoktParams from "../../hooks/staking-hooks/use-staking-pokt-params";
import useStakingRewardsTransactions from "../../hooks/staking-hooks/use-staking-rewards-transactions";
import useStakingRequestsTransactions from "../../hooks/staking-hooks/use-staking-requests-transactions";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

dayjs.extend(updateLocale.default);
dayjs.extend(localizedFormat.default);
dayjs.extend(relativeTime.default);
dayjs.extend(utc.default);
dayjs.extend(isSameOrBefore.default);

export default function StakeRewards(): ReactElement {
  const areKeyringsUnlocked = useAreKeyringsUnlocked(true);
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual);
  const {
    data: stakingPoktParams,
    isLoading: isStakingParamsLoading,
    isError: isStakingParamsError,
  } = useStakingPoktParams();
  const {
    data: rewardsTransactions,
    isLoading: isRewardsTransactionsLoading,
    isError: isRewardsTransactionsError,
  } = useStakingRewardsTransactions();
  const {
    data: stakingTransactions,
    isLoading: isStakingTransactionsLoading,
    isError: isStakingTransactionsError,
  } = useStakingRequestsTransactions();

  const {
    data: stakingUserData,
    isLoading: isStakingUserDataLoading,
    isError: isStakingUserDataError,
  } = useStakingUserData(currentAccount);

  if (isStakingParamsError) throw isStakingParamsError;
  if (isStakingUserDataError) throw isStakingUserDataError;
  if (isRewardsTransactionsError) throw isRewardsTransactionsError;
  if (isStakingTransactionsError) throw isStakingTransactionsError;

  if (
    !areKeyringsUnlocked ||
    isStakingParamsLoading ||
    isStakingUserDataLoading ||
    isStakingTransactionsLoading ||
    isRewardsTransactionsLoading
  ) {
    return (
      <div className="grow w-full relative flex flex-col justify-center items-center">
        <SharedSplashScreen />
      </div>
    );
  }

  const allTransactions = uniqBy(
    [
      ...[...(stakingTransactions ?? []), ...(rewardsTransactions ?? [])].sort(
        (a, b) => {
          return dayjs.utc(a.timestamp).unix() - dayjs.utc(b.timestamp).unix();
        }
      ),
    ],
    (tx) => tx.hash
  );

  const txsByDate = groupBy(allTransactions, (transaction) => {
    return dayjs.utc(transaction.timestamp).format("YYYY-MM-DD");
  });

  const endDate = dayjs.utc(last(allTransactions)?.timestamp);
  const startDate = dayjs.utc(allTransactions[0]?.timestamp);

  const cummRewardsDataset = {
    label: "Total Rewards",
    data: [],
    borderColor: "rgb(51, 184, 255)",
    backgroundColor: "rgba(51, 184, 255, 0.5)",
  } as ChartDataset<"line", number[]>;
  const dailyRewardsDataset = {
    label: "Daily Rewards",
    data: [],
    borderColor: "rgb(51, 184, 255)",
    backgroundColor: "rgba(51, 184, 255, 0.5)",
  } as ChartDataset<"line", number[]>;
  const stakedDataset = {
    label: "Staked",
    data: [],
    borderColor: "rgb(51, 255, 255)",
    backgroundColor: "rgba(51, 255, 255, 0.5)",
  } as ChartDataset<"line", number[]>;
  const unstakedDataset = {
    label: "Unstaked",
    data: [],
    borderColor: "rgb(255, 255, 255)",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  } as ChartDataset<"line", number[]>;

  const labels: string[] = [];
  let date = startDate.clone().subtract(1, "day");
  let cummReward = BigNumber.from(0);
  let cummStaked = BigNumber.from(0);
  while (date.isSameOrBefore(endDate, "day")) {
    const label = date.format("YYYY-MM-DD");
    labels.push(label);
    const txs = txsByDate[label] ?? [];
    const unstakedAmount = reduce(
      txs.filter((tx) => tx.action === SnAction.UNSTAKE),
      (sum, tx) => sum.add(BigNumber.from(tx.amount)),
      BigNumber.from(0)
    );
    const dailyReward = reduce(
      txs.filter((tx) => tx.reward),
      (sum, tx) => sum.add(BigNumber.from(tx.amount)),
      BigNumber.from(0)
    );
    cummReward = cummReward.add(dailyReward);
    cummStaked = reduce(
      txs.filter((tx) => tx.action === SnAction.STAKE),
      (sum, tx) => sum.add(BigNumber.from(tx.amount)),
      cummStaked
    ).sub(unstakedAmount);

    cummRewardsDataset.data.push(
      Number(formatFixed(cummReward, currentAccount.network.baseAsset.decimals))
    );
    dailyRewardsDataset.data.push(
      Number(
        formatFixed(dailyReward, currentAccount.network.baseAsset.decimals)
      )
    );
    stakedDataset.data.push(
      Number(formatFixed(cummStaked, currentAccount.network.baseAsset.decimals))
    );
    unstakedDataset.data.push(
      Number(
        formatFixed(unstakedAmount, currentAccount.network.baseAsset.decimals)
      )
    );
    date = date.add(1, "day");
  }

  const thirtyDaysAgo = dayjs.utc().subtract(30, "day");
  let index = startDate.clone();

  while (index.isSameOrBefore(thirtyDaysAgo, "day")) {
    cummRewardsDataset.data.shift();
    dailyRewardsDataset.data.shift();
    stakedDataset.data.shift();
    unstakedDataset.data.shift();
    labels.shift();
    index = index.add(1, "day");
  }

  const options = {
    responsive: true,
    aspectRatio: 1,
    stacked: false,
    onResize: (chart, size) => {
      if (size.width < 500) {
        chart.options.aspectRatio = 1.25;
      } else {
        chart.options.aspectRatio = 2.25;
      }
    },
    animations: {
      tension: {
        duration: 1000,
        easing: "linear",
        from: 1,
        to: 0,
        loop: false,
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "white",
        },
      },
      title: {
        display: true,

        color: "white",
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.2)",
        },
        ticks: { color: "white" },
      },

      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.2)",
        },
        ticks: { color: "white" },
        beginAtZero: true,
      },
    },
  } as ChartOptions<"line">;

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold">
              <div
                className={clsx(
                  "icon-mask h-10 w-10 bg-white inline-block align-middle"
                )}
                css={`
                  mask-image: url("../../public/images/rewards@2x.png");
                `}
              />
              Rewards
            </h1>
            <p className="mt-2 text-sm text-spanish-gray">
              All POKT rewards delivered to you on the Pocket Network for{" "}
              <a
                href="https://docs.sendnodes.io/"
                target="_blank"
                className="hover:text-white"
                rel="noreferrer"
              >
                POKT Onchain Pool Staking (<b className="text-white">POPS</b>){" "}
                <InformationCircleIcon className="inline h-4 w-4" />
              </a>{" "}
              by SendNodes.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            {BigNumber.from(
              stakingUserData?.userStakingData[0]?.staked ?? 0
            ).gt(0) ? (
              <StakeToggleCompounding />
            ) : (
              <Link
                to="/"
                className="relative inline-flex items-center justify-center px-4 py-1 overflow-hidden font-medium text-eerie-black rounded-lg shadow-2xl group"
              >
                <span className="absolute top-0 left-0 w-40 h-40 -mt-10 -ml-3 transition-all duration-700 bg-capri rounded-full blur-md ease" />
                <span className="absolute inset-0 w-full h-full transition duration-700 group-hover:rotate-180 ease">
                  <span className="absolute bottom-0 left-0 w-24 h-24 -ml-10 bg-aqua rounded-full blur-md" />
                  <span className="absolute bottom-0 right-0 w-24 h-24 -mr-10 bg-capri rounded-full blur-md" />
                </span>
                <span className="relative ">Stake</span>
              </Link>
            )}
          </div>
        </div>
        <div className="mt-8 flex flex-col">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 gap-y-12 lg:gap-8">
            <StatAPY
              aon={currentAccount}
              asset={currentAccount.network.baseAsset}
            />
            <StatTotalStaked
              aon={currentAccount}
              asset={currentAccount.network.baseAsset}
            />
            <div className="col-span-4 sm:hidden border-t border-t-spanish-gray" />

            <StatTotalUpcomingRewards
              aon={currentAccount}
              asset={currentAccount.network.baseAsset}
            />

            <StatTotalRewards
              aon={currentAccount}
              asset={currentAccount.network.baseAsset}
            />
          </div>

          <div className="mt-8 min-h-[20rem] max-h-[44vh] overflow-y-scroll pb-12 px-0 md:px-4">
            {[
              stakedDataset,
              cummRewardsDataset,
              dailyRewardsDataset,
              unstakedDataset,
            ].map((dataset) => (
              <Line
                key={dataset.label}
                options={options}
                data={{ labels, datasets: [dataset] }}
              />
            ))}
          </div>

          <div className="mt-8">
            <p>
              Data presented here is informational only and is not intended to
              be used as investment advice. Before you make any financial,
              legal, or other decisions involving SendWallet and/or SendNodes
              Inc., you should seek independent professional advice from an
              individual who is licensed and qualified in the area for which
              such advice would be appropriate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
