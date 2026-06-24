import React, { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeApp } from "../theme/ThemeContext";

import EmployeeHome from "../screens/employee/EmployeeHome";
import EmployeeReports from "../screens/employee/EmployeeReports";
import EmployeeReportDetails from "../screens/employee/EmployeeReportDetails";

const Stack = createNativeStackNavigator();

export default function EmployeeStack() {
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
    <Stack.Navigator screenOptions={common}>
      <Stack.Screen name="EmployeeHome" component={EmployeeHome} options={{ title: "" }} />
      <Stack.Screen name="EmployeeReports" component={EmployeeReports} options={{ title: "بلاغات الجهة" }} />
      <Stack.Screen name="EmployeeReportDetails" component={EmployeeReportDetails} options={{ title: "تفاصيل البلاغ" }} />
    </Stack.Navigator>
  );
}