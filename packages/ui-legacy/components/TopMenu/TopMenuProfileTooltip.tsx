import React, { ReactElement } from "react";

export default function TopMenuProfileTooltip(props: {
	copyAddress: () => void;
}): ReactElement {
	const { copyAddress } = props;

	return (
		<button type="button" className="tooltip" onClick={copyAddress}>
			<span className="tooltip_label">Copy address</span>
			<span className="tooltip_icon" />
			<style jsx>{`
        .tooltip {
          display: flex;
          align-items: center;
          position: absolute;
          z-index: 999999999;
          cursor: pointer;
          bottom: -30px;
          right: 0;
          background-color: var(--cod-gray-100);
          padding: 8px 10px 8px;
          border-radius: 8px;
          color: var(--white);
        }
        .tooltip:hover {
          color: var(--aqua);
        }
        .tooltip_label {
          white-space: nowrap;
          font-size: 16px;
          line-height: 24px;
        }
        .tooltip_icon {
          mask-image: url("./images/copy@2x.png");
          mask-size: cover;
          width: 24px;
          height: 24px;
          margin-left: 10px;
          display: inline-block;
          background-color: var(--white);
        }
        .tooltip:hover .tooltip_icon {
          background-color: var(--aqua);
        }
      `}</style>
		</button>
	);
}
