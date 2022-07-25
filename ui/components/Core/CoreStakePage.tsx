/* This example requires Tailwind CSS v2.0+ */
import React, { Fragment, ReactElement, useState } from "react"
import { Dialog, Transition } from "@headlessui/react"
import classNames, { clsx } from "clsx"
import { useBackgroundSelector } from "../../hooks"
import {
  AccountTotal,
  selectCurrentAccountTotal,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import Snackbar from "../Snackbar/Snackbar"
import { useHistory, Link } from "react-router-dom"
import {
  CollectionIcon,
  ReceiptRefundIcon,
  TrendingUpIcon,
} from "@heroicons/react/solid"
import { MenuIcon, XIcon } from "@heroicons/react/outline"

const navigation = [
  {
    name: "Stake",
    href: "/",
    icon: ({ className }: { className: string }) => (
      <div className={clsx(className, "stake_icon")} />
    ),
  },
  { name: "Rewards", href: "/rewards", icon: TrendingUpIcon, disabled: true },
  {
    name: "Transactions",
    href: "/transactions",
    icon: CollectionIcon,
    disabled: true,
  },
  {
    name: "Unstake",
    href: "/unstake",
    icon: ReceiptRefundIcon,
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function SidebarAddress({
  currentAccountTotal,
}: {
  currentAccountTotal?: AccountTotal
}) {
  return (
    <div className="sidebar_address flex-shrink-0 flex bg-gray-700 p-4">
      <div className="flex-shrink-0 w-full group block">
        <div className="flex items-center relative">
          {currentAccountTotal ? (
            <SharedAccountItemSummary
              accountTotal={currentAccountTotal}
              isSelected={false}
            />
          ) : (
            <SharedLoadingSpinner size="medium" />
          )}
        </div>
      </div>
      <style jsx>{`
        .sidebar_address :global(.balance_status) {
          display: none;
        }

        .sidebar_address :global(.address) {
          color: var(--white);
        }

        .sidebar_address :global(.stake_icon) {
          mask-image: url("./images/stake@2x.png");
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          width: 1.25rem;
          height: 1.25rem;
          background-color: var(--white);
          display: inline-block;
        }
      `}</style>
    </div>
  )
}

function Sidebar({ isOpen, onClose }: SidebarProps): ReactElement {
  const currentAccountTotal = useBackgroundSelector(selectCurrentAccountTotal)
  const history = useHistory()

  return (
    <Fragment>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-eerie-black bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-rich-black">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => onClose()}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </Transition.Child>
                <div className="flex-1 h-0 pb-4 overflow-y-auto">
                  <div className="flex-shrink-0 flex items-center px-4">
                    <img
                      width="380"
                      height="137"
                      draggable="false"
                      src="./images/pokt_wallet_logo@2x.png"
                    />
                  </div>
                  <nav className="mt-5 px-2 space-y-1">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={classNames(
                          history.location.pathname === item.href
                            ? "bg-gray-900 text-white"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white",
                          "group flex items-center px-2 py-2 text-base font-medium rounded-md"
                        )}
                      >
                        <item.icon
                          className={classNames(
                            history.location.pathname === item.href
                              ? "text-gray-300"
                              : "text-gray-400 group-hover:text-gray-300",
                            "mr-4 flex-shrink-0 h-6 w-6"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                </div>
                <SidebarAddress currentAccountTotal={currentAccountTotal} />
              </Dialog.Panel>
            </Transition.Child>
            <div className="flex-shrink-0 w-14">
              {/* Force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 sidebar">
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex-1 flex flex-col min-h-0 bg-rich-black">
          <div className="flex-1 flex flex-col pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <img
                width="380"
                height="137"
                draggable="false"
                src="./images/pokt_wallet_logo@2x.png"
              />
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    history.location.pathname === item.href
                      ? "bg-gray-900 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md"
                  )}
                >
                  <item.icon
                    className={classNames(
                      history.location.pathname === item.href
                        ? "text-gray-300"
                        : "text-gray-400 group-hover:text-gray-300",
                      "mr-3 flex-shrink-0 h-6 w-6"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <SidebarAddress currentAccountTotal={currentAccountTotal} />
        </div>
      </div>
    </Fragment>
  )
}

interface Props {
  children: React.ReactNode
}

export default function CoreStakePage(props: Props): ReactElement {
  const { children } = props
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-eerie-black">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-white hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-aqua"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <MenuIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <main className="flex-1">
          <div className="py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="bg-eerie-black p-2 rounded-lg ">
                <div className="dashed_border rounded-lg ">
                  <div className="p-4">{children}</div>
                </div>
              </div>
              <div className="flex justify-center">
                <Snackbar />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}