// src/screens/onboarding/LoginScreen.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";

import { useThemeApp } from "../../theme/ThemeContext";
import { API_BASE_URL } from "../../services/api";

const SESSION_KEY = "local_session_v1";
const PROFILE_KEY = "local_user_profile";

const KEY_BIOMETRICS = "settings_biometric_login"; // "1" | "0"
const KEY_LAST_EMAIL = "last_login_email";

const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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

function normalizeUserId(user) {
  return user?.userId || user?.UserId || user?.UserID || user?.id || user?.Id || null;
}


function buildAuthLoginUrl() {
  const base = String(API_BASE_URL || "").replace(/\/+$/g, ""); // remove trailing /
  // لو القاعدة تنتهي بـ /api => نضيف /auth/login
  if (base.toLowerCase().endsWith("/api")) return `${base}/auth/login`;
  // لو ما تنتهي بـ /api => نضيف /api/auth/login
  return `${base}/api/auth/login`;
}

function pickRole(user) {
  return String(user?.role || user?.Role || "user").toLowerCase();
}

function pickEmail(user) {
  return String(user?.email || user?.Email || "").trim().toLowerCase();
}

export default function LoginScreen({ navigation }) {
  const { colors, mode } = useThemeApp();
  const isDark = mode === "dark";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [bioEnabled, setBioEnabled] = useState(false);
  const [checkingBio, setCheckingBio] = useState(true);

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingBio, setLoadingBio] = useState(false);

  const validate = useCallback(() => {
    const e = String(email || "").trim();
    const p = String(password || "");
    if (!e || !p) return "يرجى ملء جميع الحقول";
    if (!emailRegex.test(e)) return "البريد الإلكتروني غير صحيح";
    return null;
  }, [email, password]);

  const goRoot = useCallback(
    (role) => {
      const target = roleToRootRoute(role);
      const root = navigation.getParent?.("Root");
      if (root?.reset) root.reset({ index: 0, routes: [{ name: target }] });
      else navigation.reset({ index: 0, routes: [{ name: target }] });
    },
    [navigation]
  );

  const saveSession = useCallback(async ({ token, user, userId }) => {
    const role = pickRole(user);
    const userEmail = pickEmail(user);

    await AsyncStorage.multiRemove([SESSION_KEY, PROFILE_KEY, "token", "userId"]);

    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        isLoggedIn: true,
        role,
        token,
        userId,
        email: userEmail,
      })
    );

    await AsyncStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        userId,
        fullName: user?.fullName || user?.FullName || "",
        phone: user?.phone || user?.Phone || "",
        email: userEmail,
        nationalId: user?.nationalId || user?.NationalId || "",
      })
    );

    await AsyncStorage.setItem("isLoggedIn", "true");
    await AsyncStorage.setItem("userRole", role);
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("userId", String(userId));

    if (userEmail) await AsyncStorage.setItem(KEY_LAST_EMAIL, userEmail);

    return role;
  }, []);

  const loginWithEmailPassword = useCallback(async () => {
    const err = validate();
    if (err) return Alert.alert("تسجيل الدخول", err);

    setLoadingLogin(true);
    try {
      const loginUrl = buildAuthLoginUrl();

      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(email || "").trim().toLowerCase(),
          password: String(password || ""),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        Alert.alert("تسجيل الدخول", data?.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
        return;
      }

      const token = data?.token;
      const user = data?.user;
      const userId = normalizeUserId(user);
      const userEmail = pickEmail(user);

      if (!token || !userEmail || !userId) {
        Alert.alert("تسجيل الدخول", "ردّ السيرفر ناقص (token/userId/email).");
        return;
      }

      const role = await saveSession({ token, user, userId });
      goRoot(role);
    } catch (e) {
      Alert.alert( "ما قدرنا نتصل بالسيرفر ");
    } finally {
      setLoadingLogin(false);
    }
  }, [email, password, goRoot, saveSession, validate]);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(KEY_BIOMETRICS);
        setBioEnabled(v === "1");

        const lastEmail = await AsyncStorage.getItem(KEY_LAST_EMAIL);
        if (lastEmail && !email) setEmail(lastEmail);
      } finally {
        setCheckingBio(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener?.("focus", async () => {
      const v = await AsyncStorage.getItem(KEY_BIOMETRICS);
      setBioEnabled(v === "1");
    });
    return unsub;
  }, [navigation]);

  const viewPages = useCallback(() => {
    const root = navigation.getParent?.("Root");
    if (root?.reset) root.reset({ index: 0, routes: [{ name: "Guest" }] });
    else navigation.reset({ index: 0, routes: [{ name: "Guest" }] });
  }, [navigation]);

  const onFaceId = useCallback(async () => {
    if (!bioEnabled) {
      Alert.alert("تنبيه", "البصمة/Face ID مقفلة من الإعدادات > الأمان.");
      return;
    }

    try {
      setLoadingBio(true);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert("تنبيه", "جهازك ما يدعم البصمة/Face ID.");
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert("تنبيه", "ما فيه بصمة/Face ID مسجل في الجهاز.");
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: "تسجيل الدخول بالبصمة/Face ID",
        cancelLabel: "إلغاء",
        fallbackLabel: "استخدم رمز الجهاز",
        disableDeviceFallback: false,
      });

      if (!auth?.success) return;

      const e = String(email || "").trim().toLowerCase();
      if (!e || !emailRegex.test(e)) {
        Alert.alert("تنبيه", "اكتب بريدك أولاً، وبعدها تشتغل البصمة.");
        return;
      }

      const sessionStr = await AsyncStorage.getItem(SESSION_KEY);
      const session = sessionStr ? JSON.parse(sessionStr) : null;

      if (!session?.token || !session?.userId) {
        Alert.alert("تنبيه", "ما عندنا جلسة محفوظة. سجل دخول مرة بالبريد وكلمة المرور.");
        return;
      }

      const sessionEmail = String(session?.email || "").toLowerCase();
      if (sessionEmail && sessionEmail !== e) {
        Alert.alert("تنبيه", "هذا البريد مختلف عن آخر جلسة محفوظة.");
        return;
      }

      goRoot(session?.role || "user");
    } catch {
      Alert.alert("خطأ", "صار خطأ أثناء التحقق بالبصمة.");
    } finally {
      setLoadingBio(false);
    }
  }, [bioEnabled, email, goRoot]);

  const faceBtnDisabled = checkingBio || loadingBio || !bioEnabled;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>تسجيل الدخول</Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="البريد الإلكتروني"
          placeholderTextColor={colors.subText}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="كلمة المرور"
          placeholderTextColor={colors.subText}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.primary, { backgroundColor: colors.primary, opacity: loadingLogin ? 0.85 : 1 }]}
          onPress={loginWithEmailPassword}
          activeOpacity={0.9}
          disabled={loadingLogin || loadingBio}
        >
          {loadingLogin ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>دخول</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.faceBtn,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              borderColor: colors.border,
              opacity: faceBtnDisabled ? 0.5 : 1,
            },
          ]}
          onPress={onFaceId}
          activeOpacity={0.9}
          disabled={faceBtnDisabled}
        >
          {loadingBio ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name="scan-outline" size={18} color={colors.text} />
              <Text style={[styles.faceText, { color: colors.text }]}>الدخول بـ Face ID</Text>
            </>
          )}
        </TouchableOpacity>

        {!checkingBio && !bioEnabled ? (
          <Text style={[styles.hint, { color: colors.subText }]}>فعّل البصمة من: الإعدادات &gt; الأمان</Text>
        ) : null}

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} activeOpacity={0.85}>
          <Text style={[styles.link, { color: colors.primary }]}>نسيت كلمة المرور؟</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("SignUp")} activeOpacity={0.85}>
          <Text style={[styles.link, { color: colors.primary }]}>ليس لديك حساب؟ انشئ حساب</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={viewPages} activeOpacity={0.85}>
          <Text style={[styles.link, { color: colors.primary }]}>عرض الصفحات</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 16 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1 },
  title: { fontSize: 20, fontWeight: "900", marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 10, fontSize: 14, fontWeight: "700" },
  primary: { marginTop: 14, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  faceBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
  },
  faceText: { fontWeight: "900", fontSize: 14 },
  hint: { marginTop: 8, textAlign: "center", fontSize: 12.5, fontWeight: "700" },
  link: { marginTop: 10, textAlign: "center", fontSize: 14, fontWeight: "800" },
});