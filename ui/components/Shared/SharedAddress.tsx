import { truncateAddress } from "@sendnodes/pokt-wallet-background/lib/utils"
import { selectCurrentAccountTotal } from "@sendnodes/pokt-wallet-background/redux-slices/selectors"
import { setSnackbarMessage } from "@sendnodes/pokt-wallet-background/redux-slices/ui"
import { NameResolverSystem } from "@sendnodes/pokt-wallet-background/services/name"
import React, { ReactElement, useCallback } from "react"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedLoadingSpinner from "./SharedLoadingSpinner"
import SharedTooltip from "./SharedTooltip"

type SharedAddressProps = {
  address: string
  name?: string | undefined
  nameResolverSystem?: NameResolverSystem
  alwaysShowAddress: boolean
  showAvatar?: boolean
  className?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  title?: string
  icon?: JSX.Element
}

/**
 * The SharedAddress component is used to render addresses that can optionally
 * be represented as resolved names, and that are copiable by clicking.
 *
 * The component always expects an `address` prop. If an optional `name` prop
 * is passed, it is shown; otherwise, a truncated version of the address is
 * shown. The component tooltip always has a tooltip with the full address.
 * Additionally, clicking the component will copy the address to the clipboard
 * and present the user with a snackbar message indicating this has occurred.
 *
 * If the optional `nameResolverSystem` property is provided, an info tooltip
 * is included in the component to inform the user of which name resolver
 * system was used to resolve the passed `name`. If no `name` is passed, the
 * `nameResolverSystem` prop is ignored.
 */
export default function SharedAddress({
  name,
  address,
  nameResolverSystem,
  alwaysShowAddress,
  showAvatar = false,
  className = "",
  onClick = undefined,
  title = undefined,
  icon = undefined,
}: SharedAddressProps): ReactElement {
  const dispatch = useBackgroundDispatch()
  const currentAccountTotal = showAvatar
    ? useBackgroundSelector(selectCurrentAccountTotal)
    : null

  const primaryText = name || truncateAddress(address, 5, -3)
  const isDefaultCopy = onClick === undefined
  const copyAddress = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation()
      navigator.clipboard.writeText(address)
      dispatch(setSnackbarMessage("Address copied to clipboard"))
    },
    [address, dispatch]
  )

  return (
    <button
      type="button"
      className={className}
      onClick={isDefaultCopy ? copyAddress : onClick}
      title={isDefaultCopy ? `Copy to clipboard:\n${address}` : title}
    >
      {showAvatar && (
        <div className="avatar">
          {currentAccountTotal?.avatarURL &&
          currentAccountTotal.avatarURL !== "" ? (
            <img src={currentAccountTotal.avatarURL} />
          ) : (
            <SharedLoadingSpinner size="medium" />
          )}
        </div>
      )}
      <small className="whitespace-nowrap">{primaryText}</small>
      {name === undefined || nameResolverSystem === undefined ? (
        <></>
      ) : (
        <>
          <SharedTooltip width={130}>
            <p className="name_source_tooltip">
              Resolved using {nameResolverSystem}
            </p>
          </SharedTooltip>{" "}
        </>
      )}
      {alwaysShowAddress && name ? (
        <p className="detail">{truncateAddress(address)}</p>
      ) : (
        <></>
      )}
      {isDefaultCopy ? <div className="copy_icon" /> : icon}
      <style jsx>{`
        button {
          transition: 300ms color;
          display: flex;
          flex-direction: row;
          align-items: center;
          width: 100%;
          background-color: var(--eerie-black-100);
          border-radius: 3rem;
          padding-right: 0.25rem;
        }

        .name_source_tooltip {
          margin: 0;
          text-align: center;
        }

        p.detail {
          font-size: 1rem;
          line-height: 1rem;
        }
        .copy_icon {
          mask-image: url("./images/copy@2x.png");
          mask-size: cover;
          mask-repeat: no-repeat;
          width: 0.75rem;
          height: 0.75rem;
          margin-left: 0.5rem;
          background-color: var(--aqua);
          display: inline-block;
          margin-top: -1px;
          transition: all 0.2s;
        }
        button:hover {
          color: var(--white);
        }
        button:hover .copy_icon {
          background-color: var(--white);
        }

        .avatar {
          height: 2rem;
          width: 2rem;
          border-radius: 1rem;
          margin-right: 0.5rem;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border: 1px solid var(--spanish-gray);
        }

        .avatar :global(.spinner) {
          height: 1.9rem;
          width: 1.9rem;
        }

        img {
          height: 2rem;
          width: 2rem;
          display: inline-block;
          border-radius: 1rem;
        }
      `}</style>
    </button>
  )
}

SharedAddress.defaultProps = {
  alwaysShowAddress: false,
}
