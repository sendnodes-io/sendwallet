import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import styles from "./styles"

export default function OnboardingAccountLayout(props: {
  title: ReactElement
  body: ReactElement
  buttons: ReactElement
  icon: ReactElement
  showCloseButton?: boolean
}): ReactElement {
  const history = useHistory()

  return (
    <section>
      <div className="icon">{props.icon}</div>
      <div className="top">
        {props.title}
        {props.showCloseButton ? (
          <button
            type="button"
            aria-label="close"
            className="icon_close"
            onClick={() => {
              if (history.action !== "POP") history.goBack()
              else history.push("/")
            }}
          />
        ) : null}
      </div>

      {props.body}

      <div className="buttons">{props.buttons}</div>

      <style jsx>{styles}</style>
      <style jsx>
        {`
          :global(main.dashed_border) {
            padding: 0 !important;
          }
          section {
            background-image: url(./images/add_wallet/add_wallet_bg@2x.png);
            background-size: 100%;
            background-position: center top;
            background-repeat: no-repeat;
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
          }

          h1 {
            max-width: 18rem;
          }

          .buttons {
            padding-bottom: 2rem;
            width: 20rem;
          }
        `}
      </style>
    </section>
  )
}
