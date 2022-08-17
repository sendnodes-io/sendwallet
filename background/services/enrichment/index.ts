import { normalizeHexAddress } from "@sendnodes/hd-keyring"
import {
  SmartContractFungibleAsset,
  isSmartContractFungibleAsset,
} from "../../assets"
import {
  AnyEVMTransaction,
  AnyPOKTTransaction,
  EIP1559TransactionRequest,
  EVMNetwork,
  POKTNetwork,
  sameNetwork,
} from "../../networks"
import { enrichAssetAmountWithDecimalValues } from "../../redux-slices/utils/asset-utils"

import { parseERC20Tx, parseLogsForERC20Transfers } from "../../lib/erc20"
import { normalizeEVMAddress, sameEVMAddress } from "../../lib/utils"

import ChainService from "../chain"
import IndexingService from "../indexing"
import NameService from "../name"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import BaseService from "../base"
import {
  EnrichedEVMTransaction,
  EnrichedEVMTransactionSignatureRequest,
  SignTypedDataAnnotation,
  TransactionAnnotation,
  EnrichedSignTypedDataRequest,
  EnrichedPOKTTransaction,
} from "./types"
import { SignTypedDataRequest } from "../../utils/signing"
import { enrichEIP2612SignTypedDataRequest, isEIP2612TypedData } from "./utils"
import { ETHEREUM } from "../../constants"

export * from "./types"

interface Events extends ServiceLifecycleEvents {
  enrichedEVMTransaction: {
    transaction: EnrichedEVMTransaction
    forAccounts: string[]
  }
  enrichedEVMTransactionSignatureRequest: EnrichedEVMTransactionSignatureRequest
  enrichedSignTypedDataRequest: EnrichedSignTypedDataRequest
}

/**
 * EnrichmentService is a coordinator service responsible for deciding when to
 * look up metadata about an application-level transaction, event, or address,
 * and annotating those entities for display UI.
 *
 * EnrichmentService acts primarily as a coordinator of ChainService,
 * IndexingService, and NameService to build annotations. It will need to
 * retrieve function selector and contract source code itself, but should
 * always prefer to delegate to a lower-lever service when possible.
 */
export default class EnrichmentService extends BaseService<Events> {
  /**
   * Create a new EnrichmentService. The service isn't initialized until
   * startService() is called and resolved.
   * @param indexingService - Required for token metadata and currency
   * @param chainService - Required for chain interactions.
   * @param nameService - Required for name lookups.
   * @returns A new, initializing EnrichmentService
   */
  static create: ServiceCreatorFunction<
    Events,
    EnrichmentService,
    [Promise<ChainService>, Promise<IndexingService>, Promise<NameService>]
  > = async (chainService, indexingService, nameService) => {
    return new this(
      await chainService,
      await indexingService,
      await nameService
    )
  }

  private constructor(
    private chainService: ChainService,
    private indexingService: IndexingService,
    private nameService: NameService
  ) {
    super({})
  }

  async internalStartService(): Promise<void> {
    await super.internalStartService()

    await this.connectChainServiceEvents()
  }

  private async connectChainServiceEvents(): Promise<void> {
    this.chainService.emitter.on(
      "transaction",
      async ({ transaction, forAccounts }) => {
        if (transaction.network.family === "EVM") {
          this.emitter.emit("enrichedEVMTransaction", {
            transaction: (await this.enrichTransaction(
              transaction,
              2 /* TODO desiredDecimals should be configurable */
            )) as EnrichedEVMTransaction,
            forAccounts,
          })
        }
      }
    )

    this.chainService.emitter.on("block", async (block) => {
      // update all balances of base account on new blocks
      // TODO: refetch all token balances
      this.chainService.getAccountsToTrack().then(async (accounts) => {
        for (const account of accounts.filter((a) =>
          sameNetwork(a.network, block.network)
        )) {
          await this.chainService.getLatestBaseAccountBalance(account)
        }
      })
    })
  }

  async resolveTransactionAnnotation(
    network: EVMNetwork | POKTNetwork,
    transaction:
      | AnyEVMTransaction
      | AnyPOKTTransaction
      | (Partial<EIP1559TransactionRequest> & { from: string }),
    desiredDecimals: number
  ): Promise<TransactionAnnotation | undefined> {
    let txAnnotation: TransactionAnnotation | undefined

    const resolvedTime = Date.now()
    if (network.family === "EVM") {
      const tx = transaction as
        | AnyEVMTransaction
        | (Partial<EIP1559TransactionRequest> & { from: string })
      if (typeof tx.to === "undefined") {
        // A missing recipient means a contract deployment.
        txAnnotation = {
          timestamp: resolvedTime,
          type: "contract-deployment",
        }
      } else if (
        tx.input === null ||
        tx.input === "0x" ||
        typeof tx.input === "undefined"
      ) {
        const toName = await this.nameService.lookUpName(tx.to, network)

        // This is _almost certainly_ not a contract interaction, move on. Note that
        // a simple ETH send to a contract address can still effectively be a
        // contract interaction (because it calls the fallback function on the
        // contract), but for now we deliberately ignore that scenario when
        // categorizing activities.
        // TODO We can do more here by checking how much gas was spent. Anything
        // over the 21k required to send ETH is a more complex contract interaction
        if (typeof tx.value !== "undefined") {
          txAnnotation = {
            timestamp: resolvedTime,
            type: "asset-transfer",
            senderAddress: tx.from,
            recipientName: toName,
            recipientAddress: tx.to, // TODO ingest address
            assetAmount: enrichAssetAmountWithDecimalValues(
              {
                asset: network.baseAsset,
                amount: tx.value,
              },
              desiredDecimals
            ),
          }
        } else {
          // Fall back on a standard contract interaction.
          txAnnotation = {
            timestamp: resolvedTime,
            type: "contract-interaction",
            contractName: toName,
          }
        }
      } else {
        const assets = await this.indexingService.getCachedAssets(network)

        // See if the address matches a fungible asset.
        const matchingFungibleAsset = assets.find(
          (asset): asset is SmartContractFungibleAsset =>
            isSmartContractFungibleAsset(asset) &&
            sameEVMAddress(asset.contractAddress, tx.to)
        )

        const transactionLogoURL = matchingFungibleAsset?.metadata?.logoURL

        const erc20Tx = parseERC20Tx(tx.input)

        // TODO handle the case where we don't have asset metadata already
        if (
          matchingFungibleAsset &&
          erc20Tx &&
          (erc20Tx.name === "transfer" || erc20Tx.name === "transferFrom")
        ) {
          const toName = await this.nameService.lookUpName(
            erc20Tx.args.to,
            network
          )

          // We have an ERC-20 transfer
          txAnnotation = {
            timestamp: resolvedTime,
            type: "asset-transfer",
            transactionLogoURL,
            senderAddress: erc20Tx.args.from ?? tx.from,
            recipientAddress: erc20Tx.args.to, // TODO ingest address
            recipientName: toName,
            assetAmount: enrichAssetAmountWithDecimalValues(
              {
                asset: matchingFungibleAsset,
                amount: BigInt(erc20Tx.args.amount),
              },
              desiredDecimals
            ),
          }
        } else if (
          matchingFungibleAsset &&
          erc20Tx &&
          erc20Tx.name === "approve"
        ) {
          const spenderName = await this.nameService.lookUpName(
            erc20Tx.args.spender,
            network
          )

          txAnnotation = {
            timestamp: resolvedTime,
            type: "asset-approval",
            transactionLogoURL,
            spenderAddress: erc20Tx.args.spender, // TODO ingest address
            spenderName,
            assetAmount: enrichAssetAmountWithDecimalValues(
              {
                asset: matchingFungibleAsset,
                amount: BigInt(erc20Tx.args.value),
              },
              desiredDecimals
            ),
          }
        } else {
          const toName = await this.nameService.lookUpName(tx.to, network)

          // Fall back on a standard contract interaction.
          txAnnotation = {
            timestamp: resolvedTime,
            type: "contract-interaction",
            // Include the logo URL if we resolve it even if the interaction is
            // non-specific; the UI can choose to use it or not, but if we know the
            // address has an associated logo it's worth passing on.
            transactionLogoURL,
            contractName: toName,
          }
        }
      }

      // Look up logs and resolve subannotations, if available.
      if ("logs" in tx && typeof tx.logs !== "undefined") {
        const assets = await this.indexingService.getCachedAssets(network)

        const erc20TransferLogs = parseLogsForERC20Transfers(tx.logs)

        // Look up transfer log names, then flatten to an address -> name map.
        const namesByAddress = Object.fromEntries(
          (
            await Promise.allSettled(
              [
                ...new Set(
                  ...erc20TransferLogs.map(
                    ({ recipientAddress }) => recipientAddress
                  )
                ),
              ].map(
                async (address) =>
                  [
                    normalizeEVMAddress(address),
                    await this.nameService.lookUpName(address, network),
                  ] as const
              )
            )
          )
            .filter(
              (result): result is PromiseFulfilledResult<[string, string]> =>
                result.status === "fulfilled" && result.value[1] !== undefined
            )
            .map(({ value }) => value)
        )

        const subannotations = erc20TransferLogs.flatMap<TransactionAnnotation>(
          ({ contractAddress, amount, senderAddress, recipientAddress }) => {
            // See if the address matches a fungible asset.
            const matchingFungibleAsset = assets.find(
              (asset): asset is SmartContractFungibleAsset =>
                isSmartContractFungibleAsset(asset) &&
                sameEVMAddress(asset.contractAddress, contractAddress)
            )

            // Try to find a resolved name for the recipient; we should probably
            // do this for the sender as well, but one thing at a time.
            const recipientName =
              namesByAddress[normalizeEVMAddress(recipientAddress)]

            return typeof matchingFungibleAsset !== "undefined"
              ? [
                  {
                    type: "asset-transfer",
                    assetAmount: enrichAssetAmountWithDecimalValues(
                      {
                        asset: matchingFungibleAsset,
                        amount,
                      },
                      desiredDecimals
                    ),
                    senderAddress,
                    recipientAddress,
                    recipientName,
                    timestamp: resolvedTime,
                  },
                ]
              : []
          }
        )

        if (subannotations.length > 0) {
          txAnnotation.subannotations = subannotations
        }
      }
    }

    return txAnnotation
  }

  async enrichTransactionSignature(
    network: EVMNetwork,
    transaction: Partial<EIP1559TransactionRequest> & { from: string },
    desiredDecimals: number
  ): Promise<EnrichedEVMTransactionSignatureRequest> {
    const enrichedTxSignatureRequest = {
      ...transaction,
      annotation: await this.resolveTransactionAnnotation(
        network,
        transaction,
        desiredDecimals
      ),
    }

    this.emitter.emit(
      "enrichedEVMTransactionSignatureRequest",
      enrichedTxSignatureRequest
    )

    return enrichedTxSignatureRequest
  }

  async enrichSignTypedDataRequest(
    signTypedDataRequest: SignTypedDataRequest
  ): Promise<EnrichedSignTypedDataRequest> {
    let annotation: SignTypedDataAnnotation = {
      type: "unrecognized",
    }
    const { typedData } = signTypedDataRequest
    if (isEIP2612TypedData(typedData)) {
      const assets = await this.indexingService.getCachedAssets(ETHEREUM)
      const correspondingAsset = assets.find(
        (asset): asset is SmartContractFungibleAsset => {
          if (
            typedData.domain.verifyingContract &&
            "contractAddress" in asset
          ) {
            return (
              normalizeHexAddress(asset.contractAddress) ===
              normalizeHexAddress(typedData.domain.verifyingContract)
            )
          }
          return false
        }
      )
      annotation = await enrichEIP2612SignTypedDataRequest(
        typedData,
        this.nameService,
        correspondingAsset
      )
    }

    const enrichedSignTypedDataRequest = {
      ...signTypedDataRequest,
      annotation,
    }

    this.emitter.emit(
      "enrichedSignTypedDataRequest",
      enrichedSignTypedDataRequest
    )

    return enrichedSignTypedDataRequest
  }

  async enrichTransaction(
    transaction: AnyEVMTransaction | AnyPOKTTransaction,
    desiredDecimals: number
  ): Promise<EnrichedEVMTransaction | EnrichedPOKTTransaction> {
    const enrichedTx = {
      ...transaction,
      annotation: await this.resolveTransactionAnnotation(
        transaction.network,
        transaction,
        desiredDecimals
      ),
    }

    return enrichedTx
  }
}
