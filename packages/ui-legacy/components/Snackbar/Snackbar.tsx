import React, { ReactElement, useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import classNames from "clsx";
import {
	selectSnackbarMessage,
	clearSnackbarMessage,
} from "@sendnodes/pokt-wallet-background/redux-slices/ui";
import { useBackgroundSelector, useDelayContentChange } from "../../hooks";

// Number of ms before a snackbar message dismisses; changing the message will
// extend visibility by this much.
const DISMISS_MS = 3000;
// Number of ms that it takes for the snackbar to disappear after it's
// dismissed.
const DISMISS_ANIMATION_MS = 800;

export default function Snackbar(): ReactElement {
	const dispatch = useDispatch();

	const snackbarMessage = useBackgroundSelector(selectSnackbarMessage);
	const shouldHide = snackbarMessage.trim() === "";
	// Delay the display message clearing to allow the animation to complete
	// before the message is hidden.
	const displayMessage = useDelayContentChange(
		snackbarMessage,
		shouldHide,
		DISMISS_ANIMATION_MS,
	);

	const snackbarTimeout = useRef<number | undefined>();

	const clearSnackbarTimeout = useCallback(() => {
		if (typeof snackbarTimeout.current !== "undefined") {
			clearTimeout(snackbarTimeout.current);
			snackbarTimeout.current = undefined;
		}
	}, []);

	useEffect(() => {
		clearSnackbarTimeout();

		snackbarTimeout.current = window.setTimeout(() => {
			dispatch(clearSnackbarMessage());
		}, DISMISS_MS);
	}, [snackbarMessage, clearSnackbarTimeout, dispatch]);

	return (
		<div className={classNames("snackbar_wrap", { hidden: shouldHide })}>
			{displayMessage}
			<style jsx>
				{`
          .snackbar_wrap {
            max-width: 22rem;
            width: auto;
            height: auto;
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            font-weight: 500;
            position: absolute;
            bottom: 4.5rem;
            z-index: 999999999;
            background: var(--eerie-black-100);
            color: var(--capri);
            box-shadow: 0px 1.5rem 1.5rem var(--eerie-black-100);
            border-radius: 0.5rem;
            transition: all ${DISMISS_ANIMATION_MS}ms ease;
            opacity: 1;
            transform: translateY(0px);
            user-select: none;
          }
          .hidden {
            /* Take up no space, and let pointer events through just in case. No */
            /* hidden snackbar should get in the way of a user's actions. */
            padding: 0;
            pointer-events: none;

            opacity: 0;
            transform: translateY(0.625rem);
          }
        `}
			</style>
		</div>
	);
}
