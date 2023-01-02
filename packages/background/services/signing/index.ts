import { StatusCodes, TransportStatusError } from "@ledgerhq/errors";
import KeyringService from "../keyring";
import LedgerService from "../ledger";
import {
	EIP1559TransactionRequest,
	EVMNetwork,
	POKTNetwork,
	POKTTransactionRequest,
	SignedEVMTransaction,
	SignedPOKTTransaction,
} from "../../networks";
import { EIP712TypedData, HexString } from "../../types";
import BaseService from "../base";
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types";
import ChainService from "../chain";
import { USE_MAINNET_FORK } from "../../features/features";
import { FORK } from "../../constants";
import { SigningMethod } from "../../utils/signing";

type SigningErrorReason = "userRejected" | "genericError";
type ErrorResponse = {
	type: "error";
	reason: SigningErrorReason;
};

export type TXSignatureResponse =
	| {
			type: "success-tx";
			signedTx: SignedEVMTransaction | SignedPOKTTransaction;
	  }
	| ErrorResponse;

export type SignatureResponse =
	| {
			type: "success-data";
			signedData: string;
	  }
	| ErrorResponse;

type Events = ServiceLifecycleEvents & {
	signingTxResponse: TXSignatureResponse;
	signingDataResponse: SignatureResponse;
	personalSigningResponse: SignatureResponse;
};

type SignerType = "keyring" | HardwareSignerType;
type HardwareSignerType = "ledger";

type AddressHandler = {
	address: string;
	signer: SignerType;
};

type AccountSigner = {
	type: SignerType;
	accountID: string;
};

function getSigningErrorReason(err: unknown): SigningErrorReason {
	if (err instanceof TransportStatusError) {
		const transportError = err as Error & { statusCode: number };
		switch (transportError.statusCode) {
			case StatusCodes.CONDITIONS_OF_USE_NOT_SATISFIED:
				return "userRejected";
			default:
		}
	}

	return "genericError";
}

/**
 * The SigningService is intended hide and demultiplex of accesses
 * to concrete signer implementations.
 *
 * It also emits all the abstract signing-related event to subscribers
 * grabbing this responsibility from each different implementation.
 *
 */
export default class SigningService extends BaseService<Events> {
	addressHandlers: AddressHandler[] = [];

	static create: ServiceCreatorFunction<
		Events,
		SigningService,
		[Promise<KeyringService>, Promise<LedgerService>, Promise<ChainService>]
	> = async (keyringService, ledgerService, chainService) => {
		return new this(
			await keyringService,
			await ledgerService,
			await chainService,
		);
	};

	private constructor(
		private keyringService: KeyringService,
		private ledgerService: LedgerService,
		private chainService: ChainService,
	) {
		super();
	}

	protected async internalStartService(): Promise<void> {
		await super.internalStartService(); // Not needed, but better to stick to the patterns
	}

	async deriveAddress(signerID: AccountSigner): Promise<HexString> {
		if (signerID.type === "ledger") {
			return this.ledgerService.deriveAddress(signerID.accountID);
		}

		if (signerID.type === "keyring") {
			return this.keyringService.deriveAddress(signerID.accountID);
		}

		throw new Error(`Unknown signerID: ${signerID}`);
	}

	private async _signTransaction(
		network: EVMNetwork | POKTNetwork,
		transactionWithNonce:
			| (EIP1559TransactionRequest & { nonce: number })
			| POKTTransactionRequest,
		signingMethod: SigningMethod,
	): Promise<SignedEVMTransaction | SignedPOKTTransaction> {
		switch (signingMethod.type) {
			case "ledger":
				if (network.family === "EVM") {
					return this.ledgerService.signTransaction(
						network,
						transactionWithNonce as EIP1559TransactionRequest & {
							nonce: number;
						},
						signingMethod.deviceID,
						signingMethod.path,
					);
				}
				throw new Error("Ledger signing not supported");

			case "keyring":
				if (network.family === "EVM") {
					return this.keyringService.signTransaction(
						{
							address: (
								transactionWithNonce as EIP1559TransactionRequest & {
									nonce: number;
								}
							).from,
							network,
						},
						transactionWithNonce,
					);
				}
				return this.keyringService.signTransaction(
					{
						address: (transactionWithNonce as POKTTransactionRequest).from,
						network,
					},
					transactionWithNonce,
				);

			default:
				throw new Error("Unreachable!");
		}
	}

	async removeAccount(
		address: HexString,
		signingMethod: SigningMethod,
	): Promise<void> {
		switch (signingMethod.type) {
			case "keyring":
				await this.keyringService.hideAccount(address);
				break;
			case "ledger":
				// @TODO Implement removal of ledger accounts.
				break;
			default:
				throw new Error("Unknown signingMethod type.");
		}
	}

	async signTransaction(
		transactionRequest: EIP1559TransactionRequest | POKTTransactionRequest,
		signingMethod: SigningMethod,
	): Promise<SignedEVMTransaction | SignedPOKTTransaction> {
		const network = USE_MAINNET_FORK
			? FORK
			: this.chainService.resolveNetwork(transactionRequest);
		if (typeof network === "undefined") {
			throw new Error(`Unknown chain ID ${transactionRequest.chainID}.`);
		}

		if (network.family === "EVM") {
			const txReq = transactionRequest as EIP1559TransactionRequest;
			const transactionWithNonce =
				await this.chainService.populateEVMTransactionNonce(txReq);

			try {
				const signedTx = await this._signTransaction(
					network,
					transactionWithNonce,
					signingMethod,
				);

				this.emitter.emit("signingTxResponse", {
					type: "success-tx",
					signedTx,
				});

				return signedTx;
			} catch (err) {
				this.emitter.emit("signingTxResponse", {
					type: "error",
					reason: getSigningErrorReason(err),
				});

				this.chainService.releaseEVMTransactionNonce(transactionWithNonce);

				throw err;
			}
		}

		const txReq = transactionRequest as POKTTransactionRequest;

		try {
			const signedTx = await this._signTransaction(
				network,
				txReq,
				signingMethod,
			);

			this.emitter.emit("signingTxResponse", {
				type: "success-tx",
				signedTx,
			});

			return signedTx;
		} catch (err) {
			this.emitter.emit("signingTxResponse", {
				type: "error",
				reason: getSigningErrorReason(err),
			});

			throw err;
		}
	}

	addTrackedAddress(address: string, handler: SignerType): void {
		this.addressHandlers.push({ address, signer: handler });
	}

	async signTypedData({
		typedData,
		account,
		signingMethod,
	}: {
		typedData: EIP712TypedData;
		account: HexString;
		signingMethod: SigningMethod;
	}): Promise<string> {
		try {
			let signedData: string;
			switch (signingMethod.type) {
				case "ledger":
					signedData = await this.ledgerService.signTypedData(
						typedData,
						account,
						signingMethod.deviceID,
						signingMethod.path,
					);
					break;
				case "keyring":
					signedData = await this.keyringService.signTypedData({
						typedData,
						account,
					});
					break;
				default:
					throw new Error("Unreachable!");
			}
			this.emitter.emit("signingDataResponse", {
				type: "success-data",
				signedData,
			});

			return signedData;
		} catch (err) {
			this.emitter.emit("signingDataResponse", {
				type: "error",
				reason: getSigningErrorReason(err),
			});

			throw err;
		}
	}

	async signData(
		address: string,
		message: string,
		signingMethod: SigningMethod,
	): Promise<string> {
		this.signData = this.signData.bind(this);
		try {
			let signedData;
			switch (signingMethod.type) {
				case "ledger":
					signedData = await this.ledgerService.signMessage(address, message);
					break;
				case "keyring":
					signedData = await this.keyringService.personalSign({
						signingData: message,
						account: address,
					});
					break;
				default:
					throw new Error("Unreachable!");
			}

			this.emitter.emit("personalSigningResponse", {
				type: "success-data",
				signedData,
			});
			return signedData;
		} catch (err) {
			if (err instanceof TransportStatusError) {
				const transportError = err as Error & { statusCode: number };
				switch (transportError.statusCode) {
					case StatusCodes.CONDITIONS_OF_USE_NOT_SATISFIED:
						this.emitter.emit("personalSigningResponse", {
							type: "error",
							reason: "userRejected",
						});
						throw err;
					default:
						break;
				}
			}
			this.emitter.emit("personalSigningResponse", {
				type: "error",
				reason: "genericError",
			});
			throw err;
		}
	}
}
