/* eslint-disable eqeqeq */
/* eslint-disable no-plusplus */
/* eslint-disable default-case */
/* eslint-disable no-underscore-dangle */
import {
	Configuration,
	HttpRpcProvider,
	Pocket,
	RPC,
	RpcError,
	Transaction,
	Block,
	RawTxResponse,
} from "@sendnodes/pocket-js/dist/index";
import { poll } from "@ethersproject/web";
import { Event } from "@ethersproject/providers/lib/base-provider";
import { EventType, Listener } from "@ethersproject/abstract-provider";
import { BigNumber } from "ethers";
import { Logger, resolveProperties, hexDataLength } from "ethers/lib/utils";
import BaseService from "../base";
import { ServiceLifecycleEvents } from "../types";
import {
	POKTNetwork,
	SignedPOKTTransaction,
	POKTTransaction,
	POKTBlock,
} from "../../networks";
import { POCKET } from "../../constants";
import { POKTWatchBlock } from "./utils";

/// ///////////////////////////
// Event Serializeing

function getEventTag(eventName: EventType): string {
	let name: string;
	if (typeof eventName === "string") {
		name = eventName.toLowerCase();

		if (name.length === 64) {
			return `tx:${name}`;
		}

		if (eventName.indexOf(":") === -1) {
			return eventName;
		}
	}

	throw new Error(`invalid event - ${eventName}`);
}

const maxDispatchers = 5;
const maxSessions = 2000;
const requestTimeOut = 100000;

// i don't think these are actually used
const dispatchers = [
	new URL("https://dispatch-1.nodes.pokt.network:4201"),
	new URL("https://dispatch-2.nodes.pokt.network:4201"),
	new URL("https://dispatch-3.nodes.pokt.network:4201"),
	new URL("https://dispatch-4.nodes.pokt.network:4201"),
	new URL("https://dispatch-5.nodes.pokt.network:4201"),
];
const DefaultRPC = POCKET.rcpUrl!;

const configuration = new Configuration(
	maxDispatchers,
	maxSessions,
	undefined,
	requestTimeOut,
	false,
	25,
	60000,
	1,
	true,
	true,
	false,
);

let nextPollId = 1;

const logger = new Logger("pocket-provider/0.1.0");

function getTime() {
	return new Date().getTime();
}

function stall(duration: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
}

export default class PocketProvider extends BaseService<ServiceLifecycleEvents> {
	private pocket: Pocket;

	private configuration: Configuration;

	private provider: HttpRpcProvider;

	private rpc: RPC;

	_network: POKTNetwork;

	_events: Array<Event>;

	// To help mitigate the eventually consistent nature of the blockchain
	// we keep a mapping of events we emit. If we emit an event X, we expect
	// that a user should be able to query for that event in the callback,
	// if the node returns null, we stall the response until we get back a
	// meaningful value, since we may be hitting a re-org, or a node that
	// has not indexed the event yet.
	// Events:
	//   - t:{hash}    - Transaction hash
	//   - b:{hash}    - BlockHash
	//   - block       - The most recent emitted block
	_emitted: { [eventName: string]: number | "pending" | undefined };

	_pollingInterval: number;

	_poller: NodeJS.Timer | null;

	_bootstrapPoll: NodeJS.Timer | null;

	_lastBlockNumber: number;

	_fastBlockNumber?: number | null;

	_fastBlockNumberPromise?: Promise<number>;

	_fastQueryDate: number;

	_maxInternalBlockNumber: number;

	_internalBlockNumber?: Promise<{
		blockNumber: number;
		reqTime: number;
		respTime: number;
	}> | null;

	constructor(baseURL = DefaultRPC) {
		super({
			blockPolling: {
				schedule: {
					// manifest v2 Alarm period is less than minimum of 1 minutes. In released .crx, alarm "blockPolling" will fire approximately every 1 minutes.
					periodInMinutes: 1,
				},
				handler: () => {
					this._startEvent();
				},
				runAtStart: true,
			},
		});

		const rpcURL = new URL(baseURL);
		this.configuration = configuration;
		this.provider = new HttpRpcProvider(rpcURL);
		this.pocket = new Pocket(dispatchers, this.provider, this.configuration);
		this.rpc = this.pocket.rpc() as RPC;

		this._events = [];

		this._emitted = { block: -2 };

		this._maxInternalBlockNumber = -1024;

		this._lastBlockNumber = -2;

		this._pollingInterval = 30000;

		this._fastQueryDate = 0;

		this._network = POCKET;

		this._poller = null;

		this._bootstrapPoll = null;
	}

	// Fetches the blockNumber, but will reuse any result that is less
	// than maxAge old or has been requested since the last request
	async _getInternalBlockNumber(maxAge: number): Promise<number> {
		// Allowing stale data up to maxAge old
		if (maxAge > 0) {
			// While there are pending internal block requests...
			while (this._internalBlockNumber) {
				// ..."remember" which fetch we started with
				const internalBlockNumber = this._internalBlockNumber;

				try {
					// Check the result is not too stale
					// eslint-disable-next-line no-await-in-loop
					const result = await internalBlockNumber;
					if (getTime() - result.respTime <= maxAge) {
						return result.blockNumber;
					}

					// Too old; fetch a new value
					break;
				} catch (error) {
					// The fetch rejected; if we are the first to get the
					// rejection, drop through so we replace it with a new
					// fetch; all others blocked will then get that fetch
					// which won't match the one they "remembered" and loop
					if (this._internalBlockNumber === internalBlockNumber) {
						break;
					}
				}
			}
		}

		const reqTime = getTime();

		const checkInternalBlockNumber = resolveProperties({
			queryHeightResponse: this.rpc.query.getHeight(),
		}).then(({ queryHeightResponse }) => {
			if (queryHeightResponse instanceof RpcError) {
				// Unremember this bad internal block number
				if (this._internalBlockNumber === checkInternalBlockNumber) {
					this._internalBlockNumber = null;
				}
				throw queryHeightResponse;
			}

			const respTime = getTime();
			let blockNumber = BigNumber.from(queryHeightResponse.height).toNumber();
			if (blockNumber < this._maxInternalBlockNumber) {
				blockNumber = this._maxInternalBlockNumber;
			}

			this._maxInternalBlockNumber = blockNumber;
			this._setFastBlockNumber(blockNumber); // @TODO: Still need this?
			return { blockNumber, reqTime, respTime };
		});

		this._internalBlockNumber = checkInternalBlockNumber;

		// Swallow unhandled exceptions; if needed they are handled else where
		checkInternalBlockNumber.catch((error) => {
			// Don't null the dead (rejected) fetch, if it has already been updated
			if (this._internalBlockNumber === checkInternalBlockNumber) {
				this._internalBlockNumber = null;
			}
		});

		return (await checkInternalBlockNumber).blockNumber;
	}

	// Deprecated; do not use this
	resetEventsBlock(blockNumber: number): void {
		this._lastBlockNumber = blockNumber - 1;
		if (this.polling) {
			this.poll();
		}
	}

	get network(): POKTNetwork {
		return this._network;
	}

	async getNetwork(): Promise<POKTNetwork> {
		return this._network;
	}

	get blockNumber(): number {
		this._getInternalBlockNumber(100 + this.pollingInterval / 2).then(
			(blockNumber) => {
				this._setFastBlockNumber(blockNumber);
			},
			(error) => {},
		);

		return this._fastBlockNumber != null ? this._fastBlockNumber : -1;
	}

	get polling(): boolean {
		return this._poller != null;
	}

	set polling(value: boolean) {
		if (value && !this._poller) {
			this._poller = setInterval(() => {
				this.poll();
			}, this.pollingInterval);

			if (!this._bootstrapPoll) {
				this._bootstrapPoll = setTimeout(() => {
					this.poll();

					// We block additional polls until the polling interval
					// is done, to prevent overwhelming the poll function
					this._bootstrapPoll = setTimeout(() => {
						// If polling was disabled, something may require a poke
						// since starting the bootstrap poll and it was disabled
						if (!this._poller) {
							this.poll();
						}

						// Clear out the bootstrap so we can do another
						this._bootstrapPoll = null;
					}, this.pollingInterval);
				}, 0);
			}
		} else if (!value && this._poller) {
			clearInterval(this._poller);
			this._poller = null;
		}
	}

	get pollingInterval(): number {
		return this._pollingInterval;
	}

	set pollingInterval(value: number) {
		if (
			typeof value !== "number" ||
			value <= 0 ||
			parseInt(String(value), 10) !== value
		) {
			throw new Error("invalid polling interval");
		}

		this._pollingInterval = value;

		if (this._poller) {
			clearInterval(this._poller);
			this._poller = setInterval(() => {
				this.poll();
			}, this._pollingInterval);
		}
	}

	_getFastBlockNumber(): Promise<number> {
		const now = getTime();

		// Stale block number, request a newer value
		if (now - this._fastQueryDate > 2 * this._pollingInterval) {
			this._fastQueryDate = now;
			this._fastBlockNumberPromise = this.getBlockNumber().then(
				(blockNumber) => {
					if (
						this._fastBlockNumber == null ||
						blockNumber > this._fastBlockNumber
					) {
						this._fastBlockNumber = blockNumber;
					}
					return this._fastBlockNumber;
				},
			);
		}

		return this._fastBlockNumberPromise as Promise<number>;
	}

	_setFastBlockNumber(blockNumber: number): void {
		// Older block, maybe a stale request
		if (this._fastBlockNumber != null && blockNumber < this._fastBlockNumber) {
			return;
		}

		// Update the time we updated the blocknumber
		this._fastQueryDate = getTime();

		// Newer block number, use  it
		if (this._fastBlockNumber == null || blockNumber > this._fastBlockNumber) {
			this._fastBlockNumber = blockNumber;
			this._fastBlockNumberPromise = Promise.resolve(blockNumber);
		}
	}

	async getBlockNumber(): Promise<number> {
		return this._getInternalBlockNumber(0);
	}

	async poll(): Promise<void> {
		nextPollId += 1;
		const pollId = nextPollId;

		// Track all running promises, so we can trigger a post-poll once they are complete
		const runners: Array<Promise<void>> = [];

		let blockNumber: number;
		try {
			blockNumber = await this._getInternalBlockNumber(
				100 + this.pollingInterval / 2,
			);
		} catch (error) {
			this.emit("error", error);
			return;
		}
		this._setFastBlockNumber(blockNumber);

		// Emit a poll event after we have the latest (fast) block number
		this.emit("poll", pollId, blockNumber);

		// If the block has not changed, meh.
		if (blockNumber === this._lastBlockNumber) {
			this.emit("didPoll", pollId);
			return;
		}

		// First polling cycle, trigger a "block" events
		if (this._emitted.block === -2) {
			this._emitted.block = blockNumber - 1;
		}

		if (Math.abs(<number>this._emitted.block - blockNumber) > 1000) {
			logger.warn(
				`network block skew detected; skipping block events (emitted=${this._emitted.block} blockNumber${blockNumber})`,
			);
			this.emit(
				"error",
				logger.makeError(
					"network block skew detected",
					Logger.errors.NETWORK_ERROR,
					{
						blockNumber,
						event: "blockSkew",
						previousBlockNumber: this._emitted.block,
					},
				),
			);
			this.emit("block", blockNumber);
		} else {
			// Notify all listener for each block that has passed
			for (let i = <number>this._emitted.block + 1; i <= blockNumber; i++) {
				this.emit("block", i);
			}
		}

		// The emitted block was updated, check for obsolete events
		if (<number>this._emitted.block !== blockNumber) {
			this._emitted.block = blockNumber;

			Object.keys(this._emitted).forEach((key) => {
				// The block event does not expire
				if (key === "block") {
					return;
				}

				// The block we were at when we emitted this event
				const eventBlockNumber = this._emitted[key];

				// We cannot garbage collect pending transactions or blocks here
				// They should be garbage collected by the Provider when setting
				// "pending" events
				if (eventBlockNumber === "pending" || !eventBlockNumber) {
					return;
				}

				// Evict any transaction hashes or block hashes over 12 blocks
				// old, since they should not return null anyways
				if (blockNumber - eventBlockNumber > 12) {
					this._emitted[key] = undefined;
				}
			});
		}

		// First polling cycle
		if (this._lastBlockNumber === -2) {
			this._lastBlockNumber = blockNumber - 1;
		}

		// Find all transaction hashes we are waiting on
		this._events.forEach((event) => {
			switch (event.type) {
				case "tx": {
					const { hash } = event;
					const runner = this.getTransaction(hash)
						.then((tx) => {
							if (!tx?.height || tx.height.toString() === "0") return;
							this._emitted[`t:${hash}`] = BigNumber.from(tx.height).toNumber();
							this.emit(hash, tx);
							return;
						})
						.catch((error: Error) => {
							this.emit("error", error);
						});

					runners.push(runner);

					break;
				}
			}
		});

		this._lastBlockNumber = blockNumber;

		// Once all events for this loop have been processed, emit "didPoll"
		Promise.all(runners)
			.then(() => {
				this.emit("didPoll", pollId);
			})
			.catch((error) => {
				this.emit("error", error);
			});
	}

	/**
	 * all methods are in the format pokt_[rpc-query]
	 * ex: pokt_balance maps to rpc path /v1/query/balance
	 */
	async send(method: string, params: unknown[]): Promise<unknown> {
		const path = `/v1/query/${method.split("pokt_")[1]}`;
		const payload = params.length ? params[0] : {};
		const result = await this.provider.send(
			path,
			JSON.stringify(payload),
			this.configuration.requestTimeOut,
			false,
		);

		if (result instanceof RpcError) {
			throw result;
		}

		const parsed = JSON.parse(result);
		return parsed;
	}

	async sendTransaction(
		transaction: SignedPOKTTransaction,
	): Promise<POKTTransaction> {
		const result = await this.rpc.client.rawtx(
			transaction.from,
			transaction.tx,
		);

		if (result instanceof RpcError) {
			throw result;
		}

		return this._wrapTransaction({
			...result,
			tx: transaction.tx,
			from: transaction.from,
			to: transaction.to,
			txMsg: transaction.txMsg,
			memo: transaction.memo,
			network: transaction.network,
		});
	}

	async getTransactions(
		address: string,
		received = false,
		prove = false,
		page = 1,
		perPage = 100,
	): Promise<Transaction[] | undefined> {
		return poll(
			async () => {
				// crazy enough, asc means descending block heights 🤷‍♂️
				const result = await this.rpc.query.getAccountTxs(
					address,
					received,
					prove,
					page,
					perPage,
					60000,
					true,
					"asc",
				);
				if (result instanceof RpcError) {
					// if (this._emitted[`t:${transactionHash}`] == null) {
					//   console.log("getTx return null")
					//   return null
					// }
					return undefined;
				}

				const txs = result.transactions;
				return txs;
			},
			{ oncePoll: this },
		);
	}

	async getTransaction(
		transactionHash: string,
	): Promise<Transaction | undefined> {
		return poll(
			async () => {
				const result = await this.rpc.query.getTX(transactionHash);
				if (result instanceof RpcError) {
					// if (this._emitted[`t:${transactionHash}`] == null) {
					//   console.log("getTx return null")
					//   return null
					// }
					return undefined;
				}

				const tx = result.transaction;
				return tx;
			},
			{ oncePoll: this },
		);
	}

	async getSkinnyBlock(
		blockNumber: number,
	): Promise<POKTWatchBlock | Block | undefined> {
		return poll(
			async () => {
				// use POKT Watch to get a skinny block since mainnet blocks are too fat
				if (this.network.chainID === "mainnet") {
					try {
						const result = await fetch(
							`https://api.pokt.watch/block?height=eq.${blockNumber}`,
						);
						return (await result.json())[0] as POKTWatchBlock;
					} catch (e) {
						return undefined;
					}
				} else {
					const result = await this.rpc.query.getBlock(BigInt(blockNumber));
					if (result instanceof RpcError) {
						return undefined;
					}
					return result.block as Block;
				}
			},
			{ retryLimit: 10 },
		);
	}

	/**
	 * Retrieves the full block from the POKT network.
	 */
	async getBlock(blockNumber: number): Promise<Block | undefined> {
		return poll(
			async () => {
				const result = await this.rpc.query.getBlock(BigInt(blockNumber));
				if (
					result instanceof RpcError ||
					result === undefined ||
					result.block === null ||
					result.block === undefined
				) {
					// if (this._emitted[`b:${blockNumber}`] == null) {
					//   console.log("getBlock return null")
					//   return null
					// }
					return undefined;
				}
				return result.block;
			},
			{ retryLimit: 10 },
		);
	}

	async getBalance(address: string, block?: number): Promise<BigNumber> {
		await this.getNetwork();
		const result = await this.rpc.query.getBalance(
			address,
			block ? BigNumber.from(block).toBigInt() : undefined,
		);
		if (result instanceof RpcError) {
			throw result;
		}

		return BigNumber.from(result.balance);
	}

	_startEvent(): void {
		this.polling = this._events.filter((e) => e.pollable()).length > 0;
	}

	_stopEvent(): void {
		this.polling = this._events.filter((e) => e.pollable()).length > 0;
	}

	_addEventListener(
		eventName: EventType,
		listener: Listener,
		once: boolean,
	): this {
		const event = new Event(getEventTag(eventName), listener, once);
		this._events.push(event);
		this._startEvent();

		return this;
	}

	on(eventName: EventType, listener: Listener): this {
		return this._addEventListener(eventName, listener, false);
	}

	once(eventName: EventType, listener: Listener): this {
		return this._addEventListener(eventName, listener, true);
	}

	emit(eventName: EventType, ...args: Array<unknown>): boolean {
		let result = false;

		const stopped: Array<Event> = [];

		const eventTag = getEventTag(eventName);
		this._events = this._events.filter((event) => {
			if (event.tag !== eventTag) {
				return true;
			}

			setTimeout(() => {
				event.listener.apply(this, args);
			}, 0);

			result = true;

			if (event.once) {
				stopped.push(event);
				return false;
			}

			return true;
		});

		stopped.forEach((event) => {
			this._stopEvent();
		});

		return result;
	}

	listenerCount(eventName?: EventType): number {
		if (!eventName) {
			return this._events.length;
		}

		const eventTag = getEventTag(eventName);
		return this._events.filter((event) => {
			return event.tag === eventTag;
		}).length;
	}

	listeners(eventName?: EventType): Array<Listener> {
		if (eventName == null) {
			return this._events.map((event) => event.listener);
		}

		const eventTag = getEventTag(eventName);
		return this._events
			.filter((event) => event.tag === eventTag)
			.map((event) => event.listener);
	}

	off(eventName: EventType, listener?: Listener): this {
		if (listener == null) {
			return this.removeAllListeners(eventName);
		}

		const stopped: Array<Event> = [];

		let found = false;

		const eventTag = getEventTag(eventName);
		this._events = this._events.filter((event) => {
			if (event.tag !== eventTag || event.listener !== listener) {
				return true;
			}
			if (found) {
				return true;
			}
			found = true;
			stopped.push(event);
			return false;
		});

		stopped.forEach(() => {
			this._stopEvent();
		});

		return this;
	}

	removeAllListeners(eventName?: EventType): this {
		let stopped: Array<Event> = [];
		if (eventName == null) {
			stopped = this._events;

			this._events = [];
		} else {
			const eventTag = getEventTag(eventName);
			this._events = this._events.filter((event) => {
				if (event.tag !== eventTag) {
					return true;
				}
				stopped.push(event);
				return false;
			});
		}

		stopped.forEach(() => {
			this._stopEvent();
		});

		return this;
	}

	// async queryBlockNumber(): Promise<number> {
	//   const res = this.rpc.query.getHeight()
	// }

	_wrapTransaction(
		tx: RawTxResponse &
			Pick<SignedPOKTTransaction, "from" | "to" | "txMsg" | "memo" | "network">,
	): POKTTransaction {
		if (!tx.tx) {
			throw new Error("tx undefiend");
		}
		return {
			hash: tx.hash,
			height: Number(tx.height.toString()),
			targetHeight: this.blockNumber + 1,
			tx: tx.tx,
			from: tx.from,
			to: tx.to,
			txMsg: tx.txMsg,
			network: tx.network,
			asset: tx.network.baseAsset,
			memo: tx.memo,
		};
	}
}
