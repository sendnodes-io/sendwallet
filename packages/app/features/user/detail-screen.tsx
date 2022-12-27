import { Button, Paragraph, YStack } from "@my/ui";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronLeft } from "@tamagui/lucide-icons";
import { RootStackParamList } from "app/navigation/native";

export function UserDetailScreen({
	route,
	navigation,
}: NativeStackScreenProps<RootStackParamList, "user-detail">) {
	console.log("route", route);
	console.log("navigation", navigation);
	return (
		<YStack f={1} jc="center" ai="center" space>
			<Paragraph
				ta="center"
				fow="800"
			>{`User ID: ${route.params.id}`}</Paragraph>
			<Button onPress={() => navigation.navigate("home")} icon={ChevronLeft}>
				Go Home
			</Button>
		</YStack>
	);
}
