import React, { useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { OnboardingNewAccountIcon } from "../../components/Onboarding/Icons"
import OnboardingAccountLayout from "../../components/Onboarding/OnboardingAccountLayout"
import SharedButton from "../../components/Shared/SharedButton"
import SharedSlideUpMenu from "../../components/Shared/SharedSlideUpMenu"
import { useRemoteConfig } from "../../hooks/remote-config-hooks"

export default function OnboardingAccountCreated() {
  const history = useHistory()
  const [openEasterEgg, setEasterEggOpen] = useState(false)
  const [easterEggAvailable, setEasterEggAvailable] = useState(false)
  const remoteConfig = useRemoteConfig()

  useEffect(() => {
    const available = remoteConfig?.easterEggs?.lucky
    setEasterEggAvailable(available !== undefined && available)
  }, [remoteConfig])

  return (
    <div>
      <OnboardingAccountLayout
        icon={<OnboardingNewAccountIcon />}
        title={
          <>
            <img
              src="./images/add_wallet/account_created@2x.png"
              width="300"
              height="300"
              draggable="false"
            />
          </>
        }
        body={<></>}
        buttons={
          <>
            <h1>Congratulations</h1>
            <div className="spacing"></div>
            <h2>
              You can now safely use your wallet!
              <br />
              You may close this tab and
              <br />
              open your wallet by clicking the <br />
              extension icon (
              <img
                src="./icon-128-black.png"
                alt="POKT Wallet Extension Icon"
                width="128"
                height="128"
                draggable="false"
                onClick={() => {
                  setEasterEggOpen(true)
                }}
              />
              ).
            </h2>
            <div className="spacing"></div>

            <SharedButton
              type="primary"
              size="large"
              onClick={() => history.push("/")}
            >
              TAKE ME TO MY WALLET
            </SharedButton>
          </>
        }
      />
      <SharedSlideUpMenu
        title="☘️ Hello Lucky Friend ☘️"
        size="auto"
        isOpen={easterEggAvailable && openEasterEgg}
        close={(e) => {
          e?.stopPropagation()
          setEasterEggOpen(false)
        }}
      >
        <div style={{ textAlign: "center" }}>
          Heroes get remembered, Legends never die
        </div>
      </SharedSlideUpMenu>
      <style jsx>
        {`
          div :global(.top) {
            margin-top: 0;
          }
          div :global(.top img) {
            margin-top: 1.5rem;
            width: 18.75rem;
            height: 18.75rem;
          }
          div :global(h1) {
            font-size: 1.5rem;
            margin-top: 1rem;
            color: var(--white);
          }
          div :global(h2) {
            font-size: 1rem;
            line-height: 1.5rem;
            color: var(--eerie-gray);
            text-align: center;
            max-width: 19rem;
          }
          div :global(.spacing) {
            display: block;
            margin-bottom: 1rem;
          }
          div :global(.top) {
            height: 50% !important;
          }
          div :global(.buttons) {
            height: 50% !important;
            padding-bottom: 0;
          }
          div :global(.button) {
            margin-top: 0.5rem;
          }

          div :global(.buttons img) {
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 1.5rem;
            vertical-align: bottom;
            box-shadow: 0px 2px 2px 1px rgba(var(--aqua-rgb), 0.1);
            animation: pulse 2s infinite linear;
            cursor: pointer;
          }

          @keyframes pulse {
            0% {
              box-shadow: 0px 2px 2px 1px rgba(var(--aqua-rgb), 0.1);
            }
            50% {
              box-shadow: 0px 2px 1rem 4px rgba(var(--aqua-rgb), 0.33);
            }
            0% {
              box-shadow: 0px 2px 2px 1px rgba(var(--aqua-rgb), 0.1);
            }
          }
          div :global(.button) {
            margin-top: 0.5rem;
          }
        `}
      </style>
    </div>
  )
}
