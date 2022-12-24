import React, { ChangeEvent, ReactElement, useEffect, useRef } from "react"
import classNames from "clsx"
import { useParsedValidation, useRunOnFirstRender } from "../../hooks"

interface Props<T> {
  id?: string
  label: string
  focusedLabelBackgroundColor: string
  placeholder?: string
  type: "password" | "text" | "number" | "textarea"
  value?: string | undefined
  onChange?: (value: T | undefined) => void
  onFocus?: () => void
  errorMessage?: string
  autoFocus?: boolean
  autoSelect?: boolean
  maxLength?: number
  disabled?: boolean
  parseAndValidate: (
    value: string
  ) => { parsed: T | undefined } | { error: string }
}

export function SharedTypedInput<T = string>(props: Props<T>): ReactElement {
  const {
    id,
    label,
    placeholder,
    focusedLabelBackgroundColor,
    type,
    onChange,
    onFocus,
    value: currentValue,
    errorMessage,
    autoFocus = false,
    autoSelect = false,
    parseAndValidate,
    maxLength,
    disabled = false,
  } = props
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (autoFocus) textAreaRef.current?.focus()
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (autoSelect) textAreaRef.current?.select()
    if (autoSelect) inputRef.current?.select()
  }, [autoSelect])

  const {
    rawValue: inputValue,
    errorMessage: parserError,
    handleInputChange,
  } = useParsedValidation<T | undefined>(
    onChange ?? (() => {}),
    parseAndValidate
  )

  useRunOnFirstRender(() => {
    if (currentValue && currentValue.trim() !== inputValue) {
      handleInputChange(currentValue)
    }
  })

  return (
    <div className="wrap shared_input">
      {type === "textarea" ? (
        <textarea
          id={id}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={
            typeof placeholder === "undefined" || placeholder === ""
              ? " "
              : placeholder
          }
          value={inputValue}
          spellCheck={false}
          onInput={(event: ChangeEvent<HTMLTextAreaElement>) =>
            handleInputChange(event.target.value)
          }
          onFocus={onFocus}
          className={classNames("input", {
            error: errorMessage,
          })}
          ref={textAreaRef}
        />
      ) : (
        <input
          id={id}
          disabled={disabled}
          type={type}
          placeholder={
            typeof placeholder === "undefined" || placeholder === ""
              ? " "
              : placeholder
          }
          value={inputValue}
          spellCheck={false}
          onInput={(event: ChangeEvent<HTMLInputElement>) =>
            handleInputChange(event.target.value)
          }
          onFocus={onFocus}
          className={classNames("input", {
            error: errorMessage,
          })}
          ref={inputRef}
        />
      )}
      <label htmlFor={id}>{label}</label>

      {errorMessage && <div className="error_message">{errorMessage}</div>}
      {parserError && <div className="error_message">{parserError}</div>}
      <style jsx>
        {`
          .wrap {
            position: relative;
            display: flex;
            margin-bottom: 1.5rem;
            width: 100%;
            margin-left: auto;
            margin-right: auto;
          }
          .input {
            width: 100%;
            height: 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid var(--spanish-gray);
            padding: 0px 1rem;
          }
          .input:disabled {
            cursor: not-allowed;
          }
          textarea {
            overflow-wrap: break-word;
          }
          .input {
            padding: 1rem;
          }
          .input::placeholder {
            color: var(--spanish-gray);
          }
          .input:focus {
            border: 1px solid var(--white);
          }
          .input[type="number"] {
            -moz-appearance: textfield;
          }
          .error,
          .error:focus {
            border-color: var(--error);
          }
          .error_message {
            color: var(--error);
            position: absolute;
            font-weight: 500;
            font-size: 0.9rem;
            line-height: 0.9rem;
            bottom: -1.25rem;
          }

          label {
            position: absolute;
            pointer-events: none;
            display: flex;
            width: fit-content;
            margin-left: 1rem;
            border-radius: 5px;
            box-sizing: border-box;
            color: var(--spanish-gray);
            transition: font-size 0.2s ease, top 0.2s ease, left 0.2s ease,
              font-weight 0.2s ease, padding 0.2s ease;
            font-weight: 300;
            top: 0.5rem;
          }
          .input:focus ~ label,
          .input:not(:placeholder-shown) ~ label,
          .input:not([placeholder=" "]) ~ label {
            top: -0.725rem;
            left: -0.25rem;
            font-size: 0.75rem;
            font-weight: 500;
            padding: 0px 0.375rem;
            color: var(--white);
            background-color: ${focusedLabelBackgroundColor};
          }
          .error ~ label {
            color: var(--error);
          }
        `}
      </style>
    </div>
  )
}

SharedTypedInput.defaultProps = {
  type: "text",
  focusedLabelBackgroundColor: "var(--eerie-black-100)",
}

export default function SharedInput(
  props: Omit<Props<string>, "onChange"> & { onChange?: (_: string) => void }
): ReactElement {
  const onChangeWrapper = (newValue: string | undefined) => {
    props.onChange?.(newValue ?? "")
  }

  return SharedTypedInput({
    ...props,
    onChange: onChangeWrapper,
  })
}

SharedInput.defaultProps = {
  ...SharedTypedInput.defaultProps,
  parseAndValidate: (v: string) => ({ parsed: v }),
}
