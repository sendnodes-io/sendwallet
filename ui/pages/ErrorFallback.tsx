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
      <div className="static md:absolute md:top-1/2  md:-translate-y-1/2">
        <Icon
          icon="fa6-solid:person-falling-burst"
          className="opacity-25 z-0  h-56 w-56"
        />
      </div>
      <div className="wrap z-10">
        <h1>Unexpected Error</h1>
        <p className="text-white">Apologies, but something went wrong.</p>
        <div className="py-4 mb-4 w-full">
          <h2 className="text-spanish-gray">For the devs:</h2>
          <pre className="block whitespace-pre-wrap max-h-48 overflow-y-auto">
            {error.message}
          </pre>
        </div>

        <SharedButton
          type="primary"
          size="medium"
          onClick={() => {
            window.location.reload()
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
