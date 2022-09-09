import { POCKET, USD, POKT, ETH, MATIC } from "../../constants"
import { Preferences } from "./types"

const defaultPreferences: Preferences = {
  tokenLists: {
    autoUpdate: false,
    urls: [
      // TODO: v0.4.0 wPOKT bridge: re-enable EVM support
      // "https://ipfs.fleek.co/ipfs/bafybeicovpqvb533alo5scf7vg34z6fjspdytbzsa2es2lz35sw3ksh2la", // the Tally community-curated list
      // "https://gateway.ipfs.io/ipns/tokens.uniswap.org", // the Uniswap default list
      // "https://yearn.science/static/tokenlist.json", // the Yearn list
      // "https://messari.io/tokenlist/messari-verified", // Messari-verified projects
      // "https://wrapped.tokensoft.eth.link", // Wrapped tokens
      // "https://tokenlist.aave.eth.link", // Aave-listed tokens and interest-bearing assets
      // "https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json", // Compound-listed tokens and interest-bearing assets
    ],
  },
  currency: USD,
  defaultWallet: true,
  selectedAccount: {
    address: "",
    network: POCKET,
  },
  customAssets: [
    POKT,
    // TODO: v0.4.0 wPOKT bridge: re-enable EVM support
    // , ETH, MATIC
  ],
}

export default defaultPreferences
