
export default function formatTokenAmount(amount: number | string | undefined, maxIntegers = 5, maxDecimals = 2) {
  // remove commas
  if (typeof amount === "string") {
    amount = amount.split(",").join("")
  }
  const [integers, decimals] = (amount ?? "").toString().split(".")
  const useCompact =
    amount === undefined ||
    (integers &&
      integers.length >
        maxIntegers + (decimals === undefined ? maxDecimals : 0))
  const numFormatter = new Intl.NumberFormat("en-US", {
    useGrouping: true,
    maximumFractionDigits: decimals !== undefined ? maxDecimals : 0,
    minimumFractionDigits: decimals !== undefined ? maxDecimals : 0,
    notation: useCompact ? "compact" : "standard",
  })
  return numFormatter.format(Number(amount ?? 0))
}