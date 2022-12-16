import { createSelector, OutputSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."
import {
  ExtensionKeyring as Keyring,
  KeyringMetadata,
} from "../../services/keyring"

export const selectKeyringStatus = createSelector(
  (state: RootState) => state.keyrings?.status,
  (status) => status
)

export const selectKeyrings = (state: RootState) => state.keyrings.keyrings
export const selectKeyringMetadata = (state: RootState) =>
  state.keyrings.keyringMetadata

export const selectKeyringByAddress = (
  address: string
): OutputSelector<
  RootState,
  Keyring | undefined,
  (res: Keyring[]) => Keyring | undefined
> =>
  createSelector(
    [(state: RootState) => state.keyrings.keyrings],
    (keyrings) => {
      const kr = keyrings.find((keyring) => keyring.addresses.includes(address))
      return kr
    }
  )

export const selectKeyringSigningAddresses = createSelector(
  selectKeyrings,
  (keyrings) => keyrings.flatMap((keyring) => keyring.addresses)
)

export const selectKeyringsByAddresses = createSelector(
  selectKeyrings,
  (keyrings): { [address: string]: Keyring } =>
    Object.fromEntries(
      keyrings.flatMap((keyring) =>
        keyring.addresses.map((address) => [address, keyring])
      )
    )
)

export const selectMetadataByAddress = createSelector(
  selectKeyrings,
  selectKeyringMetadata,
  (keyrings, keyringMetadata): { [address: string]: KeyringMetadata } =>
    Object.fromEntries(
      keyrings
        // get rid of "Loading" keyrings
        .filter((keyring) => !!keyring.fingerprint)
        .flatMap((keyring) =>
          keyring.addresses.map((address) => [
            address,
            keyringMetadata[keyring.fingerprint!],
          ])
        )
    )
)
export const selectKeyringForAddress = createSelector(
  selectKeyringsByAddresses,
  (_: RootState, address: string) => address,
  (keyringsByAddress, address) => keyringsByAddress[address]
)

export const selectKeyringMetadataForAddress = createSelector(
  selectMetadataByAddress,
  (_: RootState, address: string) => address,
  (metadataByAddress, address) => metadataByAddress[address]
)

export const selectSiblingKeyrings = createSelector(
  selectKeyrings,
  selectKeyringMetadata,
  (_: RootState, seedId: number) => seedId,
  (keyrings, metadata, seedId) => {
    const fingerprints = Object.entries(metadata)
      .filter(([fp, metadatum]) => metadatum.seedId === seedId)
      .map(([fp, _]) => fp)
    return keyrings.filter((kr) => fingerprints.includes(kr.fingerprint))
  }
)

export const selectSourcesByAddress = createSelector(
  selectKeyrings,
  selectKeyringMetadata,
  (
    keyrings,
    keyringMetadata
  ): {
    [keyringId: string]: "import" | "internal"
  } =>
    Object.fromEntries(
      keyrings
        // get rid of "Loading" keyrings
        .filter((keyring) => !!keyring.fingerprint)
        .flatMap((keyring) =>
          keyring.addresses.map((address) => [
            address,
            // Guaranteed to exist by the filter above
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            keyringMetadata[keyring.fingerprint!]?.source,
          ])
        )
    )
)
