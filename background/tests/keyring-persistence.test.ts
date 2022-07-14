import { webcrypto } from "crypto"
import {
  encryptVault,
  decryptVault,
  deriveSymmetricKeyFromPassword,
} from "../services/keyring/encryption"

const originalCrypto = global.crypto
beforeEach(() => {
  // polyfill the WebCrypto API
  global.crypto = webcrypto as unknown as Crypto
})

afterEach(() => {
  global.crypto = originalCrypto
})

test("derives symmetric keys", async () => {
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < 5; i += 1) {
    const password = Buffer.from(
      global.crypto.getRandomValues(new Uint8Array(16))
    ).toString("base64")
    const newSalt = Buffer.from(
      global.crypto.getRandomValues(new Uint8Array(16))
    ).toString("base64")

    const { key, salt } = await deriveSymmetricKeyFromPassword(
      password,
      newSalt
    )
    expect(salt).toEqual(newSalt)

    expect(new Set(key.usages)).toEqual(new Set(["encrypt", "decrypt"]))
  }
  /* eslint-enable no-await-in-loop */
})

test("doesn't throw when encrypting a vault with a password", async () => {
  const vault = { a: 1 }
  const password = "this-is-a-poor-password"
  await encryptVault(vault, password)
})

test("avoids couple common footguns when encrypting a vault with a password", async () => {
  const vault = { thisIsAnInterestingKey: "sentinel" }
  const password = "this-is-a-poor-password"
  const newVault = await encryptVault(vault, password)
  // ensure sensitive plaintext isn't in the output, with a couple simple
  // transformations. Note this *doesn't* show correctness of encryption — a
  // simple substitution cipher would still pass this — it's just a smoke test.
  const importantPlaintext = ["thisIsAnInterestingKey", "sentinel", password]
  const serializedVault = JSON.stringify(newVault)
  importantPlaintext.forEach((t) => {
    expect(serializedVault).not.toContain(t)
    expect(serializedVault).not.toContain(t.toLowerCase())
    expect(serializedVault).not.toContain(Buffer.from(t).toString("base64"))
  })
})

test("can decrypt a vault encrypted with a password", async () => {
  const vault = { a: 1 }
  const password = "this-is-a-poor-password"
  const encryptedVault = await encryptVault(vault, password)

  const newVault = await decryptVault(encryptedVault, password)

  expect(newVault).toEqual(vault)
})

test("can decrypt a complex vault encrypted with a password", async () => {
  const vault = {
    a: { b: [1, 2, 3] },
    c: null,
    d: 123,
  }
  const password = "this-is-a-poor-password"
  const encryptedVault = await encryptVault(vault, password)

  const newVault = await decryptVault(encryptedVault, password)

  expect(newVault).toEqual(vault)
})

test("can decrypt a complex vault encrypted with a password", async () => {
  const vault = {
    a: { b: [1, 2, 3] },
    c: null,
    d: 123,
  }
  const password = Buffer.from(
    global.crypto.getRandomValues(new Uint8Array(16))
  ).toString("base64")

  const saltedKey = await deriveSymmetricKeyFromPassword(password)

  const encryptedVault = await encryptVault(vault, saltedKey)

  const newVault = await decryptVault(encryptedVault, saltedKey)

  expect(newVault).toEqual(vault)
})
