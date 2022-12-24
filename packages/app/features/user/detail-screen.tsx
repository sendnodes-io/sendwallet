import { Button, Paragraph, YStack } from "@my/ui"
import { ChevronLeft } from "@tamagui/lucide-icons"
import React from "react"

export function UserDetailScreen({ route, navigation }) {
  console.log("route", route)
  console.log("navigation", navigation)
  return (
    <YStack f={1} jc="center" ai="center" space>
      <Paragraph ta="center" fow="800">{`User ID: ${route.id}`}</Paragraph>
      <Button onPress={() => navigation.navigate("home")} icon={ChevronLeft}>
        Go Home
      </Button>
    </YStack>
  )
}
