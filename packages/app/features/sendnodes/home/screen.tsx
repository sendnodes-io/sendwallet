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
  styled,
  Theme,
} from "@my/ui";
import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import { useState } from "react";
import { useLink } from "solito/link";

import SendNodesLogo from "../../../assets/sendnodes/logo.svg";
import {
  StatBody,
  StatHeader,
  StatStack,
} from "@my/ui/src/components/sendnodes/stats";

const IconRewardStack = styled(YStack, {
  name: "IconRewardStack",
  space: "$2",
  jc: "center",
  ai: "center",
  w: "$8",
  h: "$16",
  borderRadius: "$2",
  backgroundColor: "$blue3",
});

export function HomeScreen() {
  const linkProps = useLink({
    href: "/user/nate",
  });

  return (
    <YStack flex={1} backgroundColor={"$blue1"}>
      <XStack space="$4" jc="space-between" p="$4">
        <Image src={SendNodesLogo} height={48} width={278} />
        <Button>Connect Wallet</Button>
      </XStack>

      <YStack
        f={1}
        jc="center"
        ai="center"
        height="100%"
        backgroundColor={"$blue2"}
        py="$4"
      >
        <YStack width="100%" space="$4" flex={1} height="100%" jc="center">
          <YStack space="$4" px="$4">
            <H1>Analytics</H1>
            <Paragraph fontWeight={"thin"}>Your Rewards</Paragraph>
          </YStack>

          <XStack flex={1} flexWrap="wrap" p="$4">
            <XStack
              flex={1}
              width="100%"
              flexWrap="wrap"
              $gtMd={{ width: "50%" }}
              space="$4"
            >
              <IconRewardStack>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M30.6806 26.6013C30.2038 26.6128 29.8528 26.0878 30.0457 25.6514C30.2726 25.0905 31.0891 25.09 31.3156 25.6514C31.5088 26.0878 31.1575 26.613 30.6806 26.6013Z"
                    fill="currentColor"
                  />
                  <path
                    d="M20.9925 19.4995H24.9534C22.1796 19.4995 19.9228 17.2428 19.9228 14.469C19.9228 13.1217 20.4481 11.8466 21.4017 10.8782C22.3566 9.90882 23.6179 9.37491 24.9534 9.37491C26.2889 9.37491 27.5502 9.90882 28.505 10.8782C29.4587 11.8466 29.9839 13.1217 29.9839 14.469C29.9839 17.2428 27.7273 19.4995 24.9534 19.4995H28.9143C30.4021 18.3255 31.3588 16.507 31.3588 14.469C31.3588 12.7585 30.6932 11.1406 29.4845 9.91344C28.2694 8.67952 26.6602 8 24.9534 8C23.2466 8 21.6374 8.67952 20.4222 9.91344C19.2136 11.1406 18.5479 12.7584 18.5479 14.469C18.548 16.507 19.5047 18.3255 20.9925 19.4995Z"
                    fill="#17FFFF"
                  />
                  <path
                    d="M24.9534 17.0624C23.5234 17.0624 22.3599 15.8991 22.3599 14.469C22.3599 13.039 23.5234 11.8756 24.9534 11.8756C26.3834 11.8756 27.5469 13.039 27.5469 14.469C27.5469 15.8991 26.3835 17.0624 24.9534 17.0624ZM24.9534 13.2505C24.2815 13.2505 23.7349 13.7971 23.7349 14.469C23.7349 15.1409 24.2815 15.6875 24.9534 15.6875C25.6253 15.6875 26.1719 15.1409 26.1719 14.469C26.1719 13.7971 25.6254 13.2505 24.9534 13.2505Z"
                    fill="#17FFFF"
                  />
                  <path
                    d="M37.4059 25.2175H36.7052C36.3925 24.021 35.8769 22.9148 35.1669 21.9173L37.8673 18.7249C38.0981 18.4519 38.0812 18.0476 37.8285 17.7948C36.4792 16.4455 34.4251 16.1111 32.7174 16.9627L31.8805 17.3801C31.5557 17.2068 31.2215 17.0457 30.8803 16.8973C30.7036 17.3269 30.4815 17.7332 30.2201 18.1102C30.6701 18.3008 31.1071 18.516 31.524 18.7536C31.7233 18.8671 31.966 18.8739 32.1712 18.7715L33.331 18.1931C34.3175 17.7012 35.4715 17.783 36.3672 18.3693L33.7625 21.4486C33.5504 21.6994 33.5453 22.065 33.7503 22.3216C34.6185 23.4085 35.2026 24.6606 35.4863 26.0431C35.5519 26.3628 35.8333 26.5924 36.1597 26.5924H37.4058C38.0777 26.5924 38.6244 27.139 38.6244 27.8109V29.7169C38.6244 30.3888 38.0777 30.9355 37.4058 30.9355C37.2437 30.9355 35.8146 30.9358 35.5625 30.9465C35.3004 30.9577 35.0674 31.1171 34.9621 31.3574C34.3349 32.7883 33.3434 34.0625 32.1701 34.9452C31.9984 35.0743 31.897 35.2762 31.8959 35.4909C31.8947 35.7136 31.8933 36.564 31.8921 37.4061C31.893 38.4862 30.558 39.0302 29.7926 38.2831C29.5737 38.064 29.4532 37.7728 29.4535 37.4631C29.4538 37.0649 29.4542 36.7487 29.4545 36.6432C29.4641 36.132 28.8898 35.7876 28.4436 36.0346C26.8743 36.9316 23.0345 36.932 21.4643 36.0353C21.2512 35.9221 20.9943 35.9286 20.7873 36.0528C20.5804 36.1771 20.4538 36.4008 20.4538 36.6422V37.464C20.4538 38.1031 19.934 38.623 19.2951 38.623C18.6035 38.6554 18.0127 38.1017 18.0138 37.4065C18.0123 36.4973 18.0104 35.5309 18.0089 35.1749C18.008 34.9453 17.8924 34.7313 17.7009 34.6045C10.8997 30.0865 12.2381 21.1879 19.6847 18.1073C19.4241 17.7311 19.2028 17.3258 19.0265 16.8973C14.5956 18.823 11.7944 22.7389 11.8801 27.049C11.2968 26.9216 10.7572 26.6325 10.3177 26.2029C9.71068 25.6095 9.37633 24.8268 9.37633 23.999C9.37633 23.6193 9.06853 23.3115 8.68887 23.3115C8.30921 23.3115 8.00141 23.6193 8.00141 23.999C7.95498 26.2149 9.82017 28.2421 12.013 28.4641C12.4796 31.2217 14.1295 33.7733 16.6353 35.5413C16.6365 36.0049 16.6379 36.7232 16.639 37.4089C16.745 40.6851 21.4496 40.9275 21.8215 37.6589C23.5853 38.2321 26.3225 38.232 28.0861 37.6587C28.1596 38.9658 29.3629 40.0544 30.6738 39.9979C32.1018 39.9979 33.2652 38.8361 33.2672 37.4081C33.2681 36.8099 33.269 36.2075 33.2699 35.8301C34.3987 34.9115 35.3632 33.6843 36.0337 32.3144C36.4234 32.3116 36.9941 32.3104 37.406 32.3104C38.836 32.3104 39.9994 31.147 39.9994 29.717V27.811C39.9994 26.3809 38.836 25.2175 37.4059 25.2175Z"
                    fill="currentColor"
                  />
                  <path
                    d="M29.7184 20.8744H20.1884C19.8087 20.8744 19.5009 20.5666 19.5009 20.187C19.5009 19.8073 19.8087 19.4995 20.1884 19.4995H29.7184C30.0981 19.4995 30.4059 19.8073 30.4059 20.187C30.4059 20.5666 30.0981 20.8744 29.7184 20.8744Z"
                    fill="currentColor"
                  />
                </svg>
              </IconRewardStack>
              <StatStack>
                <StatHeader>Current Reward</StatHeader>
                <StatBody>489.8</StatBody>
              </StatStack>
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
                <Text
                  position="absolute"
                  t={"$-2.5"}
                  fontFamily="$heading"
                  backgroundColor={"$gray1"}
                  px="$2"
                >
                  Last Net Reward
                </Text>
                <Text fontFamily="$heading" fontSize={"$10"}>
                  456.1
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

          <YStack jc="center" ai="center">
            <XStack>
              <Button {...linkProps}>Link to user</Button>
            </XStack>

            <SheetDemo />
          </YStack>
        </YStack>
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
