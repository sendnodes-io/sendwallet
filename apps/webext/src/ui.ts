import "../global.css"

import { Provider } from "app/provider"
import { HomeScreen } from "app/features/home/screen"
import React, { ReactElement } from "react"
import ReactDOM from "react-dom"

const rootElement = document.getElementById("pokt-wallet-root")

if (!rootElement) {
  throw new Error(
    "Failed to find #pokt-wallet-root element; page structure changed?"
  )
}

ReactDOM.render(React.createElement(HomeScreen), rootElement)
