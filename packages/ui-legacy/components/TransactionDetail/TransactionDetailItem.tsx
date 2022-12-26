import classNames from "clsx";
import React, { ReactElement, ReactNode } from "react";

export default function TransactionDetailItem({
  name,
  value,
  type = "inline",
}: {
  name: ReactNode;
  value: ReactNode;
  type?: "block" | "inline";
}): ReactElement {
  return (
    <div className={classNames("container", type)}>
      <div className="name">{name}</div>
      <div className="value">{value}</div>
      <style jsx>{`
        .container {
          display: flex;
          font-size: 16px;
          line-height: 24px;
        }

        .container.block {
          flex-flow: column;
        }

        .container.inline {
          flex-flow: row;
          align-items: center;
          justify-content: space-between;
        }

        .name {
          color: var(--spanish-gray);
        }

        .value {
          color: var(--spanish-gray);
        }
      `}</style>
    </div>
  );
}
