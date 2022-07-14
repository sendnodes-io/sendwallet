import { AccountTotal, selectCurrentAccount } from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import { HexString } from "@sendnodes/pokt-wallet-background/types"
import { updateName } from "@sendnodes/pokt-wallet-background/redux-slices/accounts"
import React, { ReactElement, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"

interface AccountItemEditNameProps {
  account: AccountTotal
  address: HexString
  close: () => void
}

export default function AccountItemEditName({
  account,
  address,
  close,
}: AccountItemEditNameProps): ReactElement {
  const currentAccount  = useSelector(selectCurrentAccount)
  const [name, setName] = useState(account.name)
  const [error, setError] = useState("")
  const dispatch = useDispatch()

  let accountPreview = {
    ...account,
  }
  if (name) accountPreview.name = name

  return (
    <div className="remove_address_option">
      <ul>
        <li className="account_container">
          <SharedAccountItemSummary
            accountTotal={accountPreview}
            isSelected={false}
          />
        </li>
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (error === "") {
            dispatch(
              updateName({
                address,
                network: currentAccount.network,
                name: name ? name : "",
              })
            )
            close()
          }
        }}
      >
        <div className="remove_address_details">
          <SharedInput
            autoSelect
            errorMessage={error}
            value={name}
            onChange={(val) => {
              if (name && name?.length > 50) {
                setError("Name is too long")
              } else {
                setError("")
              }
              setName(val)
            }}
            label="Name"
            placeholder={account.defaultName}
          />
        </div>
        <div className="button_container">
          <SharedButton type="primary" size="medium" isFormSubmit>
            Save
          </SharedButton>
        </div>
      </form>
      <style jsx>{`
        .remove_address_option {
          padding: 0 1rem 1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .remove_address_option > * {
          margin-bottom: 1.5rem;
        }

        .remove_address_details {
          display: flex;
          flex-direction: column;
          line-height: 1.5rem;
        }
        .button_container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }

        .button_container :global(button) {
          width: 100%;
          justify-content: center;
        }
      `}</style>
    </div>
  )
}
