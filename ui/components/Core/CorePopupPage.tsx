import React, { ReactElement } from "react"
import Snackbar from "../Snackbar/Snackbar"

interface Props {
  children: React.ReactNode
  hasTopBar: boolean
}

export default function CorePopupPage(props: Props): ReactElement {
  const { children, hasTopBar } = props

  return (
    <>
      <main className="dashed_border">
        {children}
        <Snackbar />
      </main>
      <style jsx>
        {`
          main {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            align-items: center;
            z-index: 10;
            height: ${hasTopBar
              ? "480px"
              : "calc(var(--popup-height) - calc(var(--main-margin)) * 2)"};
            width: calc(var(--popup-width) - calc(var(--main-margin)) * 2);
          }
          .top_menu_wrap {
            z-index: 10;
            cursor: default;
          }
        `}
      </style>
    </>
  )
}

CorePopupPage.defaultProps = {
  hasTopBar: true,
}