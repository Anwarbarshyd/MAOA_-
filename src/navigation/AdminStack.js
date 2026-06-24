import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import ManageManagersScreen from "../screens/admin/ManageManagersScreen"; 

const Stack = createNativeStackNavigator();
 
export default function AdminStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: "" }}
      />
      <Stack.Screen
        name="ManageManagers"
        component={ManageManagersScreen}
        options={{ title: "" }}
      />
    </Stack.Navigator>
  );
 }