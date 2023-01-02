import { BigNumber, ethers, utils } from "ethers";
import { normalizeHexAddress } from "@sendnodes/hd-keyring";
import { HexString } from "../../types";
import { EVMNetwork, Network } from "../../networks";
import {
	ETHEREUM,
	ROPSTEN,
	RINKEBY,
	GOERLI,
	KOVAN,
	FORK,
} from "../../constants";

export function normalizeAddress(
	address: string | Buffer,
	network?: Network,
): HexString {
	if (network?.family === "EVM") return normalizeHexAddress(address);
	if (address instanceof Buffer) return address.toString("hex");
	return address.toLowerCase();
}

export function normalizeEVMAddress(address: string | Buffer): HexString {
	return normalizeHexAddress(address);
}

export function truncateDecimalAmount(
	value: number | string,
	decimalLength: number,
): string {
	const valueString = value.toString();
	if (decimalLength === 0) {
		return valueString.split(".")[0];
	}
	if (valueString.includes(".")) {
		const [integers, decimals] = valueString.split(".");
		return `${integers}.${decimals.substring(0, decimalLength)}`;
	}
	return valueString;
}

export function sameEVMAddress(
	address1: string | Buffer | undefined | null,
	address2: string | Buffer | undefined | null,
): boolean {
	if (
		typeof address1 === "undefined" ||
		typeof address2 === "undefined" ||
		address1 === null ||
		address2 === null
	) {
		return false;
	}
	return normalizeHexAddress(address1) === normalizeHexAddress(address2);
}

export function gweiToWei(value: number | bigint): bigint {
	return BigInt(utils.parseUnits(value.toString(), "gwei").toString());
}

export function convertToEth(value: string | number | bigint): string {
	if (value && value >= 1) {
		return utils.formatUnits(BigInt(value));
	}
	return "";
}

export function weiToGwei(value: string | number | bigint): string {
	if (value && value >= 1) {
		return truncateDecimalAmount(utils.formatUnits(BigInt(value), "gwei"), 2);
	}
	return "";
}

/**
 * Encode an unknown input as JSON, special-casing bigints and undefined.
 *
 * @param input an object, array, or primitive to encode as JSON
 */
export function encodeJSON(input: unknown): string {
	return JSON.stringify(input, (_, value) => {
		if (typeof value === "bigint") {
			return { B_I_G_I_N_T: value.toString() };
		}
		return value;
	});
}

/**
 * Decode a JSON string, as encoded by `encodeJSON`, including bigint support.
 * Note that the functions aren't invertible, as `encodeJSON` discards
 * `undefined`.
 *
 * @param input a string output from `encodeJSON`
 */
export function decodeJSON(input: string): unknown {
	return JSON.parse(input, (_, value) =>
		value !== null && typeof value === "object" && "B_I_G_I_N_T" in value
			? BigInt(value.B_I_G_I_N_T)
			: value,
	);
}

/**
 * Determine which Ethereum network should be used based on the .env file
 * // TODO: v0.2.0 do we still need this?
 */
export function getEthereumNetwork(): EVMNetwork {
	const ethereumNetwork = process.env.ETHEREUM_NETWORK?.toUpperCase();

	if (ethereumNetwork === "ROPSTEN") {
		return ROPSTEN;
	}

	if (ethereumNetwork === "RINKEBY") {
		return RINKEBY;
	}

	if (ethereumNetwork === "GOERLI") {
		return GOERLI;
	}

	if (ethereumNetwork === "KOVAN") {
		return KOVAN;
	}

	if (ethereumNetwork === "FORK") {
		return FORK;
	}

	// Default to mainnet
	return ETHEREUM;
}

export function isProbablyEVMAddress(str: string): str is HexString {
	if (normalizeHexAddress(str).startsWith("0x") && str.length === 42) {
		return true;
	}
	return false;
}

export function isProbablyPOKTAddress(str: string): str is HexString {
	if (str.startsWith("0x")) {
		return false;
	}
	if (!/^[A-Za-z0-9]*$/.test(str)) {
		return false;
	}
	if (str.length === 40) {
		return true;
	}
	return false;
}

export function isValidPoktAddress(pokt_address: string) {
	const valid_characters = [
		"a",
		"b",
		"c",
		"d",
		"e",
		"f",
		"0",
		"1",
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"8",
		"9",
	];

	if (pokt_address.length !== 40) {
		return false;
	}
	for (let i = 0; i < pokt_address.length; i++) {
		if (valid_characters.includes(pokt_address[i].toLowerCase())) {
		} else {
			return false;
		}
	}
	return true;
}

export function truncateAddress(address: string, lead = 5, tail = -3): string {
	return `${address.slice(0, lead)}…${address.slice(tail)}`;
}

export const getNumericStringValueFromBigNumber = (
	value: BigNumber,
	tokenDecimals: number,
): string => {
	return Number(value.toBigInt() / 10n ** BigInt(tokenDecimals)).toString();
};

export const numberTo32BytesHex = (value: string, decimals: number): string => {
	const withDecimals = BigInt(value) * 10n ** BigInt(decimals);
	const hex = utils.hexlify(withDecimals);
	return hex;
};

export const isMaxUint256 = (amount: BigNumber | bigint | string): boolean => {
	return ethers.BigNumber.from(amount).eq(ethers.constants.MaxUint256);
};

/**
 * Converts a string of hexidecimals bytes to ascii text
 */
export const hexToAscii = (hex_: string): string => {
	const hex = hex_.toString(); // force conversion
	let str = "";
	for (let i = 0; i < hex.length; i += 2)
		str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
	return str.replace("\x00", "");
};
