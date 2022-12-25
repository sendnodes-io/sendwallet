import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native"
import * as Linking from "expo-linking"
import { useMemo } from "react"
import { useTheme } from "../../../ui/src"
import { useColorScheme } from "react-native"

const MyTheme = {
  dark: true,
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "rgb(255, 45, 85)",
  },
}
export function NavigationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const scheme = useColorScheme()

  return (
    <NavigationContainer
      theme={scheme === "dark" ? DarkTheme : DefaultTheme}
      linking={useMemo(
        () => ({
          prefixes: [Linking.createURL("/")],
          config: {
            initialRouteName: "home",
            screens: {
              home: "",
              "user-detail": "user/:id",
            },
          },
        }),
        []
      )}
    >
      {children}
    </NavigationContainer>
  )
}
