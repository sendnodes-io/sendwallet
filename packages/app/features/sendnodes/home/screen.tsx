import {
  Anchor,
  Button,
  H1,
  Input,
  Paragraph,
  Separator,
  Sheet,
  XStack,
  YStack,
  Image,
  Text,
} from "@my/ui";
import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import { useState } from "react";
import { useLink } from "solito/link";

import SendNodesLogo from "../../../assets/sendnodes/logo.svg";
import IconRewards from "app/assets/sendnodes/icon_rewards.svg";

export function HomeScreen() {
  const linkProps = useLink({
    href: "/user/nate",
  });

  return (
    <YStack>
      <YStack space="$4">
        <Image src={SendNodesLogo} height={48} width={278} />
      </YStack>

      <YStack f={1} jc="center" ai="center" p="$4">
        <YStack backgroundColor={"$blue1"} width="100%" space="$4">
          <YStack space="$4" p="$4">
            <H1>Analytics</H1>
            <Paragraph fontWeight={"thin"}>Your Rewards</Paragraph>
          </YStack>

          <Separator />

          <XStack
            flex={1}
            width="100%"
            flexWrap="wrap"
            jc="center"
            ai="center"
            p="$8"
          >
            <XStack
              flex={1}
              width="100%"
              flexWrap="wrap"
              jc="center"
              ai="center"
              $gtMd={{ width: "50%" }}
              space="$4"
            >
              <YStack
                space="$2"
                jc="center"
                ai={"center"}
                w="$8"
                h="$16"
                borderRadius={"$2"}
                backgroundColor={"$gray2"}
              >
                <Image src={IconRewards} height={48} width={48} />
              </YStack>
              <YStack
                space="$2"
                width="$16"
                jc="center"
                ai={"center"}
                borderRadius={"$4"}
                borderWidth="$1"
                h={"$16"}
              >
                <Text
                  position="absolute"
                  t={"$-2.5"}
                  fontFamily="$heading"
                  backgroundColor={"$gray1"}
                  px="$2"
                >
                  Total Rewards
                </Text>
                <Text fontFamily="$heading" fontSize={"$8"}>
                  0.00000000
                </Text>
              </YStack>
              <YStack space="$2" width="$16" jc="center" ai={"center"}>
                <Text fontWeight={"bold"}>Total Rewards</Text>
                <Text fontWeight={"thin"}>0.00000000</Text>
              </YStack>
              <YStack space="$2" width="$16" jc="center" ai={"center"}>
                <Text fontWeight={"bold"}>Total Rewards</Text>
                <Text fontWeight={"thin"}>0.00000000</Text>
              </YStack>
            </XStack>
            <XStack
              flex={1}
              width="100%"
              flexWrap="wrap"
              jc="center"
              ai="center"
              $gtMd={{ width: "50%" }}
            >
              <YStack space="$2" width="$16" jc="center" ai={"center"}>
                <Text fontWeight={"bold"}>Total Rewards</Text>
                <Text fontWeight={"thin"}>0.00000000</Text>
              </YStack>
              <YStack space="$2" width="$16" jc="center" ai={"center"}>
                <Text fontWeight={"bold"}>Total Rewards</Text>
                <Text fontWeight={"thin"}>0.00000000</Text>
              </YStack>
              <YStack space="$2" width="$16" jc="center" ai={"center"}>
                <Text fontWeight={"bold"}>Total Rewards</Text>
                <Text fontWeight={"thin"}>0.00000000</Text>
              </YStack>
            </XStack>
          </XStack>
        </YStack>

        <XStack>
          <Button {...linkProps}>Link to user</Button>
        </XStack>

        <SheetDemo />
      </YStack>
    </YStack>
  );
}

function SheetDemo() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(0);
  return (
    <>
      <Button
        size="$6"
        icon={open ? ChevronDown : ChevronUp}
        circular
        onPress={() => setOpen((x) => !x)}
      />
      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPoints={[80]}
        position={position}
        onPositionChange={setPosition}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay />
        <Sheet.Frame ai="center" jc="center">
          <Sheet.Handle />
          <H1>Sheet title</H1>
          <Paragraph>Sheet content</Paragraph>
          <Button
            size="$6"
            circular
            icon={ChevronDown}
            onPress={() => {
              setOpen(false);
            }}
          />
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
