import config from "../tamagui.config"
import { NavigationProvider } from "./navigation"
import { TamaguiProvider, TamaguiProviderProps } from "@my/ui"

export function Provider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, "config">) {
  return (
    <TamaguiProvider config={config} defaultTheme="light" {...rest}>
      {/* <NavigationProvider>{children}</NavigationProvider> */}
      {children}
    </TamaguiProvider>
  )
}
