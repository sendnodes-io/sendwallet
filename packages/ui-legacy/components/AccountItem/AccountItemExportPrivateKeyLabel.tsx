import classNames from "clsx";
import React, { ReactElement } from "react";
import { Icon } from "@iconify/react";

interface ExportPrivateKeyProps {
	hoverable?: boolean;
}

export default function ExportPrivateKeyLabel({
	hoverable,
}: ExportPrivateKeyProps): ReactElement {
	return (
		<div className={classNames("export_pk", { hover: hoverable })}>
			<div className="icon">
				<Icon icon="akar-icons:key" width="1rem" height="1rem" />
			</div>
			<span>Export Private Key</span>
			<style jsx>{`
          .icon {
            width: 1rem;
            margin-right: 0.25rem;
            height: 1rem;
          }
          .export_pk {
            display: flex;
            flexDirection: row;
            align-items: center;
            color: var(--attention);
            height: 100%;
            line-height 1.5rem;
            font-weight: 500;
            width: 100%;
          }
          .hover:hover {
            opacity: 0.75;
          }
        `}</style>
		</div>
	);
}
ExportPrivateKeyLabel.defaultProps = {
	hoverable: false,
};
