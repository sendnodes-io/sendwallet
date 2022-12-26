import { createSlice, createSelector } from "@reduxjs/toolkit";
import Emittery from "emittery";
import browser from "webextension-polyfill";
import { AddressOnNetwork } from "../accounts";
import { POCKET } from "../constants";
import {
  AnalyticsTrackEvent,
  AnalyticsTrackPageView,
  trackEvent as analyticsTrackEvent,
  trackPageView as analyticsTrackPageView,
} from "../lib/analytics";
import { Network } from "../networks";
import { emitteryDebugLogger } from "../utils/emittery";
import { createBackgroundAsyncThunk } from "./utils";

const defaultSettings = {
  hideDust: false,
  defaultWallet: true,
};

export interface Location {
  pathname: string;
  key?: string;
  hash: string;
}

export type UIState = {
  selectedAccount: AddressOnNetwork;
  showingActivityDetailID: string | null;
  initializationLoadingTimeExpired: boolean;
  settings: { hideDust: boolean; defaultWallet: boolean };
  snackbarMessage: string;
  routeHistoryEntries?: Partial<Location>[];
  popoutWindowId: number | null;
  activeTab: browser.Tabs.Tab | null;
};

export enum EventNames {
  SNACKBAR_MESSAGE = "snackbarMessage",
  NEW_DEFAULT_WALLET_VALUE = "newDefaultWalletValue",
  REFRESH_BACKGROUND_PAGE = "refreshBackgroundPage",
  NEW_SELECTED_ACCOUNT = "newSelectedAccount",
  NEW_SELECTED_NETWORK = "newSelectedNetwork",
}

export type Events = {
  [EventNames.SNACKBAR_MESSAGE]: string;
  [EventNames.NEW_DEFAULT_WALLET_VALUE]: boolean;
  [EventNames.REFRESH_BACKGROUND_PAGE]: null;
  [EventNames.NEW_SELECTED_ACCOUNT]: AddressOnNetwork;
};

export const emitter = new Emittery<Events>({
  debug: {
    name: "redux-slices/ui",
    logger: emitteryDebugLogger(),
  },
});

export const initialState: UIState = {
  showingActivityDetailID: null,
  selectedAccount: {
    address: "",
    network: POCKET,
  },
  initializationLoadingTimeExpired: false,
  settings: defaultSettings,
  snackbarMessage: "",
  popoutWindowId: null,
  activeTab: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleHideDust: (
      immerState,
      { payload: shouldHideDust }: { payload: boolean },
    ): void => {
      immerState.settings = {
        hideDust: shouldHideDust,
        defaultWallet: immerState.settings?.defaultWallet,
      };
    },
    setShowingActivityDetail: (
      state,
      { payload: transactionID }: { payload: string | null },
    ): UIState => ({
      ...state,
      showingActivityDetailID: transactionID,
    }),
    setSelectedAccount: (immerState, { payload: addressNetwork }) => {
      immerState.selectedAccount = addressNetwork;
    },
    setActiveTab: (immerState, { payload: activeTab }) => {
      immerState.activeTab = activeTab;
    },
    initializationLoadingTimeHitLimit: (state) => ({
      ...state,
      initializationLoadingTimeExpired: true,
    }),
    setSnackbarMessage: (
      state,
      { payload: snackbarMessage }: { payload: string },
    ): UIState => {
      return {
        ...state,
        snackbarMessage,
      };
    },
    clearSnackbarMessage: (state): UIState => ({
      ...state,
      snackbarMessage: "",
    }),
    setDefaultWallet: (
      state,
      { payload: defaultWallet }: { payload: boolean },
    ) => ({
      ...state,
      settings: {
        ...state.settings,
        defaultWallet,
      },
    }),
    setRouteHistoryEntries: (
      state,
      { payload: routeHistoryEntries }: { payload: Partial<Location>[] },
    ) => ({
      ...state,
      routeHistoryEntries,
    }),
    setPopoutWindowId: (
      immerState,
      { payload: popoutWindowId }: { payload: number },
    ) => ({
      ...immerState,
      popoutWindowId,
    }),
  },
});

export const {
  setShowingActivityDetail,
  initializationLoadingTimeHitLimit,
  toggleHideDust,
  setSelectedAccount,
  setActiveTab,
  setSnackbarMessage,
  setDefaultWallet,
  clearSnackbarMessage,
  setRouteHistoryEntries,
  setPopoutWindowId,
} = uiSlice.actions;

export default uiSlice.reducer;

// Async thunk to bubble the setNewDefaultWalletValue action from  store to emitter.
export const setNewDefaultWalletValue = createBackgroundAsyncThunk(
  "ui/setNewDefaultWalletValue",
  async (defaultWallet: boolean, { dispatch }) => {
    await emitter.emit(EventNames.NEW_DEFAULT_WALLET_VALUE, defaultWallet);
    // Once the default value has persisted, propagate to the store.
    dispatch(uiSlice.actions.setDefaultWallet(defaultWallet));
  },
);

export const setNewSelectedAccount = createBackgroundAsyncThunk(
  "ui/setNewCurrentAddressValue",
  async (addressNetwork: AddressOnNetwork, { dispatch }) => {
    await emitter.emit(EventNames.NEW_SELECTED_ACCOUNT, addressNetwork);
    // Once the default value has persisted, propagate to the store.
    dispatch(uiSlice.actions.setSelectedAccount(addressNetwork));
  },
);

export const refreshBackgroundPage = createBackgroundAsyncThunk(
  "ui/refreshBackgroundPage",
  async () => {
    await emitter.emit(EventNames.REFRESH_BACKGROUND_PAGE, null);
  },
);

export const trackPageView = createBackgroundAsyncThunk(
  "ui/trackPageView",
  async (args: AnalyticsTrackPageView) => {
    await analyticsTrackPageView(args);
  },
);

export const trackEvent = createBackgroundAsyncThunk(
  "ui/trackEvent",
  async (args: AnalyticsTrackEvent) => {
    await analyticsTrackEvent(args);
  },
);

export const selectUI = createSelector(
  (state: { ui: UIState }): UIState | undefined => state.ui,
  (uiState) => uiState,
);

export const selectSettings = createSelector(selectUI, (ui) => ui?.settings);

export const selectHideDust = createSelector(
  selectSettings,
  (settings) => settings?.hideDust ?? true,
);

export const selectSnackbarMessage = createSelector(
  selectUI,
  (ui) => ui?.snackbarMessage ?? "",
);

export const selectDefaultWallet = createSelector(
  selectSettings,
  (settings) => settings?.defaultWallet,
);
