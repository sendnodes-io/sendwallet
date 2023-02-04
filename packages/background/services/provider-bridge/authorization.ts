import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider";
import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
  PermissionRequest,
} from "@sendnodes/provider-bridge-shared";
import { POKTTransactionRPCRequest } from "../../networks";
import { sameEVMAddress } from "../../lib/utils";
import { HexString } from "../../types";

export function checkPermissionSignTypedData(
  walletAddress: HexString,
  enablingPermission: PermissionRequest
): void {
  if (!sameEVMAddress(walletAddress, enablingPermission.accountAddress)) {
    throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized);
  }
}

export function checkPermissionSign(
  walletAddress: HexString,
  enablingPermission: PermissionRequest
): void {
  if (!sameEVMAddress(walletAddress, enablingPermission.accountAddress)) {
    throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized);
  }
}

export function checkPermissionSignTransaction(
  transactionRequest: EthersTransactionRequest | POKTTransactionRPCRequest,
  enablingPermission: PermissionRequest
): void {
  if (
    !sameEVMAddress(transactionRequest.from, enablingPermission.accountAddress)
  ) {
    throw new EIP1193Error(EIP1193_ERROR_CODES.unauthorized);
  }
}
