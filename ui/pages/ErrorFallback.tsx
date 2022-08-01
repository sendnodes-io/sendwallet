import { Icon } from "@iconify/react"
import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import SharedButton from "../components/Shared/SharedButton"
export default function ErrorFallback({
  error,
}: {
  error: Error
}): ReactElement {
  const history = useHistory()
  return (
    <>
      <div className="w-full absolute z-0">
        <div className="absolute left-0 inset-y-0">
          <Icon
            icon="fa6-solid:person-falling-burst"
            className="opacity-25 h-56 w-56"
          />
        </div>
      </div>
      <div className="wrap z-10">
        <h1>Unexpected Error</h1>
        <p className="text-white">Apologies, but something went wrong.</p>
        <div className="py-4 mb-4">
          <h2 className="text-spanish-gray">For the devs:</h2>
          <pre className="p-2 ">{error.message}</pre>
        </div>

        <SharedButton
          type="primary"
          size="medium"
          onClick={() => {
            if (history.length > 2) {
              history.goBack()
            } else {
              window.location.reload()
            }
          }}
        >
          Reload
        </SharedButton>
      </div>

      <style jsx>{`
        .wrap {
          height: 100%;
          width: 100%;
          max-width: 20rem;
          margin: 0 auto;
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
