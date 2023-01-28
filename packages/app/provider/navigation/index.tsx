import {
	NavigationContainer,
	DefaultTheme,
	DarkTheme,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import { useMemo } from "react";
import { useTheme } from "@my/ui";
import { Platform, useColorScheme, View } from "react-native";

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
						screens: {
							"user-detail": "/index.html?userid=:id",
							home: "/index.html",
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
