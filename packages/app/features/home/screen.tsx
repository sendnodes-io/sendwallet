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
} from "@my/ui";
import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import { useState } from "react";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "app/navigation/native";

import { Sandbox } from "@my/ui/src/components/Sandbox";

export function HomeScreen({
	navigation,
}: NativeStackScreenProps<RootStackParamList, "home">) {
	return (
		<YStack f={1} jc="center" ai="center" p="$4" space>
			<YStack space="$4" maw={600}>
				<H1 ta="center">Welcome to Tamagui.</H1>
				<Paragraph space="$4" ta="center">
					Here's a basic starter to show navigating from one screen to another.
					This screen uses the same code on Next.js and React Native.
				</Paragraph>

				<Input px="$5" placeholder="hi" />

				<Separator />
				<Paragraph ta="center">
					Made by{" "}
					<Anchor
						color="$color12"
						href="https://twitter.com/natebirdman"
						target="_blank"
					>
						@natebirdman
					</Anchor>
					,{" "}
					<Anchor
						color="$color12"
						href="https://github.com/tamagui/tamagui"
						target="_blank"
						rel="noreferrer"
					>
						give it a ⭐️
					</Anchor>
				</Paragraph>
			</YStack>

			<Sandbox />

			<XStack>
				<Button
					onPress={() => {
						navigation.navigate("user-detail", { id: "123" });
					}}
				>
					Link to user
				</Button>
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
