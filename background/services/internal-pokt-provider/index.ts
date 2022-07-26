import { TransactionRequest as EthersTransactionRequest } from "@ethersproject/abstract-provider"

import {
  EIP1193Error,
  EIP1193_ERROR_CODES,
  RPCRequest,
} from "@sendnodes/provider-bridge-shared"
import logger from "../../lib/logger"

import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import ChainService from "../chain"
import { POKTTransactionRequest, SignedEVMTransaction, SignedPOKTTransaction } from "../../networks"
import PreferenceService from "../preferences"
import { internalPoktProviderPort } from "../../redux-slices/utils/contract-utils"
import { POCKET } from "../../constants"
import { isValidPoktAddress } from "../../lib/utils"

type DAppRequestEvent<T, E> = {
  payload: T
  resolver: (result: E | PromiseLike<E>) => void
  rejecter: () => void
}

type Events = ServiceLifecycleEvents & {
  transactionSignatureRequest: DAppRequestEvent<
    POKTTransactionRequest,
    SignedPOKTTransaction
  >
  // connect
  // disconnet
  // account change
  // networkchange
}

export default class InternalPoktProviderService extends BaseService<Events> {
  static create: ServiceCreatorFunction<
    Events,
    InternalPoktProviderService,
    [Promise<ChainService>, Promise<PreferenceService>]
  > = async (chainService, preferenceService) => {
    return new this(await chainService, await preferenceService)
  }

  private constructor(
    private chainService: ChainService,
    private preferenceService: PreferenceService
  ) {
    super()

    internalPoktProviderPort.emitter.on("message", async (event) => {
      logger.log(`internal: request payload: ${JSON.stringify(event)}`)
      try {
        const response = {
          id: event.id,
          result: await this.routeSafeRPCRequest(
            event.request.method,
            event.request.params
          ),
        }
        logger.log("internal response:", response)

        internalPoktProviderPort.postResponse(response)
      } catch (error) {
        logger.log("error processing request", event.id, error)

        internalPoktProviderPort.postResponse({
          id: event.id,
          result: new EIP1193Error(
            EIP1193_ERROR_CODES.userRejectedRequest
          ).toJSON(),
        })
      }
    })
  }

  async routeSafeRPCRequest(
    method: string,
    params: RPCRequest["params"]
  ): Promise<unknown> {
    const { address, network } = await this.preferenceService.getSelectedAccount()
    switch (method) {
      case "pokt_accounts": {
        return [address]
      }
      case "pokt_sendTransaction":
        const sendTransactionPayload = params[0] as POKTTransactionRequest
        if (
          !isValidPoktAddress(sendTransactionPayload.from) ||
          !isValidPoktAddress(sendTransactionPayload.to)
        ) {
          throw new Error("pokt_sendTransaction: invalid from or to address")
        }
        return this.signTransaction(sendTransactionPayload).then(
          async (signed) => {
            const txHash = await this.chainService.broadcastSignedTransaction(
              signed
            )
            if (!txHash) return undefined
            const tx = await this.chainService.getTransaction(POCKET, txHash)
            return tx
          }
        )
      case "pokt_tx":
      case "pokt_balance":
      case "pokt_height":
      case "pokt_block":
        return this.chainService.send(method, params, network)
      default:
        throw new EIP1193Error(EIP1193_ERROR_CODES.unsupportedMethod)
    }
  }

  private async signTransaction(transactionRequest: POKTTransactionRequest) {
    return new Promise<SignedEVMTransaction | SignedPOKTTransaction>(
      (resolve, reject) => {
        this.emitter.emit("transactionSignatureRequest", {
          payload: transactionRequest,
          resolver: resolve,
          rejecter: reject,
        })
      }
    )
  }
}
