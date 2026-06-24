// src/screens/auth/ForgotPasswordScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeApp } from "../../theme/ThemeContext";
import { API_BASE_URL } from "../../services/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function AuthTopBar({ title, colors, onBack }) {
  return (
    <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onBack}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
        <Text style={[styles.backText, { color: colors.text }]}>رجوع</Text>
      </TouchableOpacity>

      <Text style={[styles.pageTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={{ width: 86 }} />
    </View>
  );
}

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, mode } = useThemeApp();
  const isDark = mode === "dark";

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    const e = String(email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return Alert.alert("تنبيه", "البريد الإلكتروني غير صحيح.");

    setLoading(true);
    try {
     
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return Alert.alert("تنبيه", data?.message || "تعذر تنفيذ الطلب.");
      }

      // للتجربة: نعرض التوكن (لأن الإيميل الحقيقي مو شغال)
      if (data?.resetToken) {
        setResetToken(String(data.resetToken));
        Alert.alert("تم ", "تم إنشاء طلب الاستعادة.\n(التوكن ظهر للتجربة)", [
          { text: "تمام", onPress: () => setStep(2) },
        ]);
      } else {
        Alert.alert("تم ", data?.message || "تم إنشاء طلب الاستعادة.", [
          { text: "تمام", onPress: () => setStep(2) },
        ]);
      }
    } catch (err) {
      Alert.alert( "ما قدرنا نتصل بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    const e = String(email || "").trim().toLowerCase();
    const t = String(resetToken || "").trim();
    const pw = String(newPassword || "");

    if (!EMAIL_RE.test(e)) return Alert.alert("تنبيه", "البريد الإلكتروني غير صحيح.");
    if (!t || t.length < 10) return Alert.alert("تنبيه", "التوكن غير صحيح.");
    if (pw.length < 8) return Alert.alert("تنبيه", "كلمة المرور لازم تكون 8 أحرف أو أكثر.");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, resetToken: t, newPassword: pw }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return Alert.alert("تنبيه", data?.message || "تعذر تغيير كلمة المرور.");
      }

      Alert.alert("تم ", data?.message || "تم تحديث كلمة المرور بنجاح.", [
        { text: "تسجيل الدخول", onPress: () => navigation.navigate("Login") },
      ]);
    } catch {
      Alert.alert("خطأ", "فشل الاتصال بالسيرفر.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <AuthTopBar title="نسيت كلمة المرور" colors={colors} onBack={() => navigation.navigate("Login")} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              {step === 1 ? "نسيت كلمة المرور" : "تعيين كلمة مرور جديدة"}
            </Text>

            <Text style={[styles.sub, { color: colors.subText }]}>
              {step === 1
                ? "اكتب بريدك الإلكتروني وسننشئ طلب استعادة كلمة المرور."
                : "أدخل التوكن ثم اكتب كلمة مرور جديدة."}
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>البريد الإلكتروني</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.soft, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.subText} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="name@example.com"
                placeholderTextColor={colors.subText}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {step === 2 ? (
              <>
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Reset Token</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="key-outline" size={18} color={colors.subText} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="الصق التوكن هنا"
                    placeholderTextColor={colors.subText}
                    value={resetToken}
                    onChangeText={setResetToken}
                    autoCapitalize="none"
                  />
                </View>

                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>كلمة المرور الجديدة</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.subText} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="8 أحرف أو أكثر"
                    placeholderTextColor={colors.subText}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                </View>
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.85 : 1 }]}
              onPress={step === 1 ? onSend : onReset}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>{step === 1 ? "إرسال" : "تحديث كلمة المرور"}</Text>
              )}
            </TouchableOpacity>

            {step === 2 ? (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { backgroundColor: isDark ? "#0B1220" : "#fff", borderColor: colors.border },
                ]}
                onPress={() => setStep(1)}
                activeOpacity={0.9}
              >
                <Text style={[styles.secondaryText, { color: colors.text }]}>رجوع لخطوة الإرسال</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ height: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  backText: { fontWeight: "900" },
  pageTitle: { fontSize: 16, fontWeight: "900" },

  content: { padding: 16, paddingBottom: 22 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1 },

  title: { fontSize: 18, fontWeight: "900" },
  sub: { marginTop: 6, fontSize: 12.5, fontWeight: "700", lineHeight: 18, marginBottom: 12 },

  label: { fontSize: 12.5, fontWeight: "900" },
  inputWrap: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, fontWeight: "700" },

  primaryBtn: { marginTop: 14, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14.5 },

  secondaryBtn: {
    marginTop: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontWeight: "900", fontSize: 14 },
});
