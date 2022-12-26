import {
	NavigationContainer,
	DefaultTheme,
	DarkTheme,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import { useMemo } from "react";
import { useTheme } from "../../../ui/src";
import { Platform, useColorScheme, View } from "react-native";

const MyTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		primary: "rgb(255, 45, 85)",
	},
};
export function NavigationProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const scheme = useColorScheme();

	return (
		<NavigationContainer
			theme={scheme === "dark" ? DarkTheme : DefaultTheme}
			linking={useMemo(
				() => ({
					prefixes: [Linking.createURL("/")],
					config: {
						initialRouteName: "home",
						screens: {
							home: "/index.html",
							"user-detail": "/index.html?/user/:id",
						},
					},
				}),
				[],
			)}
		>
			{children}
		</NavigationContainer>
	);
}
