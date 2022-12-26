import { FiatCurrency, FungibleAsset } from "../../assets";
import { AddressOnNetwork } from "../../accounts";
import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types";

import { Preferences, TokenListPreferences } from "./types";
import { getOrCreateDB, PreferenceDatabase } from "./db";
import BaseService from "../base";

export enum EventNames {
  PREFERENCES_CHANGES = "preferencesChanges",
  INITIALIZE_DEFAULT_WALLET = "initializeDefaultWallet",
  SELECTED_ACCOUNT_CHANGED = "selectedAccountChanged",
}

interface Events extends ServiceLifecycleEvents {
  [EventNames.PREFERENCES_CHANGES]: Preferences;
  [EventNames.INITIALIZE_DEFAULT_WALLET]: boolean;
  [EventNames.SELECTED_ACCOUNT_CHANGED]: AddressOnNetwork;
}

/*
 * The preference service manages user preference persistence, emitting an
 * event when preferences change.
 */
export default class PreferenceService extends BaseService<Events> {
  /*
   * Create a new PreferenceService. The service isn't initialized until
   * startService() is called and resolved.
   */
  static create: ServiceCreatorFunction<Events, PreferenceService, []> =
    async () => {
      const db = await getOrCreateDB();

      return new this(db);
    };

  private constructor(private db: PreferenceDatabase) {
    super();
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService();

    await this.emitter.emit(
      EventNames.INITIALIZE_DEFAULT_WALLET,
      await this.getDefaultWallet(),
    );
    await this.emitter.emit(
      EventNames.SELECTED_ACCOUNT_CHANGED,
      await this.getSelectedAccount(),
    );
  }

  protected async internalStopService(): Promise<void> {
    this.db.close();

    await super.internalStopService();
  }

  async getCurrency(): Promise<FiatCurrency> {
    return (await this.db.getPreferences())?.currency;
  }

  async getTokenListPreferences(): Promise<TokenListPreferences> {
    return (await this.db.getPreferences())?.tokenLists;
  }

  async getDefaultWallet(): Promise<boolean> {
    return (await this.db.getPreferences())?.defaultWallet;
  }

  async setDefaultWalletValue(newDefaultWalletValue: boolean): Promise<void> {
    return this.db.setDefaultWalletValue(newDefaultWalletValue);
  }

  async getSelectedAccount(): Promise<AddressOnNetwork> {
    return (await this.db.getPreferences())?.selectedAccount;
  }

  async setSelectedAccount(addressNetwork: AddressOnNetwork): Promise<void> {
    await this.db.setSelectedAccount(addressNetwork);
    this.emitter.emit(
      EventNames.SELECTED_ACCOUNT_CHANGED,
      await this.getSelectedAccount(),
    );
  }

  async getDefaultCustomAssets(): Promise<FungibleAsset[]> {
    return (await this.db.getPreferences())?.customAssets;
  }
}
