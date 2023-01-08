import React, { CSSProperties, useMemo, useState } from "react";
import { setNewSelectedAccount } from "@sendnodes/pokt-wallet-background/redux-slices/ui";
import {
	ETHEREUM,
	FIAGNET,
	FORK,
	POCKET,
	POCKET_LOCAL,
	POLYGON,
} from "@sendnodes/pokt-wallet-background/constants";
import groupBy from "lodash/groupBy";
import {
	selectCurrentAddressNetwork,
	selectKeyringMetadataForAddress,
	selectKeyrings,
	selectSiblingKeyrings,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import {
	AnyNetwork,
	NetworkFamily,
} from "@sendnodes/pokt-wallet-background/networks";
import { Dictionary } from "lodash";
import { KeyType } from "@sendnodes/pokt-wallet-background/services/keyring";
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts";
import { useHistory } from "react-router-dom";
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu";
import SharedButton from "../Shared/SharedButton";
import SharedAssetIcon from "../Shared/SharedAssetIcon";
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks";
import { RootState } from "@sendnodes/pokt-wallet-background";

const networkFamilyToHeader = {
	[NetworkFamily.EVM]: "EVM / Ethereum",
	[NetworkFamily.POKT]: "Pocket Network",
	[NetworkFamily.BTC]: "Bitcoin",
};

/**
 * a better method would be to use the derivation path but since we only
 * support EVM and POKT, a simple mapping will do.
 * @see https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
 */
const networkFamilyToKeytype = {
	[NetworkFamily.EVM]: KeyType.SECP256K1,
	[NetworkFamily.POKT]: KeyType.ED25519,
};

export type NetworkSelectorProps = {
	onAddressNetworkChange: (addressNetwork: AddressOnNetwork) => void;
};

/**
 *  Uses sibling keyrings of current keyring seed to allow for seemless switching between networks.
 */
export default function NetworkSelector({
	onAddressNetworkChange,
}: NetworkSelectorProps) {
	const history = useHistory();
	const dispatch = useBackgroundDispatch();
	const { address: currentAddress, network: currentNetwork } =
		useBackgroundSelector(selectCurrentAddressNetwork);
	const { seedId } = useBackgroundSelector((state: RootState) =>
		selectKeyringMetadataForAddress(state, currentAddress),
	)!;
	// use sibling keyrings of seed to allow for seemless switching between networks
	const siblingKeyrings = useBackgroundSelector((state) =>
		selectSiblingKeyrings(state, seedId),
	);
	// use other keyrings as well
	const allKeyrings = useBackgroundSelector(selectKeyrings);

	const availNetworks: Dictionary<AnyNetwork[]> = groupBy(
		[ETHEREUM, POLYGON, POCKET, FIAGNET, POCKET_LOCAL, FORK] as AnyNetwork[],
		(n) => n.family,
	);
	const sortedNetworks: Dictionary<AnyNetwork[]> = Object.entries(availNetworks)
		.sort((a, b) => (a[0] === currentNetwork.family ? -1 : 1))
		.reduce((sortedNetworks, [family, networks]) => {
			sortedNetworks[family] = networks;
			return sortedNetworks;
		}, {} as Dictionary<AnyNetwork[]>);

	const networkToAddress: Dictionary<string> = useMemo(() => {
		return Object.entries(sortedNetworks).reduce(
			(dictionary, [_, networks]) => {
				networks.forEach((network) => {
					const keyType = networkFamilyToKeytype[network.family];
					const siblingKeyring = siblingKeyrings.find(
						(kr) => kr.keyType === keyType,
					);
					const otherKeyring = allKeyrings.find((kr) => kr.keyType === keyType);
					if (siblingKeyring?.addresses[0]) {
						dictionary[network.family] = siblingKeyring?.addresses[0];
					} else if (otherKeyring?.addresses[0]) {
						dictionary[network.family] = otherKeyring?.addresses[0];
					}
				});
				return dictionary;
			},
			{} as Dictionary<string>,
		);
	}, [sortedNetworks, siblingKeyrings, networkFamilyToKeytype]);

	const [needKeyringForNetwork, setNeedKeyringForNetwork] =
		useState<AnyNetwork | null>(null);

	return (
		<div className="wrap">
			<div style={{ flex: "1", height: "100%" }}>
				{Object.entries(sortedNetworks).map(([family, networks]) => (
					<div key={family}>
						<h3>{networkFamilyToHeader[family as NetworkFamily]}</h3>
						<ul>
							{networks
								.map(
									(network) =>
										({
											network,
											address: networkToAddress[network.family],
										}) as AddressOnNetwork,
								)
								.map((addressNetwork) => (
									<NetworkSelectorRow
										key={`${addressNetwork.network.family}${addressNetwork.network.chainID}`}
										currentNetwork={currentNetwork}
										newAddressOnNetwork={addressNetwork}
										onClick={(e) => {
											e.preventDefault();
											if (!addressNetwork.address) {
												setNeedKeyringForNetwork(addressNetwork.network);
												return false;
											}
											dispatch(setNewSelectedAccount(addressNetwork));
											onAddressNetworkChange(addressNetwork);
										}}
									/>
								))}
						</ul>
					</div>
				))}
				<SharedSlideUpMenu
					title="Need More Keys"
					isOpen={needKeyringForNetwork !== null}
					close={() => {
						setNeedKeyringForNetwork(null);
					}}
					size="auto"
				>
					<div className="wrap">
						<div
							style={{
								flex: "1",
								height: "100%",
								gap: "1rem",
								display: "flex",
								flexDirection: "column",
								paddingBottom: "2rem",
							}}
						>
							<h3>No Keyring found for {needKeyringForNetwork?.name}</h3>
							<p>
								To start transacting on {needKeyringForNetwork?.name} you need
								to create or import a new keyring wallet.
							</p>
							<SharedButton
								size="large"
								type="primary"
								onClick={(e) => {
									e.preventDefault();
									history.push("/onboarding/add-wallet");
								}}
							>
								Add or Import Wallet
							</SharedButton>
						</div>
					</div>
				</SharedSlideUpMenu>
			</div>
			<style jsx>
				{`
          .wrap {
            padding: 0 1rem;
            flex-grow: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          nav {
            flex-grow: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .wrap :global(li) {
            padding: 1rem 2rem;
            display: block;
          }

          .wrap :global(li > a) {
            display: flex;
            align-items: center;
            height: 2rem;
            gap: 1rem;
          }

          .wrap :global(li div),
          .wrap :global(li h3) {
            color: var(--aqua);
          }

          .wrap :global(li:hover div),
          .wrap :global(li:hover a) {
            --token-icon-color: var(--aqua) !important;
            color: var(--aqua);
          }

          .footer {
            justify-self: flex-end;
            display: flex;
            justify-content: center;
            color: var(--attention);
            height: 6rem;
            font-size: 1.25rem;
            align-items: center;
            margin: calc(var(--main-padding) * -1);
            width: calc(var(--main-padding) * 2 + 100%);
          }

          .footer .dashed_border {
            display: flex;
            justify-content: center;
            color: var(--attention);
            height: 6rem;
            font-size: 1.25rem;
            align-items: center;
            margin: 0 calc(var(--main-padding) * -1);
            padding: 0;
            width: 100%;
          }

          .text_attention:hover {
            color: var(--white);
          }
        `}
			</style>
		</div>
	);
}

type NetworkSelectorRowProps = {
	currentNetwork: AnyNetwork;
	newAddressOnNetwork: AddressOnNetwork;
	onClick: (e: React.MouseEvent) => void;
};

function NetworkSelectorRow({
	currentNetwork,
	newAddressOnNetwork,
	onClick,
}: NetworkSelectorRowProps) {
	const { network, address } = newAddressOnNetwork;
	return (
		<li
			key={`${network.family}${network.chainID}`}
			style={
				currentNetwork.family === network.family &&
				currentNetwork.chainID === network.chainID
					? ({
							"--token-icon-color": "var(--white)",
							color: "var(--white)",
					  } as CSSProperties)
					: ({
							"--token-icon-color": "var(--text-body-color)",
							color: "var(--text-body-color)",
					  } as CSSProperties)
			}
			className="network_row"
		>
			{/* rome-ignore lint/a11y/useValidAnchor: <explanation> */}
			<a
				href="#_"
				aria-disabled={!address}
				style={{
					cursor: !address ? "not-allowed" : "pointer",
				}}
				onClick={onClick}
			>
				<SharedAssetIcon symbol={network.baseAsset.symbol} />
				{network.name} ({network.family === NetworkFamily.EVM ? "0x" : ""}
				{network.chainID})
			</a>
		</li>
	);
}
