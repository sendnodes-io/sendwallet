import { combineReducers } from "redux";

import { HIDE_EARN_PAGE } from "../features/features";

import accountsReducer, { AccountState } from "./accounts";
import assetsReducer, { AssetsState } from "./assets";
import activitiesReducer, { ActivitiesState } from "./activities";
import keyringsReducer, { KeyringsState } from "./keyrings";
import networksReducer, { NetworksState } from "./networks";
import transactionConstructionReducer, {
  TransactionConstruction,
} from "./transaction-construction";
import uiReducer, { UIState } from "./ui";
import dappPermissionReducer, { DAppPermissionState } from "./dapp-permission";
import ledgerReducer, { LedgerState } from "./ledger";
import signingReducer, { SigningState } from "./signing";
import earnReducer from "./earn";

const mainReducer = combineReducers({
  account: accountsReducer,
  assets: assetsReducer,
  activities: activitiesReducer,
  keyrings: keyringsReducer,
  networks: networksReducer,
  transactionConstruction: transactionConstructionReducer,
  ui: uiReducer,
  dappPermission: dappPermissionReducer,
  signing: signingReducer,
  ledger: ledgerReducer,
});

export default mainReducer;

export type RootState = {
  account: AccountState;
  assets: AssetsState;
  activities: ActivitiesState;
  keyrings: KeyringsState;
  networks: NetworksState;
  transactionConstruction: TransactionConstruction;
  ui: UIState;
  dappPermission: DAppPermissionState;
  signing: SigningState;
  ledger: LedgerState;
};
