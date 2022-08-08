import React from "react"
import { BigNumber, formatFixed } from "@ethersproject/bignumber"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { useStakingUserData } from "../../../hooks/staking-hooks"
import formatTokenAmount from "../../../utils/formatTokenAmount"
import SharedLoadingSpinner from "../../Shared/SharedLoadingSpinner"
import { FungibleAsset } from "@sendnodes/pokt-wallet-background/assets"

export default function StatTotalUnstaked({
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
        data?.userStakingData[0]?.unstaked ?? 0,
        asset.decimals
      )}
      className="relative border border-spanish-gray h-32 rounded-md md:col-span-2"
    >
      <div className="absolute flex items-center justify-center -top-6 left-0 right-0 text-white">
        <span>Total Unstaked</span>
      </div>
      <div className="w-full h-full grow flex gap-1 justify-space items-center">
        <div className="relative grow h-full">
          <div className="flex flex-col grow items-center justify-center h-full">
            <div className="text-6xl font-semibold text-white">
              {isError ? (
                (isError as any).toString()
              ) : isLoading ? (
                <SharedLoadingSpinner />
              ) : (
                formatTokenAmount(
                  formatFixed(
                    BigNumber.from(data?.userStakingData[0]?.unstaked ?? 0).add(
                      data?.userStakingData[0]?.pendingUnstaked ?? 0
                    ),
                    asset.decimals
                  ),
                  4,
                  0
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}