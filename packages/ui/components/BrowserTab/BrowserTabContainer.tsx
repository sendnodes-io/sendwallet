import React, { ReactElement } from "react"

export default function BrowserTabContainer({
  children,
}: {
  children: React.ReactNode
}): ReactElement {
  return (
    <>
      <div className="container">{children}</div>
      <style jsx>{`
        .container {
          height: 100%;
          background: linear-gradient(
            to top,
            #10322f,
            var(--eerie-black-100) 100%
          );
        }
      `}</style>
    </>
  )
}
