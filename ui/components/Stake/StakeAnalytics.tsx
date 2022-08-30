import { formatFixed } from "@ethersproject/bignumber"
import { InformationCircleIcon } from "@heroicons/react/outline"
import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import { BigNumber } from "ethers"
import { floor, isEqual } from "lodash"
import React, { ReactElement } from "react"
import { Link } from "react-router-dom"
import { useBackgroundSelector } from "../../hooks"
import { useStakingUserData } from "../../hooks/staking-hooks"
import useStakingPoktParams from "../../hooks/staking-hooks/use-staking-pokt-params"
import useStakingRequestsTransactions from "../../hooks/staking-hooks/use-staking-requests-transactions"
import useStakingRewardsTransactions from "../../hooks/staking-hooks/use-staking-rewards-transactions"
import formatTokenAmount from "../../utils/formatTokenAmount"
import SharedSplashScreen from "../Shared/SharedSplashScreen"

export default function StakeAnalytics(): ReactElement {
  const currentAccount = useBackgroundSelector(selectCurrentAccount, isEqual)
  const {
    data: stakingPoktParams,
    isLoading: isStakingParamsLoading,
    isError: isStakingParamsError,
  } = useStakingPoktParams()

  const {
    data: stakingUserData,
    isLoading: isStakingUserDataLoading,
    isError: isStakingUserDataError,
  } = useStakingUserData(currentAccount)

  if (isStakingParamsError) throw isStakingParamsError
  if (isStakingUserDataError) throw isStakingUserDataError
  if (isStakingParamsLoading || isStakingUserDataLoading) {
    return (
      <div className="grow w-full relative flex flex-col justify-center items-center">
        <SharedSplashScreen />
      </div>
    )
  }

  const poolTotalStaked = formatFixed(
    BigNumber.from(stakingUserData!.rewardsData.totalStaked ?? 0),
    currentAccount.network.baseAsset.decimals
  )
  const poolTotalUpcomingStakes = formatFixed(
    BigNumber.from(stakingUserData!.rewardsData.totalPendingStaked ?? 0),
    currentAccount.network.baseAsset.decimals
  )
  const stakingMinAmount = Number(
    formatFixed(
      stakingPoktParams!.stakingMinAmount,
      currentAccount.network.baseAsset.decimals
    )
  )
  const netRewardsPer1000PerDay = formatFixed(
    BigNumber.from(
      stakingUserData!.rewardsData.netRewardsPerPoktStakedPerDay ?? 0
    ).mul(stakingMinAmount),
    currentAccount.network.baseAsset.decimals
  )
  const staking15xMinAmount = stakingMinAmount * 15
  const netRewardsPer15000PerDay = formatFixed(
    BigNumber.from(
      stakingUserData!.rewardsData.netRewardsPerPoktStakedPerDay ?? 0
    ).mul(staking15xMinAmount),
    currentAccount.network.baseAsset.decimals
  )
  const staking60xMinAmount = stakingMinAmount * 60
  const netRewardsPer60000PerDay = formatFixed(
    BigNumber.from(
      stakingUserData!.rewardsData.netRewardsPerPoktStakedPerDay ?? 0
    ).mul(staking60xMinAmount),
    currentAccount.network.baseAsset.decimals
  )

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold flex items-end">
              <img
                src="/images/sendnodes.png"
                width={"558"}
                height="84"
                className="w-full inline-flex mr-2 max-w-[12rem]"
                alt="SendNodes"
                title="SendNodes"
              />
              <span className="inline-flex relative top-1">Analytics</span>
            </h1>
            <p className="mt-2 text-sm text-spanish-gray">
              Dashboard for{" "}
              <a
                href="https://docs.sendnodes.io/"
                target={"_blank"}
                className="hover:text-white"
              >
                POKT Onchain Pool Staking (<b className="text-white">POPS</b>){" "}
                <InformationCircleIcon className="inline h-4 w-4" />
              </a>{" "}
              stats by SendNodes.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              to="/"
              className="relative inline-flex items-center justify-center px-4 py-1 overflow-hidden font-medium text-eerie-black rounded-lg shadow-2xl group"
            >
              <span className="absolute top-0 left-0 w-40 h-40 -mt-10 -ml-3 transition-all duration-700 bg-capri rounded-full blur-md ease"></span>
              <span className="absolute inset-0 w-full h-full transition duration-700 group-hover:rotate-180 ease">
                <span className="absolute bottom-0 left-0 w-24 h-24 -ml-10 bg-aqua rounded-full blur-md"></span>
                <span className="absolute bottom-0 right-0 w-24 h-24 -mr-10 bg-capri rounded-full blur-md"></span>
              </span>
              <span className="relative ">Stake</span>
            </Link>
          </div>
        </div>
        <div className="mt-8 flex flex-col">
          <div className="mt-8 pb-12 px-0 md:px-4">
            <div className="mb-4">
              <div className="py-4 mb-4 text-center">
                <h2 className="text-base md:text-3xl">Pool</h2>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-8 gap-y-8 gap-x-4">
                <div className="hidden md:block col-span-1"></div>
                <div
                  title={poolTotalStaked}
                  className="relative border border-spanish-gray h-24 rounded-md col-span-3"
                >
                  <div className="absolute flex items-center justify-center -top-6 left-0 right-0 whitespace-nowrap text-xs">
                    <span>Total Staked</span>
                  </div>
                  <div className="w-full h-full grow flex gap-1 justify-space items-center">
                    <div className="relative grow h-full">
                      <div className="flex flex-col grow items-center justify-center h-full">
                        <div className="text-3xl xl:text-4xl sm:text-3xl font-semibold text-white">
                          {formatTokenAmount(poolTotalStaked, 3, 1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  title={poolTotalUpcomingStakes}
                  className="relative border border-spanish-gray h-24 rounded-md col-span-3"
                >
                  <div className="absolute flex items-center justify-center -top-6 left-0 right-0 whitespace-nowrap text-xs">
                    <span title="Staking requests made in the last 24 hours">
                      Recent Stakes
                    </span>
                  </div>
                  <div className="w-full h-full grow flex gap-1 justify-space items-center">
                    <div className="relative grow h-full">
                      <div className="flex flex-col grow items-center justify-center h-full">
                        <div className="text-3xl xl:text-4xl sm:text-3xl font-semibold text-white">
                          {formatTokenAmount(poolTotalUpcomingStakes, 3, 1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="py-4 mb-4 text-center">
                <h2 className="text-base md:text-3xl">Performance</h2>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-9 gap-y-8 gap-x-4">
                <div
                  title={netRewardsPer1000PerDay}
                  className="relative border border-spanish-gray h-24 rounded-md col-span-3"
                >
                  <div className="absolute flex items-center justify-center -top-6 left-0 right-0 whitespace-nowrap text-xs">
                    <span>
                      Net Rewards Per {stakingMinAmount.toLocaleString()} POKT /
                      24hr
                    </span>
                  </div>
                  <div className="w-full h-full grow flex gap-1 justify-space items-center">
                    <div className="relative grow h-full">
                      <div className="flex flex-col grow items-center justify-center h-full">
                        <div className="text-3xl xl:text-4xl sm:text-3xl font-semibold text-white">
                          {formatTokenAmount(netRewardsPer1000PerDay, 3, 1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  title={netRewardsPer15000PerDay}
                  className="relative border border-spanish-gray h-24 rounded-md col-span-3"
                >
                  <div className="absolute flex items-center justify-center -top-6 left-0 right-0 whitespace-nowrap text-xs">
                    <span>
                      Net Rewards Per {staking15xMinAmount.toLocaleString()}{" "}
                      POKT / 24hr
                    </span>
                  </div>
                  <div className="w-full h-full grow flex gap-1 justify-space items-center">
                    <div className="relative grow h-full">
                      <div className="flex flex-col grow items-center justify-center h-full">
                        <div className="text-3xl xl:text-4xl sm:text-3xl font-semibold text-white">
                          {formatTokenAmount(netRewardsPer15000PerDay, 3, 1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  title={netRewardsPer60000PerDay}
                  className="relative border border-spanish-gray h-24 rounded-md col-span-3"
                >
                  <div className="absolute flex items-center justify-center -top-6 left-0 right-0 whitespace-nowrap text-xs">
                    <span title="Staking requests made in the last 24 hours">
                      Net Rewards per {staking60xMinAmount.toLocaleString()}{" "}
                      POKT / 24hr
                    </span>
                  </div>
                  <div className="w-full h-full grow flex gap-1 justify-space items-center">
                    <div className="relative grow h-full">
                      <div className="flex flex-col grow items-center justify-center h-full">
                        <div className="text-3xl xl:text-4xl sm:text-3xl font-semibold text-white">
                          {formatTokenAmount(netRewardsPer60000PerDay, 3, 1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="py-4 mb-4 text-center">
                <h2 className="text-base md:text-3xl">APY</h2>
              </div>

              <div className="relative border border-spanish-gray rounded-md col-span-2 p-4">
                <div className="w-full h-full grow gap-1 space-y-4">
                  <div className="grid grid-cols-12 w-full items-center">
                    <div className="text-left grow col-span-2">
                      <p className="text-xs">Rolling avg. period</p>
                    </div>
                    <div
                      title={"Compounding Rewards On"}
                      className="text-center grow  text-xs md:text-base col-span-5"
                    >
                      Compounding{" "}
                      <span className="hidden md:inline">Rewards</span>
                    </div>
                    <div className="text-center grow  text-xs md:text-base col-span-5">
                      <span className="hidden md:inline">No Compounding</span>{" "}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 w-full">
                    <div className="relative grow h-full items-center col-span-2">
                      <h3 className="text-sm md:text-xl">Last 24hrs</h3>
                    </div>
                    <div className="relative grow h-full col-span-5">
                      <div className="flex flex-col grow items-center justify-center h-full">
                        <div className="text-sm xl:text-4xl md:text-2xl font-semibold text-white">
                          <span className="underline">
                            {stakingUserData!.rewardsData?.apy1d
                              ? `${floor(
                                  stakingUserData!.rewardsData?.apy1d,
                                  1
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}%`
                              : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative grow h-full col-span-5">
                      <div className="flex flex-col grow items-center justify-center h-full">
                        <div className="text-sm xl:text-4xl md:text-2xl font-semibold text-white">
                          <span className="underline">
                            {stakingUserData!.rewardsData?.apyNoCompounding1d
                              ? `${floor(
                                  stakingUserData!.rewardsData
                                    ?.apyNoCompounding1d,
                                  1
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}%`
                              : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 w-full">
                    <div className="relative grow h-full items-center col-span-2">
                      <h3 className="text-sm md:text-xl">Last 7 days</h3>
                    </div>
                    <div className="relative grow h-full col-span-5">
                      <div className="flex flex-col grow items-center justify-center h-full">
                        <div className="text-sm xl:text-4xl md:text-2xl font-semibold text-white">
                          <span className="underline">
                            {stakingUserData!.rewardsData?.apy7d
                              ? `${floor(
                                  stakingUserData!.rewardsData?.apy7d,
                                  1
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}%`
                              : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative grow h-full col-span-5">
                      <div className="flex flex-col grow items-center justify-center h-full">
                        <div className="text-sm xl:text-4xl md:text-2xl font-semibold text-white">
                          <span className="underline">
                            {stakingUserData!.rewardsData?.apyNoCompounding7d
                              ? `${floor(
                                  stakingUserData!.rewardsData
                                    ?.apyNoCompounding7d,
                                  1
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}%`
                              : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <p>
              Data presented here is informational only and is not intended to
              be used as investment advice. Before you make any financial,
              legal, or other decisions involving POKT Wallet and/or SendNodes
              Inc., you should seek independent professional advice from an
              individual who is licensed and qualified in the area for which
              such advice would be appropriate.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
