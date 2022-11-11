/* This example requires Tailwind CSS v2.0+ */
import React, { Fragment, ReactElement, useEffect, useState } from "react"
import { Dialog, Transition } from "@headlessui/react"
import classNames, { clsx } from "clsx"
import { useAreKeyringsUnlocked, useBackgroundSelector } from "../../hooks"
import { getCurrentAccountState } from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import { SharedIcon } from "../Shared/SharedIcon"
import Snackbar from "../Snackbar/Snackbar"
import { useHistory, Link, useLocation } from "react-router-dom"
import { MenuIcon, XIcon } from "@heroicons/react/outline"

import SharedSplashScreen from "../Shared/SharedSplashScreen"
import { isEqual } from "lodash"
import SharedAddress from "../Shared/SharedAddress"
import AccountsNotificationPanel from "../AccountsNotificationPanel/AccountsNotificationPanel"
import SharedModal from "../Shared/SharedModal"
import { css, stylesheet } from "astroturf"
import StakeSignTransaction from "../Stake/StakeSignTransaction"
import { selectTransactionData } from "@sendnodes/pokt-wallet-background/redux-slices/transaction-construction"

import Footer from "../Stake/Footer"
import useStakingPoktParams from "../../hooks/staking-hooks/use-staking-pokt-params"
import ErrorFallback from "../../pages/ErrorFallback"
import { usePoktNetworkBlockHeight } from "../../hooks/pocket-network/use-latest-block"

const sidebarIconCss = css`
  mask-size: cover;
  mask-repeat: no-repeat;
  mask-position: center;
  display: inline-block;
`

const navigation = [
  {
    name: "Analytics",
    href: "/analytics",
    icon: ({ className }: { className: string }) => (
      <div
        className={clsx(className, sidebarIconCss, "home-icon")}
        css={`
          mask-image: url("../../public/images/home@2x.png");
        `}
      />
    ),
  },
  {
    name: "Stake",
    href: "/",
    icon: ({ className }: { className: string }) => (
      <div
        className={clsx(className, sidebarIconCss, "stake-icon")}
        css={`
          mask-image: url("../../public/images/stake@2x.png");
        `}
      />
    ),
  },
  {
    name: "Rewards",
    href: "/rewards",
    icon: ({ className }: { className: string }) => (
      <div
        className={clsx(className, sidebarIconCss, "rewards-icon")}
        css={`
          mask-image: url("../../public/images/rewards@2x.png");
        `}
      />
    ),
    disabled: true,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: ({ className }: { className: string }) => (
      <div
        className={clsx(className, sidebarIconCss, "transactions-icon")}
        css={`
          mask-image: url("../../public/images/transactions@2x.png");
        `}
      />
    ),
  },
  {
    name: "Unstake",
    href: "/unstake",
    icon: ({ className }: { className: string }) => (
      <div
        className={clsx(className, sidebarIconCss, "unstake-icon")}
        css={`
          mask-image: url("../../public/images/unstake@2x.png");
        `}
      />
    ),
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const revealSidebarHover = stylesheet`
  .sidebar:hover .linkText {
    @apply opacity-100 relative delay-100;
  }
`
function Sidebar({ isOpen, onClose }: SidebarProps): ReactElement {
  const history = useHistory()
  const location = useLocation()

  useEffect(() => {
    if (isOpen) {
      onClose()
    }
  }, [location])

  return (
    <Fragment>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={onClose}>
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

          <div className="fixed inset-0 flex z-40 ">
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
                              ? "bg-aqua"
                              : "bg-white group-hover:bg-aqua",
                            "mr-4 flex-shrink-0 h-6 w-6"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="flex-shrink-0 w-14">
              {/* Force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div
        className={clsx(
          "hidden lg:flex lg:w-20 lg:hover:w-32 xl:w-20 xl:hover:w-36 transition-width duration-300 lg:flex-col lg:absolute lg:inset-y-0 bg-gradient-to-b from-eerie-black to-rich-black md:rounded-tl-3xl md:rounded-bl-3xl border-l-2 border-aqua",
          revealSidebarHover.sidebar
        )}
      >
        {/* Sidebar component, swap this element with another sidebar if you like */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col pb-4 overflow-y-auto">
            <nav className="mt-5 flex-1 px-2 space-y-1 flex flex-col justify-between overflow-x-hidden">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    history.location.pathname === item.href
                      ? "text-aqua"
                      : "text-white hover:text-aqua",
                    "group flex flex-col justify-center items-center px-2 py-2 text-sm xl:text-lg font-light rounded-md"
                  )}
                >
                  <item.icon
                    className={classNames(
                      history.location.pathname === item.href
                        ? "bg-aqua"
                        : "bg-white group-hover:bg-aqua",
                      "flex-shrink-0 lg:h-8 lg:w-8 xl:h-12 xl:w-12"
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={clsx(
                      "opacity-0 transition-opacity duration-300",
                      revealSidebarHover.linkText
                    )}
                  >
                    {item.name}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

interface Props {
  children: React.ReactNode
}

const styles = stylesheet`
 .accountsModal :global(.switcher_wrap) {
    @apply rounded-none -mx-4 sm:-mx-6 !important;
  }
  .accountsModalScrollbar :global(.switcher_wrap:-webkit-scrollbar-track) {
    @apply bg-eerie-black;
  }
  .mainPanel {
    background: radial-gradient(98.15% 107.73% at 15.3% 0%, rgba(255, 255, 255, 0.12) 0%, rgba(0, 0, 0, 0) 100%) /* warning: gradient uses a rotation that is not supported by CSS and may not behave as expected */, #151515;
  }
`

export default function CoreStakePage(props: Props): ReactElement {
  const { children } = props
  const [isAccountsPanelOpen, setIsAccountsPanelOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const keyringsUnlocked = useAreKeyringsUnlocked(true)
  const transactionDetails = useBackgroundSelector(
    selectTransactionData,
    isEqual
  )
  const currentAccountData = useBackgroundSelector(
    getCurrentAccountState,
    isEqual
  )

  const isInitializing = currentAccountData === "loading" || !keyringsUnlocked

  const { data: stakingPoktParams, isLoading, isError } = useStakingPoktParams()

  // ensure block height from rpc matches block height from onchain API
  const { data: pocketBlockHeight } = usePoktNetworkBlockHeight()

  const isOnchainApiCatchingUp =
    BigInt((pocketBlockHeight?.height ?? 1n).toString()) !==
    BigInt(stakingPoktParams?.currentHeight ?? 0)

  if (isLoading || isInitializing || isOnchainApiCatchingUp) {
    return (
      <div className="md:py-12 xl:py-24 min-h-screen flex flex-col justify-center items-center flex-1">
        <div className="h-24 w-24 relative">
          <SharedSplashScreen />
        </div>
        {isInitializing && <p className="mt-4">Initializing SendWallet.</p>}
        {!isInitializing && isLoading && (
          <p className="mt-4">Loading the latest SendNodes data.</p>
        )}
        {!isInitializing && !isLoading && isOnchainApiCatchingUp && (
          <p className="mt-4">
            Awaiting latest Pocket Network block information.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center ">
      <div className="w-full grid grid-cols-3 xl:max-w-7xl lg:max-w-4xl mx-auto py-4 xl:py-8 md:px-8 px-4">
        <div className="col-span-1">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-white hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-aqua lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <MenuIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="col-span-1 flex justify-center items-center">
          <img
            src="images/send-wallet-logo@2x.png"
            width="227"
            height="48"
            className="max-w-[10rem]"
          />
        </div>
        <div className="col-span-1 flex justify-end items-center">
          <div className="ml-auto flex-shrink-0">
            <SharedAddress
              className="border border-solid border-spanish-gray group"
              address={currentAccountData!.address}
              showAvatar
              name={currentAccountData?.name}
              onClick={() => setIsAccountsPanelOpen(true)}
              title={`Current Account: ${
                currentAccountData?.name
                  ? currentAccountData?.name
                  : currentAccountData!.address
              }`.trim()}
              icon={
                <SharedIcon
                  icon="accounts@2x.png"
                  width="0.65rem"
                  height="0.65rem"
                  className="ml-2 group-hover:bg-white"
                  color="var(--aqua)"
                />
              }
            />
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 xl:px-24 lg:px-8 w-full flex flex-col justify-center items-center flex-1">
        <div
          className={clsx(
            "xl:max-w-7xl lg:max-w-5xl mx-auto relative rounded-lg lg:rounded-3xl bg-eerie-black w-full h-full ",
            styles.mainPanel
          )}
        >
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="xl:px-32 lg:px-24 lg:ml-8 flex flex-col grow w-full ">
            <main className="flex flex-col flex-1 w-full min-h-[48rem] grow">
              <div className="flex flex-col grow px-4 sm:px-8 lg:px-0 py-8 xl:py-12 justify-center w-full h-full">
                {isError && <ErrorFallback error={isError as Error} />}
                {!isError && children}
                <Snackbar />
              </div>
            </main>
          </div>
        </div>
      </div>

      <SharedModal
        isOpen={isAccountsPanelOpen}
        onClose={() => setIsAccountsPanelOpen(false)}
        className={styles.accountsModal}
      >
        <>
          <div className="absolute top-0 right-0 pt-5 pr-5 z-10">
            <button
              type="button"
              className="rounded-md text-spanish-gray hover:text-white  "
              onClick={() => setIsAccountsPanelOpen(false)}
            >
              <span className="sr-only">Close</span>
              <XIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="z-0">
            <div className="text-center relative py-4 mb-2">
              <h3 className="text-2xl">My Wallets</h3>
            </div>
            <AccountsNotificationPanel
              showEasterEgg={false}
              onCurrentAddressChange={() => setIsAccountsPanelOpen(false)}
            />
          </div>
        </>
      </SharedModal>

      <SharedModal
        isOpen={
          !!transactionDetails &&
          stakingPoktParams?.wallets?.siw === transactionDetails?.to
        }
        onClose={() => {
          /**ignored */
        }}
        className={styles.accountsModal}
      >
        <div className="z-0">
          <StakeSignTransaction />
        </div>
      </SharedModal>

      <Footer />
    </div>
  )
}
