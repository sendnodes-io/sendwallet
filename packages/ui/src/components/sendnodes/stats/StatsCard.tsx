import { Paragraph, YStack } from "tamagui";

export default function StatsCard({
  name,
  stat,
}: {
  name: string;
  stat: string;
}) {
  return (
    <YStack
      space="$2"
      width="$20"
      jc="center"
      ai={"center"}
      borderRadius={"$4"}
      borderColor={"$gray3"}
      borderWidth="$1"
      h={"$16"}
    >
      <Paragraph
        position="absolute"
        t={"$-2.5"}
        fontFamily="$heading"
        backgroundColor={"$gray1"}
        px="$2"
      >
        {name}
      </Paragraph>
      <Paragraph fontFamily="$heading" fontWeight={"$16"} fontSize={"$10"}>
        {stat}
      </Paragraph>
    </YStack>
  );
}
