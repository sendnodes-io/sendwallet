/**
 * The set of available UI account types. These may or may not map 1-to-1 to
 * internal account types, depending on how the UI chooses to display data.
 */
export const enum AccountType {
	ReadOnly = "read-only",
	Imported = "imported",
	Ledger = "ledger",
	Internal = "internal",
}
