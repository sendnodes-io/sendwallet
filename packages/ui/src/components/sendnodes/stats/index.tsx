import { H2, H5, H6, Paragraph, styled, YStack } from "tamagui";

export const StatStack = styled(YStack, {
  space: "$2",
  width: "$20",
  jc: "center",
  ai: "center",
  borderRadius: "$4",
  borderColor: "$gray5",
  borderWidth: "$1",
  h: "$16",
});

export const StatHeader = styled(Paragraph, {
  position: "absolute",
  t: "$-2.5",
  fontFamily: "$heading",
  backgroundColor: "$blue2",
  px: "$2",
});

export const StatBody = styled(Paragraph, {
  fontFamily: "$heading",
  fontWeight: "$16",
  fontSize: "$10",
});
