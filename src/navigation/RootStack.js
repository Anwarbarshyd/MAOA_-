// src/navigation/RootStack.js
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

import AuthStack from "./AuthStack";
import UserStack from "./UserStack";
import AdminStack from "./AdminStack";
import ManagerStack from "./ManagerStack";
import EmployeeStack from "./EmployeeStack";
import GuestStack from "./GuestStack";

const Stack = createNativeStackNavigator();


const KEY_BIOMETRICS = "settings_biometric_login"; 

function roleToRootRoute(role) {
  switch (String(role || "").toLowerCase()) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "employee":
      return "Employee";
    default:
      return "User";
  }
}

// شاشة وسيطة تطلب البصمة قبل الدخول
function BiometricGateScreen({ navigation, route }) {
  const target = route?.params?.target || "User";
  const [busy, setBusy] = useState(false);

  const doAuth = useCallback(async () => {
    if (busy) return;
    setBusy(true);

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      
      if (!hasHardware || !isEnrolled) {
        navigation.reset({ index: 0, routes: [{ name: target }] });
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "تأكيد الهوية",
        cancelLabel: "إلغاء",
        fallbackLabel: "استخدام رمز الجهاز",
        disableDeviceFallback: false,
      });

      if (result?.success) {
        navigation.reset({ index: 0, routes: [{ name: target }] });
        return;
      }
      
    } catch (e) {
      Alert.alert("خطأ", "تعذر تشغيل البصمة. جرّب مرة ثانية.");
    } finally {
      setBusy(false);
    }
  }, [busy, navigation, target]);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([
      "isLoggedIn",
      "userRole",
      "local_session_v1",
      "local_user_profile",
      "last_login_email",
    ]);
    navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  }, [navigation]);

  useEffect(() => {
    doAuth();
  }, [doAuth]);

  return (
    <View style={gateStyles.root}>
      <View style={gateStyles.card}>
        <Text style={gateStyles.title}>تأكيد الدخول</Text>
        <Text style={gateStyles.sub}>
          فعّلنا البصمة/الوجه — لازم نتأكد إنها أنت قبل ندخلك.
        </Text>

        {busy ? (
          <View style={gateStyles.loadingRow}>
            <ActivityIndicator />
            <Text style={gateStyles.loadingText}>جارِ التحقق…</Text>
          </View>
        ) : null}

        <TouchableOpacity style={gateStyles.primaryBtn} onPress={doAuth} activeOpacity={0.9}>
          <Text style={gateStyles.primaryText}>إعادة المحاولة</Text>
        </TouchableOpacity>

        <TouchableOpacity style={gateStyles.ghostBtn} onPress={logout} activeOpacity={0.9}>
          <Text style={gateStyles.ghostText}>تسجيل خروج</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const gateStyles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#0B1220" },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#121A2B",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "900" },
  sub: { marginTop: 6, color: "rgba(255,255,255,0.70)", fontSize: 12.5, fontWeight: "700", lineHeight: 18 },
  loadingRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },
  primaryBtn: { marginTop: 14, paddingVertical: 14, borderRadius: 14, backgroundColor: "#3B82F6", alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "900" },
  ghostBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
  },
  ghostText: { color: "#fff", fontWeight: "900" },
});

export default function RootStack() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState("Auth");
  const [gateTarget, setGateTarget] = useState("User");
  const [navKey, setNavKey] = useState(1);

  const decideInitial = useCallback(async () => {
    const isLoggedIn = await AsyncStorage.getItem("isLoggedIn"); 
    const storedRole = await AsyncStorage.getItem("userRole");   
    const biometricsEnabled = await AsyncStorage.getItem(KEY_BIOMETRICS); 

    if (isLoggedIn === "true") {
      const target = roleToRootRoute(storedRole);

      
      if (biometricsEnabled === "1") {
        setGateTarget(target);
        return "BiometricGate";
      }
      return target;
    }
    return "Auth";
  }, []);

  useEffect(() => {
    (async () => {
      const r = await decideInitial();
      setInitialRoute(r);
      setReady(true);
      setNavKey((k) => k + 1);
    })();
  }, [decideInitial]);

  if (!ready) return null;

  return (
    <Stack.Navigator
      id="Root"
      key={navKey}
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="BiometricGate"
        component={BiometricGateScreen}
        initialParams={{ target: gateTarget }}
      />

      <Stack.Screen name="Auth" component={AuthStack} />
      <Stack.Screen name="Guest" component={GuestStack} />
      <Stack.Screen name="User" component={UserStack} />
      <Stack.Screen name="Admin" component={AdminStack} />
      <Stack.Screen name="Manager" component={ManagerStack} />
      <Stack.Screen name="Employee" component={EmployeeStack} />
    </Stack.Navigator>
  );
}