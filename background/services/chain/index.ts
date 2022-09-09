import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
  TransactionReceipt,
  TransactionResponse,
  getNetwork as getEthNetwork,
  JsonRpcProvider,
  WebSocketProvider,
} from "@ethersproject/providers"
import { Transaction as PoktJSTransaction } from "@pokt-network/pocket-js/dist/index"
import { utils } from "ethers"
import { Logger } from "ethers/lib/utils"
import logger from "../../lib/logger"
import getBlockPrices from "../../lib/gas"
import { HexString, UNIXTime } from "../../types"
import { AccountBalance, AddressOnNetwork } from "../../accounts"
import {
  AnyEVMBlock,
  AnyEVMTransaction,
  EIP1559TransactionRequest,
  EVMNetwork,
  POKTNetwork,
  Network,
  SignedEVMTransaction,
  BlockPrices,
  LegacyEVMTransactionRequest,
  SignedPOKTTransaction,
  AnyPOKTTransaction,
  POKTTransactionRequest,
  POKTTransaction,
  POKTBlock,
  AnyNetwork,
  NetworkFamily,
  POKTSkinnyBlock,
} from "../../networks"
import { AssetTransfer } from "../../assets"
import PreferenceService, {
  EventNames as PreferencesEventNames,
} from "../preferences"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDB, ChainDatabase, TransactionRetrieval } from "./db"
import BaseService from "../base"
import {
  blockFromEthersBlock,
  blockFromPoktBlock,
  blockFromWebsocketBlock,
  enrichTransactionWithReceipt,
  ethersTransactionRequestFromEIP1559TransactionRequest,
  ethersTransactionFromSignedTransaction,
  transactionFromEthersTransaction,
  transactionFromPoktTransaction,
} from "./utils"
import {
  getEthereumNetwork,
  normalizeEVMAddress,
  normalizeAddress,
  sameEVMAddress,
} from "../../lib/utils"
import type {
  EnrichedEIP1559TransactionRequest,
  EnrichedEVMTransactionSignatureRequest,
} from "../enrichment"
import { ETHEREUM, FORK, HOUR, POCKET } from "../../constants"
import SerialFallbackProvider from "./serial-fallback-provider"
import PocketProvider from "./pocket-provider"
import AssetDataHelper from "./asset-data-helper"

// We can't use destructuring because webpack has to replace all instances of
// `process.env` variables in the bundled output
const ALCHEMY_KEY = process.env.ALCHEMY_KEY // eslint-disable-line prefer-destructuring

// How many queued transactions should be retrieved on every tx alarm, per
// network. To get frequency, divide by the alarm period. 5 tx / 5 minutes →
// max 1 tx/min.
const MAX_CONCURRENT_TRANSACTION_REQUESTS = 20

// The number of blocks to query at a time for historic asset transfers.
// Unfortunately there's no "right" answer here that works well across different
// people's account histories. If the number is too large relative to a
// frequently used account, the first call will time out and waste provider
// resources... resulting in an exponential backoff. If it's too small,
// transaction history will appear "slow" to show up for newly imported
// accounts.
const BLOCKS_FOR_EVM_TRANSACTION_HISTORY = 128000

// The number of blocks before the current block height to start looking for
// asset transfers. This is important to allow nodes like Erigon and
// OpenEthereum with tracing to catch up to where we are.
const BLOCKS_TO_SKIP_FOR_EVM_TRANSACTION_HISTORY = 20

// The number of asset transfer lookups that will be done per account to rebuild
// historic activity.
const HISTORIC_ASSET_TRANSFER_LOOKUPS_PER_ACCOUNT = 10

// The number of milliseconds after a request to look up a transaction was
// first seen to continue looking in case the transaction fails to be found
// for either internal (request failure) or external (transaction dropped from
// mempool) reasons.
const TRANSACTION_CHECK_LIFETIME_MS = 10 * HOUR

// The number of max historical transactions to load for Pocket network accounts
const MAX_HISTORIC_ASSET_TRANSFERS_POCKET = 100

export enum ChainEventNames {
  BLOCK_PRICES = "blockPrices",
}

interface Events extends ServiceLifecycleEvents {
  newAccountToTrack: AddressOnNetwork
  accountsWithBalances: AccountBalance[]
  transactionSend: TransactionResponse | POKTTransaction
  transactionSendFailure: unknown
  assetTransfers: {
    addressNetwork: AddressOnNetwork
    assetTransfers: AssetTransfer[]
  }
  block: AnyEVMBlock | POKTBlock | POKTSkinnyBlock
  transaction: {
    forAccounts: string[]
    transaction: AnyEVMTransaction | AnyPOKTTransaction
  }
  [ChainEventNames.BLOCK_PRICES]: BlockPrices
}

type NetworkProviders = {
  [NetworkFamily.EVM]: SerialFallbackProvider
  [NetworkFamily.POKT]: PocketProvider
}

/**
 * ChainService is responsible for basic network monitoring and interaction.
 * Other services rely on the chain service rather than polling networks
 * themselves.
 *
 * The service should provide
 * * Basic cached network information, like the latest block hash and height
 * * Cached account balances, account history, and transaction data
 * * Gas estimation and transaction broadcasting
 * * Event subscriptions, including events whenever
 *   * A new transaction relevant to accounts tracked is found or first
 *     confirmed
 *   * A historic account transaction is pulled and cached
 *   * Any asset transfers found for newly tracked accounts
 *   * A relevant account balance changes
 *   * New blocks
 * * ... and finally, polling and websocket providers for supported networks, in
 *   case a service needs to interact with a network directly.
 */

export default class ChainService extends BaseService<Events> {
  providers?: NetworkProviders

  subscribedAccounts: {
    account: string
    provider: SerialFallbackProvider
  }[]

  subscribedNetworks: {
    network: EVMNetwork | POKTNetwork
    provider: SerialFallbackProvider
  }[]

  /**
   * For each chain id, track an address's last seen nonce. The tracked nonce
   * should generally not be allocated to a new transaction, nor should any
   * nonces that precede it, unless the intent is deliberately to replace an
   * unconfirmed transaction sharing the same nonce.
   */
  private evmChainLastSeenNoncesByNormalizedAddress: {
    [chainID: string]: { [normalizedAddress: string]: number }
  } = {}

  /**
   * FIFO queues of transaction hashes per network that should be retrieved and
   * cached, alongside information about when that hash request was first seen
   * for expiration purposes.
   */
  private transactionsToRetrieve: {
    network: EVMNetwork | POKTNetwork
    hash: HexString
    firstSeen: UNIXTime
    txData?: POKTTransaction | AssetTransfer
  }[]

  static create: ServiceCreatorFunction<
    Events,
    ChainService,
    [Promise<PreferenceService>]
  > = async (preferenceService) => {
    return new this(await getOrCreateDB(), await preferenceService)
  }

  ethereumNetwork?: EVMNetwork

  pocketNetwork?: POKTNetwork

  assetData: AssetDataHelper

  private constructor(
    private db: ChainDatabase,
    private preferenceService: PreferenceService
  ) {
    super({
      queuedTransactions: {
        schedule: {
          delayInMinutes: 1,
          periodInMinutes: 1,
        },
        handler: () => {
          this.handleQueuedTransactionAlarm()
        },
      },
      recentAssetTransferAlarm: {
        runAtStart: true,
        schedule: {
          periodInMinutes: 5, // Pocket block times are 15min so no need for short period
        },
        handler: () => {
          this.handleRecentAssetTransferAlarm()
        },
      },
      // TODO: v0.4.0 wPOKT bridge: re-enable EVM support
      // historicAssetTransfers: {
      //   schedule: {
      //     periodInMinutes: 1,
      //   },
      //   handler: () => {
      //     this.handleHistoricEVMAssetTransferAlarm()
      //   },
      //   runAtStart: true,
      // },
      // blockPrices: {
      //   runAtStart: false,
      //   schedule: {
      //     // periodInMinutes: 0.5,
      //     periodInMinutes:
      //       Number(process.env.GAS_PRICE_POLLING_FREQUENCY ?? "120") / 60,
      //   },
      //   handler: () => {
      //     this.pollBlockPrices()
      //   },
      // },
    })

    this.subscribedAccounts = []
    this.subscribedNetworks = []
    this.transactionsToRetrieve = []

    this.assetData = new AssetDataHelper(this)
  }

  get ethProvider(): SerialFallbackProvider {
    return this.providers![NetworkFamily.EVM]
  }

  get poktProvider(): PocketProvider {
    return this.providers![NetworkFamily.POKT]
  }

  async internalStartService(): Promise<void> {
    await super.internalStartService()

    await this.connectToAddressNetwork(
      await this.preferenceService.getSelectedAccount()
    )

    // listen for changes to selected account
    this.preferenceService.emitter.on(
      PreferencesEventNames.SELECTED_ACCOUNT_CHANGED,
      this.connectToAddressNetwork.bind(this)
    )
  }

  /**
   * Finds a provider for the given network, or returns undefined if no such
   * provider exists.
   */
  providerForNetwork(
    network: EVMNetwork | POKTNetwork
  ): SerialFallbackProvider | PocketProvider | undefined {
    return this.providers![network.family]
  }

  /**
   * Populates the provided partial EIP1559 transaction request with all fields
   * except the nonce. This leaves the transaction ready for user review, and
   * the nonce ready to be filled in immediately prior to signing to minimize the
   * likelihood for nonce reuse.
   *
   * Note that if the partial request already has a defined nonce, it is not
   * cleared.
   */
  async populatePartialEVMTransactionRequest(
    network: EVMNetwork,
    partialRequest: EnrichedEVMTransactionSignatureRequest
  ): Promise<{
    transactionRequest: EnrichedEIP1559TransactionRequest
    gasEstimationError: string | undefined
  }> {
    // Basic transaction construction based on the provided options, with extra data from the chain service
    const transactionRequest: EnrichedEIP1559TransactionRequest = {
      from: partialRequest.from,
      to: partialRequest.to,
      value: partialRequest.value ?? 0n,
      gasLimit: partialRequest.gasLimit ?? 0n,
      maxFeePerGas: partialRequest.maxFeePerGas ?? 0n,
      maxPriorityFeePerGas: partialRequest.maxPriorityFeePerGas ?? 0n,
      input: partialRequest.input ?? null,
      type: 2 as const,
      chainID: network.chainID,
      nonce: partialRequest.nonce,
      annotation: partialRequest.annotation,
    }

    // Always estimate gas to decide whether the transaction will likely fail.
    let estimatedGasLimit: bigint | undefined
    let gasEstimationError: string | undefined
    try {
      estimatedGasLimit = await this.estimateGasLimit(
        network,
        transactionRequest
      )
    } catch (error) {
      // Try to identify unpredictable gas errors to bubble that information
      // out.
      if (error instanceof Error) {
        // Ethers does some heavily loose typing around errors to carry
        // arbitrary info without subclassing Error, so an any cast is needed.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyError: any = error

        if (
          "code" in anyError &&
          anyError.code === Logger.errors.UNPREDICTABLE_GAS_LIMIT
        ) {
          gasEstimationError = anyError.error ?? "unknown transaction error"
        }
      }
    }

    // We use the estimate as the actual limit only if user did not specify the
    // gas explicitly or if it was set below the minimum network-allowed value.
    if (
      typeof estimatedGasLimit !== "undefined" &&
      (typeof partialRequest.gasLimit === "undefined" ||
        partialRequest.gasLimit < 21000n)
    ) {
      transactionRequest.gasLimit = estimatedGasLimit
    }

    return { transactionRequest, gasEstimationError }
  }

  /**
   * Populates the nonce for the passed EIP1559TransactionRequest, provided
   * that it is not yet populated. This process generates a new nonce based on
   * the known on-chain nonce state of the service, attempting to ensure that
   * the nonce will be unique and an increase by 1 over any other confirmed or
   * pending nonces in the mempool.
   *
   * Returns the transaction request with a guaranteed-defined nonce, suitable
   * for signing by a signer.
   */
  async populateEVMTransactionNonce(
    transactionRequest: EIP1559TransactionRequest
  ): Promise<EIP1559TransactionRequest & { nonce: number }> {
    if (typeof transactionRequest.nonce !== "undefined") {
      // TS undefined checks don't narrow the containing object's type, so we
      // have to cast `as` here.
      return transactionRequest as EIP1559TransactionRequest & { nonce: number }
    }

    const { chainID } = transactionRequest
    const normalizedAddress = normalizeEVMAddress(transactionRequest.from)

    const chainNonce =
      (await this.ethProvider.getTransactionCount(
        transactionRequest.from,
        "latest"
      )) - 1
    const existingNonce =
      this.evmChainLastSeenNoncesByNormalizedAddress[chainID]?.[
        normalizedAddress
      ] ?? chainNonce

    this.evmChainLastSeenNoncesByNormalizedAddress[chainID] ??= {}
    // Use the network count, if needed. Note that the assumption here is that
    // all nonces for this address are increasing linearly and continuously; if
    // the address has a pending transaction floating around with a nonce that
    // is not an increase by one over previous transactions, this approach will
    // allocate more nonces that won't mine.
    // TODO Deal with multi-network.
    this.evmChainLastSeenNoncesByNormalizedAddress[chainID][normalizedAddress] =
      Math.max(existingNonce, chainNonce)

    // Allocate a new nonce by incrementing the last seen one.
    this.evmChainLastSeenNoncesByNormalizedAddress[chainID][
      normalizedAddress
    ] += 1
    const knownNextNonce =
      this.evmChainLastSeenNoncesByNormalizedAddress[chainID][normalizedAddress]

    logger.debug(
      "Got chain nonce",
      chainNonce,
      "existing nonce",
      existingNonce,
      "using",
      knownNextNonce
    )

    return {
      ...transactionRequest,
      nonce: knownNextNonce,
    }
  }

  resolveNetwork(
    transactionRequest: EIP1559TransactionRequest | POKTTransactionRequest
  ): EVMNetwork | undefined | POKTNetwork {
    if ("network" in transactionRequest) {
      return transactionRequest["network"]
    }
    if (transactionRequest.chainID === this.ethereumNetwork!.chainID) {
      return this.ethereumNetwork
    }
    return undefined
  }

  /**
   * Releases the specified nonce for the given network and address. This
   * updates internal service state to allow that nonce to be reused. In cases
   * where multiple nonces were seen in a row, this will make internally
   * available for reuse all intervening nonces.
   */
  releaseEVMTransactionNonce(
    transactionRequest:
      | (EIP1559TransactionRequest & {
          nonce: number
        })
      | (LegacyEVMTransactionRequest & { nonce: number })
      | SignedEVMTransaction
  ): void {
    const { nonce } = transactionRequest
    const chainID =
      "chainID" in transactionRequest
        ? transactionRequest.chainID
        : transactionRequest.network.chainID

    const normalizedAddress = normalizeEVMAddress(transactionRequest.from)
    const lastSeenNonce =
      this.evmChainLastSeenNoncesByNormalizedAddress[chainID][normalizedAddress]

    // TODO Currently this assumes that the only place this nonce could have
    // TODO been used is this service; however, another wallet or service
    // TODO could have broadcast a transaction with this same nonce, in which
    // TODO case the nonce release shouldn't take effect! This should be a
    // TODO relatively rare edge case, but we should handle it at some point.
    if (nonce === lastSeenNonce) {
      this.evmChainLastSeenNoncesByNormalizedAddress[chainID][
        normalizedAddress
      ] -= 1
    } else if (nonce < lastSeenNonce) {
      // If the nonce we're releasing is below the latest allocated nonce,
      // release all intervening nonces. This risks transaction replacement
      // issues, but ensures that we don't start allocating nonces that will
      // never mine (because they will all be higher than the
      // now-released-and-therefore-never-broadcast nonce).
      this.evmChainLastSeenNoncesByNormalizedAddress[chainID][
        normalizedAddress
      ] = lastSeenNonce - 1
    }
  }

  async getAccountsToTrack(): Promise<AddressOnNetwork[]> {
    const { network } = await this.preferenceService.getSelectedAccount()
    return (
      (await this.db.getAccountsToTrack()) // work with chosen network family
        .filter((an) => an.network.family === network.family)
        // wire all accounts within the same family to the new network
        .map(({ address }) => ({ address, network }))
    )
  }

  async getLatestBaseAccountBalance(
    addressNetwork: AddressOnNetwork
  ): Promise<AccountBalance> {
    const { address, network } = addressNetwork
    const balance =
      network.family === "EVM"
        ? await this.ethProvider.getBalance(address)
        : await this.poktProvider.getBalance(address)

    const accountBalance: AccountBalance = {
      address: address,
      assetAmount: {
        asset: network.baseAsset,
        amount: balance.toBigInt(),
      },
      network: network,
      dataSource: "local",
      retrievedAt: Date.now(),
    }
    this.emitter.emit("accountsWithBalances", [accountBalance])
    await this.db.addBalance(accountBalance)
    return accountBalance
  }

  async addAccountToTrack(addressNetwork: AddressOnNetwork): Promise<void> {
    await this.db.addAccountToTrack(addressNetwork)

    this.emitter.emit("newAccountToTrack", addressNetwork)
    this.getLatestBaseAccountBalance(addressNetwork)
    this.subscribeToAccountTransactions(addressNetwork)
    this.loadRecentAssetTransfers(addressNetwork).then(() =>
      this.handleQueuedTransactionAlarm()
    )
  }

  async removeAccountToTrack(address: HexString): Promise<void> {
    const accounts = (await this.db.getAccountsToTrack()).reduce<
      Set<AddressOnNetwork>
    >((accnts, curr) => {
      if (curr.address !== address) {
        accnts.add(curr)
      }
      return accnts
    }, new Set<AddressOnNetwork>())
    await this.db.setAccountsToTrack(accounts)
  }

  async getBlockHeight(network: Network): Promise<number> {
    const cachedBlock = await this.db.getLatestBlock(network)

    if (network.family === "EVM") {
      if (cachedBlock) {
        return (cachedBlock as AnyEVMBlock).blockHeight
      }
      return this.ethProvider.getBlockNumber()
    } else if (network.family === "POKT") {
      if (cachedBlock) {
        return (cachedBlock as POKTBlock).header.height
      }
      return this.poktProvider.getBlockNumber()
    }

    throw new Error("Invalid network family: " + network.family)
  }

  /**
   * Return cached information on a block if it's in the local DB.
   *
   * Otherwise, retrieve the block from the specified network, caching and
   * returning the object.
   *
   * @param network the EVM network we're interested in
   * @param blockTag the EVM block hash or Pokt block height of the block we're interested in
   */
  async getBlockData(
    network: EVMNetwork | POKTNetwork,
    blockTag: string | number
  ): Promise<AnyEVMBlock | POKTBlock | POKTSkinnyBlock> {
    // TODO make this multi network
    const cachedBlock = await this.db.getBlock(network, blockTag)
    if (cachedBlock) {
      return cachedBlock
    }

    if (network.family === "EVM") {
      // Looking for new EVM block
      const resultBlock = await this.ethProvider.getBlock(blockTag)
      const block = blockFromEthersBlock(network as EVMNetwork, resultBlock)

      await this.db.addBlock(block)
      this.emitter.emit("block", block)
      return block
    }

    // Looking for new POKT block
    const resultBlock = await this.poktProvider.getSkinnyBlock(
      blockTag as number
    )
    const block = blockFromPoktBlock(network as POKTNetwork, resultBlock)

    await this.db.addBlock(block)
    this.emitter.emit("block", block)
    return block
  }

  /**
   * Return cached information on a transaction, if it's both confirmed and
   * in the local DB.
   *
   * Otherwise, retrieve the transaction from the specified network, caching and
   * returning the object.
   *
   * @param network the EVM network we're interested in
   * @param txHash the hash of the unconfirmed transaction we're interested in
   */
  async getTransaction(
    network: EVMNetwork | POKTNetwork,
    txHash: HexString
  ): Promise<AnyEVMTransaction | AnyPOKTTransaction> {
    const cachedTx = await this.db.getTransaction(network, txHash)
    if (cachedTx) {
      return cachedTx
    }

    if (network.family === "EVM") {
      // TODO make proper use of the network
      const gethResult = await this.ethProvider.getTransaction(txHash)
      const newTransaction = transactionFromEthersTransaction(
        gethResult,
        network as EVMNetwork
      )

      if (!newTransaction.blockHash && !newTransaction.blockHeight) {
        this.subscribeToTransactionConfirmation(
          network as EVMNetwork,
          newTransaction
        )
      }

      // TODO proper provider string
      this.saveTransaction(newTransaction, "alchemy")
    }

    const poktResult = await this.poktProvider.getTransaction(txHash)
    const newPoktTransaction = transactionFromPoktTransaction(
      poktResult,
      network as POKTNetwork
    )

    if (!newPoktTransaction.height || newPoktTransaction.height === 0) {
      this.subscribeToTransactionConfirmation(
        network as POKTNetwork,
        newPoktTransaction
      )
    }

    this.saveTransaction(newPoktTransaction, "local")

    return newPoktTransaction
  }

  /**
   * Queues up a particular transaction hash for later retrieval.
   *
   * Using this method means the service can decide when to retrieve a
   * particular transaction. Queued transactions are generally retrieved on a
   * periodic basis.
   *
   * @param network The network on which the transaction has been broadcast.
   * @param txHash The tx hash identifier of the transaction we want to retrieve.
   * @param firstSeen The timestamp at which the queued transaction was first
   *        seen; used to treat transactions as dropped after a certain amount
   *        of time.
   */
  async queueTransactionHashToRetrieve(
    network: EVMNetwork | POKTNetwork,
    txHash: HexString,
    firstSeen: UNIXTime,
    txData?: POKTTransaction | AssetTransfer
  ): Promise<void> {
    try {
      const txToRetrieve: TransactionRetrieval = {
        network,
        hash: txHash,
        firstSeen,
        txData,
      }
      if (txData && "height" in txData)
        txToRetrieve.height = BigInt(txData.height)
      await this.db.queueTransactionRetrieval(txToRetrieve)
    } catch (e) {
      throw new Error("Unable to fetch network family: " + network.family)
    }
  }

  /**
   * Estimate the gas needed to make a transaction. Adds 10% as a safety net to
   * the base estimate returned by the provider.
   */
  async estimateGasLimit(
    network: EVMNetwork | POKTNetwork,
    transactionRequest: EIP1559TransactionRequest
  ): Promise<bigint> {
    const estimate = await this.ethProvider.estimateGas(
      ethersTransactionRequestFromEIP1559TransactionRequest(transactionRequest)
    )
    // Add 10% more gas as a safety net
    const uppedEstimate = estimate.add(estimate.div(10))
    return BigInt(uppedEstimate.toString())
  }

  /**
   * Broadcast a signed EVM transaction.
   *
   * @param transaction A signed EVM transaction to broadcast. Since the tx is signed,
   *        it needs to include all gas limit and price params.
   */
  async broadcastSignedTransaction(
    transaction: SignedEVMTransaction | SignedPOKTTransaction
  ): Promise<string | undefined> {
    try {
      if (transaction.network.family === "EVM") {
        const tx = transaction as SignedEVMTransaction
        // TODO make proper use of tx.network to choose provider
        const serialized = utils.serializeTransaction(
          ethersTransactionFromSignedTransaction(tx),
          { r: tx.r, s: tx.s, v: tx.v }
        )

        await Promise.all([
          this.ethProvider
            .sendTransaction(serialized)
            .then((transactionResponse) => {
              this.emitter.emit("transactionSend", transactionResponse)
            })
            .catch((error) => {
              logger.debug(
                "Broadcast error caught, saving failed status and releasing nonce...",
                tx,
                error
              )
              // Failure to broadcast needs to be registered.
              this.saveTransaction(
                { ...tx, status: 0, error: error.toString() },
                "alchemy"
              )
              this.releaseEVMTransactionNonce(tx)
              return Promise.reject(error)
            }),
          this.subscribeToTransactionConfirmation(tx.network, tx),
          this.saveTransaction(tx, "local"),
        ])
        return tx.hash
      }

      const tx = transaction as SignedPOKTTransaction

      return await this.poktProvider
        .sendTransaction(tx)
        .then(async (transactionResponse) => {
          this.emitter.emit("transactionSend", transactionResponse)
          await this.saveTransaction({ ...tx, ...transactionResponse }, "local")
          // TODO subscribe to pokt tx confirmation
          await this.subscribeToTransactionConfirmation(
            tx.network,
            transactionResponse
          )
          return transactionResponse.hash
        })
        .catch((error) => {
          logger.debug(
            "Broadcast error caught, saving failed status...",
            transaction,
            error
          )
          // Failure to broadcast needs to be registered.
          // this.saveTransaction(
          //   { ...transaction, status: 0, error: error.toString() },
          //   "alchemy"
          // )
          return Promise.reject(error)
        })
    } catch (error) {
      this.emitter.emit("transactionSendFailure", error)
      logger.error("Error broadcasting transaction", transaction, error)

      throw error
    }
  }

  /*
   * Periodically fetch block prices and emit an event whenever new data is received
   * Write block prices to IndexedDB so we have them for later
   */
  async pollBlockPrices(): Promise<void> {
    await Promise.allSettled(
      this.subscribedNetworks.map(async ({ network, provider }) => {
        if (network.family === "EVM") {
          const blockPrices = await getBlockPrices(network, provider)
          this.emitter.emit(ChainEventNames.BLOCK_PRICES, blockPrices)
        }
      })
    )
  }

  async send(
    method: string,
    params: unknown[],
    network: AnyNetwork
  ): Promise<unknown> {
    return this.providerForNetwork(network)?.send(method, params)
  }

  /* *****************
   * PRIVATE METHODS *
   * **************** */

  /**
   * Load recent asset transfers from an account on a particular network. Backs
   * off exponentially (in block range, not in time) on failure.
   *
   * @param addressNetwork the address and network whose asset transfers we need
   */
  private async loadRecentAssetTransfers(
    addressNetwork: AddressOnNetwork
  ): Promise<void> {
    if (addressNetwork.network.family === "EVM") {
      const blockHeight =
        (await this.getBlockHeight(addressNetwork.network)) -
        BLOCKS_TO_SKIP_FOR_EVM_TRANSACTION_HISTORY
      let fromBlock = blockHeight - BLOCKS_FOR_EVM_TRANSACTION_HISTORY
      try {
        return await this.loadAssetTransfers(
          addressNetwork,
          BigInt(fromBlock),
          BigInt(blockHeight)
        )
      } catch (err) {
        logger.error(
          "Failed loaded recent assets, retrying with shorter block range",
          addressNetwork,
          err
        )
      }

      // TODO replace the home-spun backoff with a util function
      fromBlock =
        blockHeight - Math.floor(BLOCKS_FOR_EVM_TRANSACTION_HISTORY / 2)
      try {
        return await this.loadAssetTransfers(
          addressNetwork,
          BigInt(fromBlock),
          BigInt(blockHeight)
        )
      } catch (err) {
        logger.error(
          "Second failure loading recent assets, retrying with shorter block range",
          addressNetwork,
          err
        )
      }

      fromBlock =
        blockHeight - Math.floor(BLOCKS_FOR_EVM_TRANSACTION_HISTORY / 4)
      try {
        return await this.loadAssetTransfers(
          addressNetwork,
          BigInt(fromBlock),
          BigInt(blockHeight)
        )
      } catch (err) {
        logger.error(
          "Final failure loading recent assets for account",
          addressNetwork,
          err
        )
      }
      return Promise.resolve()
    }

    if (addressNetwork.network.family === "POKT") {
      try {
        const oldest = await this.db.getOldestAccountAssetTransferLookup(
          addressNetwork
        )
        const newest = await this.db.getNewestAccountAssetTransferLookup(
          addressNetwork
        )

        // load 100 historical asset transfers
        if (oldest === null && newest === null)
          return await this.loadAssetTransfers(addressNetwork)

        // load new txs
        const height = await this.getBlockHeight(addressNetwork.network)
        if (newest !== null && newest.valueOf() < height) {
          return await this.loadAssetTransfers(
            addressNetwork,
            newest,
            BigInt(height)
          )
        }
      } catch (err) {
        logger.error(
          "Failure loading recent assets for account",
          addressNetwork,
          err
        )
      }
    }
  }

  /**
   * Continue to load historic asset transfers, finding the oldest lookup and
   * searching for asset transfers before that block.
   *
   * @param addressNetwork The account whose asset transfers are being loaded.
   */
  private async loadHistoricEVMAssetTransfers(
    addressNetwork: AddressOnNetwork
  ): Promise<void> {
    if (addressNetwork.network.family === "EVM") {
      const oldest = await this.db.getOldestAccountAssetTransferLookup(
        addressNetwork
      )
      const newest = await this.db.getNewestAccountAssetTransferLookup(
        addressNetwork
      )
      if (newest !== null && oldest !== null) {
        const range = newest - oldest
        if (
          range <
          BLOCKS_FOR_EVM_TRANSACTION_HISTORY *
            HISTORIC_ASSET_TRANSFER_LOOKUPS_PER_ACCOUNT
        ) {
          // if we haven't hit 10x the single-call limit, pull another.
          await this.loadAssetTransfers(
            addressNetwork,
            oldest - BigInt(BLOCKS_FOR_EVM_TRANSACTION_HISTORY),
            oldest
          )
        }
      }
    }
  }

  /**
   * Load asset transfers from an account on a particular network within a
   * particular block range. Emit events for any transfers found, and look up
   * any related transactions and blocks.
   *
   * @param addressOnNetwork the address and network whose asset transfers we need
   */
  private async loadAssetTransfers(
    addressOnNetwork: AddressOnNetwork,
    startBlock?: bigint,
    endBlock?: bigint
  ): Promise<void> {
    if (addressOnNetwork.network.family === "EVM" && startBlock && endBlock) {
      const assetTransfers = await this.assetData.getAssetTransfers(
        addressOnNetwork,
        Number(startBlock),
        Number(endBlock)
      )

      await this.db.recordAccountAssetTransferLookup(
        addressOnNetwork,
        startBlock,
        endBlock
      )

      this.emitter.emit("assetTransfers", {
        addressNetwork: addressOnNetwork,
        assetTransfers,
      })

      const firstSeen = Date.now()
      /// send all found tx hashes into a queue to retrieve + cache
      assetTransfers.forEach((a) =>
        this.queueTransactionHashToRetrieve(
          addressOnNetwork.network,
          a.txHash,
          firstSeen
        )
      )
    }

    if (addressOnNetwork.network.family === "POKT") {
      const [txsSent, txsReceived, height] = await Promise.all([
        this.poktProvider.getTransactions(
          addressOnNetwork.address,
          false,
          false,
          1,
          100
        ),
        this.poktProvider.getTransactions(
          addressOnNetwork.address,
          true,
          false,
          1,
          100
        ),
        this.getBlockHeight(addressOnNetwork.network),
      ])
      const allTxs = [...txsSent, ...txsReceived].sort((a, b) => {
        return Number(b.height.toString()) - Number(a.height.toString())
      })

      const txsToRecord: PoktJSTransaction[] = []
      for (let tx of allTxs) {
        if (txsToRecord.length >= MAX_HISTORIC_ASSET_TRANSFERS_POCKET) break
        if (startBlock && tx.height <= startBlock) break
        if (tx.txResult.messageType !== "send") continue
        txsToRecord.push(tx)
      }

      if (!txsToRecord.length) {
        await this.db.recordAccountAssetTransferLookup(
          addressOnNetwork,
          BigInt(1),
          BigInt(height)
        )
        return
      }

      const firstSeen = Date.now()
      for (const pocketTx of txsToRecord) {
        const tx = transactionFromPoktTransaction(
          pocketTx,
          addressOnNetwork.network
        )
        await this.queueTransactionHashToRetrieve(
          addressOnNetwork.network,
          tx.hash,
          firstSeen,
          tx
        )
      }

      const startHeight =
        startBlock ?? txsToRecord[txsToRecord.length - 1].height.valueOf()
      const endHeight = endBlock ?? txsToRecord[0].height.valueOf()

      await this.db.recordAccountAssetTransferLookup(
        addressOnNetwork,
        startHeight,
        endHeight
      )
    }
  }

  private async handleRecentAssetTransferAlarm(): Promise<void> {
    const accountsToTrack = await this.getAccountsToTrack()
    await Promise.allSettled(
      accountsToTrack.map((an) => {
        // dont load EVM txs for now
        if (an.network.family === "POKT") {
          return this.loadRecentAssetTransfers(an)
        }
      })
    )
  }

  // private async handleHistoricEVMAssetTransferAlarm(): Promise<void> {
  //   const accountsToTrack = await this.getAccountsToTrack()

  //   await Promise.allSettled(
  //     accountsToTrack.map((an) => this.loadHistoricEVMAssetTransfers(an))
  //   )
  // }

  private async handleQueuedTransactionAlarm(): Promise<void> {
    const txsToRetrieve = await this.db.deQueueTransactionRetrieval(
      MAX_CONCURRENT_TRANSACTION_REQUESTS
    )
    for (const tx of txsToRetrieve) {
      const { network, hash, firstSeen, txData } = tx
      if (network.family === "EVM") {
        try {
          const result = await this.ethProvider.getTransaction(hash)

          const transaction = transactionFromEthersTransaction(result, network)

          // TODO make this provider specific
          await this.saveTransaction(transaction, "alchemy")

          if (!transaction.blockHash && !transaction.blockHeight) {
            this.subscribeToTransactionConfirmation(
              transaction.network,
              transaction
            )
          } else if (transaction.blockHash) {
            // Get relevant block data.
            await this.getBlockData(transaction.network, transaction.blockHash)
            // Retrieve gas used, status, etc
            this.retrieveTransactionReceipt(transaction.network, transaction)
          }
        } catch (error) {
          logger.error(`Error retrieving transaction ${hash}`, error)
          if (Date.now() <= firstSeen + TRANSACTION_CHECK_LIFETIME_MS) {
            this.queueTransactionHashToRetrieve(network, hash, firstSeen)
          } else {
            logger.warn(
              `Transaction ${hash} is too old to keep looking for it; treating ` +
                "it as expired."
            )

            this.db
              .getTransaction(network, hash)
              .then((existingTransaction) => {
                if (existingTransaction !== null) {
                  logger.debug(
                    "Found existing transaction for expired lookup; marking as " +
                      "failed if no other status exists."
                  )
                  this.saveTransaction(
                    // Don't override an already-persisted successful status with
                    // an expiration-based failed status, but do set status to
                    // failure if no transaction was seen.
                    { status: 0, ...existingTransaction },
                    "local"
                  )
                }
              })
          }
        }
      }

      if (network.family === "POKT" && txData) {
        try {
          const tx = txData as POKTTransaction
          const existingBlock = await this.db.getBlock(network, tx.height)
          // important to save the block before the tx so the block timestamp is readily available
          // should not load blocks and txs in parallel so the UI loads the most recent txs first and populates down
          if (!existingBlock) {
            await this.getBlockData(network, tx.height.toString())
          }
          await this.saveTransaction(tx, "local")
        } catch (error) {
          logger.error(`Error retrieving transaction ${hash}`, error)
        }
      }
    }
  }

  /**
   * Save a transaction to the database and emit an event.
   *
   * @param transaction The transaction to save and emit. Uniqueness and
   *        ordering will be handled by the database.
   * @param dataSource Where the transaction was seen.
   */
  private async saveTransaction(
    transaction: AnyEVMTransaction | AnyPOKTTransaction,
    dataSource: "local" | "alchemy"
  ): Promise<void> {
    // Merge existing data into the updated transaction data. This handles
    // cases where an existing transaction has been enriched by e.g. a receipt,
    // and new data comes in.
    const existing = await this.db.getTransaction(
      transaction.network,
      transaction.hash
    )
    const finalTransaction = {
      ...existing,
      ...transaction,
    }

    let error: unknown = null
    try {
      await this.db.addOrUpdateTransaction(
        {
          // Don't lose fields the existing transaction has pulled, e.g. from a
          // transaction receipt.
          ...existing,
          ...finalTransaction,
        },
        dataSource
      )
    } catch (err) {
      error = err
      logger.error(`Error saving tx ${finalTransaction}`, error)
    }
    try {
      if (finalTransaction.network.family === "EVM") {
        const fTx = finalTransaction as AnyEVMTransaction
        const accounts = await this.getAccountsToTrack()

        const forAccounts = accounts
          .filter(
            ({ address }) =>
              sameEVMAddress(fTx.from, address) ||
              sameEVMAddress(fTx.to, address)
          )
          .map(({ address }) => {
            return normalizeEVMAddress(address)
          })

        // emit in a separate try so outside services still get the tx
        this.emitter.emit("transaction", {
          transaction: fTx,
          forAccounts,
        })
      }

      if (finalTransaction.network.family === "POKT") {
        const fTx = finalTransaction as AnyPOKTTransaction
        const accounts = await this.getAccountsToTrack()

        const forAccounts = accounts
          .filter(({ address }) => fTx.from == address || fTx.to == address)
          .map(({ address }) => {
            return normalizeAddress(address, fTx.network)
          })

        // emit in a separate try so outside services still get the tx
        this.emitter.emit("transaction", {
          transaction: fTx,
          forAccounts,
        })
      }
    } catch (err) {
      error = err
      logger.error(`Error emitting tx ${finalTransaction}`, error)
    }
    if (error) {
      throw error
    }
  }

  /**
   * Given a list of AddressOnNetwork objects, return only the ones that
   * are currently being tracked.
   */
  async filterTrackedAddressesOnNetworks(
    addressesOnNetworks: AddressOnNetwork[]
  ): Promise<AddressOnNetwork[]> {
    const accounts = await this.getAccountsToTrack()

    return addressesOnNetworks.filter(({ address, network }) =>
      accounts.some(
        ({ address: trackedAddress, network: trackedNetwork }) =>
          sameEVMAddress(trackedAddress, address) &&
          network.name === trackedNetwork.name
      )
    )
  }

  /**
   * Watch a network for new blocks, saving each to the database and emitting an
   * event. Re-orgs are currently ignored.
   *
   * @param network The EVM network to watch.
   */
  private async subscribeToNewHeads(
    network: EVMNetwork | POKTNetwork
  ): Promise<void> {
    if (network.family === "EVM") {
      // TODO look up provider network properly
      // eslint-disable-next-line no-underscore-dangle
      await this.ethProvider.subscribe(
        "newHeadsSubscriptionID",
        ["newHeads"],
        async (result: unknown) => {
          // add new head to database
          const block = blockFromWebsocketBlock(network, result)
          await this.db.addBlock(block)
          // emit the new block, don't wait to settle
          this.emitter.emit("block", block)
          // TODO if it matches a known blockheight and the difficulty is higher,
          // emit a reorg event
        }
      )
      this.subscribedNetworks.push({
        network,
        provider: this.ethProvider,
      })

      this.pollBlockPrices()
    }

    if (network.family === "POKT") {
      this.poktProvider.on("block", async (n) => {
        const blockResult = await this.poktProvider.getSkinnyBlock(n)
        const block = blockFromPoktBlock(network, blockResult)
        await this.db.addBlock(block)
        this.emitter.emit("block", block)
      })
    }
  }

  /**
   * Watch logs for an account's transactions on a particular network.
   *
   * @param addressOnNetwork The network and address to watch.
   */
  private async subscribeToAccountTransactions({
    address,
    network,
  }: AddressOnNetwork): Promise<void> {
    if (network.family === "EVM") {
      // TODO look up provider network properly
      await this.ethProvider.subscribeFullPendingTransactions(
        { address, network: network as EVMNetwork },
        async (transaction) => {
          // handle incoming transactions for an account
          try {
            const normalizedFromAddress = normalizeEVMAddress(transaction.from)

            // If this is an EVM chain, we're tracking the from address's
            // nonce, and the pending transaction has a higher nonce, update our
            // view of it. This helps reduce the number of times when a
            // transaction submitted outside of this wallet causes this wallet to
            // produce bad transactions with reused nonces.
            if (
              typeof network.chainID !== "undefined" &&
              typeof this.evmChainLastSeenNoncesByNormalizedAddress[
                network.chainID
              ]?.[normalizedFromAddress] !== "undefined" &&
              this.evmChainLastSeenNoncesByNormalizedAddress[network.chainID]?.[
                normalizedFromAddress
              ] <= transaction.nonce
            ) {
              this.evmChainLastSeenNoncesByNormalizedAddress[network.chainID][
                normalizedFromAddress
              ] = transaction.nonce
            }
            await this.saveTransaction(transaction, "alchemy")

            // Wait for confirmation/receipt information.
            this.subscribeToTransactionConfirmation(network, transaction)
          } catch (error) {
            logger.error(`Error saving tx: ${transaction}`, error)
          }
        }
      )

      this.subscribedAccounts.push({
        account: address,
        provider: this.ethProvider,
      })
    }

    // TODO: v0.2.0 add POKT network family transaction subscribing
  }

  /**
   * Track an pending transaction's confirmation status, saving any updates to
   * the database and informing subscribers via the emitter.
   *
   * @param network the EVM network we're interested in
   * @param transaction the unconfirmed transaction we're interested in
   */
  private async subscribeToTransactionConfirmation(
    network: EVMNetwork | POKTNetwork,
    transaction: AnyEVMTransaction | POKTTransaction
  ): Promise<void> {
    if (network.family === "EVM") {
      this.ethProvider.once(
        transaction.hash,
        (confirmedReceipt: TransactionReceipt) => {
          this.saveTransaction(
            enrichTransactionWithReceipt(
              transaction as AnyEVMTransaction,
              confirmedReceipt
            ),
            "alchemy"
          )
        }
      )
      return
    }

    if (network.family === "POKT") {
      const tx = transaction as POKTTransaction
      const listener = (poktNetworkTransaction: PoktJSTransaction) => {
        if (poktNetworkTransaction && poktNetworkTransaction.height) {
          this.poktProvider.off(tx.hash, listener)
          this.saveTransaction(
            transactionFromPoktTransaction(
              poktNetworkTransaction,
              network,
              tx.targetHeight
            ),
            "local"
          )
        } else {
          this.saveTransaction(
            {
              ...tx,
              targetHeight: tx.targetHeight + 1,
            },
            "local"
          )
        }
      }
      this.poktProvider.on(tx.hash, listener)
      return
    }
  }

  /**
   * Retrieve a confirmed transaction's transaction receipt, saving the results.
   *
   * @param network the EVM network we're interested in
   * @param transaction the confirmed transaction we're interested in
   */
  private async retrieveTransactionReceipt(
    network: EVMNetwork,
    transaction: AnyEVMTransaction
  ): Promise<void> {
    if (network.family === "EVM") {
      const receipt = await this.ethProvider.getTransactionReceipt(
        transaction.hash
      )
      await this.saveTransaction(
        enrichTransactionWithReceipt(transaction, receipt),
        "alchemy"
      )
      return
    }
  }

  private configureProviders(addressNetwork: AddressOnNetwork) {
    const { network } = addressNetwork
    // always default to mainnets
    this.ethereumNetwork = ETHEREUM
    this.pocketNetwork = POCKET
    if (network.family === "EVM") {
      this.ethereumNetwork = network
    } else if (network.family === "POKT") {
      this.pocketNetwork = network
    }

    if (this.providers) {
      this.cleanupProvider(this.providers[network.family])
    }

    return {
      [NetworkFamily.EVM]:
        process.env.NODE_ENV === "development" &&
        this.ethereumNetwork!.chainID === FORK.chainID
          ? // allow for customizing the ethereum provider URL in development
            new SerialFallbackProvider(
              this.ethereumNetwork!,
              () => new WebSocketProvider("ws://localhost:8545"),
              () => new JsonRpcProvider(process.env.MAINNET_FORK_URL)
            )
          : new SerialFallbackProvider(
              this.ethereumNetwork!,
              () =>
                new AlchemyWebSocketProvider(
                  getEthNetwork(Number(this.ethereumNetwork!.chainID)),
                  ALCHEMY_KEY
                ),
              () =>
                new AlchemyProvider(
                  getEthNetwork(Number(this.ethereumNetwork!.chainID)),
                  ALCHEMY_KEY
                )
            ),

      [NetworkFamily.POKT]: new PocketProvider(this.pocketNetwork?.rcpUrl),
    }
  }

  /**
   * Connects chain service to the address on network.
   */
  private async connectToAddressNetwork(addressNetwork: AddressOnNetwork) {
    logger.debug("connecting to address network", addressNetwork)
    this.providers = this.configureProviders(addressNetwork)

    // POKT provider needs a kick to get going, restart it here
    if (addressNetwork.network.family === "POKT") {
      this.poktProvider.startService()
    }

    if (addressNetwork.network && addressNetwork.address) {
      this.subscribeToAccountTransactions(addressNetwork)
      this.getLatestBaseAccountBalance(addressNetwork)
      this.db
        .getNetworkPendingTransactions(addressNetwork.network)
        .then((pendingTransactions) => {
          pendingTransactions.forEach(({ hash, firstSeen }) => {
            logger.debug(
              `Queuing pending transaction ${hash} for status lookup.`
            )
            this.queueTransactionHashToRetrieve(
              addressNetwork.network,
              hash,
              firstSeen
            )
          })
        }),
        this.getLatestBlockHeightPendingTransactions(addressNetwork)
    }
  }

  /**
   * Gets latest block height for network and listens for new block heights.
   * Attempts to resubscribe to any pending transactions found in the database.
   */
  private async getLatestBlockHeightPendingTransactions(
    addressNetwork: AddressOnNetwork
  ) {
    return new Promise(async (resolve, reject) => {
      if (addressNetwork.network.family === "EVM")
        resolve(
          this.ethProvider!.getBlockNumber()
            .then(async (n) => {
              const result = await this.ethProvider!.getBlock(n)
              const block = blockFromEthersBlock(this.ethereumNetwork!, result)
              await this.db.addBlock(block)
            })
            .catch((e) => logger.error("Failed fetching eth block", e))
        )
      else if (addressNetwork.network.family === "POKT")
        resolve(
          this.poktProvider!.getBlockNumber()
            .then(async (height) => {
              const result = await this.poktProvider!.getSkinnyBlock(height)
              const block = blockFromPoktBlock(this.pocketNetwork!, result)
              await this.db.addBlock(block)
              const pendingTxs = (await this.db.getNetworkPendingTransactions(
                this.pocketNetwork!
              )) as POKTTransaction[]
              // Check pending tx for confirmation
              for (const tx of pendingTxs) {
                this.subscribeToTransactionConfirmation(this.pocketNetwork!, tx)
              }
            })
            .catch((e) => logger.error("Failed fetching pokt block", e))
        )
      else
        logger.error(
          "Unable to get latest block height and pending transactions"
        )
    }).then(() => {
      logger.debug("Subscribing to new heads", { addressNetwork })
      this.subscribeToNewHeads(addressNetwork.network)
    })
  }

  private cleanupProvider(provider: SerialFallbackProvider | PocketProvider) {
    provider.removeAllListeners()
    // FIXME: only remove subscribers to provider
    this.subscribedAccounts = []
    this.subscribedNetworks = []
  }
}
