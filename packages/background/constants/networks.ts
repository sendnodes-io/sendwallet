import {
  EVMNetwork,
  POKTNetwork,
  Network,
  NetworkBlockExplorerUrl,
  NetworkFamily,
} from "../networks";
import { BTC, ETH, MATIC, POKT } from "./currencies";

// TODO integrate this with /api/networks
const DEFAULT_POCKET_RPC_URL =
  process.env.POKT_MAINNET_RPC_URL || "https://rpc-4cdf39.nodes.sendnodes.io/";

export const POCKET: POKTNetwork = {
  name: "Pocket",
  baseAsset: POKT,
  chainID: "mainnet",
  family: NetworkFamily.POKT,
  blockExplorerUrl: NetworkBlockExplorerUrl.POKTSCAN,
  rcpUrl: DEFAULT_POCKET_RPC_URL,
};

export const FIAGNET: POKTNetwork = {
  name: "Pocket FIAGnet",
  baseAsset: POKT,
  chainID: "fiagnet",
  family: NetworkFamily.POKT,
  blockExplorerUrl: NetworkBlockExplorerUrl.POKTSCAN,
  rcpUrl: "http://node1.fiagnet.com:8081",
};

export const POCKET_LOCAL: POKTNetwork = {
  name: "Pocket Localnet",
  baseAsset: POKT,
  chainID: "localnet",
  family: NetworkFamily.POKT,
  blockExplorerUrl: NetworkBlockExplorerUrl.POKTSCAN,
  rcpUrl: "http://localhost:8081",
};

export const ETHEREUM: EVMNetwork = {
  name: "Ethereum",
  baseAsset: ETH,
  chainID: "1",
  family: NetworkFamily.EVM,
  blockExplorerUrl: NetworkBlockExplorerUrl.ETHERSCAN,
};

export const ROPSTEN: EVMNetwork = {
  name: "Ropsten",
  baseAsset: ETH,
  chainID: "3",
  family: NetworkFamily.EVM,
  blockExplorerUrl: NetworkBlockExplorerUrl.ROPSTEN,
};

export const RINKEBY: EVMNetwork = {
  name: "Rinkeby",
  baseAsset: ETH,
  chainID: "4",
  family: NetworkFamily.EVM,
  blockExplorerUrl: NetworkBlockExplorerUrl.ROPSTEN,
};

export const GOERLI: EVMNetwork = {
  name: "Goerli",
  baseAsset: ETH,
  chainID: "5",
  family: NetworkFamily.EVM,
  blockExplorerUrl: NetworkBlockExplorerUrl.GOERLI,
};

export const KOVAN: EVMNetwork = {
  name: "Kovan",
  baseAsset: ETH,
  chainID: "42",
  family: NetworkFamily.EVM,
  blockExplorerUrl: NetworkBlockExplorerUrl.KOVAN,
};

export const BITCOIN: Network = {
  name: "Bitcoin",
  baseAsset: BTC,
  family: NetworkFamily.BTC,
};

export const FORK: EVMNetwork = {
  name: "Hardhat",
  baseAsset: ETH,
  chainID: process.env.MAINNET_FORK_CHAIN_ID ?? "1337",
  family: NetworkFamily.EVM,
};

export const POLYGON: EVMNetwork = {
  name: "Polygon",
  baseAsset: MATIC,
  chainID: "137",
  family: NetworkFamily.EVM,
  blockExplorerUrl: NetworkBlockExplorerUrl.POLYGONSCAN,
};

export const EVM_MAIN_NETWORKS = [ETHEREUM];

export const EVM_TEST_NETWORKS = [ROPSTEN, RINKEBY, GOERLI, KOVAN];

const EVM_NETWORKS: EVMNetwork[] = EVM_MAIN_NETWORKS.concat(EVM_TEST_NETWORKS);

// A lot of code currently relies on chain id uniqueness per EVM network;
// explode if that is not maintained.
if (
  new Set(EVM_NETWORKS.map(({ chainID }) => chainID)).size < EVM_NETWORKS.length
) {
  throw new Error("Duplicate chain ID in EVM networks.");
}

export const EVM_NETWORKS_BY_CHAIN_ID: { [chainID: string]: EVMNetwork } =
  EVM_NETWORKS.reduce(
    (agg, network) => ({
      ...agg,
      [network.chainID]: network,
    }),
    {}
  );

export const NETWORKS = [BITCOIN].concat(EVM_NETWORKS);

// A lot of code currently relies on network name uniqueness; explode if that
// is not maintained.
if (new Set(NETWORKS.map(({ name }) => name)).size < NETWORKS.length) {
  throw new Error("Duplicate chain name in networks.");
}
