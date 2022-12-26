import { createSlice } from "@reduxjs/toolkit";
import Emittery from "emittery";

import { KeyType } from "@sendnodes/hd-keyring";
import { createBackgroundAsyncThunk } from "./utils";
import {
  ExtensionKeyring as Keyring,
  KeyringMetadata,
} from "../services/keyring/index";
import { emitteryDebugLogger } from "../utils/emittery";
import logger from "../lib/logger";

type KeyringsState = {
  keyrings: Keyring[];
  keyringMetadata: { [keyringId: string]: KeyringMetadata };
  importing: false | "pending" | "done" | "failed";
  deriving: false | "pending" | "done";
  unlocking: false | "pending" | "done" | "failed";
  status: "locked" | "unlocked" | "uninitialized";
};

export const initialState: KeyringsState = {
  keyrings: [],
  keyringMetadata: {},
  importing: false,
  deriving: false,
  unlocking: false,
  status: "uninitialized",
};

export enum EventNames {
  CREATE_PASSWORD = "createPassword",
  UNLOCK_KEYRINGS = "unlockKeyrings",
  LOCK_KEYRINGS = "lockKeyrings",
  GENERATE_NEW_KEYRING = "generateNewKeyring",
  DERIVE_ADDRESS = "deriveAddress",
  IMPORT_KEYRING = "importKeyring",
  IMPORT_PRIVATE_KEY = "importPrivateKey",
  EXPORT_PRIVATE_KEY = "exportPrivateKey",
}

export type Events = {
  [EventNames.CREATE_PASSWORD]: string;
  [EventNames.UNLOCK_KEYRINGS]: string;
  [EventNames.LOCK_KEYRINGS]: never;
  [EventNames.GENERATE_NEW_KEYRING]: never;
  [EventNames.DERIVE_ADDRESS]: string;
  [EventNames.IMPORT_KEYRING]: ImportKeyring;
  [EventNames.IMPORT_PRIVATE_KEY]: ImportPrivateKey;
  [EventNames.EXPORT_PRIVATE_KEY]: ExportPrivateKey;
};

export const emitter = new Emittery<Events>({
  debug: {
    name: "redux-slices/keyrings",
    logger: emitteryDebugLogger(),
  },
});

interface ImportKeyring {
  mnemonic: string;
  source: "internal" | "import";
  path?: string;
}

export interface ImportPrivateKey {
  privateKey: string;
  keyType: KeyType;
}

interface ExportPrivateKey {
  /**
   * Password of current encrypted vault
   */
  password: string;
  /**
   * Public address of requested private key
   */
  address: string;
}

export interface KeyringMnemonic {
  id: string;
  mnemonic: string[];
}

export type GenerateKeyringResponse = {
  [EventNames.GENERATE_NEW_KEYRING]: KeyringMnemonic;
};

// Async thunk to bubble the importKeyring action from  store to emitter.
export const importKeyring = createBackgroundAsyncThunk(
  "keyrings/importKeyring",
  async ({ mnemonic, source, path }: ImportKeyring, { getState, dispatch }) => {
    await emitter.emit(EventNames.IMPORT_KEYRING, { mnemonic, path, source });
  },
);

// Async thunk to bubble the importPrivateKey action from store to emitter.
export const importPrivateKey = createBackgroundAsyncThunk(
  "keyrings/importPrivateKey",
  async ({ privateKey, keyType }: ImportPrivateKey, { getState, dispatch }) => {
    try {
      await emitter.emit(EventNames.IMPORT_PRIVATE_KEY, {
        privateKey,
        keyType,
      });
    } catch (e) {
      logger.error("Failed importing private key yup", e);
      throw e;
    }
  },
);

// Async thunk to bubble the unlockKeyring action from store to emitter.
export const unlockKeyrings = createBackgroundAsyncThunk(
  "keyrings/unlockKeyrings",
  async (password: string) => {
    await emitter.emit(EventNames.UNLOCK_KEYRINGS, password);
  },
);

export const deriveAddress = createBackgroundAsyncThunk(
  "keyrings/deriveAddress",
  async (id: string) => {
    await emitter.emit(EventNames.DERIVE_ADDRESS, id);
  },
);

export const exportPrivateKey = createBackgroundAsyncThunk(
  "keyrings/exportPrivateKey",
  async ({ password, address }: ExportPrivateKey) => {
    await emitter.emit(EventNames.EXPORT_PRIVATE_KEY, { password, address });
  },
);

const keyringsSlice = createSlice({
  name: "keyrings",
  initialState,
  reducers: {
    clearImporting: (state) => ({ ...state, importing: false }),
    keyringLocked: (state) => ({
      ...state,
      status: "locked",
      unlocking: false,
    }),
    keyringUnlocked: (state) => ({
      ...state,
      status: "unlocked",
      unlocking: false,
    }),
    keyringUnlockedFailed: (state) => ({ ...state, unlocking: "failed" }),
    updateKeyrings: (
      state,
      {
        payload: { keyrings, keyringMetadata },
      }: {
        payload: {
          keyrings: Keyring[];
          keyringMetadata: { [keyringId: string]: KeyringMetadata };
        };
      },
    ) => {
      // When the keyrings are locked, we receive updateKeyrings with an empty
      // list as the keyring service clears the in-memory keyrings. For UI
      // purposes, however, we want to continue tracking the keyring metadata,
      // so we ignore an empty list if the keyrings are locked.
      if (keyrings.length === 0 && state.status === "locked") {
        return state;
      }

      return {
        ...state,
        keyrings,
        keyringMetadata,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(importKeyring.rejected, (state) => {
        return {
          ...state,
          importing: "failed",
        };
      })
      .addCase(importKeyring.pending, (state) => {
        return {
          ...state,
          importing: "pending",
        };
      })
      .addCase(importKeyring.fulfilled, (state) => {
        return {
          ...state,
          importing: "done",
        };
      })
      .addCase(importPrivateKey.pending, (state) => {
        return {
          ...state,
          importing: "pending",
        };
      })
      .addCase(importPrivateKey.fulfilled, (state) => {
        return {
          ...state,
          importing: "done",
        };
      })
      .addCase(importPrivateKey.rejected, (state) => {
        return {
          ...state,
          importing: "failed",
        };
      })
      .addCase(unlockKeyrings.pending, (state) => {
        return {
          ...state,
          unlocking: "pending",
        };
      })
      .addCase(unlockKeyrings.fulfilled, (state) => {
        return {
          ...state,
          unlocking: "done",
        };
      })
      .addCase(deriveAddress.pending, (state) => {
        return {
          ...state,
          deriving: "pending",
        };
      })
      .addCase(deriveAddress.fulfilled, (state) => {
        return {
          ...state,
          deriving: "done",
        };
      })
      .addCase(deriveAddress.rejected, (state) => {
        return {
          ...state,
          deriving: false,
        };
      });
  },
});

export const {
  updateKeyrings,
  keyringLocked,
  keyringUnlocked,
  keyringUnlockedFailed,
  clearImporting,
} = keyringsSlice.actions;

export default keyringsSlice.reducer;

// Async thunk to bubble the generateNewKeyring action from  store to emitter.
export const generateNewKeyring = createBackgroundAsyncThunk(
  "keyrings/generateNewKeyring",
  async () => {
    await emitter.emit(EventNames.GENERATE_NEW_KEYRING);
  },
);

export const lockKeyrings = createBackgroundAsyncThunk(
  "keyrings/lockKeyrings",
  async () => {
    await emitter.emit(EventNames.LOCK_KEYRINGS);
  },
);

export const createPassword = createBackgroundAsyncThunk(
  "keyrings/createPassword",
  async (password: string) => {
    await emitter.emit(EventNames.CREATE_PASSWORD, password);
  },
);
