import React from "react"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { FungibleAsset } from "@sendnodes/pokt-wallet-background/assets"
import { useStakingUserData } from "../../../hooks/staking-hooks"
import { BigNumber, formatFixed } from "@ethersproject/bignumber"
import formatTokenAmount from "../../../utils/formatTokenAmount"

export default function StatTotalRewards({
  aon,
  asset,
}: {
  aon: AddressOnNetwork
  asset: FungibleAsset
}) {
  const { data, isLoading, isError } = useStakingUserData(aon)

  return (
    <div
      title={formatFixed(
        data?.userStakingData[0]?.rewards ?? 0,
        aon.network.baseAsset.decimals
      )}
      className="relative border border-spanish-gray h-24 rounded-md col-span-2"
    >
      <div className="absolute flex items-center justify-center -top-6 left-0 right-0 text-xs">
        <span>Total Rewards</span>
      </div>
      <div className="w-full h-full grow flex gap-1 justify-space items-center">
        <div className="relative grow h-full">
          <div className="flex flex-col grow items-center justify-center h-full">
            <div className="text-3xl xl:text-4xl sm:text-3xl font-semibold text-white">
              {formatTokenAmount(
                formatFixed(
                  data?.userStakingData[0]?.rewards ?? 0,
                  aon.network.baseAsset.decimals
                ),
                3,
                1
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
