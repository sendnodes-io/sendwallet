import React from "react"
import { InformationCircleIcon } from "@heroicons/react/solid"

export default function DisclaimerAPY({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="absolute flex items-center justify-center -top-6 left-0 right-0 whitespace-nowrap text-xs">
      <div className="relative flex flex-col items-center group">
        <a
          href="https://docs.sendnodes.io/sendnodes/start-here/frequently-asked-questions/all-about-rewards"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>
            {children} <InformationCircleIcon className="ml-1 h-4 w-4 inline" />{" "}
          </span>
          <div className="absolute bottom-0 left-0 right-0 flex-col items-center hidden mb-6 group-hover:flex">
            <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md text-center ">
              Estimated net rewards after fees. Actual rewards may be different.
            </span>
            <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-600"></div>
          </div>
        </a>
      </div>
    </div>
  )
}
