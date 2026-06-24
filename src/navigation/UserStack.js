import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/user/HomeScreen";
import ReportScreen from "../screens/user/ReportScreen";
import MyReportsScreen from "../screens/user/MyReportsScreen";
import EmergencyNumbersScreen from "../screens/user/EmergencyNumbersScreen";
import ProfileScreen from "../screens/user/ProfileScreen";
import SettingsScreen from "../screens/user/SettingsScreen";
import SecurityScreen from "../screens/user/SecurityScreen";
import NotificationsScreen from "../screens/user/NotificationsScreen";


const Stack = createNativeStackNavigator();

export default function UserStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false,title:"" }} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: "إرسال بلاغ" }} />
      <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: "" }} />
      <Stack.Screen name="EmergencyNumbers" component={EmergencyNumbersScreen} options={{ title: "" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "" }} />
      <Stack.Screen name="Security" component={SecurityScreen} options={{ title: "" }}/>
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "الاشعارات" }} />

    </Stack.Navigator>
  );
}
