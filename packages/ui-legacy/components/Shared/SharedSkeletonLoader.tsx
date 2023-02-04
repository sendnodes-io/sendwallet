import React, { ReactElement } from "react";
import classNames from "clsx";

export default function SharedSkeletonLoader(props: {
  width: number;
  height: number;
}): ReactElement {
  const { width, height } = props;

  return (
    <div className={classNames("skeleton")}>
      <style jsx>
        {`
          .skeleton {
            width: ${width};
            height: ${height};
            background: var(--dim-gray);
            margin: 0 auto;
            border-radius: 8px;
          }
        `}
      </style>
    </div>
  );
}

SharedSkeletonLoader.defaultProps = {
  width: 100,
  height: 24,
};
