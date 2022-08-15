import React from "react"
import { BigNumber, formatFixed } from "@ethersproject/bignumber"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { useStakingUserData } from "../../../hooks/staking-hooks"
import formatTokenAmount from "../../../utils/formatTokenAmount"
import SharedLoadingSpinner from "../../Shared/SharedLoadingSpinner"
import { FungibleAsset } from "@sendnodes/pokt-wallet-background/assets"

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
        <span>Current APY</span>
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
