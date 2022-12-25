import React from "react"
import { Platform } from "react-native"
import { NativeNavigation } from "app/navigation/native"
import { Provider } from "app/provider"
// import { useFonts } from "expo-font"
import { createRoot } from "react-dom/client"
import Tamagui from "../tamagui.config"

export default function App() {
  // print the platform
  console.log("Platform", Platform.OS)

  // const [loaded] = useFonts({
  //   Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
  //   InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  // })

  // if (!loaded) {
  //   return null
  // }

  return (
    <Provider>
      <NativeNavigation />
    </Provider>
  )
}

// AppRegistry.registerComponent('Main', () => Sandbox)
// console.log('config', config)

createRoot(document.querySelector("#root")!).render(<App />)
