import config from "../tamagui.config";
import { NavigationProvider } from "./navigation";
import { TamaguiProvider, TamaguiProviderProps } from "@my/ui";
import StoreProvider from "./store";

export function Provider({
	children,
	...rest
}: Omit<TamaguiProviderProps, "config">) {
	return (
		<StoreProvider>
			<TamaguiProvider config={config} defaultTheme="light" {...rest}>
				<NavigationProvider>{children}</NavigationProvider>
			</TamaguiProvider>
		</StoreProvider>
	);
}
