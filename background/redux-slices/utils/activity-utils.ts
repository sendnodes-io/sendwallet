import { convertToEth, weiToGwei } from "../../lib/utils"
import { EnrichedEVMTransaction, EnrichedPOKTTransaction } from "../../services/enrichment"
import { HexString } from "../../types"

export type ActivityRecipient = {
  address: HexString | undefined
  name?: string
}

export function getRecipient(activityItem: ActivityItem): ActivityRecipient | undefined {
  const { annotation } = activityItem

  switch (activityItem.network.family) {
    case "EVM":
      const evmActivityItem = activityItem as EnrichedEVMTransaction &
        AdditionalActivityInfo
      switch (annotation?.type) {
        case "asset-transfer":
          return {
            address: annotation.recipientAddress,
            name: annotation.recipientName,
          }
        case "contract-interaction":
          return { address: evmActivityItem.to, name: annotation.contractName }
        default:
          return { address: evmActivityItem.to }
      }
    case "POKT":
      const poktActivityItem = activityItem as EnrichedPOKTTransaction &
        AdditionalActivityInfo
      return { address: poktActivityItem.to }
  }
}

function ethTransformer(
  value: string | number | bigint | null | undefined
): string {
  if (value === null || typeof value === "undefined") {
    return "(Unknown)"
  }
  return `${convertToEth(value)} ETH`
}

function gweiTransformer(
  value: string | number | bigint | null | undefined
): string {
  if (value === null || typeof value === "undefined") {
    return "(Unknown)"
  }
  return `${weiToGwei(value)} Gwei`
}

type FieldAdapter<T> = {
  readableName: string
  transformer: (value: T) => string
  detailTransformer: (value: T) => string
}

export type UIAdaptationMap<T> = {
  [P in keyof T]?: FieldAdapter<T[P]>
}

type AdditionalActivityInfo = {
  localizedDecimalValue: string
  timestamp?: number
  unixTimestamp?: string
  relativeTimestamp?: string
  blockHeight: number | null
  fromTruncated: string
  toTruncated: string
  infoRows: {
    [name: string]: {
      label: string
      value: string
      valueDetail: string
    }
  }
}

export type EVMActivityItem = (EnrichedEVMTransaction & AdditionalActivityInfo)
export type POKTActivityItem = (EnrichedPOKTTransaction & AdditionalActivityInfo)
export type ActivityItem = EVMActivityItem | POKTActivityItem

/**
 * Given a map of adaptations from fields in type T, return all keys that need
 * adaptation with three fields, a label, a value, and a valueDetail, derived
 * based on the adaptation map.
 */
export function adaptForUI<T>(
  fieldAdapters: UIAdaptationMap<T>,
  item: T
): {
    [key in keyof UIAdaptationMap<T>]: {
      label: string
      value: string
      valueDetail: string
    }
  } {
  // The as below is dicey but reasonable in our usage.
  return Object.keys(fieldAdapters).reduce(
    (adaptedFields, key) => {
      const knownKey = key as keyof UIAdaptationMap<T> // statically guaranteed
      const adapter = fieldAdapters[knownKey] as
        | FieldAdapter<unknown>
        | undefined

      if (typeof adapter === "undefined") {
        return adaptedFields
      }

      const { readableName, transformer, detailTransformer } = adapter

      return {
        ...adaptedFields,
        [key]: {
          label: readableName,
          value: transformer(item[knownKey]),
          valueDetail: detailTransformer(item[knownKey]),
        },
      }
    },
    {} as {
      [key in keyof UIAdaptationMap<T>]: {
        label: string
        value: string
        valueDetail: string
      }
    }
  )
}

export const keysMap: UIAdaptationMap<ActivityItem> = {
  blockHeight: {
    readableName: "Block Height",
    transformer: (height: number | null) =>
      height === null ? "(pending)" : height.toString(),
    detailTransformer: () => {
      return ""
    },
  },
  value: {
    readableName: "Amount",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  maxFeePerGas: {
    readableName: "Max Fee/Gas",
    transformer: gweiTransformer,
    detailTransformer: gweiTransformer,
  },
  gasPrice: {
    readableName: "Gas Price",
    transformer: gweiTransformer,
    detailTransformer: gweiTransformer,
  },
  gasUsed: {
    readableName: "Gas",
    transformer: (val) => val?.toString(),
    detailTransformer: (val) => val?.toString(),
  },
  nonce: {
    readableName: "Nonce",
    transformer: (val) => val?.toString(),
    detailTransformer: (val) => val?.toString(),
  },
}

export const keysMapPokt: UIAdaptationMap<EnrichedPOKTTransaction> = {
  height: {
    readableName: "Block Height",
    transformer: (height: number | null) =>
      (height === 0 || height === null) ? "(pending)" : height.toString(),
    detailTransformer: () => {
      return ""
    },
  },
}