import {
  CoinDenom as POKTCoinDenom,
  Fee as POKTFee,
  Signature as POKTSignature,
  Hex,
} from "@pokt-network/pocket-js/dist/index";
import { HexString, UNIXTime } from "./types";

export enum NetworkBlockExplorerUrl {
  ETHERSCAN = "https://etherscan.io/",
  POLYGONSCAN = "https://polygonscan.com/",
  POKTWATCH = "https://pokt.watch/",
  ROPSTEN = "https://ropsten.etherscan.io/",
  RINKEBY = "https://rinkeby.etherscan.io/",
  GOERLI = "https://goerli.etherscan.io/",
  KOVAN = "https://kovan.etherscan.io/",
}

/**
 * Each supported network family is generally incompatible with others from a
 * transaction, consensus, and/or wire format perspective.
 */
export enum NetworkFamily {
  EVM = "EVM",
  BTC = "BTC",
  POKT = "POKT",
}

// Should be structurally compatible with FungibleAsset or much code will
// likely explode.
type NetworkBaseAsset = {
  symbol: string;
  name: string;
  decimals: number;
};

/**
 * Represents a cryptocurrency network; these can potentially be L1 or L2.
 */
export type Network = {
  // Considered a primary key; two Networks should never share a name.
  name: string;
  baseAsset: NetworkBaseAsset;
  family: NetworkFamily;
  chainID?: string;
  rcpUrl?: string;
};

/**
 * Mixed in to any other type, gives it the property of belonging to a
 * particular network. Often used to delineate contracts or assets that are on
 * a single network to distinguish from other versions of them on different
 * networks.
 */
export type NetworkSpecific = {
  homeNetwork: AnyNetwork;
};

/**
 * A smart contract on any network that tracks smart contracts via a hex
 * contract address.
 */
export type SmartContract = NetworkSpecific & {
  contractAddress: HexString;
};

/**
 * An EVM-style network which *must* include a chainID.
 */
export type EVMNetwork = Network & {
  chainID: string;
  family: NetworkFamily.EVM;
  blockExplorerUrl?: string;
};

/**
 * An POKT-style network which *must* include a chainID.
 */
export type POKTNetwork = Network & {
  chainID: string;
  family: NetworkFamily.POKT;
  blockExplorerUrl: NetworkBlockExplorerUrl.POKTWATCH;
};

/**
 * Union type that allows narrowing to particular network subtypes.
 */
export type AnyNetwork = EVMNetwork | POKTNetwork;

/**
 * An EVM-style block identifier, including difficulty, block height, and
 * self/parent hash data.
 */
export type EVMBlock = {
  hash: string;
  parentHash: string;
  difficulty: bigint;
  blockHeight: number;
  timestamp: UNIXTime;
  network: EVMNetwork;
};

/**
 * An EVM-style block identifier that includes the base fee, as per EIP-1559.
 */
export type EIP1559Block = EVMBlock & {
  baseFeePerGas: bigint;
};

/**
 * A pre- or post-EIP1559 EVM-style block.
 */
export type AnyEVMBlock = EVMBlock | EIP1559Block;

/**
 * Base EVM transaction fields; these are further specialized by particular
 * subtypes.
 */
export type EVMTransaction = {
  hash: string;
  from: HexString;
  to?: HexString;
  gasLimit: bigint;
  gasPrice: bigint | null;
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
  input: string | null;
  nonce: number;
  value: bigint;
  blockHash: string | null;
  blockHeight: number | null;
  asset: NetworkBaseAsset;
  network: EVMNetwork;
  /*
   * 0 - plain jane
   * 1 - EIP-2930
   * 2 - EIP-1559 transactions
   */
  type: 0 | 1 | 2 | null;
};

export type POKTBlock = {
  network: POKTNetwork;
  timestamp: UNIXTime;
  header: {
    app_hash: string;
    chain_id: string;
    consensus_hash: string;
    data_hash: string;
    evidence_hash: string;
    height: number;
    last_block_id: {
      hash: string;
      parts: {
        hash: string;
        total: number;
      };
    };
    last_commit_hash: string;
    last_results_hash: string;
    next_validators_hash: string;
    num_txs: number;
    proposer_address: string;
    time: string;
    total_txs: number;
    validators_hash: string;
  };
};

export type POKTSkinnyBlock = {
  network: POKTNetwork;
  timestamp: UNIXTime;
  header: {
    height: number;
    time: string;
    proposer_address: string;
    num_txs: number;
  };
};

export enum POKTTransactionMessageType {
  app_stake = "app_stake",
  app_begin_unstake = "app_begin_unstake",
  stake_validator = "stake_validator",
  begin_unstake_validator = "begin_unstake_validator",
  unjail_validator = "unjail_validator",
  send = "send",
  upgrade = "upgrade",
  change_param = "change_param",
  dao_transfer = "dao_transfer",
  claim = "claim",
  proof = "proof",
}

/**
 * Base POKT transaction fields; these are further specialized by particular
 * subtypes.
 */
export type POKTTransactionResult = {
  code: number;
  codespace: string;
  data: string[] | null;
  events: object[] | null;
  log: string;
  info: string;
  signer: string;
  recipient: string;
  messageType: string;
};

/**
 * Base POKT transaction fields; these are further specialized by particular
 * subtypes.
 */
export type POKTTransactionSimpleProof = {
  total: number;
  index: number;
  leaf_hash: Hex | null;
  aunts: Hex[] | null;
};

/**
 * Base POKT transaction fields; these are further specialized by particular
 * subtypes.
 */
export type POKTTransactionProof = {
  root_hash: string;
  data: string | null;
  proof: POKTTransactionSimpleProof;
};

/**
 * Base POKT transaction fields; these are further specialized by particular
 * subtypes.
 */
export type POKTTransactionStd = {
  entropy: number;
  fee: POKTFee;
  memo: string;
  msg: any;
  signature: POKTSignature;
};

/**
 * Base POKT transaction fields; these are further specialized by particular
 * subtypes.
 */
export type POKTTransaction = {
  hash: string;
  height: number;
  targetHeight: number;
  tx: string;
  from: string;
  to: string;
  txMsg: POKTMsgSend;
  network: POKTNetwork;
  asset: NetworkBaseAsset;
  memo?: string;
  stdTx?: POKTTransactionStd;
  txResult?: POKTTransactionResult;
  proof?: POKTTransactionProof;
};

export enum POKTMsgType {
  send = "pos/Send",
}

/**
 * Base POKT transaction fields; these are further specialized by particular
 * subtypes.
 */
export type POKTMsgSend = {
  type: POKTMsgType.send;
  value: {
    amount: string;
    fromAddress: string;
    toAddress: string;
  };
};

/**
 * Base POKT transaction fields; these are further specialized by particular
 * subtypes.
 */
export type POKTMsg = POKTMsgSend;

export type POKTTransactionRPCRequest = {
  amount: string;
  from: string;
  to: string;
  fee?: string;
  memo?: string;
};

/**
 * Base POKT transaction fields; these are further specialized by particular
 * subtypes.
 */
export type POKTTransactionRequest = {
  txMsg: POKTMsgSend;
  chainID: "mainnet" | "localnet" | string;
  fee: string;
  network: POKTNetwork;
  from: string;
  to: string;
  feeDenom?: POKTCoinDenom;
  memo?: string;
};

/**
 * Base POKT transaction fields; these are further specialized by particular
 * subtypes.
 */
export type SignedPOKTTransaction = POKTTransactionRequest & {
  tx: string;
};

/**
 * Any EVM transaction, confirmed or unconfirmed and signed or unsigned.
 */
export type AnyPOKTTransaction = POKTTransaction;

/**
 * A legacy (pre-EIP1559) EVM transaction, whose type is fixed to `0` and whose
 * EIP1559-related fields are mandated to be `null`, while `gasPrice` must be
 * set.
 */
export type LegacyEVMTransaction = EVMTransaction & {
  gasPrice: bigint;
  type: 0 | null;
  maxFeePerGas: null;
  maxPriorityFeePerGas: null;
};

/**
 * A legacy (pre-EIP1559) EVM transaction _request_, meaning only fields that
 * are used to post a transaction for inclusion are required, including the gas
 * limit used to limit the gas expenditure on a transaction. This is used to
 * request a signed transaction, and does not include signature fields.
 */
export type LegacyEVMTransactionRequest = Pick<
  LegacyEVMTransaction,
  "gasPrice" | "type" | "nonce" | "from" | "to" | "input" | "value"
> & {
  chainID: LegacyEVMTransaction["network"]["chainID"];
  gasLimit: bigint;
};

/**
 * An EIP1559 EVM transaction, whose type is set to `1` or `2` per EIP1559 and
 * whose EIP1559-related fields are required, while `gasPrice` (pre-EIP1559) is
 * mandated to be `null`.
 */
export type EIP1559Transaction = EVMTransaction & {
  gasPrice: null;
  type: 1 | 2;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

/**
 * An EIP1559 EVM transaction _request_, meaning only fields used to post a
 * transaction for inclusion are required, including the gas limit used to
 * limit the gas expenditure on a transaction. This is used to request a signed
 * transaction, and does not include signature fields.
 *
 * Nonce is permitted to be `undefined` as PoktWallet internals can and often do
 * populate the nonce immediately before a request is signed.
 */
export type EIP1559TransactionRequest = Pick<
  EIP1559Transaction,
  | "from"
  | "to"
  | "type"
  | "input"
  | "value"
  | "maxFeePerGas"
  | "maxPriorityFeePerGas"
> & {
  gasLimit: bigint;
  chainID: EIP1559Transaction["network"]["chainID"];
  nonce: number | undefined;
};

/**
 * EVM log metadata, including the contract address that generated the log, the
 * full log data, and the indexed log topics.
 */
export type EVMLog = {
  contractAddress: HexString;
  data: HexString;
  topics: HexString[];
};

/**
 * A confirmed EVM transaction that has been included in a block. Includes
 * information about the gas actually used to execute the transaction, as well
 * as the block hash and block height at which the transaction was included.
 */
export type ConfirmedEVMTransaction = EVMTransaction & {
  gasUsed: bigint;
  status: number;
  blockHash: string;
  blockHeight: number;
  logs: EVMLog[] | undefined;
};

/**
 * An EVM transaction that failed to be confirmed. Includes information about
 * the error if available.
 */
export type FailedConfirmationEVMTransaction = EVMTransaction & {
  status: 0;
  error?: string;
  blockHash: null;
  blockHeight: null;
};

/**
 * An almost-signed EVM transaction, meaning a transaction that knows about the
 * signature fields but may not have them all populated yet.
 */
export type AlmostSignedEVMTransaction = EVMTransaction & {
  r?: string;
  s?: string;
  v?: number;
};

/**
 * An EVM transaction with signature fields filled in and ready for broadcast
 * to the network.
 */
export type SignedEVMTransaction = EVMTransaction & {
  r: string;
  s: string;
  v: number;
};

/**
 * An EVM transaction that has all signature fields and has been included in a
 * block.
 */
export type SignedConfirmedEVMTransaction = SignedEVMTransaction &
  ConfirmedEVMTransaction;

/**
 * Any EVM transaction, confirmed or unconfirmed and signed or unsigned.
 */
export type AnyEVMTransaction =
  | EVMTransaction
  | ConfirmedEVMTransaction
  | AlmostSignedEVMTransaction
  | SignedEVMTransaction
  | FailedConfirmationEVMTransaction;

/**
 * The estimated gas prices for including a transaction in the next block.
 *
 * The estimated prices include a percentage (confidence) that a transaction with
 * the given `baseFeePerGas` will be included in the next block.
 */
export enum BlockPriceDataSource {
  LOCAL = "local",
  BLOCKNATIVE = "blocknative",
}
export type BlockPrices = {
  network: Network;
  blockNumber: number;
  baseFeePerGas: bigint;
  /**
   * An estimate of how many transactions will be included in the next block.
   */
  estimatedTransactionCount: number | null;
  /**
   * A choice of gas price parameters with associated confidence that a
   * transaction using those parameters will be included in the next block.
   */
  estimatedPrices: BlockEstimate[];
  /**
   * Whether these prices were estimated locally or via a third party provider
   */
  dataSource: BlockPriceDataSource;
};

/**
 * An estimate of the confidence that a given set of gas price parameters
 * will result in the inclusion of a transaction in the next block.
 */
export type BlockEstimate = {
  confidence: number;
  /**
   * For legacy (pre-EIP1559) transactions, the gas price that results in the
   * above likelihood of inclusion.
   */
  price: bigint;
  /**
   * For EIP1559 transactions, the max priority fee per gas that results in the
   * above likelihood of inclusion.
   */
  maxPriorityFeePerGas: bigint;
  /**
   * For EIP1559 transactions, the max fee per gas that results in the above
   * likelihood of inclusion.
   */
  maxFeePerGas: bigint;
};

/**
 * Tests whether two networks should be considered the same. Verifies family,
 * chainID, and name.
 */
export function sameNetwork(
  network1: AnyNetwork,
  network2: AnyNetwork,
): boolean {
  return (
    network1.family === network2.family &&
    network1.chainID === network2.chainID &&
    network1.name === network2.name
  );
}
