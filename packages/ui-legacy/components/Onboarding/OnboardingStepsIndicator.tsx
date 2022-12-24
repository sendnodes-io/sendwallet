import React, { ReactElement } from "react"
import classNames from "clsx"

interface OnboardingStepProps {
  label: string
  isActive: boolean
}

function OnboardingStep(props: OnboardingStepProps): ReactElement {
  const { label, isActive } = props

  return (
    <li className={classNames({ active: isActive })}>
      {label}
      <style jsx>
        {`
          li:before {
            content: " ";
            display: block;
            width: 6px;
            height: 6px;
            border-radius: 100px;
            background-color: var(--dim-gray);
          }
          li {
            display: block;
            color: var(--dim-gray);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            text-align: center;
            display: flex;
            align-items: center;
            flex-direction: column;
            padding: 0px 11px;
          }
          .active {
            color: var(--aqua);
          }
          .active:before {
            background-color: var(--aqua);
            width: 16px;
          }
        `}
      </style>
    </li>
  )
}

OnboardingStep.defaultProps = {
  isActive: false,
}

interface OnboardingStepsIndicatorProps {
  activeStep: number
}

export default function OnboardingStepsIndicator(
  props: OnboardingStepsIndicatorProps
): ReactElement {
  const { activeStep } = props

  return (
    <ul>
      <OnboardingStep label="Create" isActive={activeStep === 0} />
      <OnboardingStep label="Save" isActive={activeStep === 1} />
      <OnboardingStep label="Verify" isActive={activeStep === 2} />
      <style jsx>
        {`
          ul {
            display: flex;
          }
        `}
      </style>
    </ul>
  )
}
