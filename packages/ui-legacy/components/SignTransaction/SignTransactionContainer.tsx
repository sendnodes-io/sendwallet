import { AccountTotal } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import React, { ReactElement, ReactNode, useState } from "react";
import SharedButton from "../Shared/SharedButton";
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu";
import SignTransactionLedgerActivateBlindSigning from "./SignTransactionLedgerActivateBlindSigning";
import SignTransactionLedgerBusy from "./SignTransactionLedgerBusy";
import SignTransactionLedgerNotConnected from "./SignTransactionLedgerNotConnected";
import SignTransactionMultipleLedgersConnected from "./SignTransactionMultipleLedgersConnected";
import SignTransactionNetworkAccountInfoTopBar from "./SignTransactionNetworkAccountInfoTopBar";
import SignTransactionWrongLedgerConnected from "./SignTransactionWrongLedgerConnected";
import { useSigningLedgerState } from "./useSigningLedgerState";

export default function SignTransactionContainer({
	signerAccountTotal,
	title,
	detailPanel,
	reviewPanel,
	extraPanel,
	confirmButtonLabel,
	rejectButtonLabel,
	handleConfirm,
	handleReject,
	isTransactionSigning,
	isArbitraryDataSigningRequired,
}: {
	signerAccountTotal: AccountTotal;
	title: ReactNode;
	detailPanel: ReactNode;
	reviewPanel: ReactNode;
	extraPanel: ReactNode;
	confirmButtonLabel: ReactNode;
	rejectButtonLabel?: ReactNode;
	handleConfirm: () => void;
	handleReject: () => void;
	isTransactionSigning: boolean;
	isArbitraryDataSigningRequired: boolean;
}): ReactElement {
	const { signingMethod } = signerAccountTotal;
	const [isSlideUpOpen, setSlideUpOpen] = useState(false);

	const signingLedgerState = useSigningLedgerState(signingMethod ?? null);

	const isLedgerSigning = signingMethod?.type === "ledger";
	const isWaitingForHardware = isLedgerSigning && isTransactionSigning;

	const isLedgerAvailable = signingLedgerState?.state === "available";

	const mustEnableArbitraryDataSigning =
		isLedgerAvailable &&
		isArbitraryDataSigningRequired &&
		!signingLedgerState.arbitraryDataEnabled;

	const canLedgerSign = isLedgerAvailable && !mustEnableArbitraryDataSigning;

	return (
		<section>
			<div className="top">
				<h1 className="title">
					{isWaitingForHardware ? "Awaiting hardware wallet signature" : title}
				</h1>
				<button
					type="button"
					aria-label="close"
					className="icon_close"
					onClick={handleReject}
				/>
			</div>
			<div className="full_width">
				{isWaitingForHardware ? reviewPanel : detailPanel}
			</div>
			{isWaitingForHardware ? (
				<div className="cannot_reject_warning">
					<span className="block_icon" />
					Tx can only be Rejected from Ledger
				</div>
			) : (
				<>
					{extraPanel}
					<div className="footer_actions">
						<SharedButton
							iconSize="large"
							size="large"
							type="secondary"
							onClick={handleReject}
						>
							{rejectButtonLabel ?? "REJECT"}
						</SharedButton>
						{/* TODO: split into different components depending on signing method, to avoid convoluted logic below */}
						{signerAccountTotal.signingMethod &&
							(signerAccountTotal.signingMethod.type === "ledger" &&
							!canLedgerSign ? (
								<SharedButton
									type="primary"
									iconSize="large"
									size="large"
									onClick={() => {
										setSlideUpOpen(true);
									}}
								>
									Check Ledger
								</SharedButton>
							) : (
								<SharedButton
									type="primary"
									iconSize="large"
									size="large"
									onClick={handleConfirm}
									showLoadingOnClick
									disableOnClick
								>
									{confirmButtonLabel}
								</SharedButton>
							))}
						{!signerAccountTotal.signingMethod && (
							<span className="no-signing">Read-only accounts cannot sign</span>
						)}
					</div>
				</>
			)}
			<SharedSlideUpMenu
				isOpen={isSlideUpOpen && !canLedgerSign}
				close={() => {
					setSlideUpOpen(false);
				}}
				alwaysRenderChildren
				size="auto"
			>
				{signingLedgerState?.state === "no-ledger-connected" && (
					<SignTransactionLedgerNotConnected />
				)}
				{signingLedgerState?.state === "wrong-ledger-connected" && (
					<SignTransactionWrongLedgerConnected
						signerAccountTotal={signerAccountTotal}
					/>
				)}
				{signingLedgerState?.state === "multiple-ledgers-connected" && (
					<SignTransactionMultipleLedgersConnected />
				)}
				{mustEnableArbitraryDataSigning && (
					<SignTransactionLedgerActivateBlindSigning />
				)}
				{signingLedgerState?.state === "busy" && <SignTransactionLedgerBusy />}
			</SharedSlideUpMenu>
			<style jsx>
				{`
          section {
            width: 100%;
            height: 100%;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-evenly;
            z-index: 5;
            position: relative;
          }
          .top {
            position: relative;
            width: 100%;
          }
          .top .icon_close {
            right: 0;
            top: 1.5rem;
            bottom: 0;
            float: right;
            display: inline-block;
            height: 1rem;
            width: 1rem;
          }
          .title {
            font-size: 1.5rem;
            font-weight: 500;
            text-align: center;
            margin: 1rem auto 2rem;
            display: block;
          }
          .primary_info_card {
            display: block;
            height: fit-content;
            border-radius: 16px;
            background-color: var(--eerie-black-100);
            margin: 16px 0px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .footer_actions {
            display: flex;
            width: 100%;
            margin-top: 1.5rem;
            align-items: center;
            height: 3rem;
            justify-content: center;
            gap: 1.5rem;
          }
          .footer_actions :global(.button) {
            max-width: 8rem;
            flex: 1;
            padding: 0;
            justify-content: center;
          }

          .footer_actions :global(.button_content) {
            margin: auto;
          }
          .cannot_reject_warning {
            position: fixed;
            display: flex;
            align-items: center;
            justify-content: center;
            bottom: 0;
            padding: 16px;
            color: var(--error);
            font-weight: 600;
            font-size: 18px;
          }
          .block_icon {
            width: 24px;
            height: 24px;
            margin: 8px;
            background: no-repeat center / cover
              url("./images/block_icon@2x.png");
          }
        `}
			</style>
		</section>
	);
}
