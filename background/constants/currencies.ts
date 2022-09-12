import { FiatCurrency, FungibleAsset } from "../assets"

export const USD: FiatCurrency = {
  name: "United States Dollar",
  symbol: "USD",
  decimals: 10,
}

export const EUR: FiatCurrency = {
  name: "euro",
  symbol: "EUR",
  decimals: 10,
}

export const CNY: FiatCurrency = {
  name: "renminbi",
  symbol: "CNY",
  decimals: 10,
}

export const FIAT_CURRENCIES = [USD]

export const ETH: FungibleAsset = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
  metadata: {
    coinGeckoID: "ethereum",
    tokenLists: [],
    websiteURL: "https://ethereum.org",
  },
}

export const MATIC: FungibleAsset = {
  name: "Polygon (MATIC)",
  symbol: "MATIC",
  decimals: 18,
  metadata: {
    coinGeckoID: "matic-network",
    tokenLists: [],
    websiteURL: "https://polygon.technology/",
  },
}

export const POKT: FungibleAsset = {
  name: "Pocket Network",
  symbol: "POKT",
  decimals: 6,
  metadata: {
    coinGeckoID: "pocket-network",
    tokenLists: [],
    websiteURL: "https://pokt.network",
  },
}

export const BTC: FungibleAsset = {
  name: "Bitcoin",
  symbol: "BTC",
  decimals: 8,
  metadata: {
    coinGeckoID: "bitcoin",
    tokenLists: [],
    websiteURL: "https://bitcoin.org",
  },
}

export const BASE_ASSETS = [POKT, ETH, MATIC]

export const BASE_ASSETS_BY_SYMBOL = BASE_ASSETS.reduce<{
  [assetSymbol: string]: FungibleAsset
}>((acc, asset) => {
  const newAcc = {
    ...acc,
  }
  newAcc[asset.symbol] = asset
  return newAcc
}, {})
