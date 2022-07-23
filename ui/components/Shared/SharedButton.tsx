import React, { ReactElement, useState, useEffect } from "react"
import classNames from "clsx"
import { Redirect } from "react-router-dom"
import { History } from "history"
import SharedLoadingSpinner from "./SharedLoadingSpinner"

interface Props {
  children: React.ReactNode
  id?: string
  type:
    | "primary"
    | "primaryGhost"
    | "primaryGreen"
    | "secondary"
    | "tertiary"
    | "tertiaryWhite"
    | "tertiaryGray"
    | "deemphasizedWhite"
    | "warning"
    | "unstyled"
  size: "small" | "medium" | "large" | "xlarge"
  icon?: string
  iconSize?: "small" | "medium" | "large" | "xlarge" | "secondaryMedium"
  iconPosition?: "left" | "right"
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  isDisabled?: boolean
  linkTo?: History.LocationDescriptor<unknown>
  showLoadingOnClick: boolean
  /**
   * Disable button before calling onClick
   */
  disableOnClick?: boolean
  isLoading: boolean
  isFormSubmit: boolean
  title?: string
  className?: string
}

export default function SharedButton(props: Props): ReactElement {
  const {
    id,
    children,
    type,
    size,
    onClick,
    isDisabled,
    icon,
    iconSize,
    iconPosition,
    linkTo,
    showLoadingOnClick,
    disableOnClick = false,
    isLoading,
    isFormSubmit,
    title = "",
    className,
  } = props

  const [navigateTo, setNavigateTo] =
    React.useState<History.LocationDescriptor<unknown> | null>(null)
  const [isClicked, setIsClicked] = useState(false)

  // If the prop deciding if the loader should be displayed or not
  // changes, assume resetting the loading state condition.
  useEffect(() => {
    setIsClicked(false)
  }, [showLoadingOnClick, disableOnClick])

  if (navigateTo && navigateTo === linkTo) {
    return <Redirect push to={linkTo} />
  }

  async function handleClick(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    setIsClicked(true)
    onClick?.(e)
    if (linkTo) {
      setNavigateTo(linkTo)
    }
  }

  const isShowingLoadingSpinner = isLoading || (isClicked && showLoadingOnClick)
  const disabled = isDisabled || (isClicked && disableOnClick && !!handleClick)

  return (
    <button
      title={title}
      id={id}
      type={isFormSubmit ? "submit" : "button"}
      disabled={disabled}
      className={classNames(
        type !== "unstyled" && "button",
        { xlarge: size === "xlarge" },
        { large: size === "large" },
        { small: size === "small" },
        { secondary: type === "secondary" },
        { primaryGhost: type === "primaryGhost" },
        { primaryGreen: type === "primaryGreen" },
        { disabled: disabled },
        { tertiary: type === "tertiary" },
        { "tertiary white": type === "tertiaryWhite" },
        { "tertiary gray": type === "tertiaryGray" },
        { deemphasized_white: type === "deemphasizedWhite" },
        { warning: type === "warning" },
        { icon_button: icon },
        className
      )}
      onClick={handleClick}
    >
      {isShowingLoadingSpinner && (
        <div className="spinner_wrap">
          <SharedLoadingSpinner />
        </div>
      )}
      <div
        className={classNames("button_content", {
          hide_me: isShowingLoadingSpinner,
          icon_left: iconPosition === "left",
        })}
      >
        {children}
        {icon ? (
          <span
            className={classNames(
              { icon: true },
              { icon_large: iconSize === "large" },
              { icon_xlarge: iconSize === "xlarge" },
              { icon_secondary_medium: iconSize === "secondaryMedium" },
              `${icon}_icon`
            )}
          />
        ) : null}
      </div>

      <style jsx>
        {`
          :global(:root) {
            --icon-color: #ffffff;
          }
          .button {
            height: 2.5rem;
            width: 100%;
            border-radius: 0.25rem;
            background-color: var(--aqua);
            background-image: var(--aqua-to-capri);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--black);
            font-size: 1rem;
            font-weight: 700;
            letter-spacing: 0.48px;
            line-height: 1.5rem;
            text-align: center;
            border-radius: 5rem;
            transition: all 0.2s;
          }
          .button:hover {
            background-image: unset;
            background-color: var(--capri);
            color: var(--white);
          }

          .button_content {
            display: flex;
            align-items: center;
          }
          .icon {
            mask-image: url("./images/${icon}@2x.png");
            mask-size: cover;
            mask-repeat: no-repeat;
            width: 0.75rem;
            height: 0.75rem;
            margin-left: 0.5rem;
            background-color: var(--icon-color);
            display: inline-block;
            margin-top: -1px;
            transition: all 0.2s;
          }
          .large {
            height: 3rem;
          }
          .xlarge {
            height: 4rem;
          }
          .icon_secondary_medium {
            width: 1rem;
            height: 1rem;
            margin-left: 0.25rem;
          }
          .icon_large {
            width: 1.5rem;
            height: 1.5rem;
            margin-left: 0.5rem;
          }

          .icon_xlarge {
            width: 3rem;
            height: 3rem;
          }
          .secondary {
            background: unset;
            border: 2px solid var(--aqua);
            color: var(--aqua);
            box-sizing: border-box;
          }
          .icon_button.secondary .icon {
             {
              /* background-color: var(--aqua); */
            }
          }
          .secondary:hover,
          .secondary:active {
            background-color: unset;
            border-color: var(--white);
          }
          .disabled {
            /* background-color: var(--dim-gray);
            color: var(--cod-gray-200); */
            cursor: not-allowed;
          }
          .icon_button.disabled .icon {
            /* background-color: var(--cod-gray-200); */
          }
          .disabled:hover {
            /* background-color: var(--dim-gray);
            color: var(--cod-gray-200); */
          }
          .icon_button.disabled:hover .icon {
            /* background-color: var(--cod-gray-200); */
          }
          .disabled:active {
            /* background-color: var(--dim-gray);
            color: var(--cod-gray-200); */
          }
          .icon_button.disabled:active .icon {
            /*
            background-color: var(--cod-gray-200);
            */
          }
          .tertiary {
            color: var(--capri);
            background: unset;
            border: unset;
            padding: unset;
            font-size: 1rem;
          }
          .tertiary.icon_button .icon {
            background-color: var(--capri);
          }
          .tertiary:hover {
            background-color: unset;
            color: var(--sky-blue-crayola);
          }
          .icon_button.tertiary:hover .icon {
            background-color: var(--sky-blue-crayola);
          }
          .tertiary:active {
            background-color: unset;
            color: var(--sky-blue-crayola);
          }
          .icon_button.tertiary:active .icon {
            background-color: var(--sky-blue-crayola);
          }
          .white {
            color: #ffffff;
            font-weight: 500;
          }
          .icon_button.white .icon {
            background-color: #ffffff;
          }
          .gray {
            color: var(--spanish-gray);
          }
          .icon_button.gray .icon {
            background-color: var(--spanish-gray);
          }
          .gray:hover {
            color: var(--white);
          }
          .icon_button.gray:hover .icon {
            background-color: var(--white);
          }
          .tertiary.disabled {
            color: var(--spanish-gray);
          }
          .icon_button.tertiary.disabled .icon {
            background-color: var(--spanish-gray);
          }
          .deemphasized_white {
            color: #fff;
            background-color: var(--onyx-200);
          }
          .icon_button.deemphasized_white .icon {
            background-color: #fff;
          }
          .deemphasized_white:hover {
            background-color: var(--nero);
            color: #fff;
          }
          .icon_button.deemphasized_white:hover .icon {
            background-color: #fff;
          }
          .small {
            padding: 0 0.8rem;
            height: 2rem;
            font-size: 0.8rem;
          }
          .primaryGreen {
            color: var(--eerie-black-100);
            background-color: var(--aqua);
          }

          .primaryGhost {
            border: 2px solid transparent;
            background-origin: border-box;
            background-image: linear-gradient(
                var(--eerie-black-100),
                var(--eerie-black-100)
              ),
              var(--aqua-to-capri);
            background-clip: padding-box, border-box;
            background-color: transparent;
          }

          .primaryGhost * {
            background: var(--aqua-to-capri);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .primaryGhost:hover {
            color: var(--black);
            background-image: var(--aqua-to-capri);
          }

          .primaryGhost:hover * {
            color: var(--black);
            background: transparent;
            -webkit-background-clip: initial;
            -webkit-text-fill-color: initial;
          }

          .warning {
            background-color: var(--attention);
          }
          .warning {
            color: var(--eerie-black-100);
          }
          .icon_button.warning .icon {
            background-color: var(--eerie-black-100);
          }
          .icon_left {
            flex-direction: row-reverse;
          }
          .icon_button .icon_left .icon {
            margin-left: 0px;
            margin-right: 0.5rem;
          }
          .hide_me {
            opacity: 0;
            position: absolute;
          }
          .unstyled {
            unset: all;
          }
          button :global(.stake_icon) {
            mask-size: contain;
            mask-repeat: no-repeat;
            mask-position: center;
          }
        `}
      </style>
    </button>
  )
}

SharedButton.defaultProps = {
  icon: null,
  isDisabled: false,
  iconSize: "medium",
  iconPosition: "right",
  linkTo: null,
  showLoadingOnClick: false,
  isLoading: false,
  isFormSubmit: false,
}
