import {
  isProbablyEVMAddress,
  isProbablyPOKTAddress,
  isValidPoktAddress,
} from "@sendnodes/pokt-wallet-background/lib/utils"
// import { resolveNameOnNetwork } from "@sendnodes/pokt-wallet-background/redux-slices/accounts"
import { selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import { HexString } from "@sendnodes/pokt-wallet-background/types"
import { useRef, useState } from "react"
import Resolution from "@unstoppabledomains/resolution"
import { useBackgroundSelector } from "./redux-hooks"
import useRemoteConfig from "./remote-config-hooks"

/**
 * A handler that is called once a valid input is processed through a
 * validator. If an invalid value is entered by the user, the validator will be
 * called with `undefined` to facilitate form state maintenance.
 */
export type ValidDataChangeHandler<T> = (validData: T | undefined) => void
/**
 * A data validator that may return a validation error or, if the data is
 * valid, undefined.
 */
export type AdditionalDataValidator<T> = (
  data: T
) => { error: string } | undefined

export type ValidationHookProperties = {
  /**
   * A passthrough for the raw value. This is useful to avoid clearing the
   * user's input just because they entered an invalid value, and can be used
   * as a direct input to a `value` prop.
   */
  rawValue: string
  /**
   * The error message from parsing the current value, if any.
   */
  errorMessage: string | undefined
  /**
   * The handler that should receive new raw user inputs (e.g. for passing to
   * an input's `onChange`).
   */
  handleInputChange: (newValue: string) => void
}

export type AsyncValidationHookProperties = ValidationHookProperties & {
  /**
   * A boolean indicating if the async validator is currently validating the
   * passed input. The most straightforward use of this is to show a spinner
   * while the validator is running.
   */
  isValidating: boolean
}

/**
 * A hook that provides validation for a string input that should produce a
 * type T. Validation hooks typically handle parsing internally and may do
 * limited validation; additional validation may be provided with one or more
 * additional validators, which are expected to be called in sequence.
 *
 * The `onValidChange` handler is invoked with a validated value, or `undefined`
 * if the entered value was invalid.
 *
 * Validation hooks return an object with two properties; see
 * `ValidationHookProperties` for more.
 *
 * @param onValidChange A change handler that is invoked with the parsed and
 *     validated user input, or undefined if the user input was empty,
 *     unparsable, or invalid.
 * @param additionalValidators One or more additional validator functions that
 *     can layer caller-specified validation on the parsed value.
 */
export type ValidationHook<T> = (
  onValidChange: ValidDataChangeHandler<T>,
  ...additionalValidators: AdditionalDataValidator<T>[]
) => ValidationHookProperties

/**
 * A hook that provides asynchronous validation for a string input that should
 * produce a type T. These hooks function the same as {@see ValidationHook},
 * but may perform asynchronous operations. As such, they return an additional
 * property to indicate whether an asynchronous validation is currently in
 * progress, which can be used to reflect the pending operation in the UI.
 */
export type AsyncValidationHook<T> = (
  onValidChange: ValidDataChangeHandler<T>,
  ...additionalValidators: AdditionalDataValidator<Promise<T>>[]
) => AsyncValidationHookProperties

/**
 * A ValidationHook that parses string values using a parser and allows for
 * additional validation. Empty strings or strings of entirely whitespace do
 * not trigger an error, but do trigger the change handler with a value of
 * `undefined`.
 */
export const useParsedValidation = <T>(
  onValidChange: (validValue: T | undefined) => void,
  parser: (value: string) => { parsed: T } | { error: string },
  additionalValidator?: AdditionalDataValidator<T>
): ValidationHookProperties => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [rawValue, setRawValue] = useState<string>("")

  const handleInputChange = (newValue: string) => {
    setRawValue(newValue)

    const trimmed = newValue.trim()

    setErrorMessage(undefined)
    if (trimmed === "") {
      onValidChange(undefined)
    } else {
      try {
        const parseResult = parser(trimmed)
        if ("error" in parseResult) {
          setErrorMessage(parseResult.error)
        } else {
          const additionalValidation = additionalValidator?.(parseResult.parsed)
          if (additionalValidation !== undefined) {
            setErrorMessage(additionalValidation.error)
          } else {
            onValidChange(parseResult.parsed)
          }
        }
      } catch (e) {
        setErrorMessage("Must be a number")
      }
    }
  }

  return { rawValue, errorMessage, handleInputChange }
}

/**
 * An AsyncValidationHook that attempts to resolve strings as either addresses
 * or names resolvable via internal name resolution. Empty strings or strings
 * of entirely whitespace do not trigger an error, but do trigger the change
 * handler with a value of `undefined`.
 *
 * Address-like strings are immediately considered valid, while non-address
 * strings are resolved asynchronously.
 */
export const useAddressOrNameValidation: AsyncValidationHook<
  HexString | undefined
> = (onValidChange) => {
  const remoteConfig = useRemoteConfig()
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [rawValue, setRawValue] = useState<string>("")
  // Flag and value tracked separately due to async handling.
  const [isValidating, setIsValidating] = useState(false)
  const validatingValue = useRef<string | undefined>(undefined)
  const currentAccount = useBackgroundSelector(selectCurrentAccount)

  const handleInputChange = async (newValue: string) => {
    setRawValue(newValue)

    const trimmed = newValue.trim()

    setErrorMessage(undefined)

    // EVM address validation
    if (currentAccount.network.family === "EVM") {
      if (trimmed === "") {
        onValidChange(undefined)
      } else if (isProbablyEVMAddress(trimmed)) {
        onValidChange(trimmed)
      } else {
        setIsValidating(true)
        validatingValue.current = trimmed

        const resolution = new Resolution()
        const resolved = (await resolution
          .addr(trimmed, "ETH")
          .catch(() => "")) as unknown as string

        // Asynchronicity means we could already have started validating another
        // value before this validation completed; ignore those cases.
        if (validatingValue.current === trimmed) {
          if (resolved === undefined) {
            onValidChange(undefined)
            setErrorMessage("Address could not be found")
          } else {
            onValidChange(resolved)
          }

          setIsValidating(false)
          validatingValue.current = undefined
        }
      }
    }

    // POKT address validation
    if (currentAccount.network.family === "POKT") {
      if (trimmed === "") {
        onValidChange(undefined)
      } else if (
        isProbablyPOKTAddress(trimmed) &&
        isValidPoktAddress(trimmed)
      ) {
        onValidChange(trimmed)
      } else if (remoteConfig?.POKT?.features?.unstoppableDomains) {
        setIsValidating(true)
        validatingValue.current = trimmed
        const resolution = new Resolution({
          sourceConfig: {
            uns: {
              locations: {
                Layer1: {
                  url: process.env.ETH_MAINNET_RPC_URL,
                  network: "mainnet",
                },
                Layer2: {
                  url: process.env.POLYGON_MAINNET_RPC_URL,
                  network: "polygon-mainnet",
                },
              },
            },
          },
        })

        const resolved = await resolution
          .addr(trimmed, "POKT")
          .catch(() => undefined)

        // Asynchronicity means we could already have started validating another
        // value before this validation completed; ignore those cases.
        if (validatingValue.current === trimmed) {
          if (resolved === undefined) {
            onValidChange(undefined)
            setErrorMessage("Address could not be found")
          } else {
            onValidChange(resolved)
          }

          setIsValidating(false)
          validatingValue.current = undefined
        }
      } else {
        onValidChange(undefined)
        setErrorMessage("Invalid Address")
      }
    }
  }

  return {
    rawValue,
    errorMessage,
    isValidating,
    handleInputChange,
  }
}
