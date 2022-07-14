import browser, { runtime } from "webextension-polyfill"
import { alias, wrapStore } from "webext-redux"
import { configureStore, isPlain, Middleware } from "@reduxjs/toolkit"
import devToolsEnhancer from "remote-redux-devtools"
import { PermissionRequest } from "@sendnodes/provider-bridge-shared"
import { decodeJSON, encodeJSON } from "./lib/utils"
import "./utils/emittery"

import {
  BaseService,
  ChainService,
  EnrichmentService,
  IndexingService,
  InternalEthereumProviderService,
  InternalPoktProviderService,
  KeyringService,
  NameService,
  PreferenceService,
  ProviderBridgeService,
  TelemetryService,
  ServiceCreatorFunction,
  LedgerService,
  SigningService,
} from "./services"

import {
  EIP712TypedData,
  HexString,
  KeyringTypes,
  ExportedPrivateKey,
} from "./types"
import {
  EVMNetwork,
  POKTNetwork,
  POKTTransaction,
  SignedEVMTransaction,
  SignedPOKTTransaction,
} from "./networks"
import { AccountBalance, AddressOnMaybeNetwork, AddressOnNetwork, NameOnNetwork } from "./accounts"

import rootReducer from "./redux-slices"
import {
  loadAccount,
  updateAccountBalance,
  updateENSName,
  updateENSAvatar,
  AccountData,
  resetAccountsData,
} from "./redux-slices/accounts"
import { activityEncountered } from "./redux-slices/activities"
import { assetsLoaded, newPricePoint } from "./redux-slices/assets"
import {
  emitter as keyringSliceEmitter,
  keyringLocked,
  keyringUnlocked,
  updateKeyrings,
  EventNames as KeyringSliceEvents,
  keyringUnlockedFailed,
  GenerateKeyringResponse,
} from "./redux-slices/keyrings"
import { blockSeen } from "./redux-slices/networks"
import {
  initializationLoadingTimeHitLimit,
  emitter as uiSliceEmitter,
  setDefaultWallet,
  setSelectedAccount,
  setNewSelectedAccount,
  setSnackbarMessage,
  EventNames as UIEventNames,
} from "./redux-slices/ui"
import {
  estimatedFeesPerGas,
  emitter as transactionConstructionSliceEmitter,
  transactionRequest,
  updateTransactionOptions,
  clearTransactionState,
  selectDefaultNetworkFeeSettings,
  TransactionConstructionStatus,
  rejectTransactionSignature,
  transactionSigned,
  EventNames as TransactionConstructionEventNames,
} from "./redux-slices/transaction-construction"
import { allAliases } from "./redux-slices/utils"
import {
  requestPermission,
  emitter as providerBridgeSliceEmitter,
  initializeAllowedPages,
} from "./redux-slices/dapp-permission"
import logger from "./lib/logger"
import {
  rejectDataSignature,
  clearSigningState,
  signedTypedData,
  signedData as signedDataAction,
  signingSliceEmitter,
  typedDataRequest,
  signDataRequest,
} from "./redux-slices/signing"

import {
  SigningMethod,
  SignTypedDataRequest,
  SignDataRequest,
} from "./utils/signing"
import {
  resetLedgerState,
  setDeviceConnectionStatus,
  setUsbDeviceCount,
} from "./redux-slices/ledger"
import { ETHEREUM, POCKET } from "./constants"
import { SignatureResponse, TXSignatureResponse } from "./services/signing"
import {
  EnrichedEVMTransactionSignatureRequest,
  EnrichedPOKTTransactionRequest,
} from "./services/enrichment"
import { trackEvent } from "./lib/analytics"
import { TransactionResponse } from "@ethersproject/abstract-provider"
import { KeyringEvents } from "./services/keyring"
import { KeyType } from "@sendnodes/hd-keyring"
import { ChainEventNames } from "./services/chain"
import { EventNames as PreferencesEventNames } from "./services/preferences"

// This sanitizer runs on store and action data before serializing for remote
// redux devtools. The goal is to end up with an object that is directly
// JSON-serializable and deserializable; the remote end will display the
// resulting objects without additional processing or decoding logic.
const devToolsSanitizer = (input: unknown) => {
  switch (typeof input) {
    // We can make use of encodeJSON instead of recursively looping through
    // the input
    case "bigint":
    case "object":
      return JSON.parse(encodeJSON(input))
    // We only need to sanitize bigints and objects that may or may not contain
    // them.
    default:
      return input
  }
}

// The version of persisted Redux state the extension is expecting. Any previous
// state without this version, or with a lower version, ought to be migrated.
const REDUX_STATE_VERSION = 6

type Migration = (prevState: Record<string, unknown>) => Record<string, unknown>

// An object mapping a version number to a state migration. Each migration for
// version n is expected to take a state consistent with version n-1, and return
// state consistent with version n.
const REDUX_MIGRATIONS: { [version: number]: Migration } = {
  2: (prevState: Record<string, unknown>) => {
    // Migrate the old currentAccount SelectedAccount type to a bare
    // selectedAccount AddressNetwork type. Note the avoidance of imported types
    // so this migration will work in the future, regardless of other code changes
    type BroadAddressNetwork = {
      address: string
      network: Record<string, unknown>
    }
    type OldState = {
      ui: {
        currentAccount?: {
          addressNetwork: BroadAddressNetwork
          truncatedAddress: string
        }
      }
    }
    const newState = { ...prevState }
    const addressNetwork = (prevState as OldState)?.ui?.currentAccount
      ?.addressNetwork
    delete (newState as OldState)?.ui?.currentAccount
    newState.selectedAccount = addressNetwork as BroadAddressNetwork
    return newState
  },
  3: (prevState: Record<string, unknown>) => {
    const { assets, ...newState } = prevState

    // Clear assets collection; these should be immediately repopulated by the
    // IndexingService in startService.
    newState.assets = []

    return newState
  },
  4: (prevState: Record<string, unknown>) => {
    // Migrate the ETH-only block data in store.accounts.blocks[blockHeight] to
    // a new networks slice. Block data is now network-specific, keyed by EVM
    // chainID in store.networks.networkData[chainId].blocks
    type OldState = {
      account?: {
        blocks?: { [blockHeight: number]: unknown }
      }
    }
    type NetworkState = {
      evm: {
        [chainID: string]: {
          blockHeight: number | null
          blocks: {
            [blockHeight: number]: unknown
          }
        }
      }
    }

    const oldState = prevState as OldState

    const networks: NetworkState = {
      evm: {
        "1": {
          blocks: { ...oldState.account?.blocks },
          blockHeight:
            Math.max(
              ...Object.keys(oldState.account?.blocks ?? {}).map((s) =>
                parseInt(s, 10)
              )
            ) || null,
        },
      },
    }

    const { blocks, ...oldStateAccountWithoutBlocks } = oldState.account ?? {
      blocks: undefined,
    }

    return {
      ...prevState,
      // Drop blocks from account slice.
      account: oldStateAccountWithoutBlocks,
      // Add new networks slice data.
      networks,
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  5: (prevState: any) => {
    const { ...newState } = prevState
    newState.keyrings.keyringMetadata = {}

    return newState
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  6: (prevState: any) => {
    const { ...newState } = prevState
    newState.ledger.isArbitraryDataSigningEnabled = false

    return newState
  }
}

// Migrate a previous version of the Redux state to that expected by the current
// code base.
function migrateReduxState(
  previousState: Record<string, unknown>,
  previousVersion?: number
): Record<string, unknown> {
  const resolvedVersion = previousVersion ?? 1
  let migratedState: Record<string, unknown> = previousState

  if (resolvedVersion < REDUX_STATE_VERSION) {
    const outstandingMigrations = Object.entries(REDUX_MIGRATIONS)
      .sort()
      .filter(([version]) => parseInt(version, 10) > resolvedVersion)
      .map(([, migration]) => migration)
    migratedState = outstandingMigrations.reduce(
      (state: Record<string, unknown>, migration: Migration) => {
        return migration(state)
      },
      migratedState
    )
  }

  return migratedState
}

const reduxCache: Middleware = (store) => (next) => (action) => {
  const result = next(action)
  const state = store.getState()
  if (process.env.WRITE_REDUX_CACHE === "true") {
    // Browser extension storage supports JSON natively, despite that we have
    // to stringify to preserve BigInts
    browser.storage.local.set({
      state: encodeJSON(state),
      version: REDUX_STATE_VERSION,
    })
  }

  return result
}

// Declared out here so ReduxStoreType can be used in Main.store type
// declaration.
const initializeStore = (preloadedState = {}, main: Main) =>
  configureStore({
    preloadedState,
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({
        serializableCheck: {
          isSerializable: (value: unknown) =>
            isPlain(value) || typeof value === "bigint",
        },
        thunk: { extraArgument: { main } },
      })

      // It might be tempting to use an array with `...` destructuring, but
      // unfortunately this fails to preserve important type information from
      // `getDefaultMiddleware`. `push` and `pull` preserve the type
      // information in `getDefaultMiddleware`, including adjustments to the
      // dispatch function type, but as a tradeoff nothing added this way can
      // further modify the type signature. For now, that's fine, as these
      // middlewares don't change acceptable dispatch types.
      //
      // Process aliases before all other middleware, and cache the redux store
      // after all middleware gets a chance to run.
      middleware.unshift(alias(allAliases))
      middleware.push(reduxCache)

      return middleware
    },
    devTools: false,
    enhancers:
      process.env.NODE_ENV === "development"
        ? [
            devToolsEnhancer({
              hostname: "localhost",
              port: 8000,
              realtime: true,
              actionSanitizer: devToolsSanitizer,
              stateSanitizer: devToolsSanitizer,
            }),
          ]
        : [],
  })

type ReduxStoreType = ReturnType<typeof initializeStore>

export const popupMonitorPortName = "popup-monitor"

// TODO Rename ReduxService or CoordinationService, move to services/, etc.
export default class Main extends BaseService<never> {
  /**
   * The redux store for the wallet core. Note that the redux store is used to
   * render the UI (via webext-redux), but it is _not_ the source of truth.
   * Services interact with the various external and internal components and
   * create persisted state, and the redux store is simply a view onto those
   * pieces of canonical state.
   */
  store: ReduxStoreType

  static create: ServiceCreatorFunction<never, Main, []> = async () => {
    const preferenceService = PreferenceService.create()
    const chainService = ChainService.create(preferenceService)
    const indexingService = IndexingService.create(
      preferenceService,
      chainService
    )
    const nameService = NameService.create(chainService)
    const enrichmentService = EnrichmentService.create(
      chainService,
      indexingService,
      nameService
    )
    const keyringService = KeyringService.create()
    const internalEthereumProviderService =
      InternalEthereumProviderService.create(chainService, preferenceService)
    const internalPoktProviderService = InternalPoktProviderService.create(
      chainService,
      preferenceService
    )
    const providerBridgeService = ProviderBridgeService.create(
      internalEthereumProviderService,
      internalPoktProviderService,
      preferenceService
    )

    const telemetryService = TelemetryService.create()

    const ledgerService = LedgerService.create()

    const signingService = SigningService.create(
      keyringService,
      ledgerService,
      chainService
    )

    let savedReduxState = {}
    const { state, version } = await browser.storage.local.get([
      "state",
      "version",
    ])

    if (state) {
      const restoredState = decodeJSON(state)
      if (typeof restoredState === "object" && restoredState !== null) {
        // If someone managed to sneak JSON that decodes to typeof "object"
        // but isn't a Record<string, unknown>, there is a very large
        // problem...
        savedReduxState = migrateReduxState(
          restoredState as Record<string, unknown>,
          version || undefined
        )
      } else {
        throw new Error(`Unexpected JSON persisted for state: ${state}`)
      }
    }

    return new this(
      savedReduxState,
      await preferenceService,
      await chainService,
      await enrichmentService,
      await indexingService,
      await keyringService,
      await nameService,
      await internalEthereumProviderService,
      await internalPoktProviderService,
      await providerBridgeService,
      await telemetryService,
      await ledgerService,
      await signingService
    )
  }

  private constructor(
    savedReduxState: Record<string, unknown>,
    /**
     * A promise to the preference service, a dependency for most other services.
     * The promise will be resolved when the service is initialized.
     */
    private preferenceService: PreferenceService,
    /**
     * A promise to the chain service, keeping track of base asset balances,
     * transactions, and network status. The promise will be resolved when the
     * service is initialized.
     */
    private chainService: ChainService,
    /**
     *
     */
    private enrichmentService: EnrichmentService,
    /**
     * A promise to the indexing service, keeping track of token balances and
     * prices. The promise will be resolved when the service is initialized.
     */
    private indexingService: IndexingService,
    /**
     * A promise to the keyring service, which stores key material, derives
     * accounts, and signs messagees and transactions. The promise will be
     * resolved when the service is initialized.
     */
    private keyringService: KeyringService,
    /**
     * A promise to the name service, responsible for resolving names to
     * addresses and content.
     */
    private nameService: NameService,
    /**
     * A promise to the internal ethereum provider service, which acts as
     * web3 / ethereum provider for the internal and external dApps to use.
     */
    private internalEthereumProviderService: InternalEthereumProviderService,
    /**
     * A promise to the internal pokt provider service, which acts as
     * web3 / pokt provider for the internal and external dApps to use.
     */
    private internalPoktProviderService: InternalPoktProviderService,
    /**
     * A promise to the provider bridge service, handling and validating
     * the communication coming from dApps according to EIP-1193 and some tribal
     * knowledge.
     */
    private providerBridgeService: ProviderBridgeService,
    /**
     * A promise to the telemetry service, which keeps track of extension
     * storage usage and (eventually) other statistics.
     */
    private telemetryService: TelemetryService,

    /**
     * A promise to the Ledger service, handling the communication
     * with attached Ledger device according to ledgerjs examples and some
     * tribal knowledge. ;)
     */
    private ledgerService: LedgerService,

    /**
     * A promise to the signing service which will route operations between the UI
     * and the exact signing services.
     */
    private signingService: SigningService
  ) {
    super({})

    // Start up the redux store and set it up for proxying.
    this.store = initializeStore(savedReduxState, this)
    logger.debug("initializing store", { state: this.store.getState() })
    wrapStore(this.store, {
      serializer: encodeJSON,
      deserializer: decodeJSON,
      dispatchResponder: async (
        dispatchResult: Promise<unknown>,
        send: (param: { error: string | null; value: unknown | null }) => void
      ) => {
        try {
          send({
            error: null,
            value: encodeJSON(await dispatchResult),
          })
        } catch (error) {
          logger.error(
            "Error awaiting and dispatching redux store result: ",
            error
          )
          send({
            error: encodeJSON(error),
            value: null,
          })
        }
      },
    })
    this.initializeRedux()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService()

    const servicesToBeStarted = [
      this.preferenceService.startService(),
      this.chainService.startService(),
      this.indexingService.startService(),
      this.enrichmentService.startService(),
      this.keyringService.startService(),
      this.nameService.startService(),
      this.internalEthereumProviderService.startService(),
      this.internalPoktProviderService.startService(),
      this.providerBridgeService.startService(),
      this.telemetryService.startService(),
      this.ledgerService.startService(),
      this.signingService.startService(),
    ]

    await Promise.all(servicesToBeStarted)
  }

  protected async internalStopService(): Promise<void> {
    const servicesToBeStopped = [
      this.preferenceService.stopService(),
      this.chainService.stopService(),
      this.indexingService.stopService(),
      this.enrichmentService.stopService(),
      this.keyringService.stopService(),
      this.nameService.stopService(),
      this.internalEthereumProviderService.stopService(),
      this.internalPoktProviderService.stopService(),
      this.providerBridgeService.stopService(),
      this.telemetryService.stopService(),
      this.ledgerService.stopService(),
      this.signingService.stopService(),
    ]

    await Promise.all(servicesToBeStopped)
    await super.internalStopService()
  }

  async initializeRedux(): Promise<void> {
    this.connectIndexingService()
    this.connectKeyringService()
    this.connectNameService()
    this.connectInternalEthereumProviderService()
    this.connectInternalPoktProviderService()
    this.connectProviderBridgeService()
    this.connectPreferenceService()
    this.connectEnrichmentService()
    this.connectTelemetryService()
    this.connectLedgerService()
    this.connectSigningService()

    await this.connectChainService()

    // FIXME Should no longer be necessary once transaction queueing enters the
    // FIXME picture.
    this.store.dispatch(
      clearTransactionState(TransactionConstructionStatus.Idle)
    )

    // no longer needed now that webext-redux automatically reconnects ports
    // this.connectPopupMonitor()
  }

  async addAccount(addressNetwork: AddressOnNetwork): Promise<void> {
    await this.chainService.addAccountToTrack(addressNetwork)
  }

  async removeAccount(
    addressOnNetwork: AddressOnMaybeNetwork,
    signingMethod: SigningMethod
  ): Promise<void> {
    const { address } = addressOnNetwork
    await this.signingService.removeAccount(address, signingMethod)
    await this.chainService.removeAccountToTrack(address)
    const defaultSelectedAccount =
      await this.preferenceService.getSelectedAccount()
    if (defaultSelectedAccount.address === address) {
      const accountsData = this.store.getState().account.accountsData
      const newAddress = Object.keys(accountsData).find((accountAddress) => {
        if (
          accountAddress !== address &&
          accountsData[accountAddress] &&
          accountsData[accountAddress] !== "loading"
        ) {
          return true
        }
        return false
      })
      const newAddressOnNetwork = {
        address: newAddress ?? "",
        // defaults to POCKET, but probably should be null
        network: ((accountsData[newAddress ?? ""] as AccountData)?.network as
          | POKTNetwork
          | EVMNetwork) ?? POCKET,
      }
      await this.preferenceService.setSelectedAccount(newAddressOnNetwork)
      await this.store.dispatch(setNewSelectedAccount(newAddressOnNetwork))
    }
  }

  async importLedgerAccounts(
    accounts: Array<{
      path: string
      address: string
    }>
  ): Promise<void> {
    for (let i = 0; i < accounts.length; i += 1) {
      const { path, address } = accounts[i]

      // eslint-disable-next-line no-await-in-loop
      await this.ledgerService.saveAddress(path, address)

      // TODO: do we need to dynamically decide address network
      const addressNetwork = {
        address,
        network: ETHEREUM,
      }
      this.store.dispatch(
        loadAccount({ address, network: addressNetwork.network })
      )
      // eslint-disable-next-line no-await-in-loop
      await this.chainService.addAccountToTrack(addressNetwork)
      this.store.dispatch(setNewSelectedAccount(addressNetwork))
    }
  }

  async deriveLedgerAddress(path: string): Promise<string> {
    return this.signingService.deriveAddress({
      type: "ledger",
      accountID: path,
    })
  }

  async connectLedger(): Promise<string | null> {
    return this.ledgerService.refreshConnectedLedger()
  }

  async getAccountEthBalanceUncached(address: string): Promise<bigint> {
    const amountBigNumber = await this.chainService.ethProvider.getBalance(
      address
    )
    return amountBigNumber.toBigInt()
  }

  async connectChainService(): Promise<void> {
    // Wire up chain service to account slice.
    this.chainService.emitter.on(
      "accountsWithBalances",
      (accountWithBalance) => {
        // The first account balance update will transition the account to loading.
        this.store.dispatch(updateAccountBalance(accountWithBalance))
      }
    )

    this.chainService.emitter.on("block", (block) => {
      this.store.dispatch(blockSeen(block))
    })

    this.chainService.emitter.on("transactionSend", async (txResponse) => {
      this.store.dispatch(
        setSnackbarMessage("Transaction signed, broadcasting...")
      )

      if ("txMsg" in txResponse) {
        const tx = txResponse as POKTTransaction

        await trackEvent({
          action: "transaction_send",
          label: "amount",
          value: tx.txMsg.value.amount.toString(),
        })
      } else {
        const tx = txResponse as TransactionResponse

        await trackEvent({
          action: "transaction_send",
          label: "amount",
          value: tx.value.toString(),
        })
      }

      // clear the transaction constructions status
      this.store.dispatch(
        clearTransactionState(TransactionConstructionStatus.Idle)
      )
    })

    this.chainService.emitter.on("transactionSendFailure", async (error) => {
      this.store.dispatch(
        setSnackbarMessage("Transaction failed to broadcast. " + error)
      )
      await trackEvent({
        action: "transaction_failed",
        label: "error",
        value: error ? (error as Error).toString() : "",
      })
    })

    transactionConstructionSliceEmitter.on(
      TransactionConstructionEventNames.UPDATE_OPTIONS,
      async (options) => {
        if ("network" in options && options.network.family === "POKT") {
          const opts = options as EnrichedPOKTTransactionRequest
          this.store.dispatch(
            transactionRequest({
              transactionRequest: opts,
              transactionLikelyFails: false,
            })
          )
        } else {
          const opts = options as EnrichedEVMTransactionSignatureRequest
          const {
            values: { maxFeePerGas, maxPriorityFeePerGas },
          } = selectDefaultNetworkFeeSettings(this.store.getState())

          const { transactionRequest: populatedRequest, gasEstimationError } =
            await this.chainService.populatePartialEVMTransactionRequest(
              this.chainService.ethereumNetwork!,
              {
                ...opts,
                maxFeePerGas: opts.maxFeePerGas ?? maxFeePerGas,
                maxPriorityFeePerGas:
                  opts.maxPriorityFeePerGas ?? maxPriorityFeePerGas,
              }
            )

          const { annotation } =
            await this.enrichmentService.enrichTransactionSignature(
              this.chainService.ethereumNetwork!,
              populatedRequest,
              2 /* TODO desiredDecimals should be configurable */
            )
          const enrichedPopulatedRequest = { ...populatedRequest, annotation }

          if (typeof gasEstimationError === "undefined") {
            this.store.dispatch(
              transactionRequest({
                transactionRequest: enrichedPopulatedRequest,
                transactionLikelyFails: false,
              })
            )
          } else {
            this.store.dispatch(
              transactionRequest({
                transactionRequest: enrichedPopulatedRequest,
                transactionLikelyFails: true,
              })
            )
          }
        }
      }
    )

    transactionConstructionSliceEmitter.on(
      TransactionConstructionEventNames.BROADCAST_SIGNED_TRANSACTION,
      async (transaction: SignedEVMTransaction | SignedPOKTTransaction) => {
        this.chainService.broadcastSignedTransaction(transaction)
      }
    )

    transactionConstructionSliceEmitter.on(
      TransactionConstructionEventNames.REQUEST_SIGNATURE,
      async ({ transaction, method }) => {
        try {
          const signedTransactionResult =
            await this.signingService.signTransaction(transaction, method)
          await this.store.dispatch(transactionSigned(signedTransactionResult))
        } catch (exception) {
          logger.error("Error signing transaction", exception)
          this.store.dispatch(
            clearTransactionState(TransactionConstructionStatus.Idle)
          )
        }
      }
    )
    signingSliceEmitter.on(
      "requestSignTypedData",
      async ({
        typedData,
        account,
        signingMethod,
      }: {
        typedData: EIP712TypedData
        account: HexString
        signingMethod: SigningMethod
      }) => {
        try {
          const signedData = await this.signingService.signTypedData({
            typedData,
            account,
            signingMethod,
          })
          this.store.dispatch(signedTypedData(signedData))
        } catch (err) {
          logger.error("Error signing typed data", typedData, "error: ", err)
          this.store.dispatch(clearSigningState)
        }
      }
    )
    signingSliceEmitter.on(
      "requestSignData",
      async ({ rawSigningData, account, signingMethod }) => {
        const signedData = await this.signingService.signData(
          account,
          rawSigningData,
          signingMethod
        )
        this.store.dispatch(signedDataAction(signedData))
      }
    )

    // Set up initial state.
   this.preferenceService.emitter.on(PreferencesEventNames.SELECTED_ACCOUNT_CHANGED, async ({ network: newNetwork }) => {
      this.store.dispatch(resetAccountsData())
    } )

    this.chainService.emitter.on(
      ChainEventNames.BLOCK_PRICES,
      (blockPrices) => {
        this.store.dispatch(estimatedFeesPerGas(blockPrices))
      }
    )

    // Report on transactions for basic activity. Fancier stuff is handled via
    // connectEnrichmentService
    this.chainService.emitter.on("transaction", async (transactionInfo) => {
      this.store.dispatch(activityEncountered(transactionInfo))
    })
  }

  async connectNameService(): Promise<void> {
    this.nameService.emitter.on(
      "resolvedName",
      async ({ from: { addressNetwork }, resolved: { name } }) => {
        this.store.dispatch(updateENSName({ ...addressNetwork, name }))
      }
    )
    this.nameService.emitter.on(
      "resolvedAvatar",
      async ({ from: { addressNetwork }, resolved: { avatar } }) => {
        this.store.dispatch(
          updateENSAvatar({ ...addressNetwork, avatar: avatar.toString() })
        )
      }
    )
  }

  async connectIndexingService(): Promise<void> {
    this.indexingService.emitter.on(
      "accountsWithBalances",
      async (accountsWithBalances) => {
        const assetsToTrack = await this.indexingService.getAssetsToTrack()

        const filteredBalancesToDispatch: AccountBalance[] = []

        accountsWithBalances.forEach((balance) => {
          // TODO support multi-network assets
          const doesThisBalanceHaveAnAlreadyTrackedAsset =
            !!assetsToTrack.filter(
              (t) => t.symbol === balance.assetAmount.asset.symbol
            )[0]

          if (
            balance.assetAmount.amount > 0 ||
            doesThisBalanceHaveAnAlreadyTrackedAsset
          ) {
            filteredBalancesToDispatch.push(balance)
          }
        })

        this.store.dispatch(updateAccountBalance(filteredBalancesToDispatch))
      }
    )

    this.indexingService.emitter.on("assets", (assets) => {
      this.store.dispatch(assetsLoaded(assets))
    })

    this.indexingService.emitter.on("price", (pricePoint) => {
      this.store.dispatch(newPricePoint(pricePoint))
    })
  }

  async connectEnrichmentService(): Promise<void> {
    this.enrichmentService.emitter.on(
      "enrichedEVMTransaction",
      async (transactionData) => {
        this.indexingService.notifyEnrichedTransaction(
          transactionData.transaction
        )
        this.store.dispatch(activityEncountered(transactionData))
      }
    )
  }

  async connectSigningService(): Promise<void> {
    this.keyringService.emitter.on(KeyringEvents.ADDRESS, ({ address }) =>
      this.signingService.addTrackedAddress(address, "keyring")
    )

    this.ledgerService.emitter.on(KeyringEvents.ADDRESS, ({ address }) =>
      this.signingService.addTrackedAddress(address, "ledger")
    )
  }

  async connectLedgerService(): Promise<void> {
    this.store.dispatch(resetLedgerState())

    this.ledgerService.emitter.on("connected", ({ id, metadata }) => {
      this.store.dispatch(
        setDeviceConnectionStatus({
          deviceID: id,
          status: "available",
          isArbitraryDataSigningEnabled: metadata.isArbitraryDataSigningEnabled,
        })
      )
    })

    this.ledgerService.emitter.on("disconnected", ({ id }) => {
      this.store.dispatch(
        setDeviceConnectionStatus({
          deviceID: id,
          status: "disconnected",
          isArbitraryDataSigningEnabled: false /* dummy */,
        })
      )
    })

    this.ledgerService.emitter.on("usbDeviceCount", (usbDeviceCount) => {
      this.store.dispatch(setUsbDeviceCount({ usbDeviceCount }))
    })
  }

  async connectKeyringService(): Promise<void> {
    this.keyringService.emitter.on(KeyringEvents.KEYRINGS, (keyrings) => {
      this.store.dispatch(updateKeyrings(keyrings))
    })

    this.keyringService.emitter.on(
      KeyringEvents.ADDRESS,
      ({ address, keyType }) => {
        const network =
          keyType === KeyType.SECP256K1
            ? ETHEREUM
            : POCKET

        // Mark as loading and wire things up.
        this.store.dispatch(loadAccount({ address, network }))
        this.chainService.addAccountToTrack({
          address,
          network,
        })
      }
    )

    this.keyringService.emitter.on(KeyringEvents.LOCKED, async (isLocked) => {
      if (isLocked) {
        this.store.dispatch(keyringLocked())
        await trackEvent({
          action: "keyring_lock",
          session_control: "end",
        })
      } else {
        this.store.dispatch(keyringUnlocked())
        await trackEvent({
          action: "keyring_unlock",
          session_control: "start",
        })
      }
    })

    keyringSliceEmitter.on(
      KeyringSliceEvents.CREATE_PASSWORD,
      async (password) => {
        await this.keyringService.unlock(password, true)
      }
    )

    keyringSliceEmitter.on(
      KeyringSliceEvents.UNLOCK_KEYRINGS,
      async (password) => {
        if (!(await this.keyringService.unlock(password))) {
          this.store.dispatch(keyringUnlockedFailed())
        }
      }
    )

    keyringSliceEmitter.on(KeyringSliceEvents.LOCK_KEYRINGS, async () => {
      await this.keyringService.lock()
    })

    keyringSliceEmitter.on(
      KeyringSliceEvents.DERIVE_ADDRESS,
      async (keyringID) => {
        await this.signingService.deriveAddress({
          type: "keyring",
          accountID: keyringID,
        })
        await trackEvent({
          action: "derive_address",
        })
      }
    )

    keyringSliceEmitter.on(
      KeyringSliceEvents.GENERATE_NEW_KEYRING,
      async () => {
        // TODO move unlocking to a reasonable place in the initialization flow
        const generated: {
          id: string
          mnemonic: string[]
        } = await this.keyringService.generateNewKeyring(
          KeyringTypes.mnemonicBIP39S256
        )

        const msg: GenerateKeyringResponse = {
          [KeyringSliceEvents.GENERATE_NEW_KEYRING]: generated,
        }
        browser.runtime.sendMessage(msg)
      }
    )

    keyringSliceEmitter.on(
      KeyringSliceEvents.IMPORT_KEYRING,
      async ({ mnemonic, path, source }) => {
        // Set the selected account as the first address emitted during import
        // use the UI currently selcted network
        this.keyringService.emitter
          .once(KeyringEvents.ADDRESS)
          .then(async ({ address }) => {
            
            // so dumb but decide network by 0x
            const network = address.match(/^0x/) ? ETHEREUM : POCKET

            // FIXME: v0.2.0 once imported use the currect selected address and account instead of the first address emitted
            await this.store.dispatch(
              setNewSelectedAccount({
                address,
                network,
              })
            )

            await trackEvent({
              action: "import_keyring",
            })
          })

        await this.keyringService.importKeyring(mnemonic, source, path)
      }
    )

    keyringSliceEmitter.on(
      KeyringSliceEvents.IMPORT_PRIVATE_KEY,
      async ({ privateKey, keyType }) => {
        // Set the selected account as the first address emitted during import
        // use the UI currently selcted network
        this.keyringService.emitter
          .once(KeyringEvents.ADDRESS)
          .then(async ({ address }) => {
            // so dumb but decide network by 0x
            const network = address.match(/^0x/) ? ETHEREUM : POCKET

            await this.store.dispatch(
              setNewSelectedAccount({
                address,
                network,
              })
            )

            await trackEvent({
              action: "import_private_key",
            })
          })

        await this.keyringService.importPrivateKey(privateKey, keyType)
      }
    )

    keyringSliceEmitter.on(
      KeyringSliceEvents.EXPORT_PRIVATE_KEY,
      async ({ password, address }) => {
        const resp: ExportedPrivateKey = {
          exportedPrivateKey: {
            error: false,
          },
        }
        if (resp.exportedPrivateKey) {
          const success = await this.keyringService.passwordChallenge(password)
          if (!success) {
            resp.exportedPrivateKey.error = "Invalid password"
            browser.runtime.sendMessage(resp)
          }

          resp.exportedPrivateKey.address = address
          resp.exportedPrivateKey.privateKey =
            await this.keyringService.exportPrivateKey(address)
          browser.runtime.sendMessage(resp)
        }
      }
    )
  }

  async connectInternalEthereumProviderService(): Promise<void> {
    this.internalEthereumProviderService.emitter.on(
      "transactionSignatureRequest",
      async ({ payload, resolver, rejecter }) => {
        this.store.dispatch(
          clearTransactionState(TransactionConstructionStatus.Pending)
        )
        this.store.dispatch(updateTransactionOptions(payload))
        const clear = () => {
          // Mutual dependency to handleAndClear.
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          this.signingService.emitter.off("signingTxResponse", handleAndClear)

          transactionConstructionSliceEmitter.off(
            TransactionConstructionEventNames.SIGNATURE_REJECTED,
            // Mutual dependency to rejectAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            rejectAndClear
          )
        }

        const handleAndClear = (response: TXSignatureResponse) => {
          clear()
          switch (response.type) {
            case "success-tx":
              resolver(response.signedTx as SignedEVMTransaction)
              break
            default:
              rejecter()
              break
          }
        }

        const rejectAndClear = () => {
          clear()
          rejecter()
        }

        this.signingService.emitter.on("signingTxResponse", handleAndClear)

        transactionConstructionSliceEmitter.on(
          TransactionConstructionEventNames.SIGNATURE_REJECTED,
          rejectAndClear
        )
      }
    )
    this.internalEthereumProviderService.emitter.on(
      "signTypedDataRequest",
      async ({
        payload,
        resolver,
        rejecter,
      }: {
        payload: SignTypedDataRequest
        resolver: (result: string | PromiseLike<string>) => void
        rejecter: () => void
      }) => {
        const enrichedsignTypedDataRequest =
          await this.enrichmentService.enrichSignTypedDataRequest(payload)
        this.store.dispatch(typedDataRequest(enrichedsignTypedDataRequest))

        const clear = () => {
          this.signingService.emitter.off(
            "signingDataResponse",
            // Mutual dependency to handleAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            handleAndClear
          )

          signingSliceEmitter.off(
            TransactionConstructionEventNames.SIGNATURE_REJECTED,
            // Mutual dependency to rejectAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            rejectAndClear
          )
        }

        const handleAndClear = (response: SignatureResponse) => {
          clear()
          switch (response.type) {
            case "success-data":
              resolver(response.signedData)
              break
            default:
              rejecter()
              break
          }
        }

        const rejectAndClear = () => {
          clear()
          rejecter()
        }

        this.signingService.emitter.on("signingDataResponse", handleAndClear)

        signingSliceEmitter.on(TransactionConstructionEventNames.SIGNATURE_REJECTED, rejectAndClear)
      }
    )
    this.internalEthereumProviderService.emitter.on(
      "signDataRequest",
      async ({
        payload,
        resolver,
        rejecter,
      }: {
        payload: SignDataRequest
        resolver: (result: string | PromiseLike<string>) => void
        rejecter: () => void
      }) => {
        this.store.dispatch(signDataRequest(payload))

        const clear = () => {
          this.signingService.emitter.off(
            "personalSigningResponse",
            // Mutual dependency to handleAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            handleAndClear
          )

          signingSliceEmitter.off(
            TransactionConstructionEventNames.SIGNATURE_REJECTED,
            // Mutual dependency to rejectAndClear.
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            rejectAndClear
          )
        }

        const handleAndClear = (response: SignatureResponse) => {
          clear()
          switch (response.type) {
            case "success-data":
              resolver(response.signedData)
              break
            default:
              rejecter()
              break
          }
        }

        const rejectAndClear = () => {
          clear()
          rejecter()
        }

        this.signingService.emitter.on(
          "personalSigningResponse",
          handleAndClear
        )

        signingSliceEmitter.on(TransactionConstructionEventNames.SIGNATURE_REJECTED, rejectAndClear)
      }
    )
  }

  async connectInternalPoktProviderService(): Promise<void> {
    this.internalPoktProviderService.emitter.on(
      "transactionSignatureRequest",
      async ({ payload, resolver, rejecter }) => {
        this.store.dispatch(
          clearTransactionState(TransactionConstructionStatus.Pending)
        )
        this.store.dispatch(updateTransactionOptions(payload))
        const clear = () => {
          this.signingService.emitter.off("signingTxResponse", handleAndClear)

          transactionConstructionSliceEmitter.off(
            TransactionConstructionEventNames.SIGNATURE_REJECTED,
            rejectAndClear
          )
        }

        const handleAndClear = (response: TXSignatureResponse) => {
          clear()
          switch (response.type) {
            case "success-tx":
              resolver(response.signedTx as SignedPOKTTransaction)
              break
            default:
              rejecter()
              break
          }
        }

        const rejectAndClear = () => {
          clear()
          rejecter()
        }

        this.signingService.emitter.on("signingTxResponse", handleAndClear)

        transactionConstructionSliceEmitter.on(
          TransactionConstructionEventNames.SIGNATURE_REJECTED,
          rejectAndClear
        )
      }
    )
  }

  async connectProviderBridgeService(): Promise<void> {
    this.providerBridgeService.emitter.on(
      "requestPermission",
      (permissionRequest: PermissionRequest) => {
        this.store.dispatch(requestPermission(permissionRequest))
      }
    )

    this.providerBridgeService.emitter.on(
      "initializeAllowedPages",
      async (allowedPages: Record<string, PermissionRequest>) => {
        this.store.dispatch(initializeAllowedPages(allowedPages))
      }
    )

    providerBridgeSliceEmitter.on("grantPermission", async (permission) => {
      await this.providerBridgeService.grantPermission(permission)
    })

    providerBridgeSliceEmitter.on(
      "denyOrRevokePermission",
      async (permission) => {
        await this.providerBridgeService.denyOrRevokePermission(permission)
      }
    )
  }

  async connectPreferenceService(): Promise<void> {
    this.preferenceService.emitter.on(
      PreferencesEventNames.INITIALIZE_DEFAULT_WALLET,
      async (isDefaultWallet: boolean) => {
        await this.store.dispatch(setDefaultWallet(isDefaultWallet))
      }
    )

    // listen for UI new selected account changes
    uiSliceEmitter.on(
      UIEventNames.NEW_SELECTED_ACCOUNT,
      async (addressNetwork) => {
        await this.preferenceService.setSelectedAccount(addressNetwork)

        await this.providerBridgeService.notifyContentScriptsAboutAddressChange(
          addressNetwork.address
        )
      }
    )

    uiSliceEmitter.on(
      UIEventNames.NEW_DEFAULT_WALLET_VALUE,
      async (newDefaultWalletValue) => {
        await this.preferenceService.setDefaultWalletValue(
          newDefaultWalletValue
        )

        this.providerBridgeService.notifyContentScriptAboutConfigChange(
          newDefaultWalletValue
        )
      }
    )

    uiSliceEmitter.on(UIEventNames.REFRESH_BACKGROUND_PAGE, async () => {
      window.location.reload()
    })

    // Update currentAddress in db if it's not set but it is in the store
    // should run only one time
    const preferenceSelectedAddress =
      await this.preferenceService.getSelectedAccount()
    if (!preferenceSelectedAddress) {
      const addressNetwork = this.store.getState().ui.selectedAccount

      if (addressNetwork) {
        await this.preferenceService.setSelectedAccount(addressNetwork)
      }
    }
  }

  connectTelemetryService(): void {
    // Pass the redux store to the telemetry service so we can analyze its size
    this.telemetryService.connectReduxStore(this.store)
  }

  async resolveNameOnNetwork({
    name,
    network,
  }: NameOnNetwork): Promise<string | undefined> {
    try {
      return await this.nameService.lookUpEthereumAddress(name /* , network */)
    } catch (error) {
      logger.info("Error looking up Ethereum address: ", error)
      return undefined
    }
  }

  private connectPopupMonitor() {
    runtime.onConnect.addListener((port) => {
      if (port.name !== popupMonitorPortName) return
      port.onDisconnect.addListener(() => {
        this.onPopupDisconnected()
      })
    })
  }

  private onPopupDisconnected() {
    this.store.dispatch(rejectTransactionSignature())
    this.store.dispatch(rejectDataSignature())
  }
}
