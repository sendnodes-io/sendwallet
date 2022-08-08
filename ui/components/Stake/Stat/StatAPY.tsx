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
    <div className="relative border border-spanish-gray h-32 rounded-md md:col-span-4">
      <div className="absolute flex items-center justify-center -top-6 left-0 right-0 text-white">
        <span>Current APY</span>
      </div>
      <div className="w-full h-full grow flex gap-1 justify-space items-center">
        <div className="relative grow h-full">
          <div className="flex flex-col grow items-center justify-center h-full">
            <div className="text-3xl sm:text-4xl font-semibold text-white">
              {isError ? (
                (isError as any).toString()
              ) : isLoading ? (
                <SharedLoadingSpinner />
              ) : (
                <span>{data?.rewardsData?.apy.toFixed(2)}%</span>
              )}
            </div>
          </div>
          <div className="absolute flex items-center justify-center text-center inset-x-0 bottom-1 mx-auto text-white text-xs">
            Autocompounding
          </div>
        </div>
        <div className="relative grow h-full">
          <div className="flex flex-col grow items-center justify-center h-full">
            <div className="text-3xl sm:text-4xl font-semibold text-white">
              {isError ? (
                (isError as any).toString()
              ) : isLoading ? (
                <SharedLoadingSpinner />
              ) : (
                <span>{data?.rewardsData?.apyNoCompounding.toFixed(2)}%</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
