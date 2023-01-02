import React, { ReactElement } from "react";
import classNames from "clsx";

export default function SharedLoadingSpinner(props: {
	size: "small" | "medium" | "large";
}): ReactElement {
	const { size } = props;

	return (
		<div className={classNames("spinner", size)}>
			<style jsx>
				{`
          .spinner {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid var(--cod-gray-200);
            border-top-color: var(--aqua);
            box-sizing: border-box;
            animation: spinner 1s linear infinite;
          }
          @keyframes spinner {
            to {
              transform: rotate(360deg);
            }
          }
          .small {
            width: 14px;
            height: 14px;
          }

          .large {
            width: 3rem;
            height: 3rem;
          }
        `}
			</style>
		</div>
	);
}

SharedLoadingSpinner.defaultProps = {
	size: "medium",
};
