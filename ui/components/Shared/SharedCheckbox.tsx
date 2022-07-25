import React, { ReactElement, ChangeEventHandler } from "react"

interface Props {
  id: string
  label: string
  onChange: ChangeEventHandler<HTMLInputElement>
  checked?: boolean
}

export default function SharedCheckbox(props: Props): ReactElement {
  const { label, checked, onChange, id = "checkbox" } = props

  return (
    <div className="checkbox">
      <label htmlFor={id} className="label flex flex-row">
        <input
          id={id}
          defaultChecked={checked}
          onChange={onChange}
          type="checkbox"
          className="inline-block"
        />
        <span className="checkmark " />
        <span>{label}</span>
      </label>
      <style jsx>{`
        .checkbox {
          display: flex;
          align-items: center;
          position: relative;
          cursor: pointer;
          user-select: none;
        }

        .checkbox input {
          position: absolute;
          opacity: 0;
          height: 0;
          width: 0;
        }

        .checkmark {
          position: relative;
          height: 1.5rem;
          width: 1.5rem;
          border-radius: 0.25rem;
          background-color: var(--dim-gray);
          margin-right: 0.75rem;
        }
        .checkbox:hover input ~ .checkmark {
          background-color: var(--dim-gray);
        }
        .checkmark:after {
          position: absolute;
        }
        .checkbox input:checked ~ .checkmark:after {
          content: "";
        }
        .checkbox input:checked ~ span {
          color: var(--white);
        }
        .checkbox .checkmark:after {
          left: 0.49rem;
          top: 0.15rem;
          width: 0.6rem;
          height: 1.2rem;
          border: solid var(--white);
          border-width: 0 0.3rem 0.3rem 0;
          transform: rotate(45deg);
        }
        .label {
          line-height: normal;
          margin-top: 0;
          cursor: pointer;
          font-size: 1rem;
        }
      `}</style>
    </div>
  )
}
