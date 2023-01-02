import React, { ReactElement } from "react";

export interface OnboardingRecoveryPhraseProps {
	mnemonic?: string[];
	verify?: number[];
	selected?: number[];
	onClick?: (word: number) => void;
	importing?: boolean;
	onInput?: (e: React.FormEvent, index: number) => void;
}

export default function OnboardingRecoveryPhrase(
	props: OnboardingRecoveryPhraseProps,
) {
	const {
		mnemonic = [],
		verify = [],
		selected = [],
		onClick,
		importing = false,
		onInput,
	} = props;
	const isImporting = importing;
	const isVerifying = !isImporting && verify.length > 0;
	return (
		<>
			<div className={`mnemonic ${isVerifying && "verifying"}`}>
				{isImporting
					? Array.apply(null, Array(24)).map(function (_, idx) {
							return (
								<div
									key={`mnemonic-word-${idx + 1}`}
									style={{ "--word-index": idx + 1 } as React.CSSProperties}
									className="word"
								>
									<span>
										{" "}
										<input
											type="password"
											onInput={(e) => onInput?.(e, idx)}
											onPaste={(e) => onInput?.(e, idx)}
										/>
									</span>
								</div>
							);
					  })
					: mnemonic.map((word, idx) => {
							const verifiableIndex = verify.indexOf(idx);
							const isVerifiable = verifiableIndex > -1;
							const isSelected =
								isVerifiable && selected[verifiableIndex] !== undefined;
							const wordComponent = (
								<span>
									{isVerifiable
										? mnemonic[selected[verifiableIndex]!] || <br />
										: word}
								</span>
							);

							return (
								<div
									key={`mnemonic-word-${idx + 1}`}
									style={{ "--word-index": idx + 1 } as React.CSSProperties}
									className={`word ${isVerifiable && "selectable"} ${
										isSelected && "selected"
									}`}
									onClick={onClick?.bind(null, selected[verifiableIndex])}
									onKeyPress={(e) => e.stopPropagation()}
								>
									{wordComponent}
								</div>
							);
					  })}
			</div>
			<style jsx>
				{`
          .mnemonic {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            column-gap: 0.5rem;
            row-gap: 1rem;
          }

          .word {
            position: relative;
            padding: 0.5rem 0rem;
            line-height: 1rem;
            width: calc(var(--popup-width) * 0.2);
          }

          .word span {
            display: block;
            position: relative;
            top: 0;
            left: 0;
            font-size: 0.75rem;
            color: var(--white);
            margin-left: 1rem;
          }

          .word:before {
            counter-reset: curr_idx var(--word-index);
            content: counter(curr_idx);
            display: inline;
            font-size: 0.6rem;
            position: absolute;
            left: 2px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--davys-gray);
          }

          .word:after {
            content: "";
            display: block;
            position: absolute;
            bottom: 0;
            width: 100%;
            border-bottom: 1px solid var(--davys-gray);
          }

          .verifying .word {
            filter: blur(0.33rem);
            user-select: none;
          }

          .verifying .selectable {
            filter: unset;
            cursor: pointer;
            transition: color 0.2s;
            color: var(--white);
          }
          .verifying .word:before {
            color: var(--white);
          }
          .verifying .word:after {
            transition: color 0.2s;
            border-color: var(--white);
          }
          .verifying .selected span {
            color: var(--aqua);
            font-weight: 700;
          }
          .verifying .selected:before {
            content: "X";
            color: var(--aqua);
          }

          input {
            max-width: 100%;
          }

          .word:focus-within:after,
          .word:focus-within:before {
            border-color: var(--white);
            color: var(--white);
          }
        `}
			</style>
		</>
	);
}
