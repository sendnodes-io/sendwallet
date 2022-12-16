import classNames from "clsx"
import React, { ReactElement } from "react"

interface RemoveAddressProps {
  hoverable?: boolean
}

export default function RemoveAddressLabel({
  hoverable,
}: RemoveAddressProps): ReactElement {
  return (
    <div className={classNames("remove_address", { hover: hoverable })}>
      <div className="icon_garbage" />
      <span>Remove</span>
      <style jsx>{`
          .icon_garbage {
            mask-image: url("./images/garbage@2x.png");
            mask-size: cover;
            color: blue;
            background-color: var(--error);
            width: 1rem;
            margin-right: 5px;
            height: 1rem;
          }
          .remove_address {
            display: flex;
            flexDirection: row;
            align-items: center;
            color: var(--error);
            height: 100%;
            line-height 24px;
            font-weight: 500;
            width: 100%;
          }
          .hover:hover {
            color: var(--error-80);
          }
          .hover:hover .icon_garbage {
            background-color: var(--error-80);
          }
        `}</style>
    </div>
  )
}
RemoveAddressLabel.defaultProps = {
  hoverable: false,
}
