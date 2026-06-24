import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/onboarding/LoginScreen";
import SignUpScreen from "../screens/onboarding/SignUpScreen";
import ForgotPasswordScreen from "../screens/onboarding/ForgotPasswordScreen";

import UserStack from "./UserStack";
import AdminStack from "./AdminStack";
import ManagerStack from "./ManagerStack";
import EmployeeStack from "./EmployeeStack";

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

      
      <Stack.Screen name="UserStack" component={UserStack} />
      <Stack.Screen name="AdminStack" component={AdminStack} />
      <Stack.Screen name="ManagerStack" component={ManagerStack} />
      <Stack.Screen name="EmployeeStack" component={EmployeeStack} />
    </Stack.Navigator>
  );
}
