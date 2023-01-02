import {
	addLedgerAccount,
	fetchAddress,
	fetchBalance,
	importLedgerAccounts,
	LedgerDeviceState,
} from "@sendnodes/pokt-wallet-background/redux-slices/ledger";
import classNames from "clsx";
import React, { ReactElement, useEffect, useState } from "react";
import { useBackgroundDispatch } from "../../hooks";
import SharedButton from "../../components/Shared/SharedButton";
import LedgerContinueButton from "../../components/Ledger/LedgerContinueButton";
import LedgerPanelContainer from "../../components/Ledger/LedgerPanelContainer";
import OnboardingDerivationPathSelectAlt from "../../components/Onboarding/OnboardingDerivationPathSelect";

const addressesPerPage = 6;

function usePageData({
	device,
	pageIndex,
	parentPath,
}: {
	device: LedgerDeviceState;
	parentPath: string;
	pageIndex: number;
}) {
	const dispatch = useBackgroundDispatch();

	const [selectedStates, setSelectedStates] = useState<
		Record<string, boolean | undefined>
	>({});

	const paths: string[] = [];

	const firstIndex = pageIndex * addressesPerPage;
	const lastIndex = (pageIndex + 1) * addressesPerPage - 1;
	for (let i = firstIndex; i <= lastIndex; i += 1) {
		if (parentPath.includes("x")) {
			const formattedString = parentPath.slice().replace("x", `${i}`);
			paths.push(formattedString);
		} else {
			paths.push(`${parentPath}/${i}`);
		}
	}

	const items = paths.map((path) => {
		const account = device.accounts[path] ?? null;
		const address = account?.address ?? null;
		return {
			path,
			account,
			address,
			ethBalance: account?.balance ?? null,
			isSelected: (selectedStates[path] ?? false) && address !== null,
			setSelected: (selected: boolean) => {
				setSelectedStates((states) => ({ ...states, [path]: selected }));
			},
		};
	});

	useEffect(() => {
		const nextUnresolvedAccount = items.find((item) => item.account === null);
		if (!nextUnresolvedAccount) return;
		const { path } = nextUnresolvedAccount;
		dispatch(addLedgerAccount({ deviceID: device.id, path }));
	}, [device.id, dispatch, items]);

	useEffect(() => {
		const nextUnresolvedAddress = items.find((item) => item.address === null);
		if (!nextUnresolvedAddress) return;
		const { account } = nextUnresolvedAddress;
		if (!account) return;
		const { path, fetchingAddress } = account;
		if (!path || fetchingAddress) return;
		dispatch(fetchAddress({ deviceID: device.id, path }));
	}, [device.id, dispatch, items]);

	useEffect(() => {
		const nextUnresolvedBalance = items.find(
			(item) => item.ethBalance === null,
		);
		if (!nextUnresolvedBalance) return;
		const { path, account } = nextUnresolvedBalance;
		if (!account) return;
		const { address, fetchingBalance } = account;
		if (!address || fetchingBalance) return;
		dispatch(fetchBalance({ deviceID: device.id, path, address }));
	}, [device.id, dispatch, items]);

	const selectedAccounts = items.flatMap((item) => {
		if (!selectedStates[item.path]) return [];
		if (!item.account) return [];
		const { path, address } = item.account;
		if (!address) return [];
		return [{ path, address }];
	});

	return { firstIndex, lastIndex, items, selectedAccounts };
}

function LedgerAccountList({
	device,
	parentPath,
	onConnect,
}: {
	device: LedgerDeviceState;
	parentPath: string;
	onConnect: () => void;
}): ReactElement {
	const [pageIndex, setPageIndex] = useState(0);

	const pageData = usePageData({ device, parentPath, pageIndex });
	const dispatch = useBackgroundDispatch();

	return (
		<>
			<div className="addresses">
				<div className="item-list">
					{pageData.items.map(
						({ path, address, ethBalance, isSelected, setSelected }) => (
							<div className="item" key={path}>
								<label className="checkbox_label">
									{/* TODO: Share this implementation of checkbox. */}
									<input
										className="checkbox_input"
										type="checkbox"
										disabled={address === null}
										checked={isSelected}
										onChange={(event) => {
											setSelected(event.currentTarget.checked);
										}}
									/>
									<div
										className={classNames("checkbox_box", {
											selected: isSelected,
											disabled: address === null,
										})}
									/>
								</label>
								{address === null && <div className="address_loading" />}
								{address !== null && (
									<>
										<div className="address" title={address}>
											{address.slice(0, 4)}...
											{address.slice(address.length - 4)}
										</div>
										{ethBalance === null && <div className="balance_loading" />}
										{ethBalance !== null && (
											<div className="balance">{ethBalance} ETH</div>
										)}
										<div className="etherscan_link_container">
											<SharedButton
												type="tertiaryGray"
												size="medium"
												icon="external"
												iconSize="secondaryMedium"
												onClick={() => {
													window
														.open(
															`https://etherscan.io/address/${address}`,
															"_blank",
														)
														?.focus();
												}}
											>
												{/* No label. FIXME: is this ok for a11y? */}
											</SharedButton>
										</div>
									</>
								)}
							</div>
						),
					)}
				</div>
				<div className="pagination">
					<div className="previous_button">
						<SharedButton
							isDisabled={pageIndex === 0}
							onClick={() => {
								setPageIndex((i) => i - 1);
							}}
							size="medium"
							type="tertiary"
						>
							Previous
						</SharedButton>
					</div>
					<div className="current_page">
						{pageData.firstIndex} - {pageData.lastIndex}
					</div>
					<div className="next_button">
						<SharedButton
							onClick={() => {
								setPageIndex((i) => i + 1);
							}}
							size="medium"
							type="tertiary"
						>
							Next
						</SharedButton>
					</div>
				</div>
			</div>
			<LedgerContinueButton
				isDisabled={pageData.selectedAccounts.length === 0}
				onClick={() => {
					dispatch(
						importLedgerAccounts({ accounts: pageData.selectedAccounts }),
					);
					onConnect();
				}}
			>
				Connect selected
			</LedgerContinueButton>

			<style jsx>{`
        .addresses {
          margin: 0.5rem 0;
          padding: 1rem;
          border-radius: 4px;
          background: var(--eerie-black-100);
        }

        .item {
          display: flex;
          align-items: center;
          padding: 0 0.5rem;
        }

        .checkbox_label {
          margin: unset;
          line-height: unset;
          margin-right: 1rem;
        }

        .checkbox_input {
          display: none;
        }

        .checkbox_box {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 2px;
          box-sizing: border-box;
          cursor: pointer;
        }

        .checkbox_box.disabled {
          background: var(--cod-gray-200);
        }

        .checkbox_box:not(.selected) {
          border: 2px solid var(--dim-gray);
        }

        .checkbox_box.selected {
          background-color: var(--aqua);
        }

        .checkbox_box.selected::before {
          content: "";
          display: block;
          margin: 0.25rem;
          width: 0.75rem;
          height: 0.75rem;
          background: no-repeat center / cover url("/images/checkmark@2x.png");
        }

        .address_loading,
        .balance_loading {
          height: 1.5rem;
          border-radius: 2px;
          background: linear-gradient(
            to right,
            var(--cod-gray-200),
            var(--cod-gray-200),
            var(--cod-gray-200)
          );
        }

        .address_loading {
          flex: 1;
          margin: 0.5rem 0;
        }

        .balance_loading {
          flex: 0 1 6rem;
          margin: 0.5rem 0;
          margin-left: auto;
        }

        .address,
        .balance {
          font-size: 16px;
          line-height: 40px;

          color: var(--spanish-gray);
        }

        .balance {
          flex: 1;
          text-align: right;
        }

        .etherscan_link_container {
          margin-left: 0.5rem;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0.5rem 0.5rem 0;
        }

        .previous_button,
        .current_page,
        .next_button {
          display: flex;
          flex: 1 0 0;
        }

        .current_page {
          justify-content: center;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
          color: var(--spanish-gray);
        }

        .next_button {
          justify-content: flex-end;
        }
      `}</style>
		</>
	);
}

export default function LedgerImportAccounts({
	device,
	onConnect,
}: {
	device: LedgerDeviceState;
	onConnect: () => void;
}): ReactElement {
	const [parentPath, setParentPath] = useState<string | null>(null);

	return (
		<>
			<LedgerPanelContainer
				indicatorImageSrc="/images/connect_ledger_indicator_connected.svg"
				heading="Select ledger accounts"
				subHeading="You can select as many as you want"
			>
				<div className="derivation_path">
					<OnboardingDerivationPathSelectAlt
						onChange={(value) => {
							setParentPath(value);
						}}
					/>
				</div>
				{parentPath !== null && (
					<LedgerAccountList
						device={device}
						parentPath={parentPath}
						onConnect={onConnect}
					/>
				)}
			</LedgerPanelContainer>
			<style jsx>{`
        .derivation_path {
          margin: 0.5rem 0;
          padding: 1rem 1.5rem;
          border-radius: 4px;
          background: var(--eerie-black-100);
        }
      `}</style>
		</>
	);
}
