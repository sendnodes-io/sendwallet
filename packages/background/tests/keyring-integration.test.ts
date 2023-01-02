import "mockzilla-webextension";

import { webcrypto } from "crypto";
import { Browser } from "webextension-polyfill";
import { MockzillaDeep } from "mockzilla";
import { KeyringType, KeyType } from "@sendnodes/hd-keyring";
import { CoinDenom as POKTCoinDenom } from "@pokt-network/pocket-js/dist/transactions/models/coin-denom";
import KeyringService, {
	ExtensionKeyring,
	KeyringEvents,
	MAX_KEYRING_IDLE_TIME,
	MAX_OUTSIDE_IDLE_TIME,
} from "../services/keyring";
import { KeyringTypes } from "../types";
import {
	EIP1559TransactionRequest,
	POKTMsgType,
	POKTTransactionRequest,
} from "../networks";
import { ETHEREUM, POCKET } from "../constants";
import logger from "../lib/logger";

const originalCrypto = global.crypto;
beforeEach(() => {
	// polyfill the WebCrypto API
	global.crypto = webcrypto as unknown as Crypto;
});

afterEach(() => {
	global.crypto = originalCrypto;
});

const validMnemonics = {
	metamask: [
		"input pulp truth gain expire kick castle voyage firm fee degree draft",
		"thumb major whip ensure spend brief pattern jelly stock echo tone session",
		"cancel canyon twenty pretty stool arrange brief speak agent earth thumb robust",
	],
	other: [
		"square time hurdle gospel crash uncle flash tomorrow city space shine sad fence ski harsh salt need edit name fold corn chuckle resource else",
		"until issue must",
		"glass skin grass cat photo essay march detail remain",
		"dream dinosaur poem cherry brief hand injury ice stuff steel bench vacant amazing bar uncover",
		"mad such absent minor vapor edge tornado wrestle convince shy battle region adapt order finish foot follow monitor",
	],
};

const validTransactionRequests: {
	[key: string]: {
		ETHEREUM: EIP1559TransactionRequest & { nonce: number };
		POCKET: POKTTransactionRequest;
	};
} = {
	simple: {
		POCKET: {
			// POKTMsgSend
			txMsg: {
				type: POKTMsgType.send,
				value: {
					fromAddress: "0x0",
					toAddress: "0x1",
					amount: "1000000000000000000",
				},
			},
			chainID: "mainnet",
			fee: "100000",
			network: POCKET,
			from: "0x0",
			to: "0x1",
			feeDenom: POKTCoinDenom.Upokt,
			memo: "test",
		},
		ETHEREUM: {
			from: "0x0",
			nonce: 0,
			type: 2,
			input: "0x",
			value: 0n,
			maxFeePerGas: 0n,
			maxPriorityFeePerGas: 0n,
			gasLimit: 0n,
			chainID: "0",
		},
	},
};

const testPassword = "my password";

// Default value that is clearly not correct for testing inspection.
const dateNowValue = 1000000000000;

const startKeyringService = async () => {
	const service = await KeyringService.create();
	await service.startService();

	return service;
};

function expectBase64String(
	{
		minLength: min,
		maxLength: max,
	}: { minLength: number; maxLength?: number } = { minLength: 1 },
) {
	return expect.stringMatching(
		new RegExp(`^[0-9a-zA-Z=+/]{${min},${max ?? ""}}`),
	);
}

const mockAlarms = (mock: MockzillaDeep<Browser>) => {
	mock.alarms.create.mock(() => ({}));
	mock.alarms.onAlarm.addListener.mock(() => ({}));
};

describe("KeyringService when uninitialized", () => {
	let service: KeyringService;

	beforeEach(async () => {
		mockBrowser.storage.local.get.mock(() => Promise.resolve({}));
		mockBrowser.storage.local.set.mock(() => Promise.resolve());
		mockAlarms(mockBrowser);

		service = await startKeyringService();
	});

	describe("and locked", () => {
		it("won't import or create accounts", async () => {
			await expect(
				service.importKeyring(validMnemonics.metamask[0], "import"),
			).rejects.toThrow("KeyringService must be unlocked.");

			await Promise.all(
				Object.keys(KeyringTypes).map(async (keyringType) =>
					expect(
						service.generateNewKeyring(keyringType as KeyringTypes),
					).rejects.toThrow("KeyringService must be unlocked."),
				),
			);
		});

		it("won't sign transactions", async () => {
			await expect(
				service.signTransaction(
					{ address: "0x0", network: POCKET },
					validTransactionRequests.simple.POCKET,
				),
			).rejects.toThrow("KeyringService must be unlocked.");
		});
	});

	describe("and unlocked", () => {
		beforeEach(async () => {
			await service.unlock(testPassword);
		});

		it.each(validMnemonics.metamask)(
			"will import mnemonic '%s'",
			async (mnemonic) => {
				return expect(service.importKeyring(mnemonic, "import")).resolves;
			},
		);

		it("will create multiple distinct BIP-39 S256 accounts and expose mnemonics", async () => {
			const keyringOne = service.generateNewKeyring(
				KeyringTypes.mnemonicBIP39S256,
			);
			await expect(keyringOne).resolves.toMatchObject({
				id: expect.stringMatching(/.+/),
			});

			const keyringTwo = service.generateNewKeyring(
				KeyringTypes.mnemonicBIP39S256,
			);
			await expect(keyringTwo).resolves.toMatchObject({
				id: expect.stringMatching(/.+/),
			});

			const { id: idOne, mnemonic: mnemonicOne } = await keyringOne;
			const { id: idTwo, mnemonic: mnemonicTwo } = await keyringTwo;

			expect(idOne).not.toEqual(idTwo);
			expect(mnemonicOne).not.toEqual(mnemonicTwo);
			expect(mnemonicOne.length).toEqual(24);
			expect(mnemonicTwo.length).toEqual(24);
		});
	});
});

describe("KeyringService when initialized", () => {
	let service: KeyringService;
	let address: string;

	beforeEach(async () => {
		mockAlarms(mockBrowser);

		let localStorage: Record<string, Record<string, unknown>> = {};

		mockBrowser.storage.local.get.mock((key) => {
			if (typeof key === "string" && key in localStorage) {
				return Promise.resolve({ [key]: localStorage[key] } || {});
			}
			return Promise.resolve({});
		});
		mockBrowser.storage.local.set.mock((values) => {
			localStorage = {
				...localStorage,
				...values,
			};
			return Promise.resolve();
		});

		service = await startKeyringService();
		await service.unlock(testPassword);
		service.emitter.on(KeyringEvents.ADDRESS, ({ address: emittedAddress }) => {
			address = emittedAddress;
		});
		const { mnemonic } = await service.generateNewKeyring(
			KeyringTypes.mnemonicBIP39S256,
		);
		await service.importKeyring(mnemonic.join(" "), "import");
	});

	it("will return keyring fingerprint and addresses", async () => {
		const keyrings = service.getKeyrings();
		expect(keyrings).toHaveLength(1);
		expect(keyrings[0]).toMatchObject({
			fingerprint: expect.anything(),
			addresses: expect.arrayContaining([
				expect.stringMatching(new RegExp(address, "i")),
			]),
		});
	});

	it("will derive a new address", async () => {
		const [
			{
				fingerprint: id,
				addresses: [originalAddress],
			},
		] = service.getKeyrings();

		const newAddress = id ? await service.deriveAddress(id) : "";
		expect(newAddress).toEqual(
			expect.not.stringMatching(new RegExp(originalAddress, "i")),
		);

		const keyrings = service.getKeyrings();
		expect(keyrings).toHaveLength(1);
		expect(keyrings[0]).toMatchObject({
			fingerprint: expect.anything(),
			addresses: expect.arrayContaining([
				expect.stringMatching(new RegExp(originalAddress, "i")),
				expect.stringMatching(new RegExp(newAddress, "i")),
			]),
		});
	});

	test("will sign a transaction", async () => {
		const transactionWithFrom = {
			...validTransactionRequests.simple.POCKET,
			from: address,
		};

		const signedTransaction = await service.signTransaction(
			{ address, network: POCKET },
			transactionWithFrom,
		);

		await expect(signedTransaction).toMatchObject({
			...transactionWithFrom,
			tx: expect.stringMatching(/^[0-9a-f]{2,}$/i),
		});
		// TODO assert correct recovered address
	});

	it("does not overwrite data if unlocked with the wrong password", async () => {
		const transactionWithFrom = {
			...validTransactionRequests.simple.POCKET,
			from: address,
		};

		await service.lock();

		const badUnlockResult = await service.unlock("booyan");
		expect(badUnlockResult).toEqual(false);

		const goodUnlockResult = await service.unlock(testPassword);
		expect(goodUnlockResult).toEqual(true);

		await expect(
			service.signTransaction(
				{ address, network: POCKET },
				transactionWithFrom,
			),
		).resolves.toBeDefined();
	});

	it("successfully unlocks already unlocked wallet", async () => {
		jest.spyOn(logger, "warn").mockImplementation((arg) => {
			// We should log if we try to unlock an unlocked keyring
			expect(arg).toEqual("KeyringService is already unlocked!");
		});
		expect(service.locked()).toEqual(false);
		expect(await service.unlock(testPassword)).toEqual(true);
	});
});

describe("KeyringService when saving keyrings", () => {
	let localStorage: Record<string, Record<string, unknown>> = {};
	let localStorageCalls: Record<string, unknown>[] = [];

	beforeEach(() => {
		mockAlarms(mockBrowser);

		localStorage = {};
		localStorageCalls = [];

		mockBrowser.storage.local.get.mock((key) => {
			if (typeof key === "string" && key in localStorage) {
				return Promise.resolve({ [key]: localStorage[key] } || {});
			}
			return Promise.resolve({});
		});
		mockBrowser.storage.local.set.mock((values) => {
			localStorage = {
				...localStorage,
				...values,
			};
			localStorageCalls.unshift(values);

			return Promise.resolve();
		});

		jest.spyOn(Date, "now").mockReturnValue(dateNowValue);
	});

	it("saves data encrypted", async () => {
		const service = await startKeyringService();
		await service.unlock(testPassword);

		expect(localStorageCalls.shift()).toMatchObject({
			poktWalletVaults: expect.objectContaining({
				vaults: [
					expect.objectContaining({
						timeSaved: dateNowValue,
						vault: expect.objectContaining({
							salt: expectBase64String(),
							initializationVector: expectBase64String(),
							cipherText: expectBase64String({ minLength: 24, maxLength: 24 }),
						}),
					}),
				],
			}),
		});

		const { mnemonic } = await service.generateNewKeyring(
			KeyringTypes.mnemonicBIP39S256,
		);
		await service.importKeyring(mnemonic.join(" "), "import");

		expect(localStorageCalls.shift()).toMatchObject({
			poktWalletVaults: expect.objectContaining({
				vaults: [
					expect.objectContaining({
						timeSaved: dateNowValue,
						vault: expect.objectContaining({
							salt: expectBase64String(),
							initializationVector: expectBase64String(),
							cipherText: expectBase64String({ minLength: 24, maxLength: 24 }),
						}),
					}),
					expect.objectContaining({
						timeSaved: dateNowValue,
						vault: expect.objectContaining({
							salt: expectBase64String(),
							initializationVector: expectBase64String(),
							cipherText: expectBase64String({ minLength: 25 }),
						}),
					}),
				],
			}),
		});
	});

	it("loads encrypted data at instantiation time", async () => {
		localStorage = {
			poktWalletVaults: {
				version: 1,
				vaults: [
					{
						timeSaved: 1655223222511,
						vault: {
							cipherText:
								"mush2xs6GrQFDWyUAyhUiux1YZvf2Ix0SkysV5YimIPWs0sELDNamyCJU1+gASCbZcSEhIa5wvS1g5rxIBp+yBDRPsOT5mHWadBU2xTLTpUWQ2VZSNcYuxb2ReovoXDDnCqkVIk7pUamtDYhTOumYGbNlPmb8qvvdW8Pk2oSRkMCVkZQeHZvFvheSjhOrT3n4hh3MMXPFQ1+zb0jg+2M0Nzvxs8Nu+UEAhyXOWALdW8nCLKfSV7IWxGRrYtx6O1S6Yoj6Um5TwBAkkplGHjO/M88pEKtU+b93mlwE3AnR4sKJtqh/YZvdLSQPkrte4uOfrpXPdoQPAP/rCUnvGl2pmHVQDCYIQzhVCUlu+KjVaFoR9q9RbB060OgxGvzxGou2XlLRpnbwEBKQDamqraVmrpLbn1Vwi3FcMACfKpXPHbCWIs3a5G/CGV+jDLeTKxMGRfuSUsvTTL6kXBomsklfX/I6E2esdkDa+12gjDXNLBlN+6tkxA+Ow/QaTQKXtH6o7iT5v0csnCqPLHLE7WNye6i8JO2Vc0pdvWBlJ1qwA==",
							initializationVector: "50gJvZlgQJLJk0zm9Jl3Ew==",
							salt: "w8a3e50Jh7+PKg97BwmexfdzEMgiFIYm0MEFJG2dVH2awIf7T5ixDttCRF2Cz8+s/QQ5WesyQ+wsXKQXNkqnxA==",
						},
					},
				],
			},
		};

		const storedKeyrings: ExtensionKeyring[] = [];

		const service = await startKeyringService();
		service.emitter.on(KeyringEvents.KEYRINGS, (keyringEvent) => {
			storedKeyrings.push(...keyringEvent.keyrings);
			return Promise.resolve();
		});
		await service.unlock(testPassword);

		await expect(
			// Wait for the emitter to emit the keyrings event.
			new Promise((resolve) => {
				resolve(storedKeyrings);
			}),
		).resolves.toHaveLength(1);

		expect(storedKeyrings[0]).toMatchObject<ExtensionKeyring>({
			keyType: KeyType.ED25519,
			keyringType: KeyringType.BIP39,
			fingerprint: "0x4f340901",
			addresses: ["792c5f1a6c087f20316a802d325fdfbb9b41482a"],
		});
	});
});

describe("Keyring service when autolocking", () => {
	let service: KeyringService;
	let address: string;
	let callAutolockHandler: (timeSinceInitialMock: number) => void;

	beforeEach(async () => {
		mockBrowser.storage.local.get.mock(() => Promise.resolve({}));
		mockBrowser.storage.local.set.mock(() => Promise.resolve());
		mockBrowser.alarms.create.mock(() => ({}));

		mockBrowser.alarms.onAlarm.addListener.mock((handler) => {
			callAutolockHandler = (timeSinceInitialMock) => {
				jest
					.spyOn(Date, "now")
					.mockReturnValue(dateNowValue + timeSinceInitialMock);

				handler({
					name: "autolock",
					scheduledTime: dateNowValue + timeSinceInitialMock,
				});
			};
		});

		jest.spyOn(Date, "now").mockReturnValue(dateNowValue);

		service = await startKeyringService();
		await service.unlock(testPassword);
		service.emitter.on(KeyringEvents.ADDRESS, ({ address: emittedAddress }) => {
			address = emittedAddress;
		});
		const { mnemonic } = await service.generateNewKeyring(
			KeyringTypes.mnemonicBIP39S256,
		);
		await service.importKeyring(mnemonic.join(" "), "import");
	});

	it("will autolock after the keyring idle time but not sooner", async () => {
		expect(service.locked()).toEqual(false);

		callAutolockHandler(MAX_KEYRING_IDLE_TIME - 10);
		expect(service.locked()).toEqual(false);

		callAutolockHandler(MAX_KEYRING_IDLE_TIME);
		expect(service.locked()).toEqual(true);
	});

	it("will autolock after the outside activity idle time but not sooner", async () => {
		expect(service.locked()).toEqual(false);

		callAutolockHandler(MAX_OUTSIDE_IDLE_TIME - 10);
		expect(service.locked()).toEqual(false);

		callAutolockHandler(MAX_OUTSIDE_IDLE_TIME);
		expect(service.locked()).toEqual(true);
	});

	it.each([
		{
			action: "signing a transaction",
			call: async () => {
				const transactionWithFrom = {
					...validTransactionRequests.simple.POCKET,
					from: address,
				};

				await service.signTransaction(
					{ address, network: POCKET },
					transactionWithFrom,
				);
			},
		},
		{
			action: "importing a keyring",
			call: async () => {
				await service.importKeyring(validMnemonics.metamask[0], "import");
			},
		},
		{
			action: "generating a keyring",
			call: async () => {
				await service.generateNewKeyring(KeyringTypes.mnemonicBIP39S256);
			},
		},
	])("will bump keyring activity idle time when $action", async ({ call }) => {
		jest
			.spyOn(Date, "now")
			.mockReturnValue(dateNowValue + MAX_KEYRING_IDLE_TIME - 1);

		await call();

		// Bump the outside activity timer to make sure the service doesn't
		// autolock due to outside idleness.
		jest
			.spyOn(Date, "now")
			.mockReturnValue(dateNowValue + MAX_OUTSIDE_IDLE_TIME - 1);
		service.markOutsideActivity();

		callAutolockHandler(MAX_KEYRING_IDLE_TIME);
		expect(service.locked()).toEqual(false);

		callAutolockHandler(2 * MAX_KEYRING_IDLE_TIME - 10);
		expect(service.locked()).toEqual(false);

		callAutolockHandler(2 * MAX_KEYRING_IDLE_TIME);
		expect(service.locked()).toEqual(true);
	});

	it("will bump the outside activity idle time when outside activity is marked", async () => {
		jest
			.spyOn(Date, "now")
			.mockReturnValue(dateNowValue + MAX_OUTSIDE_IDLE_TIME - 1);

		service.markOutsideActivity();

		// Bump the keyring activity timer to make sure the service doesn't
		// autolock due to keyring idleness.
		jest
			.spyOn(Date, "now")
			.mockReturnValue(dateNowValue + MAX_KEYRING_IDLE_TIME - 1);
		await service.generateNewKeyring(KeyringTypes.mnemonicBIP39S256);

		callAutolockHandler(MAX_OUTSIDE_IDLE_TIME);
		expect(service.locked()).toEqual(false);

		callAutolockHandler(2 * MAX_OUTSIDE_IDLE_TIME - 10);
		expect(service.locked()).toEqual(false);

		callAutolockHandler(2 * MAX_OUTSIDE_IDLE_TIME);
		expect(service.locked()).toEqual(true);
	});
});
