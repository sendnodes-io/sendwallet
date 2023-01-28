/// <reference types="styled-jsx" />
/// <reference types="@sendwallet/pokt-wallet-background" />

declare module "styled-jsx/style";

declare module "react" {
	interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
		// extends React's HTMLAttributes
		css?: string;
	}
}
