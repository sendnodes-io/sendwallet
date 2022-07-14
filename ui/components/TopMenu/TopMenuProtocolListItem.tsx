import React, { ReactElement } from "react"
import classNames from "classnames"

interface Props {
  name: string
  info: string
  width: number
  height: number
  isSelected: boolean
}

export default function TopMenuProtocolListItem(props: Props): ReactElement {
  const { name, width, height, info, isSelected } = props

  return (
    <li className={classNames({ select: isSelected })}>
      <div className="left">
        <div className="icon_wrap">
          <span className="icon" />
        </div>
      </div>
      <div className="right">
        <div className="title">{name}</div>
        <div className="sub_title">
          {info}
          {isSelected && <span className="status">Connected</span>}
        </div>
      </div>
      <style jsx>
        {`
          li {
            display: flex;
            margin-bottom: 15px;
            cursor: pointer;
          }
          .status {
            height: 17px;
            color: var(--success);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-left: 8px;
          }
          .icon {
            background: url("./images/${name
              .replaceAll(" ", "")
              .toLowerCase()}@2x.png");
            background-size: cover;
            width: ${width}px;
            height: ${height}px;
          }
          .icon_wrap {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            background-color: var(--eerie-black-100);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .left {
            margin-right: 16px;
            margin-left: 2px;
          }
          .right {
            height: 24px;
            color: var(--white);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .title {
            height: 24px;
            color: var(--white);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .sub_title {
            height: 17px;
            color: var(--dim-gray);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .select .icon_wrap {
            border: 2px solid var(--success);
          }
          .select .left {
            margin-left: 0px;
          }
        `}
      </style>
    </li>
  )
}

TopMenuProtocolListItem.defaultProps = {
  isSelected: false,
}
