import { AccountTotal } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import {
	ExportedPrivateKey,
	HexString,
} from "@sendnodes/pokt-wallet-background/types";

import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { setSnackbarMessage } from "@sendnodes/pokt-wallet-background/redux-slices/ui";
import { browser } from "@sendnodes/pokt-wallet-background";
import { exportPrivateKey } from "@sendnodes/pokt-wallet-background/redux-slices/keyrings";
import SharedButton from "../Shared/SharedButton";
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary";
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks";
import SharedInput from "../Shared/SharedInput";

interface AccountItemExportPrivateKeyConfirmProps {
	account: AccountTotal;
	address: HexString;
	close: () => void;
}
export default function ({
	account,
	address,
}: AccountItemExportPrivateKeyConfirmProps): ReactElement {
	const dispatch = useBackgroundDispatch();
	const [password, setPassword] = useState("");
	const [privateKey, setPrivateKey] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [revealing, setRevealing] = useState(false);
	// height gets messed up with input auto focus
	const [autoFocus, setAutoFocus] = useState(false);

	const revealPrivateKey = () => {
		if (!revealing) {
			setRevealing(true);
			// start listening for private key
			browser.runtime.onMessage.addListener(revealPrivateKeyMessageHandler);
			// signal ready for private key
			dispatch(exportPrivateKey({ password, address }));
		}
	};

	const revealPrivateKeyMessageHandler = (message: ExportedPrivateKey) => {
		const { exportedPrivateKey } = message as ExportedPrivateKey;
		if (!exportedPrivateKey) {
			return;
		}

		// stop listening
		browser.runtime.onMessage.removeListener(revealPrivateKeyMessageHandler);

		if (exportedPrivateKey.error) {
			setRevealing(false);
			setErrorMessage(exportedPrivateKey.error);
			return;
		}

		if (
			exportedPrivateKey.address === address &&
			exportedPrivateKey.privateKey
		) {
			// reveal the private key
			setPrivateKey(exportedPrivateKey.privateKey);
		}
	};

	// ensure no listeners left behind
	useEffect(() => {
		return () => {
			browser.runtime.onMessage.removeListener(revealPrivateKeyMessageHandler);
		};
	}, []);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setAutoFocus(true);
		}, 300);
		return () => window.clearTimeout(timeoutId);
	}, []);

	return (
		<div className="export_private_key_option">
			<ul>
				<li className="account_container">
					<SharedAccountItemSummary accountTotal={account} isSelected={false} />
				</li>
			</ul>
			<div className="export_private_key_details">
				{privateKey ? (
					<>
						<span>
							Anyone who has your private key can access your funds. Keep it
							safe.
						</span>
					</>
				) : (
					<span>
						Revealing your private key can have{" "}
						<strong>disastrous consequences such as loss of funds</strong>. Are
						you sure?
					</span>
				)}
				{privateKey ? (
					<small className="private_key">{privateKey}</small>
				) : null}
			</div>
			<div className="button_container">
				{privateKey ? (
					<SharedButton
						type="tertiary"
						size="medium"
						icon="copy"
						iconSize="large"
						onClick={() => {
							navigator.clipboard.writeText(privateKey);
							dispatch(setSnackbarMessage("Copied!"));
						}}
					>
						Copy to Clipboard
					</SharedButton>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							revealPrivateKey();
						}}
					>
						<SharedInput
							type="password"
							label="ENTER PASSWORD"
							autoFocus={autoFocus}
							onChange={(value) => {
								setPassword(value);
								// Clear error message on input change
								setErrorMessage("");
							}}
							errorMessage={errorMessage}
						/>
						<SharedButton
							type="primary"
							size="medium"
							isDisabled={revealing}
							isLoading={revealing}
							isFormSubmit
						>
							REVEAL PRIVATE KEY
						</SharedButton>
					</form>
				)}
			</div>
			<style jsx>{`
        .export_private_key_option {
          padding: 0 1rem 1rem;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 1.5rem 0;
        }
        .export_private_key_option > * {
        }

        .export_private_key_details {
          display: flex;
          flex-direction: column;
          line-height: 1.5rem;
        }
        .button_container form {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 1.5rem 0;
        }

        .button_container :global(button) {
          width: 100%;
          justify-content: center;
        }

        .button_container :global(.wrap) {
          margin-bottom: 0;
        }

        input,
        small {
          width: 20rem;
          margin: 1rem 0;
          color: var(--white);
        }

        .private_key {
          word-break: break-all;
        }
      `}</style>
		</div>
	);
}
