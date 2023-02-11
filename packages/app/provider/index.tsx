import config from "../tamagui.config";
import { NavigationProvider } from "./navigation";
import { TamaguiProvider, TamaguiProviderProps, Theme } from "@my/ui";
import { useColorScheme } from "react-native";

export function Provider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, "config">) {
  const scheme = useColorScheme();
  return (
    <TamaguiProvider
      config={config}
      // disableInjectCSS
      defaultTheme={scheme === "dark" ? "dark" : "light"}
      {...rest}
    >
      <Theme name="blue">
        <NavigationProvider>{children}</NavigationProvider>
      </Theme>
    </TamaguiProvider>
  );
}
