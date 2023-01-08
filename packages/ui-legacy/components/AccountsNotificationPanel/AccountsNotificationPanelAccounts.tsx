import React, { ReactElement, useEffect, useState } from "react";
import { setNewSelectedAccount } from "@sendnodes/pokt-wallet-background/redux-slices/ui";
import { deriveAddress } from "@sendnodes/pokt-wallet-background/redux-slices/keyrings";
import {
	AccountTotal,
	selectAccountTotalsByCategory,
	selectCurrentAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { Link, useHistory } from "react-router-dom";
import {
	ETHEREUM,
	POCKET,
} from "@sendnodes/pokt-wallet-background/constants/networks";
import { AccountType } from "@sendnodes/pokt-wallet-background/redux-slices/AccountType";
import {
	normalizeAddress,
	sameEVMAddress,
} from "@sendnodes/pokt-wallet-background/lib/utils";
import { Network } from "@sendnodes/pokt-wallet-background/networks";
import classNames from "classnames";
import { HiOutlinePlusSm } from "react-icons/hi";
import SharedButton from "../Shared/SharedButton";
import {
	useBackgroundDispatch,
	useBackgroundSelector,
	useAreKeyringsUnlocked,
} from "../../hooks";
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary";
import AccountItemOptionsMenu from "../AccountItem/AccountItemOptionsMenu";

type WalletTypeInfo = {
	title: string;
	icon: string;
};

const walletTypeDetails: { [key in AccountType]: WalletTypeInfo } = {
	[AccountType.ReadOnly]: {
		title: "Read-only",
		icon: "./images/eye_account@2x.png",
	},
	[AccountType.Imported]: {
		title: "Import",
		icon: "./images/imported@2x.png",
	},
	[AccountType.Internal]: {
		title: "SendWallet",
		icon: "./icon-128.png",
	},
	[AccountType.Ledger]: {
		title: "Full access via Ledger", // FIXME: check copy against UI specs
		icon: "./images/ledger_icon@2x.png", // FIXME: use proper icon
	},
};

function WalletTypeHeader({
	accountType,
	onClickAddAddress,
	walletNumber,
}: {
	accountType: AccountType;
	onClickAddAddress?: () => void;
	walletNumber?: number;
}) {
	const { title, icon } = walletTypeDetails[accountType];
	const history = useHistory();
	const areKeyringsUnlocked = useAreKeyringsUnlocked(false);
	const deriveAddressImporting = useBackgroundSelector(
		(state) => state.keyrings.deriving,
	);

	return (
		<>
			<header className="wallet_title">
				<h2 className="left">
					{title} {accountType !== AccountType.ReadOnly ? walletNumber : null}
				</h2>
				{onClickAddAddress ? (
					<div className="right">
						<SharedButton
							type="tertiaryWhite"
							size="small"
							icon="plus"
							iconSize="large"
							isDisabled={deriveAddressImporting === "pending"}
							isLoading={deriveAddressImporting === "pending"}
							onClick={() => {
								if (areKeyringsUnlocked) {
									onClickAddAddress();
								}
							}}
						>
							Add Address
						</SharedButton>
					</div>
				) : (
					<></>
				)}
			</header>
			<style jsx>{`
        .wallet_title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 1.5rem;
        }
        .wallet_title > h2 {
          color: var(--white);
          font-size: 1.25rem;
          font-weight: 500;
        }
        .left {
          align-items: center;
          display: flex;
        }
        .right {
          align-items: center;
        }

        .right :global(button) {
          padding: 0;
        }

        .right :global(.icon_button .icon) {
          width: 1.25rem;
          height: 1.25rem;
        }
        .right :global(.icon_button .icon) {
          background-color: var(--aqua) !important;
        }
        .right :global(.icon_button:hover .icon) {
          background-color: var(--white) !important;
        }
        .right :global(.button_content) {
          color: var(--spanish-gray) !important;
        }
        .right :global(button:hover .button_content) {
          color: var(--white) !important;
        }
      `}</style>
		</>
	);
}

type Props = {
	showEasterEgg?: boolean;
	onCurrentAddressChange: (newAddress: string) => void;
};

export default function AccountsNotificationPanelAccounts({
	showEasterEgg = true,
	onCurrentAddressChange,
}: Props): ReactElement {
	const dispatch = useBackgroundDispatch();

	const accountTotals = useBackgroundSelector(selectAccountTotalsByCategory);

	const [pendingSelectedAddress, setPendingSelectedAddress] = useState("");

	const selectedAccount = useBackgroundSelector(selectCurrentAccount);
	const { address: selectedAccountAddress, network: selectedNetwork } =
		selectedAccount;

	const updateCurrentAccount = (address: string) => {
		setPendingSelectedAddress(address);
		dispatch(
			setNewSelectedAccount({
				address,
				network: selectedNetwork,
			}),
		);
	};

	const deriveAddressImporting = useBackgroundSelector(
		(state) => state.keyrings.deriving,
	);

	useEffect(() => {
		if (
			pendingSelectedAddress !== "" &&
			pendingSelectedAddress === selectedAccountAddress
		) {
			onCurrentAddressChange(pendingSelectedAddress);
			setPendingSelectedAddress("");
		}
	}, [onCurrentAddressChange, pendingSelectedAddress, selectedAccountAddress]);

	const accountTypes = [
		AccountType.Internal,
		AccountType.Imported,
		AccountType.ReadOnly,
		AccountType.Ledger,
	];

	return (
		<div className="switcher_wrap">
			<div className="wallets">
				{accountTypes
					.filter((type) => (accountTotals[type]?.length ?? 0) > 0)
					.map((accountType) => {
						// Known-non-null due to above filter.
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						const accountTotalsByType = accountTotals[accountType]!.reduce(
							(acc, accountTypeTotal) => {
								if (accountTypeTotal.keyringId) {
									acc[accountTypeTotal.keyringId] ??= [];
									// Known-non-null due to above ??=
									// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
									acc[accountTypeTotal.keyringId]!.push(accountTypeTotal);
								} else {
									acc.readOnly ??= [];
									acc.readOnly.push(accountTypeTotal);
								}
								return acc;
							},
							{} as { [keyringId: string]: AccountTotal[] },
						);

						return Object.values(accountTotalsByType).map(
							(accountTotalsByKeyringId, idx) => {
								return (
									<section key={accountType + idx + 1}>
										<WalletTypeHeader
											accountType={accountType}
											walletNumber={idx + 1}
											onClickAddAddress={
												(accountType === "imported" ||
													accountType === "internal") &&
												accountTotalsByKeyringId[0]?.keyringType !== "fixed" &&
												accountTotalsByKeyringId.length < 10
													? () => {
															if (
																accountTotalsByKeyringId[0]!.keyringId &&
																(!deriveAddressImporting ||
																	deriveAddressImporting === "done")
															) {
																dispatch(
																	deriveAddress(
																		accountTotalsByKeyringId[0]!.keyringId,
																	),
																);
															}
													  }
													: undefined
											}
										/>
										<ul>
											{accountTotalsByKeyringId.map((accountTotal) => {
												const normalizedAddress = normalizeAddress(
													accountTotal.address,
													selectedNetwork,
												);

												const isSelected = sameEVMAddress(
													normalizedAddress,
													selectedAccountAddress,
												);

												return (
													<li
														className={classNames({ isSelected })}
														key={normalizedAddress}
														// We use these event handlers in leiu of :hover so that we can prevent child hovering
														// from affecting the hover state of this li.
														onMouseOver={(e) => {
															e.currentTarget.style.backgroundColor =
																"var(--eerie-black-100)";
														}}
														onFocus={(e) => {
															e.currentTarget.style.backgroundColor =
																"var(--eerie-black-100)";
														}}
														onMouseOut={(e) => {
															e.currentTarget.style.backgroundColor = "";
														}}
														onBlur={(e) => {
															e.currentTarget.style.backgroundColor = "";
														}}
													>
														<div className="account_status" />
														<div
															className="connect_account_link"
															title={`Connect to account ${normalizedAddress}`}
															onClick={(e) => {
																e.stopPropagation();
																e.preventDefault();
																const target = e.target as Element;
																if (
																	!e.currentTarget.contains(
																		target.closest(".slide_up_menu"),
																	)
																)
																	updateCurrentAccount(normalizedAddress);
															}}
															onKeyDown={(e) => {
																if (e.key === "Enter") {
																	e.stopPropagation();
																	e.preventDefault();
																	updateCurrentAccount(normalizedAddress);
																}
															}}
															role="button"
															tabIndex={0}
														>
															<SharedAccountItemSummary
																key={normalizedAddress}
																accountTotal={accountTotal}
																isSelected={isSelected}
															>
																<AccountItemOptionsMenu
																	accountTotal={accountTotal}
																	address={accountTotal.address}
																/>
															</SharedAccountItemSummary>
														</div>
													</li>
												);
											})}
										</ul>
									</section>
								);
							},
						);
					})}
			</div>
			<footer>
				<Link
					to="/onboarding/add-wallet"
					title="Import Wallet"
					className="add-wallet"
				>
					Import Wallet
					<span className="circle">
						<HiOutlinePlusSm color="currentColor" />
					</span>
				</Link>
			</footer>
			<style jsx>
				{`
          .switcher_wrap {
            background-color: var(--rich-black-100);
            margin: calc(var(--main-margin) * -2);
            height: 32rem;
            overflow-y: scroll;
            display: flex;
            flex-direction: column;
            border-radius: 1.5rem 1.5rem 0 0;
            flex-grow: 1;
          }
          .wallets {
            height: 28rem;
            overflow-y: auto;
            flex-grow: 1;
          }
          ul {
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            align-content: center;
          }
          ul:last-child {
            margin-bottom: 0;
          }
          li {
            width: 100%;
            background-color: var(--rich-black-200);
          }
          .account_status {
            position: relative;
          }
          .account_status:before {
            content: "";
            width: 0.25rem;
            height: 3rem;
            background-color: var(--spanish-gray);
            display: block;
            position: absolute;
            border-radius: 0 1rem 1rem 0;
            left: 0;
            top: 50%;
            transform: translateY(50%);
          }

          .isSelected .account_status:before {
            background-color: var(--success);
          }
          li .connect_account_link {
            display: block;
            padding: 1rem 1.5rem;
          }

          .connect_account_link {
            cursor: pointer;
          }

          footer {
            display: flex;
            flex-grow: 1;
            justify-content: flex-end;
            align-items: center;
            padding: 0 1.5rem;
            padding-bottom: 00.5rem;
            margin-top: -1px;
            border-top: 1px solid var(--rich-black-200);
            height: 5rem;
          }
          footer :global(.add-wallet) {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .circle {
            display: flex;
            height: 3rem;
            width: 3rem;
            background-color: var(--aqua);
            background-image: var(--aqua-to-capri);
            border-radius: 3rem;
            color: var(--black);
            justify-content: center;
            align-items: center;
            font-size: 2rem;
            font-weight: 300;
            line-height: 2rem;
          }

          footer :global(.add-wallet:hover),
          footer :global(.add-wallet:hover) .circle {
            color: var(--white);
          }

          .pokt_pulse {
            width: 1.5rem;
            height: 1.5rem;
            border-radius: 1.5rem;
            vertical-align: bottom;
            box-shadow: 0px 2px 2px 1px rgba(var(--aqua-rgb), 0.1);
            animation: pulse 2s infinite linear;
            cursor: pointer;
          }

          @keyframes pulse {
            0% {
              box-shadow: 0px 2px 2px 1px rgba(var(--aqua-rgb), 0.1);
            }
            50% {
              box-shadow: 0px 2px 1rem 4px rgba(var(--aqua-rgb), 0.33);
            }
            0% {
              box-shadow: 0px 2px 2px 1px rgba(var(--aqua-rgb), 0.1);
            }
          }
        `}
			</style>
		</div>
	);
}
