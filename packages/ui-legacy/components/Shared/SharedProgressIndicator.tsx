import React, { ReactElement } from "react";
import classNames from "clsx";

export default function SharedProgressIndicator(props: {
  activeStep: number;
  numberOfSteps: number;
  onProgressStepClicked: (step: number) => void;
}): ReactElement {
  const { activeStep, numberOfSteps, onProgressStepClicked } = props;

  return (
    <div className="indicator_wrap">
      {Array(numberOfSteps)
        .fill(undefined)
        .map((_, index) => {
          return (
            <button
              aria-label="step"
              type="button"
              // rome-ignore lint/suspicious/noArrayIndexKey: The nature of this is that the key and index are the same.
              key={index}
              className={classNames("step", {
                active: index === activeStep - 1,
              })}
              onClick={() => {
                onProgressStepClicked(index + 1);
              }}
            />
          );
        })}

      <style jsx>
        {`
          .step {
            background-size: cover;
            background: var(--dim-gray);
            width: 8px;
            height: 8px;
            border-radius: 4px;
            margin: 0px 6px;
            transition: 0.2s ease-in-out;
          }
          .active {
            width: 12px;
            height: 12px;
            border-radius: 6px;
            background: linear-gradient(
              176.66deg,
              var(--aqua) -33.81%,
              var(--capri) 131.01%
            );
          }
          .indicator_wrap {
            display: flex;
            align-items: center;
          }
        `}
      </style>
    </div>
  );
}
