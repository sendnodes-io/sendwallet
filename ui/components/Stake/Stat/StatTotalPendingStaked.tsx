import React from "react"
import { formatFixed } from "@ethersproject/bignumber"
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts"
import { useStakingUserData } from "../../../hooks/staking-hooks"
import formatTokenAmount from "../../../utils/formatTokenAmount"
import SharedLoadingSpinner from "../../Shared/SharedLoadingSpinner"
import { FungibleAsset } from "@sendnodes/pokt-wallet-background/assets"

export default function StatTotalStaked({
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
        data?.userStakingData[0]?.staked ?? 0,
        aon.network.baseAsset.decimals
      )}
      className="relative border border-spanish-gray h-32 rounded-md"
    >
      <div className="absolute flex items-center justify-center -top-6 left-0 right-0 text-white">
        <span>Pending Staked</span>
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
                <p className="text-2xl font-semibold text-white">
                  {formatTokenAmount(
                    formatFixed(
                      data?.userStakingData[0]?.pendingStaked ?? 0,
                      aon.network.baseAsset.decimals
                    ),
                    3,
                    0
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="absolute flex items-center justify-center text-center inset-x-0 bottom-1 mx-auto text-white text-xs px-2">
          Stake earns rewards ~24 hrs after tx confirmation
        </div>
      </div>
    </div>
  )
}
