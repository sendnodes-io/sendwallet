import React, { ReactElement, useState } from "react";
import { Redirect } from "react-router-dom";
import { useBackgroundSelector } from "../../hooks";
import SharedButton from "../../components/Shared/SharedButton";
import SharedProgressIndicator from "../../components/Shared/SharedProgressIndicator";
import styles from "../../components/Onboarding/styles";
import openPoktWalletTab from "../../helpers/open-pokt-wallet-tab";

interface OnboardingIntroStep {
  content: React.ReactElement;
  buttonCopy: string;
}

const OnboardingIntroStep1 = (
  <>
    <span>
      <small>WELCOME TO</small>
    </span>
    <img
      src="/images/onboarding/step-1-logo-simple@4x.png"
      alt="SendWallet"
      width={232}
      height={32}
    />
    <p>Simple. Secure.</p>
    <style jsx global>
      {`
        .illustration {
          background-image: url("./images/onboarding/step-1-logo-icon@2x.png");
          width: 13.5rem;
          height: 18.125rem;
          margin-top: -1.1rem;
        }
        small {
          color: var(--white);
          letter-spacing: 0.36rem;
          text-transform: uppercase;
        }
        img {
          margin: 1em auto 2rem;
        }
        p {
          font-size: 1.25rem;
        }
      `}
    </style>
  </>
);

const OnboardingIntroStep2 = (
  <>
    <h1>
      <span>Send</span>Wallet by SendNodes
    </h1>
    <p>
      Some of the best devs and designers contributing to the Pocket Ecosystem.
      Open-source.
    </p>
    <style jsx global>
      {`
        .illustration_section {
          justify-content: center;
        }
        .illustration {
          background-image: url("./images/onboarding/step-2@4x.png");
          width: 14.5rem;
          height: 13.125rem;
          margin: auto;
        }
        p {
          padding-bottom: 2rem;
        }
      `}
    </style>
  </>
);

// const OnboardingIntroStep3 = (
//   <>
//     <h1>
//       Test <span>responsibly</span>
//     </h1>
//     <p>
//       SendWallet is a work in progess!
//       <br />
//       This beta version includes
//       <br />
//       limited features & may have bugs.
//     </p>
//     <style jsx global>
//       {`
//         .illustration_section {
//           justify-content: center;
//         }
//         .illustration {
//           background-image: url("./images/onboarding/step-3@4x.png");
//           width: 232px;
//           height: 212px;
//           margin: auto;
//         }
//         p {
//           padding-bottom: 1rem;
//         }
//       `}
//     </style>
//   </>
// )

const steps: OnboardingIntroStep[] = [
  {
    content: OnboardingIntroStep1,
    buttonCopy: "CONTINUE",
  },
  {
    content: OnboardingIntroStep2,
    buttonCopy: "GET STARTED",
  },
  // {
  //   content: OnboardingIntroStep3,
  //   buttonCopy: "GET STARTED",
  // },
];

export default function OnboardingInfoIntro(): ReactElement {
  const [activeStep, setActiveStep] = useState(1);

  const hasAccounts = useBackgroundSelector(
    (state) => Object.keys(state.account.accountsData).length > 0
  );

  // If there's an account, return to /
  if (hasAccounts) {
    return <Redirect to="/" />;
  }

  return (
    <section>
      <div className={`fade-in-${activeStep - 1} onboarding_step`}>
        <div className="illustration_section">
          <div className="illustration" />
        </div>
        <div className="bottom_part">
          <div className="bottom_content">{steps[activeStep - 1]!.content}</div>
        </div>
      </div>
      <div className="buttons">
        <SharedButton
          type="primaryGhost"
          size="large"
          onClick={() => {
            if (activeStep < steps.length) {
              setActiveStep(activeStep + 1);
            } else {
              openPoktWalletTab("/onboarding/add-wallet");
            }
          }}
        >
          {steps[activeStep - 1]!.buttonCopy}
        </SharedButton>
        <div className="spacing" />
        <SharedProgressIndicator
          numberOfSteps={2}
          activeStep={activeStep}
          onProgressStepClicked={(step) => {
            setActiveStep(step);
          }}
        />
      </div>
      <style jsx>{styles}</style>
      <style jsx>
        {`
          .spacing {
            padding: 0.5rem 0;
          }

          .onboarding_step {
            display: flex;
            flex-direction: column;
            height: 75%;
            width: 100%;
            justify-content: space-between;
            align-items: center;
          }
          .illustration_section {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            height: 65%;
          }
          .bottom_part {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            text-align: center;
            height: 35%;
          }
          .bottom_content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            height: 100%;
            margin-top: 1.5rem;
          }

          .illustration {
            background-position-x: center;
            background-size: cover;
            background-repeat: no-repeat;
            flex-shrink: 0;
            left: 0;
            right: 0;
            margin-left: auto;
            margin-right: auto;
            position: absolute;
          }
          :global(h1) {
            margin-bottom: 1rem;
          }
          :global(span) {
            color: var(--sky-blue-crayola);
          }
          :global(p) {
            line-height: 1.5rem;
            max-width: 20rem;
          }
        `}
      </style>
      <style jsx>
        {`
          @keyframes fadeIn {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
          .fade-in-${activeStep - 1} {
            animation: fadeIn ease-out 0.8s;
          }
        `}
      </style>
    </section>
  );
}
