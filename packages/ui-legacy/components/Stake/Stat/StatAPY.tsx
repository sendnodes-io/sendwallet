import React from "react";
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts";
import { FungibleAsset } from "@sendnodes/pokt-wallet-background/assets";
import { floor } from "lodash";
import { useStakingUserData } from "../../../hooks/staking-hooks";
import SharedLoadingSpinner from "../../Shared/SharedLoadingSpinner";
import DisclaimerAPY from "../DisclaimerAPY";

export default function StatAPY({
  aon,
  asset,
}: {
  aon: AddressOnNetwork;
  asset: FungibleAsset;
}) {
  const { data, isLoading, isError } = useStakingUserData(aon);

  return (
    <div className="relative border border-spanish-gray h-24 rounded-md col-span-2">
      <DisclaimerAPY>Current APY</DisclaimerAPY>
      <div className="w-full h-full grow flex gap-1 justify-space items-center">
        {isLoading && (
          <div className="relative grow h-full">
            <div className="flex flex-col grow items-center justify-center h-full">
              <SharedLoadingSpinner />
            </div>
          </div>
        )}
        {!isLoading && data?.userStakingData[0]?.compound && (
          <div className="relative grow h-full">
            <div className="flex flex-col grow items-center justify-center h-full">
              <div className="text-3xl xl:text-4xl md:text-2xl font-semibold text-white">
                <span>
                  {data?.rewardsData?.apy1d
                    ? `${floor(data?.rewardsData?.apy1d, 1).toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 1,
                        },
                      )}%`
                    : "--"}
                </span>
              </div>
            </div>
            <div className="absolute flex items-center justify-center text-center inset-x-0 -bottom-5 mx-auto text-xs whitespace-nowrap">
              Compounding Rewards
            </div>
          </div>
        )}
        {!isLoading && data && !data?.userStakingData[0]?.compound && (
          <div className="relative grow h-full">
            <div className="flex flex-col grow items-center justify-center h-full">
              <div className="text-3xl xl:text-4xl md:text-2xl font-semibold text-white">
                <span>
                  {data?.rewardsData?.apyNoCompounding1d
                    ? `${floor(
                        data?.rewardsData?.apyNoCompounding1d,
                        1,
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })}%`
                    : "--"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
