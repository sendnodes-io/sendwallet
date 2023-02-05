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
} from "@my/ui";
import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import React, { useState } from "react";
import { useLink } from "solito/link";

import SendNodesLogo from "../../../assets/sendnodes/logo.svg";

export function HomeScreen() {
  const linkProps = useLink({
    href: "/user/nate",
  });

  return (
    <YStack f={1} jc="center" ai="center" p="$4" space>
      <YStack space="$4" maw={600}>
        <Image src={SendNodesLogo} height={48} width={278} />
        <H1 ta="center">SendWallet</H1>
      </YStack>

      <XStack>
        <Button {...linkProps}>Link to user</Button>
      </XStack>

      <SheetDemo />
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
