import React, { ReactElement } from "react"
import Wallet from "../pages/Wallet"
import SignTransaction from "../pages/SignTransaction"
import SignData from "../pages/SignData"
import PersonalSign from "../pages/PersonalSign"
import OnboardingSaveSeed from "../pages/Onboarding/OnboardingSaveSeed"
import OnboardingVerifySeed from "../components/Onboarding/OnboardingVerifySeed"
import OnboardingImportSeed from "../pages/Onboarding/OnboardingImportSeed"
import OnboardingImportKeyfile from "../pages/Onboarding/OnboardingImportKeyfile"
import OnboardingInfoIntro from "../pages/Onboarding/OnboardingInfoIntro"
import OnboardingAddWallet from "../pages/Onboarding/OnboardingAddWallet"
import Overview from "../pages/Overview"
import SingleAsset from "../pages/SingleAsset"
import Menu from "../pages/Menu"
import Send from "../pages/Send"
import DAppPermissionRequest from "../pages/DAppConnectRequest"
import KeyringUnlock from "../components/Keyring/KeyringUnlock"
import KeyringSetPassword from "../components/Keyring/KeyringSetPassword"
import OnboardingAccountCreated from "../pages/Onboarding/OnboardingAccountCreated"
import Stake from "../pages/Stake"

interface PageList {
  path: string
  // Tricky to handle all props components are
  // accepting here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: (...args: any[]) => ReactElement
  hasTabBar: boolean
  hasTopBar: boolean
  persistOnClose: boolean
}

const pageList: PageList[] = [
  {
    path: "/keyring/set-password",
    Component: KeyringSetPassword,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/keyring/unlock",
    Component: KeyringUnlock,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/singleAsset/:asset",
    Component: SingleAsset,
    hasTabBar: true,
    hasTopBar: true,
    persistOnClose: true,
  },
  {
    path: "/singleAsset/:asset/:contractAddress",
    Component: SingleAsset,
    hasTabBar: true,
    hasTopBar: true,
    persistOnClose: true,
  },
  {
    path: "/onboarding/info-intro",
    Component: OnboardingInfoIntro,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/add-wallet",
    Component: OnboardingAddWallet,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/sign-transaction",
    Component: SignTransaction,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/sign-data",
    Component: SignData,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/personal-sign",
    Component: PersonalSign,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: true,
  },
  {
    path: "/overview",
    Component: Overview,
    hasTabBar: true,
    hasTopBar: false,
    persistOnClose: true,
  },
  {
    path: "/menu",
    Component: Menu,
    hasTabBar: true,
    hasTopBar: false,
    persistOnClose: true,
  },
  {
    path: "/send",
    Component: Send,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: true,
  },
  {
    path: "/dapp-permission",
    Component: DAppPermissionRequest,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/import-seed",
    Component: OnboardingImportSeed,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/import-keyfile",
    Component: OnboardingImportKeyfile,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/onboarding/save-seed",
    Component: OnboardingSaveSeed,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: true,
  },
  {
    path: "/onboarding/verify-seed",
    Component: OnboardingVerifySeed,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: true,
  },
  {
    path: "/onboarding/account-created",
    Component: OnboardingAccountCreated,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/stake",
    Component: Stake,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: false,
  },
  {
    path: "/",
    Component: Wallet,
    hasTabBar: false,
    hasTopBar: false,
    persistOnClose: true,
  },
]

export default pageList
