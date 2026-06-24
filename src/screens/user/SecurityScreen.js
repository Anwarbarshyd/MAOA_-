// src/screens/user/SecurityScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";

import { useThemeApp } from "../../theme/ThemeContext";


const KEY_BIOMETRICS = "settings_biometric_login"; // "1" | "0"

//  إعداد الخروج التلقائي 
const KEY_AUTO_LOGOUT = "security_auto_logout_enabled"; // "1" | "0"

//  مدة عدم النشاط بالدقائق
const KEY_AUTO_LOGOUT_MINUTES = "security_auto_logout_minutes"; // e.g. "10"

export default function SecurityScreen({ navigation }) {
  const { mode, colors, ready } = useThemeApp();
  const isDark = mode === "dark";

  const C = useMemo(
    () => ({
      title: "الأمان",
      sub: "تحكم بخيارات الحماية",
      biometrics: "البصمة / الوجه",
      biometricsHint: "استخدم بصمة الإصبع أو Face ID لتسجيل الدخول",
      autoLogout: "تسجيل خروج تلقائي",
      autoLogoutHint: "تسجيل خروج بعد فترة عدم نشاط (نفعّله على مستوى التطبيق)",
      sessions: "الجلسات النشطة",
      sessionsHint: "قريبًا ",
      done: "تم",
      close: "إغلاق",
      noteTitle: "تنبيه",
      noHardware: "جهازك ما يدعم البصمة/Face ID.",
      notEnrolled: "ما فيه بصمة/Face ID مسجل في الجهاز. سجّلها من إعدادات الجهاز أولاً.",
      authFailed: "ما تم التحقق. تم إلغاء التفعيل.",
      enabledMsg: "تم تفعيل تسجيل الدخول بالبصمة/Face ID.",
      disabledMsg: "تم إيقاف تسجيل الدخول بالبصمة/Face ID.",
      soon: "قريبًا",
      sessionsSoonMsg: " بنفعلها لاحقًا",
    }),
    []
  );

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(false);
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(10);

  const styles = useMemo(() => makeStyles(colors, mode), [colors, mode]);

  useEffect(() => {
    navigation?.setOptions?.({ headerShown: true });
  }, [navigation]);

  const loadAll = useCallback(async () => {
    const b = await AsyncStorage.getItem(KEY_BIOMETRICS);
    const a = await AsyncStorage.getItem(KEY_AUTO_LOGOUT);
    const m = await AsyncStorage.getItem(KEY_AUTO_LOGOUT_MINUTES);

    setBiometricsEnabled(b === "1");
    setAutoLogoutEnabled(a === "1");

    const mins = Number(m);
    setAutoLogoutMinutes(Number.isFinite(mins) && mins > 0 ? mins : 10);
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadAll();
  }, [ready, loadAll]);

  const toggleBiometrics = async (v) => {
    try {
      if (v) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
          Alert.alert(C.noteTitle, C.noHardware);
          setBiometricsEnabled(false);
          await AsyncStorage.setItem(KEY_BIOMETRICS, "0");
          return;
        }

        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          Alert.alert(C.noteTitle, C.notEnrolled);
          setBiometricsEnabled(false);
          await AsyncStorage.setItem(KEY_BIOMETRICS, "0");
          return;
        }

        //  تأكيد بالبصمة/الوجه عند التفعيل
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: "تأكيد تفعيل البصمة/Face ID",
          cancelLabel: "إلغاء",
          fallbackLabel: "استخدم رمز الجهاز",
          disableDeviceFallback: false,
        });

        if (!auth?.success) {
          Alert.alert(C.noteTitle, C.authFailed);
          setBiometricsEnabled(false);
          await AsyncStorage.setItem(KEY_BIOMETRICS, "0");
          return;
        }

        setBiometricsEnabled(true);
        await AsyncStorage.setItem(KEY_BIOMETRICS, "1");
        Alert.alert(C.done, C.enabledMsg);
        return;
      }

      // إيقاف
      setBiometricsEnabled(false);
      await AsyncStorage.setItem(KEY_BIOMETRICS, "0");
      Alert.alert(C.done, C.disabledMsg);
    } catch (e) {
      Alert.alert("خطأ", "تعذر تحديث إعداد البصمة.");
    }
  };

  const toggleAutoLogout = async (v) => {
    setAutoLogoutEnabled(v);
    await AsyncStorage.setItem(KEY_AUTO_LOGOUT, v ? "1" : "0");

    
    await AsyncStorage.setItem(KEY_AUTO_LOGOUT_MINUTES, String(autoLogoutMinutes || 10));
  };

  const onSessionsPress = () => {
    Alert.alert(C.soon, C.sessionsSoonMsg);
  };

  if (!ready) return null;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>{C.title}</Text>
          <Text style={styles.sub}>{C.sub}</Text>

          {/*  البصمة/الوجه */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.iconBox}>
                <Ionicons name="scan-outline" size={18} color={colors.text} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{C.biometrics}</Text>
                <Text style={styles.sectionHint}>{C.biometricsHint}</Text>
              </View>

              <Switch
                value={biometricsEnabled}
                onValueChange={toggleBiometrics}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
          </View>

          {/*  الخروج التلقائي  */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.iconBox}>
                <Ionicons name="time-outline" size={18} color={colors.text} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{C.autoLogout}</Text>
                <Text style={styles.sectionHint}>
                  {C.autoLogoutHint} (المدة الحالية: {autoLogoutMinutes} دقائق)
                </Text>
              </View>

              <Switch
                value={autoLogoutEnabled}
                onValueChange={toggleAutoLogout}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
          </View>

          {/* الجلسات  */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.9} onPress={onSessionsPress}>
              <View style={styles.iconBox}>
                <Ionicons name="laptop-outline" size={18} color={colors.text} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>{C.sessions}</Text>
                <Text style={styles.actionHint}>{C.sessionsHint}</Text>
              </View>

              <Ionicons name="chevron-back" size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors, mode) {
  const shadow =
    mode === "dark"
      ? {}
      : { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 };

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 22 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow,
    },

    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    sub: {
      marginTop: 4,
      fontSize: 12.5,
      fontWeight: "700",
      color: colors.subText,
      marginBottom: 10,
    },

    section: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "#F1F2F6",
    },

    sectionHead: { flexDirection: "row", alignItems: "center", gap: 10 },

    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 14,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
    },
    actionTitle: { fontSize: 14.5, fontWeight: "900", color: colors.text },
    actionHint: { marginTop: 2, fontSize: 12, fontWeight: "700", color: colors.subText },

    sectionTitle: { fontSize: 14.5, fontWeight: "900", color: colors.text },
    sectionHint: { marginTop: 2, fontSize: 12, fontWeight: "700", color: colors.subText },
  });
}