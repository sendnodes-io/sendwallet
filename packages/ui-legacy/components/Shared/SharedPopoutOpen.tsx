import { browser } from "@sendnodes/pokt-wallet-background";
import { selectPopoutWindowId } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import React, { useEffect, useState } from "react";
import { useBackgroundSelector } from "../../hooks";
import SharedButton from "./SharedButton";

export default function SharedPopoutOpen() {
	const popoutWindowId = useBackgroundSelector(selectPopoutWindowId);
	const [popout, setPopoutWindow] = useState<browser.Windows.Window | null>(
		null,
	);

	useEffect(() => {
		if (!popoutWindowId) {
			return;
		}
		const fetchPopout = async () => {
			try {
				setPopoutWindow(await browser.windows.get(popoutWindowId));
			} catch (e) {}
		};
		fetchPopout().catch((e) =>
			console.error("Failed to fetch popout window", e),
		);
	}, [popoutWindowId]);

	return (
		<>
			<div className="page_content">
				<div className="section">
					<h1>Popout Open</h1>
					<p>Please continue in the popout window.</p>
					{popout !== null && popoutWindowId !== null ? (
						<SharedButton
							type="primary"
							size="large"
							onClick={(e) => {
								browser.windows.update(popoutWindowId, { focused: true });
							}}
						>
							BRING POPOUT TO FRONT
						</SharedButton>
					) : (
						<></>
					)}
				</div>
			</div>
			<style jsx>
				{`
          .section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: calc(100% - 1rem);
            height: 100%;
          }
          h1 {
            margin-bottom: 0.5rem;
          }
          p {
            margin-bottom: 2rem;
          }
        `}
			</style>
		</>
	);
}
