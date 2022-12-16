import React, { ReactElement, CSSProperties, useRef } from "react"
import classNames from "clsx"
import { useDelayContentChange, useOnClickOutside } from "../../hooks"
import { SharedIconButton } from "./SharedIcon"

export type SharedSlideUpMenuSize =
  | "auto"
  | "small"
  | "medium"
  | "large"
  | "full"
  | "custom"

const SLIDE_TRANSITION_MS = 445

interface Props {
  isOpen: boolean
  close: (
    e: MouseEvent | TouchEvent | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void
  title?: string | ReactElement
  children: React.ReactNode
  customSize?: string
  size: SharedSlideUpMenuSize
  alwaysRenderChildren?: boolean
  leftButton?: ReactElement
  closeOnClickOutside?: boolean
}

const menuHeights: Record<SharedSlideUpMenuSize, string | null> = {
  auto: "auto",
  small: "24rem",
  medium: "33.5rem",
  large: "37.5rem",
  full: "var(--popup-height)",
  custom: null,
}

export default function SharedSlideUpMenu(props: Props): ReactElement {
  const {
    isOpen,
    close,
    size,
    title = "",
    children,
    customSize,
    alwaysRenderChildren,
    leftButton,
    closeOnClickOutside = true,
  } = props

  const slideUpMenuRef = useRef(null)

  useOnClickOutside(slideUpMenuRef, (e) =>
    closeOnClickOutside ? close(e) : e.preventDefault()
  )

  // Continue showing children during the close transition.
  const visibleChildren = isOpen || alwaysRenderChildren ? children : <></>
  const displayChildren = useDelayContentChange(
    visibleChildren,
    !isOpen,
    SLIDE_TRANSITION_MS
  )

  const menuHeight = menuHeights[size] ?? customSize ?? menuHeights.medium

  return (
    <div className="slide_up_menu_wrap ">
      <div className={classNames("overlay", { closed: !isOpen })} />
      <div
        className={classNames("slide_up_menu", "base_texture", {
          large: size === "large",
          closed: !isOpen,
        })}
        style={
          {
            "--menu-height": menuHeight,
            "--menu-height-transform":
              menuHeight === "auto" ? "100%" : menuHeight,
          } as CSSProperties
        }
        ref={isOpen ? slideUpMenuRef : null}
      >
        <div className="dashed_border">
          <div className="slide_up_header">
            <div className="left_button_wrap">{leftButton}</div>
            {typeof title === "string" ? <h2>{title}</h2> : title}
            <div className="close_button_wrap">
              <SharedIconButton
                icon="close.svg"
                width="1rem"
                color="var(--spanish-gray)"
                hoverColor="#fff"
                customStyles="
            z-index: 2;
            position: sticky;
            top: 0px;
            right: 1.5rem;
            float: right;"
                ariaLabel="Close menu"
                onClick={(e) => {
                  close(e)
                }}
              />
            </div>
          </div>
          {displayChildren}
        </div>
      </div>
      <style jsx>
        {`
          .left_button_wrap {
            position: absolute;
            top: 50%;
            left: 1.5rem;
            transform: translateY(-50%);
          }
          .close_button_wrap {
            position: absolute;
            top: 50%;
            right: 1.5rem;
            transform: translateY(-50%);
          }
          .slide_up_menu {
            width: var(--popup-width);
            height: var(--menu-height);
            margin: auto;
            overflow: hidden;
            border-radius: 1rem 1rem 0 0;
            position: absolute;
            left: 0px;
            right: 0px;
            bottom: 0px;
            z-index: 999;
            transform: translateY(0); /* open by default */
            opacity: 1;
            transition: transform cubic-bezier(0.19, 1, 0.22, 1)
              ${SLIDE_TRANSITION_MS}ms;
          }
          .dashed_border {
            height: calc(var(--menu-height) - calc(var(--main-margin)) * 2);
            width: calc(var(--popup-width) - calc(var(--main-margin)) * 2);
            display: flex;
            flex-direction: column;
          }
          .slide_up_header {
            text-align: center;
            padding: 2rem 0;
            position: relative;
          }
          .slide_up_header h2 {
            font-size: 1.5rem;
            font-weight: 500;
            color: var(--white);
            display: inline-block;
          }
          .overlay {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            top: 0;
            cursor: pointer;
            z-index: 998;
            background: var(--eerie-black-100);
            opacity: 0.7;
            transition: opacity cubic-bezier(0.19, 1, 0.22, 1) 0.445s,
              visiblity 0.445s;
          }
          :global(.tab) .overlay {
            display: none;
          }
          .overlay.closed {
            opacity: 0;
            visiblity: hidden;
            pointer-events: none;
          }
          .large {
            background-color: var(--onyx-200);
          }
          .slide_up_menu.closed {
            transform: translateY(var(--menu-height-transform));
            transition: transform cubic-bezier(0.19, 1, 0.22, 1)
                ${SLIDE_TRANSITION_MS}ms,
              // Drop opacity all at once at the end.
              opacity 0ms ${SLIDE_TRANSITION_MS}ms;
            opacity: 0;
            pointer-events: none;
          }
        `}
      </style>
    </div>
  )
}

SharedSlideUpMenu.defaultProps = {
  size: "medium",
}
