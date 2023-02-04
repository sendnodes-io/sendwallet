import browser from "webextension-polyfill";

import { EncryptedVault } from "./encryption";
import { UNIXTime } from "../../types";

type SerializedEncryptedVault = {
  timeSaved: UNIXTime;
  vault: EncryptedVault;
};

type SerializedEncryptedVaults = {
  version: 1;
  vaults: SerializedEncryptedVault[];
};

/**
 * Retrieve all serialized encrypted vaults from extension storage.
 *
 * @returns a schema version and array of serialized vaults
 */
export async function getEncryptedVaults(): Promise<SerializedEncryptedVaults> {
  const data = await browser.storage.local.get("poktWalletVaults");
  if (!("poktWalletVaults" in data)) {
    return {
      version: 1,
      vaults: [],
    };
  }
  const { poktWalletVaults } = data;
  if (
    "version" in poktWalletVaults &&
    poktWalletVaults.version === 1 &&
    "vaults" in poktWalletVaults &&
    Array.isArray(poktWalletVaults.vaults)
  ) {
    return poktWalletVaults as SerializedEncryptedVaults;
  }
  throw new Error("Encrypted vaults are using an unkown serialization format");
}

export async function currentVault(): Promise<EncryptedVault | null> {
  const { vaults } = await getEncryptedVaults();
  const currentVault = vaults[vaults.length - 1];
  return currentVault ? currentVault.vault : null;
}

function equalVaults(vault1: EncryptedVault, vault2: EncryptedVault): boolean {
  if (vault1.salt !== vault2.salt) {
    return false;
  }
  if (vault1.initializationVector !== vault2.initializationVector) {
    return false;
  }
  if (vault1.cipherText !== vault2.cipherText) {
    return false;
  }
  return true;
}

/**
 * Write an encryptedVault to extension storage if and only if it's different
 * than the most recently saved vault.
 *
 * @param encryptedVault - an encrypted keyring vault
 */
export async function writeLatestEncryptedVault(
  encryptedVault: EncryptedVault
): Promise<void> {
  const serializedVaults = await getEncryptedVaults();
  const vaults = [...serializedVaults.vaults];
  const currentLatest = vaults.reduce<SerializedEncryptedVault | null>(
    (newestVault, nextVault) =>
      newestVault && newestVault.timeSaved > nextVault.timeSaved
        ? newestVault
        : nextVault,
    null
  );
  const oldVault = currentLatest?.vault;
  // if there's been a change, persist the vault
  if (!(oldVault && equalVaults(oldVault, encryptedVault))) {
    await browser.storage.local.set({
      poktWalletVaults: {
        ...serializedVaults,
        vaults: [
          ...serializedVaults.vaults,
          {
            timeSaved: Date.now(),
            vault: encryptedVault,
          },
        ],
      },
    });
  }
}
