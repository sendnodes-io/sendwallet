import { floor } from "lodash"

const defaultSymbols = ["", "k", "M", "G", "T", "P", "E"]

interface AbbreviateOptions {
  padding?: boolean
  symbols?: string[]
}

const defaultOptions = {
  padding: true,
  symbols: defaultSymbols,
}

function abbreviateNumber(
  num: number,
  digit = 1,
  options?: AbbreviateOptions | AbbreviateOptions["symbols"]
): string {
  // Previous options style
  if (Array.isArray(options)) {
    options = { symbols: options }
  }

  const { symbols, padding } = Object.assign({}, defaultOptions, options)

  // handle negatives
  const sign = Math.sign(num) >= 0
  num = Math.abs(num)

  // what tier? (determines SI symbol)
  const tier = (Math.log10(num) / 3) | 0

  // if zero, we don't need a suffix
  if (tier == 0) return (!sign ? "-" : "") + num.toString()

  // get suffix and determine scale
  const suffix = symbols[tier]
  if (!suffix) throw new RangeError()

  const scale = Math.pow(10, tier * 3)

  // scale the number
  const scaled = num / scale

  let rounded = scaled.toFixed(digit)
  if (!padding) {
    rounded = String(Number(rounded))
  }

  // format number and add suffix
  return (!sign ? "-" : "") + rounded + suffix
}

export default function formatTokenAmount(
  amount: number | string | undefined,
  maxIntegers = 4,
  maxDecimals = 2
) {
  // remove commas
  if (typeof amount === "string") {
    amount = amount.split(",").join("")
  }

  let digits = (amount ?? "").toString().split(".")
  let [integers = 0, decimals = 0] = digits.map((s) => Number(s))
  let [integersLength = 0, decimalsLength = 0] = digits.map((s) => s.length)

  if ((digits[0] && isNaN(integers)) || (digits[1] && isNaN(decimals))) {
    return abbreviateNumber(0, maxDecimals)
  }

  if (integersLength > maxIntegers) {
    integers = floor(Number(amount), maxIntegers - integersLength)
    integersLength = integers.toString().length
    return abbreviateNumber(integers, maxDecimals)
  }

  return Number(amount).toLocaleString(undefined, {
    useGrouping: true,
    maximumFractionDigits: maxDecimals,
  })
}
