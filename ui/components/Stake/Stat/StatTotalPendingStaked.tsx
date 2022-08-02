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
    <div className="relative pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
      <dt>
        <div className="absolute bg-spanish-gray rounded-md p-3">
          <div className="stake_icon bg-white w-8 h-8 inline-block" />
        </div>
        <p className="ml-16 text-sm font-medium text-spanish-gray truncate">
          Pending Staked
        </p>
      </dt>

      <dd className="ml-16 flex items-baseline">
        {isError ? (
          (isError as any).toString()
        ) : isLoading ? (
          <SharedLoadingSpinner />
        ) : (
          <p className="text-2xl font-semibold text-white">
            {formatTokenAmount(
              formatFixed(data?.pendingStaked ?? 0, asset.decimals)
            )}
          </p>
        )}
      </dd>
    </div>
  )
}
