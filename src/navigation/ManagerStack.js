import React, { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeApp } from "../theme/ThemeContext";

import ManagerDashboard from "../screens/manager/ManagerDashboard";
import ManagerReports from "../screens/manager/ManagerReports";
import ManagerReportDetails from "../screens/manager/ManagerReportDetails";
import ManagerEmployees from "../screens/manager/ManagerEmployees"; 

const Stack = createNativeStackNavigator();

export default function ManagerStack() {
  const { colors } = useThemeApp();

  const common = useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.card },
      headerTintColor: colors.text,
      contentStyle: { backgroundColor: colors.bg },
    }),
    [colors]
  );

  return (
    <Stack.Navigator
      initialRouteName="ManagerDashboard"  
      screenOptions={common}
    >
      <Stack.Screen
        name="ManagerDashboard"
        component={ManagerDashboard}
        options={{ title: "" }}
      />

      <Stack.Screen
        name="ManagerReports"
        component={ManagerReports}
        options={{ title: "بلاغات الجهة" }}
      />

      <Stack.Screen
        name="ManagerReportDetails"
        component={ManagerReportDetails}
        options={{ title: "تفاصيل البلاغ" }}
      />

     
      <Stack.Screen
        name="ManagerEmployees"
        component={ManagerEmployees}
        options={{ title: "الموظفون" }}
      />
    </Stack.Navigator>
  );
}