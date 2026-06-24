// src/screens/user/ProfileScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { useThemeApp } from "../../theme/ThemeContext";
import { API_BASE_URL } from "../../services/api";

const PROFILE_KEY = "local_user_profile";

//  Demo fallback (لو ما عندك endpoints جاهزة للـ password)
const KEY_PASSWORD = "security_password_demo";
const KEY_PW_RESET_PENDING = "pw_reset_pending_demo";

function genCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isStrongPassword(pw) {
  if (!pw || pw.length < 8) return false;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNum = /\d/.test(pw);
  const hasSym = /[^A-Za-z0-9]/.test(pw);
  return hasUpper && hasLower && hasNum && hasSym;
}

function normStr(v) {
  return String(v ?? "").trim();
}

function pickProfileValue(p, keys) {
  for (const k of keys) {
    const v = p?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function normalizeProfile(raw) {
  if (!raw || typeof raw !== "object") return null;

  return {
    fullName: pickProfileValue(raw, ["fullName", "FullName", "name", "Name"]),
    phone: pickProfileValue(raw, ["phone", "Phone"]),
    email: pickProfileValue(raw, ["email", "Email"]),
    nationalId: pickProfileValue(raw, ["nationalId", "NationalId", "civilId", "CivilId"]),
    userId: pickProfileValue(raw, ["userId", "UserId", "id", "Id"]),
    _raw: raw,
  };
}

// =====================
//  Password API tries
// =====================
async function apiPostTry(paths, body) {
  let lastErr = null;

  for (const p of paths) {
    try {
      const res = await fetch(`${API_BASE_URL}${p}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      return { ok: true, data, path: p };
    } catch (e) {
      lastErr = e;
    }
  }

  return { ok: false, error: lastErr };
}

export default function ProfileScreen({ navigation }) {
  const { mode, colors } = useThemeApp();
  const isDark = mode === "dark";

  const T = useMemo(
    () => ({
      title: "ملفي الشخصي",
      sub: "بيانات حسابك",
      name: "الاسم",
      phone: "رقم الجوال",
      email: "البريد الإلكتروني",
      civil: "رقم الهوية",
      empty: "لا توجد بيانات محفوظة.",

      securityTitle: "أمان الحساب",
      securitySub: "كلمة المرور والتحقق",
      changePw: "تغيير كلمة المرور",
      changePwHint: "تحقق عبر البريد ثم عيّن كلمة مرور جديدة",

      verifyTitle: "التحقق عبر البريد",
      sendCode: "إرسال كود",
      codeLabel: "كود التحقق",
      codePh: "6 أرقام",
      newPw: "كلمة المرور الجديدة",
      newPwPh: "8+ مع A/a/1/!",
      confirmPw: "تأكيد كلمة المرور",
      confirmPwPh: "أعد إدخال كلمة المرور",
      save: "حفظ",
      cancel: "إلغاء",

      noEmail: "ما لقينا بريد إلكتروني في الملف الشخصي.",
      sent: "تم إرسال كود التحقق إلى بريدك.",
      enterCode: "أدخل كود التحقق.",
      wrongCode: "الكود غير صحيح.",
      weakPw: "كلمة المرور لازم 8+ وتحتوي كبير/صغير/رقم/رمز.",
      mismatch: "كلمتا المرور غير متطابقتين.",
      updated: "تم تحديث كلمة المرور بنجاح ",

      apiNotReady:
        "ملاحظة: ما لقيت endpoint جاهز لتغيير كلمة المرور في الباك-إند، فاشتغلت بوضع تجريبي داخل التطبيق.",
    }),
    []
  );

  const [p, setP] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [pwModal, setPwModal] = useState(false);
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);

  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const pendingCodeRef = useRef(null);

  useEffect(() => {
    navigation?.setOptions?.({ headerShown: true });
  }, [navigation]);

  const loadProfile = useCallback(async () => {
    const str = await AsyncStorage.getItem(PROFILE_KEY);
    const raw = str ? JSON.parse(str) : null;
    const normalized = normalizeProfile(raw);
    setP(normalized);

    const pendingStr = await AsyncStorage.getItem(KEY_PW_RESET_PENDING);
    if (pendingStr) {
      try {
        const pending = JSON.parse(pendingStr);
        if (pending?.code) pendingCodeRef.current = String(pending.code);
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      //  كل ما تدخل الصفحة تتحدث تلقائياً
      loadProfile();
    }, [loadProfile])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  const openChangePassword = () => {
    setCode("");
    setNewPw("");
    setConfirmPw("");
    setStep(1);
    setPwModal(true);
  };

  const closeModal = () => {
    setPwModal(false);
    setSending(false);
    setCode("");
    setNewPw("");
    setConfirmPw("");
    setStep(1);
  };

  const sendVerificationCode = async () => {
    const email = normStr(p?.email);
    if (!email) return Alert.alert(T.verifyTitle, T.noEmail);

    setSending(true);
    try {
      //  نحاول API أول (لو عندك جاهز)
      const apiRes = await apiPostTry(
        ["/auth/send-reset-code", "/auth/forgot-password", "/auth/request-reset", "/users/send-reset-code"],
        { email }
      );

      if (apiRes.ok) {
        Alert.alert(T.verifyTitle, T.sent);
        setStep(2);
        return;
      }

      //  fallback demo
      const generated = genCode6();
      pendingCodeRef.current = generated;

      await AsyncStorage.setItem(
        KEY_PW_RESET_PENDING,
        JSON.stringify({
          email,
          code: generated,
          createdAt: Date.now(),
        })
      );

      Alert.alert(T.verifyTitle, `${T.sent}\n(${T.apiNotReady})`);
      setStep(2);
    } finally {
      setSending(false);
    }
  };

  const saveNewPassword = async () => {
    const email = normStr(p?.email);
    if (!email) return Alert.alert(T.verifyTitle, T.noEmail);

    if (!code?.trim()) return Alert.alert(T.verifyTitle, T.enterCode);
    if (!isStrongPassword(newPw)) return Alert.alert(T.verifyTitle, T.weakPw);
    if (newPw !== confirmPw) return Alert.alert(T.verifyTitle, T.mismatch);

    //  نحاول API أول
    const apiRes = await apiPostTry(
      ["/auth/reset-password", "/auth/change-password", "/users/reset-password", "/users/change-password"],
      { email, code: code.trim(), newPassword: newPw }
    );

    if (apiRes.ok) {
      Alert.alert(T.verifyTitle, T.updated);
      closeModal();
      return;
    }

    //  fallback demo (يطابق وضعك السابق)
    const expected = pendingCodeRef.current;
    if (!expected) return Alert.alert(T.verifyTitle, T.enterCode);
    if (code.trim() !== String(expected)) return Alert.alert(T.verifyTitle, T.wrongCode);

    await AsyncStorage.setItem(KEY_PASSWORD, newPw);
    pendingCodeRef.current = null;
    await AsyncStorage.removeItem(KEY_PW_RESET_PENDING);

    Alert.alert(T.verifyTitle, `${T.updated}\n(${T.apiNotReady})`);
    closeModal();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.head}>
            <View style={[styles.iconBox, { backgroundColor: colors.soft, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{T.title}</Text>
              <Text style={[styles.sub, { color: colors.subText }]}>{T.sub}</Text>
            </View>
          </View>

          {!p ? (
            <Text style={[styles.empty, { color: colors.subText }]}>{T.empty}</Text>
          ) : (
            <>
              <Row label={T.name} value={p.fullName} colors={colors} icon="id-card-outline" />
              <Row label={T.phone} value={p.phone} colors={colors} icon="call-outline" />
              <Row label={T.email} value={p.email} colors={colors} icon="mail-outline" />
              <Row label={T.civil} value={p.nationalId} colors={colors} icon="finger-print-outline" />
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
          <View style={styles.head}>
            <View style={[styles.iconBox, { backgroundColor: colors.soft, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{T.securityTitle}</Text>
              <Text style={[styles.sub, { color: colors.subText }]}>{T.securitySub}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionRow, { backgroundColor: colors.soft, borderColor: colors.border }]}
            onPress={openChangePassword}
            activeOpacity={0.9}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="key-outline" size={18} color={colors.text} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{T.changePw}</Text>
              <Text style={[styles.actionHint, { color: colors.subText }]}>{T.changePwHint}</Text>
            </View>

            <Ionicons name="chevron-back" size={18} color={colors.subText} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={pwModal} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={mStyles.modalWrap}>
          <Pressable style={mStyles.backdrop} onPress={closeModal} />

          <View style={[mStyles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={mStyles.modalHeader}>
              <Text style={[mStyles.modalTitle, { color: colors.text }]}>{T.verifyTitle}</Text>

              <TouchableOpacity
                onPress={closeModal}
                style={[mStyles.closeBtn, { backgroundColor: colors.soft, borderColor: colors.border }]}
                activeOpacity={0.9}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {step === 1 ? (
              <>
                <View style={[mStyles.infoBox, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.text} />
                  <Text style={[mStyles.infoText, { color: colors.subText }]}>{p?.email ? p.email : "—"}</Text>
                </View>

                <TouchableOpacity
                  style={[mStyles.primaryBtn, { backgroundColor: colors.primary, opacity: sending ? 0.85 : 1 }]}
                  onPress={sendVerificationCode}
                  activeOpacity={0.9}
                  disabled={sending}
                >
                  {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send-outline" size={18} color="#fff" />}
                  <Text style={mStyles.primaryText}>{T.sendCode}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[mStyles.ghostBtn, { backgroundColor: colors.soft, borderColor: colors.border }]}
                  onPress={closeModal}
                  activeOpacity={0.9}
                >
                  <Text style={[mStyles.ghostText, { color: colors.text }]}>{T.cancel}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[mStyles.label, { color: colors.text }]}>{T.codeLabel}</Text>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                  placeholder={T.codePh}
                  placeholderTextColor={colors.subText}
                  style={[
                    mStyles.input,
                    {
                      backgroundColor: isDark ? "#0B1220" : "#fff",
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  maxLength={6}
                />

                <Text style={[mStyles.label, { color: colors.text }]}>{T.newPw}</Text>
                <TextInput
                  value={newPw}
                  onChangeText={setNewPw}
                  secureTextEntry
                  placeholder={T.newPwPh}
                  placeholderTextColor={colors.subText}
                  style={[
                    mStyles.input,
                    {
                      backgroundColor: isDark ? "#0B1220" : "#fff",
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />

                <Text style={[mStyles.label, { color: colors.text }]}>{T.confirmPw}</Text>
                <TextInput
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  secureTextEntry
                  placeholder={T.confirmPwPh}
                  placeholderTextColor={colors.subText}
                  style={[
                    mStyles.input,
                    {
                      backgroundColor: isDark ? "#0B1220" : "#fff",
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />

                <View style={mStyles.footerRow}>
                  <TouchableOpacity
                    style={[mStyles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={saveNewPassword}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="checkmark-outline" size={18} color="#fff" />
                    <Text style={mStyles.primaryText}>{T.save}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[mStyles.ghostBtn, { backgroundColor: colors.soft, borderColor: colors.border }]}
                    onPress={closeModal}
                    activeOpacity={0.9}
                  >
                    <Text style={[mStyles.ghostText, { color: colors.text }]}>{T.cancel}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value, icon, colors }) {
  return (
    <View style={[styles.row, { borderTopColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.soft, borderColor: colors.border }]}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.subText }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{value || "—"}</Text>
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
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  content: { padding: 16, paddingBottom: 22 },

  card: { borderRadius: 18, padding: 16, borderWidth: 1 },

  head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  title: { fontSize: 18, fontWeight: "900" },
  sub: { marginTop: 4, fontSize: 12.5, fontWeight: "700" },

  empty: { marginTop: 10, fontSize: 13, fontWeight: "700" },

  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12, marginTop: 12, borderTopWidth: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: "800" },
  value: { marginTop: 4, fontSize: 14.5, fontWeight: "900" },

  actionRow: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionTitle: { fontSize: 14.5, fontWeight: "900" },
  actionHint: { marginTop: 2, fontSize: 12, fontWeight: "700", lineHeight: 17 },
});

const mStyles = StyleSheet.create({
  modalWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  modalCard: { width: "92%", borderRadius: 18, padding: 14, borderWidth: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  modalTitle: { fontSize: 15.5, fontWeight: "900" },
  closeBtn: { width: 36, height: 36, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  infoBox: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  infoText: { fontSize: 13, fontWeight: "800", flex: 1 },

  label: { marginTop: 10, marginBottom: 6, fontSize: 12.5, fontWeight: "900" },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, fontWeight: "700" },

  primaryBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primaryText: { color: "#fff", fontWeight: "900" },

  ghostBtn: { marginTop: 10, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  ghostText: { fontWeight: "900" },

  footerRow: { marginTop: 6 },
});
