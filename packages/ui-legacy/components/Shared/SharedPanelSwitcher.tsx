import React, { ReactElement } from "react";

interface Props {
	setPanelNumber: (x: number) => void;
	panelNumber: number;
	panelNames: string[];
}

export default function SharedPanelSwitcher(props: Props): ReactElement {
	const { setPanelNumber, panelNumber, panelNames } = props;

	// TODO: make these styles work for more than two panels
	// .selected::after is the hardcoded culprit.
	return (
		<nav>
			<ul>
				{panelNames.slice(0, 3).map((name, index) => {
					return (
						<li key={name}>
							<button
								type="button"
								onClick={() => {
									setPanelNumber(index);
								}}
								className={`option${panelNumber === index ? " selected" : ""}`}
							>
								{name}
							</button>
						</li>
					);
				})}
			</ul>
			<style jsx>
				{`
          nav {
            width: 100%;
            position: relative;
            display: flex;
            height: 3.25rem;
            border-bottom: 1px solid var(--eerie-black-200);
            background-color: var(--black);
          }
          button {
            color: var(--aqua);
          }
          ul {
            display: flex;
            justify-content: space-around;
            flex: 1;
            width: 100%;
            height: 100%;
          }
          li {
            text-align: center;
            flex: 1;
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .option {
            cursor: pointer;
          }
          .option:hover {
            color: var(--white);
            margin: 0 auto;
          }
          .selected {
            font-weight: 700;
            color: var(--white);
            text-align: center;
            display: flex;
            justify-content: center;
          }
          .selected:hover {
            color: var(--white);
          }
          .selected::after {
            content: "";
            width: 2rem;
            height: 3px;
            background-color: var(--white);
            border-radius: 2rem;
            position: absolute;
            display: block;
            bottom: -2px;
          }
        `}
			</style>
		</nav>
	);
}
