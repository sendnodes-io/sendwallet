import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { AnyAsset, Asset } from "@sendnodes/pokt-wallet-background/assets"
import { normalizeEVMAddress } from "@sendnodes/pokt-wallet-background/lib/utils"
import {
  convertFixedPointNumber,
  fixedPointNumberToString,
  parseToFixedPointNumber,
} from "@sendnodes/pokt-wallet-background/lib/fixed-point"
import SharedButton from "./SharedButton"
import SharedSlideUpMenu from "./SharedSlideUpMenu"
import SharedAssetItem, {
  AnyAssetWithOptionalAmount,
  hasAmounts,
} from "./SharedAssetItem"
import SharedAssetIcon from "./SharedAssetIcon"
import classNames from "clsx"

// List of symbols we want to display first.  Lower array index === higher priority.
// For now we just prioritize somewhat popular assets that we are able to load an icon for.
const SYMBOL_PRIORITY_LIST = [
  "UST",
  "KEEP",
  "ENS",
  "CRV",
  "FTM",
  "GRT",
  "BAL",
  "MATIC",
  "NU",
  "AMP",
  "BNT",
  "COMP",
  "UMA",
  "WLTC",
  "CVC",
]

const symbolPriority = Object.fromEntries(
  SYMBOL_PRIORITY_LIST.map((symbol, idx) => [
    symbol,
    SYMBOL_PRIORITY_LIST.length - idx,
  ])
)
interface SelectAssetMenuContentProps<AssetType extends AnyAsset> {
  assets: AnyAssetWithOptionalAmount<AssetType>[]
  setSelectedAssetAndClose: (
    asset: AnyAssetWithOptionalAmount<AssetType>
  ) => void
}

// Sorts an AnyAssetWithOptionalAmount by symbol, alphabetically, according to
// the current locale.  Symbols passed into the symbolList will take priority
// over alphabetical sorting.
function prioritizedAssetAlphabeticSorter<
  AssetType extends AnyAsset,
  T extends AnyAssetWithOptionalAmount<AssetType>
>({ asset: { symbol: symbol1 } }: T, { asset: { symbol: symbol2 } }: T) {
  const firstSymbolPriority = symbolPriority[symbol1] ?? 0
  const secondSymbolPriority = symbolPriority[symbol2] ?? 0
  if (firstSymbolPriority > secondSymbolPriority) {
    return -1
  }
  if (firstSymbolPriority < secondSymbolPriority) {
    return 1
  }

  return symbol1.localeCompare(symbol2)
}

// Sorts an AnyAssetWithOptionalAmount by symbol, alphabetically, according to
// the current locale, but bubbles to the top any assets that match the passed
// `searchTerm` at the start of the symbol. Matches are case-insensitive for
// sorting purposes.
//
// For example, if a set of assets [DAAD, AD, AB, AC, AA] is passed, and the
// search term is empty, the list will be [DAAD, AA, AB, AC, AD]. If the search
// term is instead AA, the list will be [AA, DAAD, AB, AC, AD]. Note that this
// function performs no filtering against the search term, the search term is
// purely used to sort start-anchored symbol matches in front of all other
// assets.
function assetAlphabeticSorterWithFilter<
  AssetType extends AnyAsset,
  T extends AnyAssetWithOptionalAmount<AssetType>
>(searchTerm: string): (asset1: T, asset2: T) => number {
  const startingSearchTermRegExp = new RegExp(`^${searchTerm}.*$`, "i")

  return (
    { asset: { symbol: symbol1 } }: T,
    { asset: { symbol: symbol2 } }: T
  ) => {
    const searchTermStartMatch1 = startingSearchTermRegExp.test(symbol1)
    const searchTermStartMatch2 = startingSearchTermRegExp.test(symbol2)

    // If either search term matches at the start and the other doesn't, the
    // one that matches at the start is greater.
    if (searchTermStartMatch1 && !searchTermStartMatch2) {
      return -1
    }
    if (!searchTermStartMatch1 && searchTermStartMatch2) {
      return 1
    }

    return symbol1.localeCompare(symbol2)
  }
}

function SelectAssetMenuContent<T extends AnyAsset>(
  props: SelectAssetMenuContentProps<T>
): ReactElement {
  const { setSelectedAssetAndClose, assets } = props
  const [searchTerm, setSearchTerm] = useState("")
  const searchInput = useRef<HTMLInputElement | null>(null)

  const filteredAssets =
    searchTerm.trim() === ""
      ? assets
      : assets.filter(({ asset }) => {
          return (
            asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ("contractAddress" in asset &&
              searchTerm.startsWith("0x") &&
              normalizeEVMAddress(asset.contractAddress).includes(
                // The replace handles `normalizeEVMAddress`'s
                // octet alignment that prefixes a `0` to a partial address
                // if it has an uneven number of digits.
                normalizeEVMAddress(searchTerm).replace(/^0x0?/, "0x")
              ) &&
              asset.contractAddress.length >= searchTerm.length)
          )
        })

  const sortedFilteredAssets = filteredAssets.sort(
    searchTerm.trim() === ""
      ? prioritizedAssetAlphabeticSorter
      : assetAlphabeticSorterWithFilter(searchTerm.trim())
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      searchInput.current?.focus()
    }, 50)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchInput])

  return (
    <>
      <div className="standard_width_padded center_horizontal">
        <div className="search_label">Select token</div>
        <div className="search_wrap">
          <input
            type="text"
            ref={searchInput}
            className="search_input"
            placeholder="Search by name or address"
            spellCheck={false}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <span className="icon_search" />
        </div>
      </div>
      <div className="divider" />
      <ul className="assets_list">
        {sortedFilteredAssets.map((assetWithOptionalAmount) => {
          const { asset } = assetWithOptionalAmount
          return (
            <SharedAssetItem
              key={
                asset.metadata?.coinGeckoID ??
                asset.symbol +
                  ("contractAddress" in asset ? asset.contractAddress : "")
              }
              assetAndAmount={assetWithOptionalAmount}
              onClick={() => setSelectedAssetAndClose(assetWithOptionalAmount)}
            />
          )
        })}
      </ul>
      <style jsx>
        {`
          .search_label {
            height: 20px;
            color: var(--dim-gray);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-bottom: 16px;
            margin-top: -5px;
          }
          .search_wrap {
            display: flex;
          }
          .search_input {
            width: 336px;
            height: 48px;
            border-radius: 4px;
            border: 1px solid var(--dim-gray);
            padding-left: 16px;
            box-sizing: border-box;
            color: var(--spanish-gray);
          }
          .search_input::placeholder {
            color: var(--spanish-gray);
          }
          .icon_search {
            background: url("./images/search_large@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            position: absolute;
            right: 42px;
            margin-top: 11px;
          }
          .divider {
            width: 384px;
            height: 0;
            border-bottom: 1px solid var(--eerie-black-100);
            margin-top: 15px;
          }
          .assets_list {
            display: block;
            overflow: scroll;
            height: calc(100% - 96px);
            width: 100%;
          }
        `}
      </style>
    </>
  )
}

interface SelectedAssetButtonProps {
  asset: Asset
  isDisabled: boolean
  toggleIsAssetMenuOpen?: () => void
}

function SelectedAssetButton(props: SelectedAssetButtonProps): ReactElement {
  const { asset, isDisabled, toggleIsAssetMenuOpen } = props

  return (
    <button type="button" disabled={isDisabled} onClick={toggleIsAssetMenuOpen}>
      <div className="asset_icon_wrap">
        <SharedAssetIcon
          logoURL={asset?.metadata?.logoURL}
          symbol={asset?.symbol}
          size={"large"}
        />
      </div>

      <style jsx>{`
        button {
          display: flex;
          align-items: center;
          color: #fff;
          font-size: 1rem;
          font-weight: 500;
          line-height: 1.5rem;
          text-transform: uppercase;
        }
        button:disabled {
          cursor: default;
        }
        .asset_icon_wrap {
          padding-right: 0.75rem;
        }
      `}</style>
    </button>
  )
}

SelectedAssetButton.defaultProps = {
  toggleIsAssetMenuOpen: null,
}

interface SharedAssetInputProps<AssetType extends AnyAsset> {
  autoFocus?: boolean
  assetsAndAmounts: AnyAssetWithOptionalAmount<AssetType>[]
  label: string
  selectedAsset: AssetType | undefined
  amount: string
  isAssetOptionsLocked: boolean
  disableDropdown: boolean
  showMaxButton: boolean
  isDisabled?: boolean
  onAssetSelect?: (asset: AssetType) => void
  onAmountChange?: (value: string, errorMessage: string | undefined) => void
  /** Include a network fee in the max balance set*/
  networkFee?: string
  /** Validate amount before calling amount changed. Should throw an error if amount is invalid */
  validateAmount?: (amount: bigint) => void
}

function isSameAsset(asset1: Asset, asset2: Asset) {
  return asset1.symbol === asset2.symbol // FIXME Once asset similarity logic is extracted, reuse.
}

function assetWithOptionalAmountFromAsset<T extends AnyAsset>(
  asset: T,
  assetsToSearch: AnyAssetWithOptionalAmount<T>[]
) {
  return assetsToSearch.find(({ asset: listAsset }) =>
    isSameAsset(asset, listAsset)
  )
}

export default function SharedAssetInput<T extends AnyAsset>(
  props: SharedAssetInputProps<T>
): ReactElement {
  const {
    assetsAndAmounts,
    label,
    selectedAsset,
    amount,
    isAssetOptionsLocked,
    disableDropdown,
    showMaxButton,
    isDisabled,
    onAssetSelect,
    onAmountChange,
    autoFocus = false,
    networkFee,
    validateAmount = () => {},
  } = props

  const [openAssetMenu, setOpenAssetMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleIsAssetMenuOpen = useCallback(() => {
    if (!isAssetOptionsLocked) {
      setOpenAssetMenu((currentlyOpen) => !currentlyOpen)
    }
  }, [isAssetOptionsLocked])

  const selectedAssetAndAmount =
    typeof selectedAsset !== "undefined"
      ? assetWithOptionalAmountFromAsset<T>(selectedAsset, assetsAndAmounts)
      : undefined

  const setSelectedAssetAndClose = useCallback(
    (assetWithOptionalAmount: AnyAssetWithOptionalAmount<T>) => {
      setOpenAssetMenu(false)
      onAssetSelect?.(assetWithOptionalAmount.asset)
    },

    [onAssetSelect]
  )

  const getErrorMessage = (givenAmount: string): string | undefined => {
    if (
      givenAmount.trim() === "" ||
      typeof selectedAssetAndAmount === "undefined" ||
      !hasAmounts(selectedAssetAndAmount) ||
      !("decimals" in selectedAssetAndAmount.asset)
    ) {
      return undefined
    }

    const parsedGivenAmount = parseToFixedPointNumber(givenAmount.trim())
    if (typeof parsedGivenAmount === "undefined") {
      return "Invalid amount"
    }

    const decimalMatched = convertFixedPointNumber(
      parsedGivenAmount,
      selectedAssetAndAmount.asset.decimals
    )

    let selectedAmount = selectedAssetAndAmount.amount

    if (networkFee) {
      selectedAmount -= BigInt(networkFee)
    }

    if (decimalMatched.amount > selectedAmount) {
      return "Insufficient balance"
    }

    if (validateAmount) {
      try {
        validateAmount(decimalMatched.amount)
      } catch (error) {
        return (error as Error)?.message
      }
    }
    return undefined
  }

  const setMaxBalance = () => {
    if (
      typeof selectedAssetAndAmount === "undefined" ||
      !hasAmounts(selectedAssetAndAmount)
    ) {
      return
    }

    let selectedAmount = selectedAssetAndAmount.amount

    if (networkFee) {
      selectedAmount -= BigInt(networkFee)
    }

    const fixedPointAmount = {
      amount: selectedAmount,
      decimals:
        "decimals" in selectedAssetAndAmount.asset
          ? selectedAssetAndAmount.asset.decimals
          : 0,
    }
    const fixedPointString = fixedPointNumberToString(fixedPointAmount)

    onAmountChange?.(fixedPointString, getErrorMessage(fixedPointString))
  }

  // auto focus input after some delay cuz browsers are slow
  useEffect(() => {
    let timeoutId = setTimeout(() => {
      if (autoFocus && inputRef.current) inputRef.current.focus()
    }, 200)

    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <>
      <label
        className="label"
        htmlFor={
          typeof selectedAsset === "undefined"
            ? "asset_selector"
            : "asset_amount_input"
        }
      >
        {label}
      </label>

      {typeof selectedAssetAndAmount !== "undefined" &&
      hasAmounts(selectedAssetAndAmount) ? (
        <div className="amount_controls">
          <span className="available">
            Bal{" "}
            <b style={{ color: "var(--white)" }}>
              {selectedAssetAndAmount.localizedDecimalAmount}
            </b>
          </span>
          {showMaxButton ? (
            <button type="button" className="max" onClick={setMaxBalance}>
              Max
            </button>
          ) : (
            <></>
          )}
        </div>
      ) : (
        <></>
      )}

      <SharedSlideUpMenu
        isOpen={openAssetMenu}
        close={() => {
          setOpenAssetMenu(false)
        }}
      >
        {assetsAndAmounts && (
          <SelectAssetMenuContent
            assets={assetsAndAmounts}
            setSelectedAssetAndClose={setSelectedAssetAndClose}
          />
        )}
      </SharedSlideUpMenu>
      <div className="asset_wrap">
        <div>
          {selectedAssetAndAmount?.asset.symbol ? (
            <SelectedAssetButton
              isDisabled={isDisabled || disableDropdown}
              asset={selectedAssetAndAmount.asset}
              toggleIsAssetMenuOpen={toggleIsAssetMenuOpen}
            />
          ) : (
            <SharedButton
              id="asset_selector"
              type="secondary"
              size="large"
              isDisabled={isDisabled || disableDropdown}
              onClick={toggleIsAssetMenuOpen}
              icon="chevron"
            >
              Select token
            </SharedButton>
          )}
        </div>

        <input
          ref={inputRef}
          id="asset_amount_input"
          className={classNames(
            "input_amount focus:outline outline-1 outline-white px-1 rounded-sm"
          )}
          type="number"
          step="any"
          min="0"
          disabled={isDisabled}
          value={amount}
          spellCheck={false}
          onChange={(event) =>
            onAmountChange?.(
              event.target.value,
              getErrorMessage(event.target.value)
            )
          }
        />
        <div className="error_message">{getErrorMessage(amount)}</div>
      </div>
      <style jsx>
        {`
          label,
          .amount_controls {
            font-weight: 300;
            font-size: 0.75rem;
          }
          .amount_controls {
            line-height: 1.6875rem;
            // align with label top + offset by border radius right
            margin: -1.6875rem 0.25rem 0 0;

            color: var(--spanish-gray);
            text-align: right;
            position: relative;
            font-size: 0.75rem;
          }
          .max {
            margin-left: 0.5rem; // space to balance
            color: var(--spanish-gray);
            cursor: pointer;
          }
          .asset_wrap {
            width: 100%;
            height: 4.25rem;
            border-radius: 0.5rem;
            background-color: var(--black);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0px 1rem;
          }
          .asset_input {
            width: 100%;
            height: 2.1rem;
            font-size: 1.75rem;
            font-weight: 700;
            line-height: 2rem;
            color: var(--white);
          }
          .asset_input::placeholder {
            color: var(--spanish-gray);
            opacity: 1;
          }
          .input_amount::placeholder {
            color: var(--spanish-gray);
            opacity: 1;
          }
          .input_amount {
            height: 2rem;
            color: var(--white);
            font-size: 2rem;
            font-weight: 700;
            line-height: 2rem;
            text-align: left;
            width: 100%;
            caret-color: var(--aqua);
          }
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
          .input_amount:disabled {
            cursor: default;
            color: var(--spanish-gray);
          }
          .error_message {
            color: var(--error);
            position: absolute;
            font-weight: 500;
            font-size: 0.75rem;
            line-height: 1rem;
            transform: translateY(1.7rem);
            display: block;
            right: 1rem;
          }
        `}
      </style>
    </>
  )
}

SharedAssetInput.defaultProps = {
  isAssetOptionsLocked: false,
  disableDropdown: false,
  isDisabled: false,
  showMaxButton: true,
  assetsAndAmounts: [],
  label: "",
  amount: "0.0",
}
