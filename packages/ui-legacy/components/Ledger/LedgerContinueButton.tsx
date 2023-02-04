import React from "react";

export default function LedgerContinueButton({
  children,
  isDisabled = false,
  onClick,
}: {
  children: React.ReactNode;
  isDisabled?: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <>
      <button
        className="button"
        disabled={isDisabled}
        type="button"
        onClick={onClick}
      >
        {children}
      </button>
      <style jsx>{`
        .button {
          background: var(--aqua);
          border-radius: 4px;
          margin: 1rem 0;
          padding: 0.5rem 1rem;
          text-align: center;
          font-weight: 600;
          font-size: 16px;
          line-height: 24px;
          letter-spacing: 0.03em;
          color: var(--eerie-black-100);
        }

        .button:not(:disabled):hover {
          background-color: var(--onyx-200);
        }

        .button:disabled {
          cursor: unset;
          background-color: var(--dim-gray);
          color: var(--cod-gray-200);
        }
      `}</style>
    </>
  );
}
