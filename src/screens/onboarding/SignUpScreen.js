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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeApp } from "../../theme/ThemeContext";
import { API_BASE_URL } from "../../services/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/;

const YEMEN_PHONE_RE = /^(71|73|77|78)\d{7}$/;
const ONLY_DIGITS_RE = /^\d+$/;

const T = {
  title: "إنشاء حساب",
  subtitle: "أنشئ حسابك لإرسال البلاغات بسرعة وبشكل منظم.",
  fullName: "الاسم الكامل",
  email: "البريد الإلكتروني",
  phone: "رقم الهاتف",
  nationalId: "رقم الهوية",
  password: "كلمة المرور",
  confirm: "تأكيد كلمة المرور",
  create: "إنشاء حساب",
  haveAccount: "عندك حساب؟",
  login: "تسجيل الدخول",
  rulesTitle: "شروط كلمة المرور",
  rules1: "8 أحرف أو أكثر",
  rules2: "حرف كبير + حرف صغير",
  rules3: "رقم + رمز (مثل: ! @ #)",
  rules4: "بدون مسافات",
};

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

export default function SignUpScreen({ navigation }) {
  const { mode, colors } = useThemeApp();
  const isDark = mode === "dark";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const normalizeEmail = (v) => String(v || "").trim().toLowerCase();
  const normalizeDigits = (v) => String(v || "").replace(/[^\d]/g, "");

  const validate = () => {
    const n = fullName.trim();
    const e = normalizeEmail(email);
    const p = normalizeDigits(phone);
    const id = normalizeDigits(nationalId);

    if (!n || n.length < 6) return "اكتب الاسم الكامل بشكل صحيح.";
    if (!EMAIL_RE.test(e)) return "البريد الإلكتروني غير صحيح.";
    if (!YEMEN_PHONE_RE.test(p)) return "رقم الجوال لازم يكون يمني محلي (مثال: 77xxxxxxx).";
    if (!id || id.length < 10 || id.length > 15 || !ONLY_DIGITS_RE.test(id))
      return "رقم الهوية لازم يكون أرقام فقط (من 10 إلى 15 رقم).";
    if (!PASSWORD_RE.test(password))
      return "كلمة المرور ضعيفة: 8+ أحرف وفيها حرف كبير وصغير ورقم ورمز وبدون مسافات.";
    if (confirm !== password) return "تأكيد كلمة المرور غير مطابق.";
    return null;
  };

  const onCreate = async () => {
    const err = validate();
    if (err) return Alert.alert("تنبيه", err);

    const payload = {
      fullName: fullName.trim(),
      email: normalizeEmail(email),
      phone: normalizeDigits(phone),
      nationalId: normalizeDigits(nationalId),
      password,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return Alert.alert("تنبيه", data?.message || "تعذر إنشاء الحساب. جرّب مرة ثانية.");
      }

     
      Alert.alert("تم ", "تم إنشاء الحساب بنجاح. الآن سجّل دخولك.", [
        {
          text: "تسجيل الدخول",
          onPress: () => navigation.navigate("Login", { prefillEmail: payload.email }),
        },
      ]);
    } catch (e) {
      Alert.alert( "ما قدرنا نتصل بالسيرفر ");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <AuthTopBar title={T.title} colors={colors} onBack={() => navigation.navigate("Login")} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{T.title}</Text>
            <Text style={[styles.sub, { color: colors.subText }]}>{T.subtitle}</Text>

            <Field
              label={T.fullName}
              value={fullName}
              onChangeText={setFullName}
              placeholder={T.fullName}
              icon="person-outline"
              colors={colors}
              autoCapitalize="words"
            />

            <Field
              label={T.email}
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              icon="mail-outline"
              colors={colors}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label={T.phone}
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/[^\d]/g, ""))}
              placeholder="مثال: 77xxxxxxx"
              icon="call-outline"
              colors={colors}
              keyboardType="number-pad"
              maxLength={9}
            />

            <Field
              label={T.nationalId}
              value={nationalId}
              onChangeText={(v) => setNationalId(v.replace(/[^\d]/g, ""))}
              placeholder="رقم الهوية"
              icon="card-outline"
              colors={colors}
              keyboardType="number-pad"
              maxLength={15}
            />

            <Field
              label={T.password}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              icon="lock-closed-outline"
              colors={colors}
              secureTextEntry
              autoCapitalize="none"
            />

            <Field
              label={T.confirm}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              icon="lock-closed-outline"
              colors={colors}
              secureTextEntry
              autoCapitalize="none"
            />

            <View
              style={[
                styles.rulesBox,
                {
                  borderColor: colors.border,
                  backgroundColor: isDark ? "#0B1220" : "#F8FAFC",
                },
              ]}
            >
              <Text style={[styles.rulesTitle, { color: colors.text }]}>{T.rulesTitle}</Text>
              <Text style={[styles.rule, { color: colors.subText }]}>• {T.rules1}</Text>
              <Text style={[styles.rule, { color: colors.subText }]}>• {T.rules2}</Text>
              <Text style={[styles.rule, { color: colors.subText }]}>• {T.rules3}</Text>
              <Text style={[styles.rule, { color: colors.subText }]}>• {T.rules4}</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={onCreate}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryText}>{T.create}</Text>
            </TouchableOpacity>

            <View style={styles.bottomRow}>
              <Text style={[styles.bottomText, { color: colors.subText }]}>{T.haveAccount} </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.85}>
                <Text style={[styles.link, { color: colors.primary }]}>{T.login}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 18 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, icon, colors, ...props }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.soft, borderColor: colors.border }]}>
        <Ionicons name={icon} size={18} color={colors.subText} />
        <TextInput style={[styles.input, { color: colors.text }]} placeholderTextColor={colors.subText} {...props} />
      </View>
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
  sub: { marginTop: 6, fontSize: 12.5, fontWeight: "700", lineHeight: 18 },

  label: { marginTop: 2, fontSize: 12.5, fontWeight: "900" },
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

  rulesBox: { marginTop: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  rulesTitle: { fontWeight: "900", marginBottom: 6 },
  rule: { fontWeight: "700", lineHeight: 18, fontSize: 12.5 },

  primaryBtn: { marginTop: 14, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14.5 },

  bottomRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  bottomText: { fontWeight: "700" },
  link: { fontWeight: "900" },
});
