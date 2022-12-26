import { combineReducers } from "redux";

import { HIDE_EARN_PAGE } from "../features/features";

import accountsReducer from "./accounts";
import assetsReducer from "./assets";
import activitiesReducer from "./activities";
import keyringsReducer from "./keyrings";
import networksReducer from "./networks";
import transactionConstructionReducer from "./transaction-construction";
import uiReducer from "./ui";
import dappPermissionReducer from "./dapp-permission";
import ledgerReducer from "./ledger";
import signingReducer from "./signing";
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
  ...(HIDE_EARN_PAGE ? {} : { earn: earnReducer }),
});

export default mainReducer;

export type RootState = ReturnType<typeof mainReducer>;
