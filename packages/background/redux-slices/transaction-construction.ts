import { createSlice, createSelector } from "@reduxjs/toolkit";

import Emittery from "emittery";
import { FORK } from "../constants";
import {
	EXPRESS,
	INSTANT,
	MAX_FEE_MULTIPLIER,
	REGULAR,
} from "../constants/network-fees";
import logger from "../lib/logger";

import {
	BlockEstimate,
	BlockPrices,
	EIP1559TransactionRequest,
	SignedEVMTransaction,
	POKTTransactionRequest,
	SignedPOKTTransaction,
} from "../networks";
import {
	EnrichedEIP1559TransactionRequest,
	EnrichedEVMTransactionSignatureRequest,
	EnrichedPOKTTransactionRequest,
	EnrichedPOKTTransactionSignatureRequest,
} from "../services/enrichment";
import { emitteryDebugLogger } from "../utils/emittery";
import { SigningMethod } from "../utils/signing";

import { createBackgroundAsyncThunk } from "./utils";

export const enum TransactionConstructionStatus {
	Idle = "idle",
	Pending = "pending",
	Loaded = "loaded",
	Signed = "signed",
}

export type NetworkFeeSettings = {
	feeType: NetworkFeeTypeChosen;
	gasLimit: bigint | undefined;
	suggestedGasLimit: bigint | undefined;
	values: {
		maxFeePerGas: bigint;
		maxPriorityFeePerGas: bigint;
	};
};

export enum NetworkFeeTypeChosen {
	Regular = "regular",
	Express = "express",
	Instant = "instant",
}
export type TransactionConstruction = {
	status: TransactionConstructionStatus;
	transactionRequest?:
		| EnrichedEIP1559TransactionRequest
		| EnrichedPOKTTransactionRequest;
	signedTransaction?: SignedEVMTransaction | SignedPOKTTransaction;
	broadcastOnSign?: boolean;
	transactionLikelyFails?: boolean;
	estimatedFeesPerGas: EstimatedFeesPerGas | undefined;
	lastGasEstimatesRefreshed: number;
	feeTypeSelected: NetworkFeeTypeChosen;
};

export type EstimatedFeesPerGas = {
	baseFeePerGas: bigint;
	instant: BlockEstimate | undefined;
	express: BlockEstimate | undefined;
	regular: BlockEstimate | undefined;
};

export const initialState: TransactionConstruction = {
	status: TransactionConstructionStatus.Idle,
	feeTypeSelected: NetworkFeeTypeChosen.Regular,
	estimatedFeesPerGas: undefined,
	lastGasEstimatesRefreshed: Date.now(),
};

export interface SignatureRequest {
	transaction: EIP1559TransactionRequest | POKTTransactionRequest;
	method: SigningMethod;
}

export enum EventNames {
	UPDATE_OPTIONS = "updateOptions",
	REQUEST_SIGNATURE = "requestSignature",
	SIGNATURE_REJECTED = "signatureRejected",
	BROADCAST_SIGNED_TRANSACTION = "broadcastSignedTransaction",
}

export type Events = {
	[EventNames.UPDATE_OPTIONS]:
		| EnrichedEVMTransactionSignatureRequest
		| EnrichedPOKTTransactionSignatureRequest;
	[EventNames.REQUEST_SIGNATURE]: SignatureRequest;
	[EventNames.SIGNATURE_REJECTED]: never;
	[EventNames.BROADCAST_SIGNED_TRANSACTION]:
		| SignedEVMTransaction
		| SignedPOKTTransaction;
};

export const emitter = new Emittery<Events>({
	debug: {
		name: "redux-slices/transaction-construction",
		logger: emitteryDebugLogger(),
	},
});

// Async thunk to pass transaction options from the store to the background via an event
export const updateTransactionOptions = createBackgroundAsyncThunk(
	"transaction-construction/update-options",
	async (
		options:
			| EnrichedEVMTransactionSignatureRequest
			| EnrichedPOKTTransactionSignatureRequest,
	) => {
		await emitter.emit(EventNames.UPDATE_OPTIONS, options);
	},
);

export const signTransaction = createBackgroundAsyncThunk(
	"transaction-construction/sign",
	async (request: SignatureRequest) => {
		await emitter.emit(EventNames.REQUEST_SIGNATURE, request);
	},
);

const transactionSlice = createSlice({
	name: "transaction-construction",
	initialState,
	reducers: {
		transactionRequest: (
			state,
			{
				payload: { transactionRequest, transactionLikelyFails },
			}: {
				payload: {
					transactionRequest:
						| EnrichedEIP1559TransactionRequest
						| EnrichedPOKTTransactionRequest;
					transactionLikelyFails: boolean;
				};
			},
		) => ({
			...state,
			status: TransactionConstructionStatus.Loaded,
			signedTransaction: undefined,
			transactionRequest: {
				...transactionRequest,
				// maxFeePerGas:
				//   state.estimatedFeesPerGas?.[state.feeTypeSelected]?.maxFeePerGas ??
				//   transactionRequest.maxFeePerGas,
				// maxPriorityFeePerGas:
				//   state.estimatedFeesPerGas?.[state.feeTypeSelected]
				//     ?.maxPriorityFeePerGas ?? transactionRequest.maxPriorityFeePerGas,
			},
			transactionLikelyFails,
		}),
		clearTransactionState: (
			state,
			{ payload }: { payload: TransactionConstructionStatus },
		) => ({
			estimatedFeesPerGas: state.estimatedFeesPerGas,
			lastGasEstimatesRefreshed: state.lastGasEstimatesRefreshed,
			status: payload,
			feeTypeSelected: state.feeTypeSelected ?? NetworkFeeTypeChosen.Regular,
			broadcastOnSign: false,
			signedTransaction: undefined,
		}),
		setFeeType: (
			state,
			{ payload }: { payload: NetworkFeeTypeChosen },
		): TransactionConstruction => ({
			...state,
			feeTypeSelected: payload,
		}),

		signed: (
			state,
			{ payload }: { payload: SignedEVMTransaction | SignedPOKTTransaction },
		) => ({
			...state,
			status: TransactionConstructionStatus.Signed,
			signedTransaction: payload,
		}),
		broadcastOnSign: (state, { payload }: { payload: boolean }) => ({
			...state,
			broadcastOnSign: payload,
		}),
		transactionLikelyFails: (state) => ({
			...state,
			transactionLikelyFails: true,
		}),
		estimatedFeesPerGas: (
			immerState,
			{ payload: estimatedFeesPerGas }: { payload: BlockPrices },
		) => {
			const instanceMaxFeePerGas =
				(estimatedFeesPerGas.baseFeePerGas * MAX_FEE_MULTIPLIER[INSTANT]) /
					10n +
				(estimatedFeesPerGas.estimatedPrices.find(
					(el) => el.confidence === INSTANT,
				)?.maxPriorityFeePerGas ?? 0n);
			const expressMaxFeePerGas =
				(estimatedFeesPerGas.baseFeePerGas * MAX_FEE_MULTIPLIER[EXPRESS]) /
					10n +
				(estimatedFeesPerGas.estimatedPrices.find(
					(el) => el.confidence === EXPRESS,
				)?.maxPriorityFeePerGas ?? 0n);
			const regularMaxFeePerGas =
				(estimatedFeesPerGas.baseFeePerGas * MAX_FEE_MULTIPLIER[REGULAR]) /
					10n +
				(estimatedFeesPerGas.estimatedPrices.find(
					(el) => el.confidence === REGULAR,
				)?.maxPriorityFeePerGas ?? 0n);
			const newEstimatedFeesPerGas = {
				baseFeePerGas: estimatedFeesPerGas.baseFeePerGas,
				instant: {
					maxFeePerGas: instanceMaxFeePerGas,
					confidence: INSTANT,
					maxPriorityFeePerGas:
						estimatedFeesPerGas.estimatedPrices.find(
							(el) => el.confidence === INSTANT,
						)?.maxPriorityFeePerGas ?? 0n,
					price:
						estimatedFeesPerGas.estimatedPrices.find(
							(el) => el.confidence === INSTANT,
						)?.price ?? 0n,
				},
				express: {
					maxFeePerGas: expressMaxFeePerGas,
					confidence: EXPRESS,
					maxPriorityFeePerGas:
						estimatedFeesPerGas.estimatedPrices.find(
							(el) => el.confidence === EXPRESS,
						)?.maxPriorityFeePerGas ?? 0n,
					price:
						estimatedFeesPerGas.estimatedPrices.find(
							(el) => el.confidence === EXPRESS,
						)?.price ?? 0n,
				},
				regular: {
					maxFeePerGas: regularMaxFeePerGas,
					confidence: REGULAR,
					maxPriorityFeePerGas:
						estimatedFeesPerGas.estimatedPrices.find(
							(el) => el.confidence === REGULAR,
						)?.maxPriorityFeePerGas ?? 0n,
					price:
						estimatedFeesPerGas.estimatedPrices.find(
							(el) => el.confidence === REGULAR,
						)?.price ?? 0n,
				},
			};
			logger.debug("updating estimatedFeesPerGas", {
				estimatedFeesPerGas,
				newEstimatedFeesPerGas,
			});
			return {
				...immerState,
				estimatedFeesPerGas: newEstimatedFeesPerGas,
				lastGasEstimatesRefreshed: Date.now(),
			};
		},
	},
	extraReducers: (builder) => {
		builder.addCase(updateTransactionOptions.pending, (immerState) => {
			immerState.status = TransactionConstructionStatus.Pending;
			immerState.signedTransaction = undefined;
		});
	},
});

export const {
	transactionRequest,
	clearTransactionState,
	transactionLikelyFails,
	broadcastOnSign,
	signed,
	setFeeType,
	estimatedFeesPerGas,
} = transactionSlice.actions;

export default transactionSlice.reducer;

export const broadcastSignedTransaction = createBackgroundAsyncThunk(
	"transaction-construction/broadcast",
	async (transaction: SignedEVMTransaction | SignedPOKTTransaction) => {
		await emitter.emit(EventNames.BROADCAST_SIGNED_TRANSACTION, transaction);
	},
);

export const transactionSigned = createBackgroundAsyncThunk(
	"transaction-construction/transaction-signed",
	async (
		transaction: SignedEVMTransaction | SignedPOKTTransaction,
		{ dispatch, getState },
	) => {
		await dispatch(signed(transaction));

		const { transactionConstruction } = getState() as {
			transactionConstruction: TransactionConstruction;
		};

		if (transactionConstruction.broadcastOnSign ?? false) {
			await dispatch(broadcastSignedTransaction(transaction));
		}
	},
);

export const rejectTransactionSignature = createBackgroundAsyncThunk(
	"transaction-construction/reject",
	async (_, { dispatch }) => {
		await emitter.emit(EventNames.SIGNATURE_REJECTED);
		// Provide a clean slate for future transactions.
		dispatch(
			transactionSlice.actions.clearTransactionState(
				TransactionConstructionStatus.Idle,
			),
		);
	},
);

export const selectDefaultNetworkFeeSettings = createSelector(
	({
		transactionConstruction,
	}: {
		transactionConstruction: TransactionConstruction;
	}) => ({
		feeType: transactionConstruction.feeTypeSelected,
		selectedFeesPerGas:
			transactionConstruction.estimatedFeesPerGas?.[
				transactionConstruction.feeTypeSelected
			],
		suggestedGasLimit: undefined, // Refactor for supporting EVM netowrks
	}),
	({ feeType, selectedFeesPerGas, suggestedGasLimit }): NetworkFeeSettings => ({
		feeType,
		gasLimit: undefined,
		suggestedGasLimit,
		values: {
			maxFeePerGas: selectedFeesPerGas?.maxFeePerGas ?? 0n,
			maxPriorityFeePerGas: selectedFeesPerGas?.maxPriorityFeePerGas ?? 0n,
		},
	}),
);

export const selectEstimatedFeesPerGas = createSelector(
	(state: { transactionConstruction: TransactionConstruction }) =>
		state.transactionConstruction.estimatedFeesPerGas,
	(gasData) => gasData,
);

export const selectFeeType = createSelector(
	(state: { transactionConstruction: TransactionConstruction }) =>
		state.transactionConstruction.feeTypeSelected,
	(feeTypeChosen) => feeTypeChosen,
);

export const selectLastGasEstimatesRefreshTime = createSelector(
	(state: { transactionConstruction: TransactionConstruction }) =>
		state.transactionConstruction.lastGasEstimatesRefreshed,
	(updateTime) => updateTime,
);

export const selectTransactionData = createSelector(
	(state: { transactionConstruction: TransactionConstruction }) =>
		state.transactionConstruction.transactionRequest,
	(transactionRequestData) => transactionRequestData,
);

export const selectIsTransactionPendingSignature = createSelector(
	(state: { transactionConstruction: TransactionConstruction }) =>
		state.transactionConstruction?.status,
	(status) => status === "loaded" || status === "pending",
);

export const selectIsTransactionLoaded = createSelector(
	(state: { transactionConstruction: TransactionConstruction }) =>
		state.transactionConstruction.status,
	(status) => status === "loaded",
);

export const selectIsTransactionSigned = createSelector(
	(state: { transactionConstruction: TransactionConstruction }) =>
		state.transactionConstruction.status,
	(status) => status === "signed",
);

export const selectCurrentlyChosenNetworkFees = createSelector(
	(state: { transactionConstruction: TransactionConstruction }) =>
		state.transactionConstruction?.estimatedFeesPerGas?.[
			state.transactionConstruction.feeTypeSelected
		],
	(feeData) => feeData,
);
