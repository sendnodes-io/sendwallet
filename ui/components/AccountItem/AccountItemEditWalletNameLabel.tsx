import classNames from "classnames"
import React, { ReactElement } from "react"

interface EditWalletNameProps {
  hoverable?: boolean
}

export default function EditWalletNameLabel({
  hoverable,
}: EditWalletNameProps): ReactElement {
  return (
    <div className={classNames("edit_wallet_name", { hover: hoverable })}>
      <div className="icon_edit" />
      <span>Edit</span>
      <style jsx>{`
          .icon_edit {
            mask-image: url("./images/edit@2x.png");
            mask-size: cover;
            color: blue;
            background-color: var(--gray-web-200);
            width: 1rem;
            margin-right: 0.25rem;
            height: 1rem;
          }
          .edit_wallet_name {
            display: flex;
            flexDirection: row;
            align-items: center;
            font-size: 1rem;
            height: 100%;
            line-height 24px;
            font-weight: 500;
            width: 100%;
            color: var(--gray-web-200);
          }
          .hover:hover {
            color: var(--dim-gray);
          }
          .hover:hover .icon_edit {
            background-color: var(--dim-gray);
          }
        `}</style>
    </div>
  )
}
EditWalletNameLabel.defaultProps = {
  hoverable: false,
}
