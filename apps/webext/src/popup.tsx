window.global ||= window
globalThis.global ||= globalThis

import { Platform } from "react-native"

import React from "react"
// import { NavigationContainer } from "@react-navigation/native"
// import { NativeNavigation } from "app/navigation/native"
import { HomeScreen } from "app/features/home/screen"
import { Provider } from "app/provider"
// import { useFonts } from "expo-font"
import { createRoot } from "react-dom/client"
import Tamagui from "../tamagui.config"
import { Text, XStack, YStack } from "tamagui"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
const Stack = createNativeStackNavigator()

export default function App() {
  // print the platform
  console.log("Platform waaahhh", Platform.OS)

  // const [loaded] = useFonts({
  //   Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
  //   InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  // })

  // if (!loaded) {
  //   return null
  // }

  return (
    <Provider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  )
}

// AppRegistry.registerComponent('Main', () => Sandbox)
// console.log('config', config)

createRoot(document.querySelector("#root")!).render(<App />)
