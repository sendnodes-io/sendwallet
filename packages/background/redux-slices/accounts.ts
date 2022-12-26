import { createSlice } from "@reduxjs/toolkit";
import { createBackgroundAsyncThunk } from "./utils";
import {
  AccountBalance,
  AddressOnMaybeNetwork,
  AddressOnNetwork,
  NameOnNetwork,
} from "../accounts";
import { AnyNetwork, Network } from "../networks";
import {
  AnyAsset,
  AnyAssetAmount,
  SmartContractFungibleAsset,
} from "../assets";
import {
  AssetMainCurrencyAmount,
  AssetDecimalAmount,
} from "./utils/asset-utils";
import { DomainName, HexString, URI } from "../types";
import { normalizeEVMAddress, normalizeAddress } from "../lib/utils";
import {
  selectKeyringForAddress,
  selectKeyringMetadataForAddress,
  selectSiblingKeyrings,
} from "./selectors";
import type { RootState } from ".";

const availableDefaultAvatars = [
  "invisiblefriends/65.png",
  "invisiblefriends/290.png",
  "invisiblefriends/1198.png",
  "invisiblefriends/1822.png",
  "invisiblefriends/1870.png",
  "invisiblefriends/2041.png",
  "invisiblefriends/2619.png",
  "invisiblefriends/3291.png",
  "invisiblefriends/4478.png",
  "invisiblefriends/1228.png",
  "invisiblefriends/1913.png",
  "invisiblefriends/2510.png",
  "invisiblefriends/2655.png",
  "invisiblefriends/3260.png",
  "invisiblefriends/4256.png",
  "invisiblefriends/4617.png",
  "invisiblefriends/2153.png",
  "invisiblefriends/3201.png",
  "invisiblefriends/3204.png",
  "invisiblefriends/3644.png",
  "invisiblefriends/3652.png",
  "invisiblefriends/3653.png",
];

export type AccountData = AddressOnNetwork & {
  balances: {
    [assetSymbol: string]: AccountBalance;
  };
  ens: {
    name?: DomainName;
    avatarURL?: URI;
  };
  defaultName: string;
  name: string;
  defaultAvatar: string;
  avatar: string;
};

export type AccountState = {
  account?: AddressOnNetwork;
  accountLoading?: string;
  hasAccountError?: boolean;
  // TODO Adapt to use AccountNetwork, probably via a Map and custom serialization/deserialization.
  accountsData: { [address: string]: AccountData | "loading" };
  combinedData: CombinedAccountData;
  removingAccount: false | "pending" | "fulfilled" | "rejected";
};

export type CombinedAccountData = {
  totalMainCurrencyValue?: string;
  assets: AnyAssetAmount[];
};

// Utility type, wrapped in CompleteAssetAmount<T>.
type InternalCompleteAssetAmount<
  E extends AnyAsset = AnyAsset,
  T extends AnyAssetAmount<E> = AnyAssetAmount<E>,
> = T & AssetMainCurrencyAmount & AssetDecimalAmount;

/**
 * An asset amount including localized and numeric main currency and decimal
 * equivalents, where applicable.
 */
export type CompleteAssetAmount<T extends AnyAsset = AnyAsset> =
  InternalCompleteAssetAmount<T, AnyAssetAmount<T>>;

export type CompleteSmartContractFungibleAssetAmount =
  CompleteAssetAmount<SmartContractFungibleAsset>;

export const initialState = {
  accountsData: {},
  combinedData: {
    totalMainCurrencyValue: "",
    assets: [],
  },
  removingAccount: false,
} as AccountState;

function newAccountData(
  address: HexString,
  network: AnyNetwork,
  existingAccountsCount: number,
): AccountData {
  const addressNum =
    network.family === "POKT" ? BigInt(`0x${address}`) : BigInt(address);
  const defaultAvatarIndex =
    // Skip potentially-used Avatars at the beginning of the array if relevant,
    // see below.
    (existingAccountsCount % availableDefaultAvatars.length) +
    Number(
      // Treat the address as a number and mod it to get an index into
      // default Avatars.
      addressNum %
        BigInt(
          availableDefaultAvatars.length -
            (existingAccountsCount % availableDefaultAvatars.length),
        ),
    );
  const defaultAccountAvatar = availableDefaultAvatars[defaultAvatarIndex];

  // Move used default Avatars to the start so they can be skipped above.
  availableDefaultAvatars.splice(defaultAvatarIndex, 1);
  availableDefaultAvatars.unshift(defaultAccountAvatar);

  // use IF token ID as the default name
  const defaultName = defaultAccountAvatar
    .replace("invisiblefriends/", "")
    .replace(".png", "");

  return {
    address,
    network,
    balances: {},
    ens: {},
    defaultName: `Wallet ${defaultName}`,
    name: "",
    defaultAvatar: `./images/avatars/${defaultAccountAvatar}`,
    avatar: "",
  };
}

function getOrCreateAccountData(
  data: AccountData | "loading",
  account: HexString,
  network: AnyNetwork,
  existingAccountsCount: number,
): AccountData {
  if (data === "loading" || !data) {
    return newAccountData(account, network, existingAccountsCount);
  }
  return data;
}

/**
 * Async thunk whose dispatch promise will return a resolved name or undefined
 * if the name cannot be resolved.
 */
export const resolveNameOnNetwork = createBackgroundAsyncThunk(
  "account/resolveNameOnNetwork",
  async (nameOnNetwork: NameOnNetwork, { extra: { main } }) => {
    return main.resolveNameOnNetwork(nameOnNetwork);
  },
);

/**
 * Async thunk whose dispatch promise will return when the account has been
 * added.
 *
 * Actual account data will flow into the redux store through other channels;
 * the promise returned from this action's dispatch will be fulfilled by a void
 * value.
 */
export const addAddressNetwork = createBackgroundAsyncThunk(
  "account/addAccount",
  async (addressNetwork: AddressOnNetwork, { dispatch, extra: { main } }) => {
    const normalizedAddressNetwork = {
      address: addressNetwork.address.toLowerCase(),
      network: addressNetwork.network,
    };

    dispatch(
      loadAccount({
        address: normalizedAddressNetwork.address,
        network: normalizedAddressNetwork.network,
      }),
    );
    await main.addAccount(normalizedAddressNetwork);
  },
);

export const removeAccount = createBackgroundAsyncThunk(
  "account/removeAccount",
  async (
    addressOnNetwork: AddressOnNetwork,
    { getState, dispatch, extra: { main } },
  ) => {
    const state = getState() as RootState;
    const keyring = selectKeyringForAddress(state, addressOnNetwork.address);

    // last address, remove sibling keyrings
    if (keyring?.addresses?.length === 1) {
      const keyringMetadata = selectKeyringMetadataForAddress(
        state,
        addressOnNetwork.address,
      );
      const siblingKeyrings = selectSiblingKeyrings(
        state,
        keyringMetadata.seedId,
      );
      await Promise.all(
        siblingKeyrings
          .flatMap((kr) => kr.addresses)
          .map(async (address) => {
            await dispatch(accountSlice.actions.deleteAccount({ address }));
            await main.removeAccount({ address }, { type: "keyring" });
          }),
      );
    } else {
      // still other addresses left, just remove this one
      await dispatch(accountSlice.actions.deleteAccount(addressOnNetwork));
      await main.removeAccount(addressOnNetwork, { type: "keyring" });
    }
  },
);

// TODO Much of the combinedData bits should probably be done in a Reselect
// TODO selector.
const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    clearRemovingAccount: (state) => {
      return {
        ...state,
        removingAccount: false,
      };
    },
    loadAccount: (
      state,
      {
        payload: { address: accountToLoad, network },
      }: { payload: { address: string; network: Network } },
    ) => {
      const accountKey = normalizeAddress(accountToLoad, network);
      return state.accountsData[accountKey]
        ? state // If the account data already exists, the account is already loaded.
        : {
            ...state,
            accountsData: { ...state.accountsData, [accountKey]: "loading" },
          };
    },
    deleteAccount: (
      state,
      { payload: accountToRemove }: { payload: AddressOnMaybeNetwork },
    ) => {
      const keyToRemove = normalizeAddress(
        accountToRemove.address,
        accountToRemove.network,
      );

      if (!state.accountsData[keyToRemove]) {
        return state;
      }
      // Immutably remove the account passed in
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { [keyToRemove]: _, ...withoutAccountToRemove } =
        state.accountsData;
      if (!Object.keys(withoutAccountToRemove).length) {
        return initialState;
      }
      return {
        ...state,
        accountsData: withoutAccountToRemove,
      };
    },
    updateAccountBalance: (
      immerState,
      { payload: accountsWithBalances }: { payload: AccountBalance[] },
    ) => {
      accountsWithBalances.forEach((updatedAccountBalance) => {
        const {
          address: updatedAccount,
          assetAmount: { asset: { symbol: updatedAssetSymbol } },
          network,
        } = updatedAccountBalance;

        const updatedAccountKey = normalizeAddress(updatedAccount, network);
        const existingAccountData = immerState.accountsData[updatedAccountKey];
        if (existingAccountData) {
          if (existingAccountData !== "loading") {
            existingAccountData.balances[updatedAssetSymbol] =
              updatedAccountBalance;
          } else {
            immerState.accountsData[updatedAccountKey] = {
              ...newAccountData(
                updatedAccountKey,
                updatedAccountBalance.network,
                Object.keys(immerState.accountsData).filter(
                  (key) => key !== updatedAccountKey,
                ).length,
              ),
              balances: {
                [updatedAssetSymbol]: updatedAccountBalance,
              },
            };
          }
        }
      });

      // A key assumption here is that the balances of two accounts in
      // accountsData are mutually exclusive; that is, that there are no two
      // accounts in accountsData all or part of whose balances are shared with
      // each other.
      const combinedAccountBalances = Object.values(immerState.accountsData)
        .flatMap((ad) =>
          ad === "loading"
            ? []
            : Object.values(ad.balances).map((ab) => ab.assetAmount),
        )
        .filter((b) => b);

      immerState.combinedData.assets = Object.values(
        combinedAccountBalances.reduce<{
          [symbol: string]: AnyAssetAmount;
        }>((acc, combinedAssetAmount) => {
          const assetSymbol = combinedAssetAmount.asset.symbol;
          acc[assetSymbol] = {
            ...combinedAssetAmount,
            amount:
              (acc[assetSymbol]?.amount || 0n) + combinedAssetAmount.amount,
          };
          return acc;
        }, {}),
      );
    },
    updateENSName: (
      immerState,
      {
        payload: addressNetworkName,
      }: { payload: AddressOnNetwork & { name: DomainName } },
    ) => {
      // TODO Refactor when accounts are also keyed per network.
      const accountKey = normalizeEVMAddress(addressNetworkName.address);

      // No entry means this ENS name isn't being tracked here.
      if (immerState.accountsData[accountKey] === undefined) {
        return;
      }

      const baseAccountData = getOrCreateAccountData(
        immerState.accountsData[accountKey],
        accountKey,
        addressNetworkName.network,
        Object.keys(immerState.accountsData).filter((key) => key !== accountKey)
          .length,
      );
      immerState.accountsData[accountKey] = {
        ...baseAccountData,
        ens: { ...baseAccountData.ens, name: addressNetworkName.name },
      };
    },
    updateName: (
      immerState,
      {
        payload: addressNetworkName,
      }: { payload: AddressOnNetwork & { name: string } },
    ) => {
      // TODO Refactor when accounts are also keyed per network.
      const accountKey = normalizeAddress(
        addressNetworkName.address,
        addressNetworkName.network,
      );
      // No entry means this ENS name isn't being tracked here.
      if (immerState.accountsData[accountKey] === undefined) {
        return;
      }

      const baseAccountData = getOrCreateAccountData(
        immerState.accountsData[accountKey],
        accountKey,
        addressNetworkName.network,
        Object.keys(immerState.accountsData).filter((key) => key !== accountKey)
          .length,
      );
      immerState.accountsData[accountKey] = {
        ...baseAccountData,
        name: addressNetworkName.name,
      };
    },
    updateENSAvatar: (
      immerState,
      {
        payload: addressNetworkAvatar,
      }: { payload: AddressOnNetwork & { avatar: URI } },
    ) => {
      // TODO Refactor when accounts are also keyed per network.
      const accountKey = normalizeEVMAddress(addressNetworkAvatar.address);

      // No entry means this ENS name isn't being tracked here.
      if (immerState.accountsData[accountKey] === undefined) {
        return;
      }

      const baseAccountData = getOrCreateAccountData(
        immerState.accountsData[accountKey],
        accountKey,
        addressNetworkAvatar.network,
        Object.keys(immerState.accountsData).filter((key) => key !== accountKey)
          .length,
      );
      immerState.accountsData[accountKey] = {
        ...baseAccountData,
        ens: { ...baseAccountData.ens, avatarURL: addressNetworkAvatar.avatar },
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(removeAccount.pending, (state) => {
        return {
          ...state,
          removingAccount: "pending",
        };
      })
      .addCase(removeAccount.fulfilled, (state) => {
        return {
          ...state,
          removingAccount: "fulfilled",
        };
      })
      .addCase(removeAccount.rejected, (state) => {
        return {
          ...state,
          removingAccount: "rejected",
        };
      });
  },
});

export const {
  loadAccount,
  updateAccountBalance,
  updateENSName,
  updateName,
  updateENSAvatar,
  clearRemovingAccount,
} = accountSlice.actions;

export default accountSlice.reducer;
