import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../../features/home/screen";
import { UserDetailScreen } from "../../features/user/detail-screen";

export type RootStackParamList = {
	home: undefined;
	"user-detail": {
		id: string;
	};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function NativeNavigation() {
	return (
		<Stack.Navigator>
			<Stack.Screen
				name="home"
				component={HomeScreen}
				options={{
					title: "Home",
				}}
			/>
			{/* TODO for wallet:
					- Onboarding
						- Create
						- Restore
					- Accounts
						- Send
						- Receive
						- Transactions
						- Notifications
						- Staking
						- Performance
					- Analytics
					- Settings
					- About
			*/}
			<Stack.Screen
				name="user-detail"
				component={UserDetailScreen}
				options={{
					title: "User",
				}}
			/>
		</Stack.Navigator>
	);
}
