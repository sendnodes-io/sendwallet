import {
  EIP1559TransactionRequest,
  POKTTransactionRequest,
} from "@sendnodes/pokt-wallet-background/networks";
import { TransactionAnnotation } from "@sendnodes/pokt-wallet-background/services/enrichment";
import { ReactElement, ReactNode } from "react";

export interface SignTransactionInfo {
  title: ReactNode;
  infoBlock: ReactNode;
  textualInfoBlock: ReactNode;
  confirmButtonLabel: ReactNode;
  rejectButtonLabel?: ReactNode;
}

export interface SignTransactionInfoProviderProps<
  T extends TransactionAnnotation | undefined =
    | TransactionAnnotation
    | undefined,
> {
  transactionDetails: EIP1559TransactionRequest | POKTTransactionRequest;
  annotation: T;
  inner: (info: SignTransactionInfo) => ReactElement;
}

export default function SignTransactionBaseInfoProvider({
  inner,
  ...info
}: SignTransactionInfo & {
  inner: (info: SignTransactionInfo) => ReactElement;
}): ReactElement {
  return inner(info);
}
