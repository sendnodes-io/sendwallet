import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import SharedButton from "../components/Shared/SharedButton"
export default function ErrorFallback(): ReactElement {
  const history = useHistory()
  return (
    <>
      <div className="wrap">
        <h1>Unexpected Error</h1>
        <SharedButton type="primary" size="medium" onClick={() => {
          if (history.length > 1) {
            history.goBack()
          } else {
            window.location.reload()
          }
        }}>
          Return Home
        </SharedButton>
      </div>
      <style jsx>{`
        .wrap {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        h1 {
          margin-bottom: 20px;
        }
      `}</style>
    </>
  )
}
