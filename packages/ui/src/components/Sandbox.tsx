import {
  YStack,
  Paragraph,
  XStack,
  Button,
  Input,
  Image,
  Stack,
} from "tamagui";

export const Sandbox = () => {
  return (
    <YStack>
      <Paragraph>Paragraph</Paragraph>
      <XStack>
        <Button>Button</Button>
        <Input placeholder="Input" />
      </XStack>
      <Image src={"https://picsum.photos/200/300"} width={200} height={300} />
      <Stack>
        <Button>Button</Button>
        <Button>Button</Button>
        <Button>Button</Button>
      </Stack>
    </YStack>
  );
};
