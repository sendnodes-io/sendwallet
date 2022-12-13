import { Storage } from "webextension-polyfill"

import { parse as parseRawTransaction } from "@ethersproject/transactions"

import {
  defaultPathPokt,
  FixedKeyring,
  HDKeyring,
  Keyring,
  KeyringType,
  KeyType,
  SeralizedFixedKeyring,
  SerializedHDKeyring,
  SerializedKeyring,
  v1KeyringDeserializer,
} from "@sendnodes/hd-keyring"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { currentVault, writeLatestEncryptedVault } from "./storage"
import {
  decryptVault,
  deriveSymmetricKeyFromPassword,
  EncryptedVault,
  encryptVault,
  SaltedKey,
} from "./encryption"
import {
  EIP191Data,
  EIP712TypedData,
  HexString,
  KeyringTypes,
  UNIXTime,
} from "../../types"
import {
  EIP1559TransactionRequest,
  POKTTransactionRequest,
  SignedEVMTransaction,
  SignedPOKTTransaction,
} from "../../networks"
import BaseService from "../base"
import { ETH, FORK, MINUTE } from "../../constants"
import {
  ethersTransactionRequestFromEIP1559TransactionRequest,
  poktHDKeyringTransactionRequestFromPoktTransactionRequest,
} from "../chain/utils"
import { USE_MAINNET_FORK } from "../../features/features"
import { AddressOnNetwork } from "../../accounts"
import logger from "../../lib/logger"

export const MAX_KEYRING_IDLE_TIME = 30 * MINUTE
export const MAX_OUTSIDE_IDLE_TIME = 30 * MINUTE

export { KeyType } from "@sendnodes/hd-keyring"

export type ExtensionKeyring = {
  keyringType: KeyringType
  keyType: KeyType
  fingerprint: string
  addresses: string[]
}

export interface KeyringMetadata {
  source: "import" | "internal"
  seedId: number
}

interface SerializedKeyringData {
  keyrings: Keyring<SerializedKeyring>[]
  metadata: { [keyringId: string]: KeyringMetadata }
  hiddenAccounts: { [address: HexString]: boolean }
}

export const enum KeyringEvents {
  LOCKED = "locked",
  KEYRINGS = "keyrings",
  ADDRESS = "address",
  SIGNED_TX = "signedTx",
  SIGNED_DATA = "signedData",
}

interface Events extends ServiceLifecycleEvents {
  [KeyringEvents.LOCKED]: boolean
  [KeyringEvents.KEYRINGS]: {
    keyrings: ExtensionKeyring[]
    keyringMetadata: {
      [keyringId: string]: KeyringMetadata
    }
  }
  [KeyringEvents.ADDRESS]: { address: string; keyType: KeyType }
  // TODO message was signed
  [KeyringEvents.SIGNED_TX]: SignedEVMTransaction
  [KeyringEvents.SIGNED_DATA]: string
}

type CachedKeySession = {
  key: JsonWebKey | null
  salt: string | null
}

type KeyringSession = {
  saltedKey: CachedKeySession | null
  lastKeyringActivity: UNIXTime | undefined
  lastOutsideActivity: UNIXTime | undefined
}

/*
 * KeyringService is responsible for all key material, as well as applying the
 * material to sign messages, sign transactions, and derive child keypairs.
 *
 * The service can be in two states, locked or unlocked, and starts up locked.
 * Keyrings are persisted in encrypted form when the service is locked.
 *
 * When unlocked, the service automatically locks itself after it has not seen
 * activity for a certain amount of time. The service can be notified of
 * outside activity that should be considered for the purposes of keeping the
 * service unlocked. No keyring activity for 30 minutes causes the service to
 * lock, while no outside activity for 30 minutes has the same effect.
 */
export default class KeyringService extends BaseService<Events> {
  #cachedKey: SaltedKey | null = null

  #keyrings: Keyring<SerializedKeyring>[] = []

  #keyringMetadata: { [keyringId: string]: KeyringMetadata } = {}

  #hiddenAccounts: { [address: HexString]: boolean } = {}

  /**
   * The last time a keyring took an action that required the service to be
   * unlocked (signing, adding a keyring, etc).
   */
  lastKeyringActivity: UNIXTime | undefined

  /**
   * The last time the keyring was notified of an activity outside of the
   * keyring. {@see markOutsideActivity}
   */
  lastOutsideActivity: UNIXTime | undefined

  static create: ServiceCreatorFunction<Events, KeyringService, []> =
    async () => {
      return new this()
    }

  private constructor() {
    super({
      autolock: {
        schedule: {
          periodInMinutes: 1,
        },
        handler: () => {
          this.autolockIfNeeded()
        },
      },
    })
  }

  async internalStartService(): Promise<void> {
    await super.internalStartService()

    const currentEncryptedVault = await currentVault()

    // nothing to unlock/lock if no vault
    if (!currentEncryptedVault) {
      return
    }

    // starts locked due to cached key being null so this may be a moot check
    if (this.#cachedKey === null) {
      // check if there is a keyring session
      await this.loadKeyringSession()
    }

    // if cached key set from session attempt to unlock
    if (this.#cachedKey !== null) {
      // emit locked if session expired
      this.autolockIfNeeded()
      if (this.#cachedKey === null) {
        return // session expired
      }

      // attempt to decrypt current vault
      if (
        (await this.decryptKeyringVault(
          currentEncryptedVault,
          this.#cachedKey
        )) === true
      ) {
        this.#unlock() // unlock and emit
        return
      }
    }

    // Emit locked status on startup if no cached key.
    // Should always be locked, but the main
    // goal is to have external viewers synced to internal state no matter what
    // it is. Don't emit if there are no keyrings to unlock.
    this.lock()
  }

  /**
   * Attempts to load keyring session if browser.storage.session exists.
   * Due to the manifest v3 and service workers, the only reliable way to persist
   * the salted keyring across restarts is using session storage. Chrome only for now
   *
   * @see https://developer.chrome.com/docs/extensions/reference/storage/#property-session
   */
  async loadKeyringSession(): Promise<void> {
    if (chrome?.storage) {
      const storage = chrome.storage as unknown as Storage
      if ("session" in storage) {
        const sessionStorage = storage.session as Storage.StorageArea
        const { keyringSession } = await sessionStorage.get("keyringSession")
        if (keyringSession === undefined) return
        try {
          const { saltedKey, lastKeyringActivity, lastOutsideActivity } =
            keyringSession
          this.#cachedKey = {
            salt: saltedKey.salt,
            key: await crypto.subtle.importKey(
              "jwk",
              saltedKey.key,
              { name: "AES-GCM", length: 256 },
              true,
              ["encrypt", "decrypt"]
            ),
          }
          this.lastKeyringActivity = lastKeyringActivity
          this.lastOutsideActivity = lastOutsideActivity
        } catch (e) {
          // ignored
        }
      }
    }
  }

  /**
   * Attempts to save keyring session if browser.storage.session exists.
   * Due to the manifest v3 and service workers, the only reliable way to persist
   * the salted keyring across restarts is using session storage. Chrome only for now
   *
   * @see https://developer.chrome.com/docs/extensions/reference/storage/#property-session
   */
  async saveKeyringSession(): Promise<void> {
    if (chrome?.storage) {
      const storage = chrome.storage as unknown as Storage
      if ("session" in storage) {
        const sessionStorage = storage.session as Storage.StorageArea
        const keyringSession: KeyringSession = {
          saltedKey: this.#cachedKey
            ? {
                key: await crypto.subtle.exportKey("jwk", this.#cachedKey.key),
                salt: this.#cachedKey.salt,
              }
            : null,
          lastKeyringActivity: this.lastKeyringActivity,
          lastOutsideActivity: this.lastOutsideActivity,
        }
        sessionStorage.set({ keyringSession })
      }
    }
  }

  async internalStopService(): Promise<void> {
    await this.lock()

    await super.internalStopService()
  }

  /**
   * @return True if the keyring is locked, false if it is unlocked.
   */
  locked(): boolean {
    return this.#cachedKey === null
  }

  /**
   * Update activity timestamps and emit unlocked event.
   */
  #unlock(): void {
    this.lastKeyringActivity = Date.now()
    this.lastOutsideActivity = Date.now()
    this.saveKeyringSession().then(() => {
      this.emitter.emit(KeyringEvents.LOCKED, false)
    })
  }

  /**
   * Unlock the keyring with a provided password, initializing from the most
   * recently persisted keyring vault if one exists.
   *
   * @param password A user-chosen string used to encrypt keyring vaults.
   *        Unlocking will fail if an existing vault is found, and this password
   *        can't decrypt it.
   *
   *        Note that losing this password means losing access to any key
   *        material stored in a vault.
   * @param ignoreExistingVaults If true, ignore any existing, previously
   *        persisted vaults on unlock, instead starting with a clean slate.
   *        This option makes sense if a user has lost their password, and needs
   *        to generate a new keyring.
   *
   *        Note that old vaults aren't deleted, and can still be recovered
   *        later in an emergency.
   * @returns true if the service was successfully unlocked using the password,
   *          and false otherwise.
   */
  async unlock(
    password: string,
    ignoreExistingVaults = false
  ): Promise<boolean> {
    if (!this.locked()) {
      logger.warn("KeyringService is already unlocked!")
      this.#unlock()
      return true
    }

    if (!ignoreExistingVaults) {
      const currentEncryptedVault = await currentVault()
      if (currentEncryptedVault) {
        // attempt to load the vault
        const saltedKey = await deriveSymmetricKeyFromPassword(
          password,
          currentEncryptedVault.salt
        )

        // decryption failed
        if (
          !(await this.decryptKeyringVault(currentEncryptedVault, saltedKey))
        ) {
          return false
        }
      }
    }

    // if there's no vault or we want to force a new vault, generate a new key
    // and unlock
    if (!this.#cachedKey) {
      this.#cachedKey = await deriveSymmetricKeyFromPassword(password)
      await this.persistKeyrings()
    }

    this.#unlock()
    return true
  }

  /**
   * Attempts to decrypt the current encrypted vault with the password.
   */
  static async passwordChallenge(password: string): Promise<boolean> {
    const currentEncryptedVault = await currentVault()
    if (!currentEncryptedVault) {
      throw new Error("No keyring vault found")
    }

    // attempt to load the vault
    const saltedKey = await deriveSymmetricKeyFromPassword(
      password,
      currentEncryptedVault.salt
    )

    try {
      await decryptVault<SerializedKeyringData>(
        currentEncryptedVault,
        saltedKey
      )
      // success
      return true
    } catch (err) {
      // failed
      return false
    }
  }

  private async decryptKeyringVault(
    encryptedVault: EncryptedVault,
    saltedKey: SaltedKey
  ) {
    let plainTextVault: SerializedKeyringData
    try {
      plainTextVault = await decryptVault<SerializedKeyringData>(
        encryptedVault,
        saltedKey
      )
      this.#cachedKey = saltedKey
    } catch (err) {
      // if we weren't able to load the vault, don't unlock
      return false
    }
    // hooray! vault is loaded, import any serialized keyrings
    this.#keyrings = []
    this.#keyringMetadata = {
      ...plainTextVault.metadata,
    }
    // track seeds to map to an index so there's a way to identify when a keyring comes from the same master seed
    const seeds: Set<string> = new Set()

    // deserialize into keyrings
    plainTextVault.keyrings.forEach((kr) => {
      const keyring = v1KeyringDeserializer(kr)

      if (!keyring) {
        logger.error(`Failed to deserialize keyring: ${kr.fingerprint}`)
        return
      }

      // determine seed
      let seed
      if ((kr as unknown as SerializedHDKeyring).mnemonic) {
        seed = (kr as unknown as SerializedHDKeyring).mnemonic
      } else if ((kr as unknown as SeralizedFixedKeyring).privateKey) {
        seed = (kr as unknown as SeralizedFixedKeyring).privateKey
      } else {
        seed = kr.fingerprint // default to fingerprint if no seed material
      }
      // track it
      seeds.add(seed)

      // not the most efficient, but a simpler algo using positional index as the seedId since Set iterates with insert order
      const seedId = [...seeds].indexOf(seed)

      // tie it all together for keyring metadata
      const keyringMetadata = {
        ...(this.#keyringMetadata[kr.fingerprint] ?? {}),
        seedId,
      }

      // track it privately
      this.#keyrings.push(keyring)
      this.#keyringMetadata[kr.fingerprint] = keyringMetadata
    })

    this.#hiddenAccounts = {
      ...plainTextVault.hiddenAccounts,
    }

    this.emitKeyrings()
    return true
  }

  /**
   * Lock the keyring service, deleting references to the cached vault
   * encryption key and keyrings.
   */
  async lock(): Promise<void> {
    this.lastKeyringActivity = undefined
    this.lastOutsideActivity = undefined
    this.#cachedKey = null
    this.saveKeyringSession().then(() => {
      this.#keyrings = []
      this.#keyringMetadata = {}
      this.emitter.emit(KeyringEvents.LOCKED, true)
      this.emitKeyrings()
    })
  }

  /**
   * Notifies the keyring that an outside activity occurred. Outside activities
   * are used to delay autolocking.
   */
  markOutsideActivity(): void {
    if (typeof this.lastOutsideActivity !== "undefined") {
      this.lastOutsideActivity = Date.now()
    }
  }

  // Locks the keyring if the time since last keyring or outside activity
  // exceeds preset levels.
  private async autolockIfNeeded(): Promise<void> {
    if (
      typeof this.lastKeyringActivity === "undefined" ||
      typeof this.lastOutsideActivity === "undefined"
    ) {
      // Normally both activity counters should be undefined only if the keyring
      // is locked, otherwise they should both be set; regardless, fail safe if
      // either is undefined and the keyring is unlocked.
      if (!this.locked()) {
        await this.lock()
      }

      return
    }

    const now = Date.now()
    const timeSinceLastKeyringActivity = now - this.lastKeyringActivity
    const timeSinceLastOutsideActivity = now - this.lastOutsideActivity

    if (timeSinceLastKeyringActivity >= MAX_KEYRING_IDLE_TIME) {
      this.lock()
    } else if (timeSinceLastOutsideActivity >= MAX_OUTSIDE_IDLE_TIME) {
      this.lock()
    }
  }

  // Throw if the keyring is not unlocked; if it is, update the last keyring
  // activity timestamp.
  private requireUnlocked(): void {
    if (this.locked()) {
      throw new Error("KeyringService must be unlocked.")
    }

    this.lastKeyringActivity = Date.now()
    this.markOutsideActivity()
    this.saveKeyringSession()
  }

  // ///////////////////////////////////////////
  // METHODS THAT REQUIRE AN UNLOCKED SERVICE //
  // ///////////////////////////////////////////

  /**
   * Generate a new keyring
   *
   * @param type - the type of keyring to generate. Currently only supports 256-
   *        bit HD keys.
   * @param keyType the type of key to generate.
   * @returns An object containing the string ID of the new keyring and the
   *          mnemonic for the new keyring. Note that the mnemonic can only be
   *          accessed at generation time through this return value.
   */
  async generateNewKeyring(
    type: KeyringTypes,
    keyType: KeyType = KeyType.ED25519
  ): Promise<{ id: string; mnemonic: string[] }> {
    this.requireUnlocked()

    if (type !== KeyringTypes.mnemonicBIP39S256) {
      throw new Error(
        "KeyringService only supports generating 256-bit HD key trees"
      )
    }

    const newKeyring = new HDKeyring({ strength: 256, keyType })

    const { mnemonic } = newKeyring.serializeSync()

    return { id: newKeyring.fingerprint, mnemonic: mnemonic.split(" ") }
  }

  /**
   * Import keyring and pull the first address from that
   * keyring for system use.
   *
   * @param mnemonic - a seed phrase
   * @returns The string ID of the new keyring.
   */
  async importKeyring(
    mnemonic: string,
    source: "import" | "internal",
    path?: string
  ): Promise<string[]> {
    this.requireUnlocked()

    // track this mnemonic uniquely by using current time plus some pseudo randomness
    const seedId =
      new Date().getTime() + parseInt((Math.random() * 1000000).toString(), 10)
    const keyringMetadata = {
      source,
      seedId,
    }

    // path coming, assume caller knows what they are doing
    if (path) {
      const newKeyring = await this.saveKeyring(
        new HDKeyring({ mnemonic, path }),
        keyringMetadata
      )
      return [newKeyring.fingerprint]
    }

    // create keyring for POKT and EVM
    const poktKeyring = await this.saveKeyring(
      new HDKeyring({ mnemonic, path: defaultPathPokt }),
      keyringMetadata
    )
    // TODO: v0.4.0 wPOKT bridge: re-enable evm support
    // const evmKeyring = await this.saveKeyring(
    //   new HDKeyring({ mnemonic, path: defaultPathEth }),
    //   keyringMetadata
    // )

    return [
      poktKeyring.fingerprint,
      // evmKeyring.fingerprint
    ]
  }

  /**
   * Import private as a FixedKeyring and use that address for extension use
   */
  async importPrivateKey(
    privateKey: string,
    keyType: KeyType
  ): Promise<string> {
    this.requireUnlocked()
    if (!Object.values(KeyType).includes(keyType)) {
      throw new Error(`Unsupported keyType: ${keyType}`)
    }
    // track this mnemonic uniquely by using current time plus some pseudo randomness
    const seedId =
      new Date().getTime() + parseInt((Math.random() * 1000000).toString(), 10)
    const keyringMetadata = {
      source: "import",
      seedId,
    } as KeyringMetadata
    const newKeyring = await this.saveKeyring(
      new FixedKeyring({ privateKey, keyType }),
      keyringMetadata
    )
    return newKeyring.fingerprint
  }

  /**
   * Return an array of keyring representations that can safely be stored and
   * used outside the extension.
   */
  getKeyrings(): ExtensionKeyring[] {
    this.requireUnlocked()

    return this.#keyrings.map((kr) => ({
      keyringType: kr.keyringType,
      keyType: kr.keyType,
      addresses: [
        ...kr
          .getAddressesSync()
          .filter((address: string) => this.#hiddenAccounts[address] !== true),
      ],
      fingerprint: kr.fingerprint,
    }))
  }

  /**
   * Derive and return the next address from an HDKeyring.
   *
   * @param fingerprint - a string corresponding to an unlocked keyring.
   */
  async deriveAddress(fingerprint: string): Promise<HexString> {
    this.requireUnlocked()

    // find the keyring using a linear search
    const keyring = this.#keyrings.find((kr) => kr.fingerprint === fingerprint)
    if (!keyring) {
      throw new Error("Keyring not found.")
    }

    const keyringAddresses = keyring.getAddressesSync()

    // If There are any hidden addresses, show those first before adding new ones.
    const newAddress =
      keyringAddresses.find(
        (address: string) => this.#hiddenAccounts[address] === true
      ) ?? keyring.addAddressesSync(1)[0]

    if (keyring.getAddressesSync().length > 10) {
      throw new Error("Keyring has too many addresses")
    }

    this.#hiddenAccounts[newAddress] = false

    await this.persistKeyrings()

    this.emitter.emit(KeyringEvents.ADDRESS, {
      address: newAddress,
      keyType: keyring.keyType,
    })
    this.emitKeyrings()

    return newAddress
  }

  async hideAccount(address: HexString): Promise<void> {
    this.#hiddenAccounts[address] = true
    // avoid using #findKeyring which will blow up if keyring not found
    const keyring = this.#keyrings.find((kr) =>
      kr.getAddressesSync().includes(address)
    )
    if (!keyring) {
      logger.warn(`Unknown keyring for address: ${address}`)
      return
    }
    const keyringAddresses = await keyring.getAddresses()
    const areAllAddressesHidden = keyringAddresses.every(
      (keyringAddress: string) => this.#hiddenAccounts[keyringAddress] === true
    )
    if (areAllAddressesHidden) {
      this.#removeKeyring(keyring)
    }
    // always save vaults to disk after hiding address
    await this.persistKeyrings()
    this.emitKeyrings()
  }

  async exportPrivateKey(address: HexString): Promise<string> {
    this.requireUnlocked()
    const keyring = await this.#findKeyring(address)
    return keyring.getPrivateKey(address)
  }

  /**
   * Removes a keyring from memory and disk
   */
  #removeKeyring(
    keyring: Keyring<SerializedKeyring>
  ): Keyring<SerializedKeyring>[] {
    const filteredKeyrings = this.#keyrings.filter(
      (kr) => kr.fingerprint !== keyring.fingerprint
    )

    // delete hidden addresses
    keyring.getAddressesSync().forEach((keyringAddress: string) => {
      delete this.#hiddenAccounts[keyringAddress]
    })

    // delete keyring metadata
    delete this.#keyringMetadata[keyring.fingerprint]

    if (filteredKeyrings.length === this.#keyrings.length) {
      logger.warn(
        `Attempting to remove keyring that does not exist. fingerprint: (${keyring.fingerprint})`
      )
    }
    this.#keyrings = filteredKeyrings
    return filteredKeyrings
  }

  /**
   * Find keyring associated with an account.
   *
   * @param account - the account desired to search the keyring for.
   */
  async #findKeyring(account: HexString): Promise<Keyring<SerializedKeyring>> {
    const keyring = this.#keyrings.find((kr) =>
      kr.getAddressesSync().includes(account)
    )
    if (!keyring) {
      throw new Error("Address keyring not found.")
    }
    return keyring
  }

  /**
   * Sign a transaction.
   *
   * @param account - the account desired to sign the transaction
   * @param txRequest -
   */
  async signTransaction(
    addressOnNetwork: AddressOnNetwork,
    txRequest:
      | (EIP1559TransactionRequest & { nonce: number })
      | POKTTransactionRequest
  ): Promise<SignedEVMTransaction | SignedPOKTTransaction> {
    this.requireUnlocked()

    const { address: account, network } = addressOnNetwork

    // find the keyring using a linear search
    const keyring = await this.#findKeyring(account)

    if (network.family === "EVM") {
      const txReq = txRequest as EIP1559TransactionRequest & { nonce: number }
      // ethers has a looser / slightly different request type
      const ethersTxRequest =
        ethersTransactionRequestFromEIP1559TransactionRequest(txReq)
      // unfortunately, ethers gives us a serialized signed tx here
      const signed = await keyring.signTransaction(account, ethersTxRequest)

      // parse the tx, then unpack it as best we can
      const tx = parseRawTransaction(signed)

      if (
        !tx.hash ||
        !tx.from ||
        !tx.r ||
        !tx.s ||
        typeof tx.v === "undefined"
      ) {
        throw new Error("Transaction doesn't appear to have been signed.")
      }

      if (
        typeof tx.maxPriorityFeePerGas === "undefined" ||
        typeof tx.maxFeePerGas === "undefined" ||
        tx.type !== 2
      ) {
        throw new Error("Can only sign EIP-1559 conforming transactions")
      }

      // TODO move this to a helper function
      const signedTx: SignedEVMTransaction = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        nonce: tx.nonce,
        input: tx.data,
        value: tx.value.toBigInt(),
        type: tx.type,
        gasPrice: null,
        maxFeePerGas: tx.maxFeePerGas.toBigInt(),
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toBigInt(),
        gasLimit: tx.gasLimit.toBigInt(),
        r: tx.r,
        s: tx.s,
        v: tx.v,
        blockHash: null,
        blockHeight: null,
        asset: ETH,
        network: USE_MAINNET_FORK ? FORK : network,
      }

      return signedTx
    }

    const txReq = txRequest as POKTTransactionRequest
    const poktTxRequest =
      poktHDKeyringTransactionRequestFromPoktTransactionRequest(txReq)
    const txBytes = await keyring.signTransaction(account, poktTxRequest)

    // TODO move this to a helper function
    const signedTx: SignedPOKTTransaction = {
      txMsg: txReq.txMsg,
      chainID: txReq.chainID,
      fee: txReq.fee,
      feeDenom: txReq.feeDenom,
      from: account,
      to: txReq.txMsg.value.toAddress,
      tx: txBytes,
      network,
      memo: txReq.memo,
    }

    return signedTx
  }

  /**
   * Sign typed data based on EIP-712 with the usage of eth_signTypedData_v4 method,
   * more information about the EIP can be found at https://eips.ethereum.org/EIPS/eip-712
   *
   * @param typedData - the data to be signed
   * @param account - signers account address
   */

  async signTypedData({
    typedData,
    account,
  }: {
    typedData: EIP712TypedData
    account: HexString
  }): Promise<string> {
    this.requireUnlocked()
    const { domain, types, message } = typedData
    // find the keyring using a linear search
    const keyring = await this.#findKeyring(account)
    // When signing we should not include EIP712Domain type
    const { EIP712Domain, ...typesForSigning } = types
    try {
      const signature = await keyring.signTypedData(
        account,
        domain,
        typesForSigning,
        message
      )

      return signature
    } catch (error) {
      throw new Error("Signing data failed")
    }
  }

  /**
   * Sign data based on EIP-191 with the usage of personal_sign method,
   * more information about the EIP can be found at https://eips.ethereum.org/EIPS/eip-191
   *
   * @param signingData - the data to be signed
   * @param account - signers account address
   */

  async personalSign({
    signingData,
    account,
  }: {
    signingData: EIP191Data
    account: HexString
  }): Promise<string> {
    this.requireUnlocked()
    // find the keyring using a linear search
    const keyring = await this.#findKeyring(account)
    try {
      const signature = await keyring.signMessage(account, signingData)

      return signature
    } catch (error) {
      throw new Error("Signing data failed")
    }
  }

  // //////////////////
  // PRIVATE METHODS //
  // //////////////////

  private emitKeyrings() {
    if (this.locked()) {
      this.emitter.emit(KeyringEvents.KEYRINGS, {
        keyrings: [],
        keyringMetadata: {},
      })
    } else {
      const keyrings = this.getKeyrings()
      this.emitter.emit(KeyringEvents.KEYRINGS, {
        keyrings,
        keyringMetadata: { ...this.#keyringMetadata },
      })
    }
  }

  /**
   * Saves a new keyring
   */
  private async saveKeyring(
    keyring: Keyring<SerializedKeyring>,
    keyringMetadata: KeyringMetadata
  ) {
    // track metadata always
    this.#keyringMetadata[keyring.fingerprint] = keyringMetadata

    // ensure addresses are set by finding the first address or add the first one
    const addresses = keyring.getAddressesSync()
    const [address] =
      addresses.length > 0 ? addresses : keyring.addAddressesSync(1)

    // ensure not hidden in case of a previsouly added account
    this.#hiddenAccounts[address] = false

    // emits to update selected address
    this.emitter.emit(KeyringEvents.ADDRESS, {
      address,
      keyType: keyring.keyType,
    })

    // remove this keyring in case already tracking
    this.#keyrings = this.#keyrings.filter(
      (kr) => kr.fingerprint !== keyring.fingerprint
    )

    // track in memory
    this.#keyrings.push(keyring)
    // track in vaults
    await this.persistKeyrings()
    // notify redux
    this.emitKeyrings()

    return keyring
  }

  /**
   * Serialize, encrypt, and persist all HDKeyrings.
   */
  private async persistKeyrings() {
    this.requireUnlocked()

    // This if guard will always pass due to requireUnlocked, but statically
    // prove it to TypeScript.
    if (this.#cachedKey !== null) {
      const serializedKeyrings = this.#keyrings.map((kr) => kr.serializeSync())
      const hiddenAccounts = { ...this.#hiddenAccounts }
      const keyringMetadata = { ...this.#keyringMetadata }
      serializedKeyrings.sort((a, b) =>
        a.fingerprint > b.fingerprint ? 1 : -1
      )
      const vault = await encryptVault(
        {
          keyrings: serializedKeyrings,
          metadata: keyringMetadata,
          hiddenAccounts,
        },
        this.#cachedKey
      )
      await writeLatestEncryptedVault(vault)
    }
  }
}
