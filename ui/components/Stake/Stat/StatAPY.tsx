import React from "react"
import { BigNumber, formatFixed } from "@ethersproject/bignumber"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { useStakingUserData } from "../../../hooks/staking-hooks"
import formatTokenAmount from "../../../utils/formatTokenAmount"
import SharedLoadingSpinner from "../../Shared/SharedLoadingSpinner"
import { FungibleAsset } from "@sendnodes/pokt-wallet-background/assets"
import { InformationCircleIcon } from "@heroicons/react/outline"

export default function StatAPY({
  aon,
  asset,
}: {
  aon: AddressOnNetwork
  asset: FungibleAsset
}) {
  const { data, isLoading, isError } = useStakingUserData(aon)

  return (
    <div className="relative border border-spanish-gray h-24 rounded-md col-span-2">
      <div className="absolute flex items-center justify-center -top-6 left-0 right-0 whitespace-nowrap text-xs">
        <div className="relative flex flex-col items-center group">
          <a
            href="https://docs.sendnodes.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>
              Current APY{" "}
              <InformationCircleIcon className="ml-1 h-4 w-4 inline" />{" "}
            </span>
            <div className="absolute bottom-0 left-0 right-0 flex-col items-center hidden mb-6 group-hover:flex">
              <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md text-center ">
                Estimated net rewards after fees. Actual rewards may be
                different.
              </span>
              <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-600"></div>
            </div>
          </a>
        </div>
      </div>
      <div className="w-full h-full grow flex gap-1 justify-space items-center">
        {isLoading ? (
          <div className="relative grow h-full">
            <div className="flex flex-col grow items-center justify-center h-full">
              <SharedLoadingSpinner />
            </div>
          </div>
        ) : data?.userStakingData[0]?.compound ? (
          <div className="relative grow h-full">
            <div className="flex flex-col grow items-center justify-center h-full">
              <div className="text-3xl xl:text-4xl md:text-2xl font-semibold text-white">
                <span title={data?.rewardsData?.apy.toLocaleString() ?? ""}>
                  {data?.rewardsData?.apy.toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}
                  %
                </span>
              </div>
            </div>
            <div className="absolute flex items-center justify-center text-center inset-x-0 -bottom-5 mx-auto text-xs whitespace-nowrap">
              Compounding Rewards
            </div>
          </div>
        ) : (
          <div className="relative grow h-full">
            <div className="flex flex-col grow items-center justify-center h-full">
              <div className="text-3xl xl:text-4xl md:text-2xl font-semibold text-white">
                <span
                  title={
                    data?.rewardsData?.apyNoCompounding.toLocaleString() ?? ""
                  }
                >
                  {data?.rewardsData?.apyNoCompounding.toLocaleString(
                    undefined,
                    { maximumFractionDigits: 1 }
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
