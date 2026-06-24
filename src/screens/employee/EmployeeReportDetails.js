// src/screens/employee/EmployeeReportDetails.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useThemeApp } from "../../theme/ThemeContext";
import { employeeApi } from "../../services/employeeApi";

const PROFILE_KEY = "local_user_profile";
const SESSION_KEY = "local_session_v1";

function fmtDate(v) {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function statusLabel(key) {
  switch (String(key || "").toLowerCase()) {
    case "new":
      return "جديد";
    case "in_progress":
      return "قيد المعالجة";
    case "accepted":
      return "ناجحة";
    case "rejected":
      return "مرفوضة";
    default:
      return String(key || "غير محدد");
  }
}

async function getEmployeeIdFromStorage() {
  // من profile
  try {
    const rawProfile = await AsyncStorage.getItem(PROFILE_KEY);
    if (rawProfile) {
      const p = JSON.parse(rawProfile);
      const id = p?.userId || p?.UserId || p?.id || p?.Id;
      if (id) return String(id);
    }
  } catch {}

  // من session
  try {
    const rawSession = await AsyncStorage.getItem(SESSION_KEY);
    if (rawSession) {
      const s = JSON.parse(rawSession);
      const id = s?.userId || s?.UserId || s?.id || s?.Id;
      if (id) return String(id);
    }
  } catch {}

  return "";
}

export default function EmployeeReportDetails({ route }) {
  const { colors } = useThemeApp();
  const { id } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    (async () => {
      const eid = await getEmployeeIdFromStorage();
      setEmployeeId(eid);
    })();
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        isRefresh ? setRefreshing(true) : setLoading(true);
        const r = await employeeApi.reportDetails(id);
        setData(r);
      } catch (e) {
        Alert.alert("خطأ", e.message || "Server error");
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const s = useMemo(() => styles(colors), [colors]);

  const openAttachment = async (url) => {
    try {
      const u = String(url || "").trim();
      if (!u) return;
      const ok = await Linking.canOpenURL(u);
      if (!ok) return Alert.alert("تنبيه", "الرابط غير صالح");
      await Linking.openURL(u);
    } catch {
      Alert.alert("خطأ", "تعذر فتح الرابط");
    }
  };

  const doSetStatus = async (next) => {
    try {
      const nextLower = String(next || "").toLowerCase().trim();

      if (!employeeId) {
        return Alert.alert("تنبيه", "معرف الموظف غير موجود (employeeId). سجّل خروج/دخول وجرب.");
      }

      
      await employeeApi.updateStatus(String(id), nextLower, employeeId);

      await load(true);
      Alert.alert("تم", "تم تحديث الحالة ");
    } catch (e) {
      Alert.alert("خطأ", e.message || "Server error");
    }
  };

  const setStatus = (next) => {
    const nextLower = String(next || "").toLowerCase().trim();

    if (nextLower === "rejected") {
      return Alert.alert("تأكيد الرفض", "متأكد تبغى تخلي البلاغ مرفوض؟", [
        { text: "إلغاء", style: "cancel" },
        { text: "نعم", style: "destructive", onPress: () => doSetStatus("rejected") },
      ]);
    }

    return doSetStatus(nextLower);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const report = data?.report || {};
  const media = data?.media || [];
  const history = data?.history || [];

  const st = String(report.Status || "").toLowerCase();

  const hasLocation = report.LocationLat && report.LocationLng;
  const locationText = hasLocation ? `${report.LocationLat}, ${report.LocationLng}` : "غير محدد";

  const sameStatus = (k) => String(k).toLowerCase() === st;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 18 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Card title="معلومات البلاغ" colors={colors}>
        <InfoRow label="الحالة" value={statusLabel(st)} colors={colors} />
        <InfoRow label="التاريخ" value={fmtDate(report.CreatedAt)} colors={colors} />
        <InfoRow label="الوصف" value={String(report.Description || "")} colors={colors} />
        <InfoRow label="الموقع" value={locationText} colors={colors} />
      </Card>

      <Card title="بيانات المبلّغ" colors={colors}>
        <InfoRow label="الاسم" value={String(report.ReporterName || "")} colors={colors} />
        <InfoRow label="الجوال" value={String(report.ReporterPhone || "")} colors={colors} />
        {report.ReporterEmail ? (
          <InfoRow label="البريد" value={String(report.ReporterEmail)} colors={colors} />
        ) : null}
      </Card>

      <Card title="تحديث الحالة" colors={colors}>
        <View style={s.btnRow}>
          <ActionBtn
            title="قيد المعالجة"
            icon="time-outline"
            onPress={() => setStatus("in_progress")}
            colors={colors}
            disabled={sameStatus("in_progress")}
          />
          <ActionBtn
            title="ناجحة"
            icon="checkmark-circle-outline"
            onPress={() => setStatus("accepted")}
            colors={colors}
            disabled={sameStatus("accepted")}
          />
          <ActionBtn
            title="مرفوضة"
            icon="close-circle-outline"
            onPress={() => setStatus("rejected")}
            colors={colors}
            disabled={sameStatus("rejected")}
          />
        </View>
        <Text style={s.hint}>اختر الحالة المناسبة. (لو اخترت نفس الحالة ما بيصير تغيير)</Text>
      </Card>

     
      <Card title="سجل تغيير الحالة" colors={colors}>
        {history.length === 0 ? (
          <Text style={s.muted}>لا يوجد سجل تغييرات.</Text>
        ) : (
          history.map((h) => {
            const from = String(h.FromStatus || "").toLowerCase();
            const to = String(h.ToStatus || "").toLowerCase();
            const who = String(h.ChangedByName || h.ChangedBy || "—");
            const when = fmtDate(h.ChangedAt);

            return (
              <View key={String(h.Id)} style={s.histRow}>
                <Text style={s.histLine}>
                  {from} <Text style={s.histArrow}>→</Text> {to}
                </Text>
                <Text style={s.histMeta}>
                  {when} • بواسطة: {who}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      <Card title="المرفقات" colors={colors}>
        {media.length === 0 ? (
          <Text style={s.muted}>لا يوجد مرفقات.</Text>
        ) : (
          media.map((m) => {
            const isVideo = String(m.Type || "").toLowerCase() === "video";
            const url = String(m.FileUrl || "").trim();
            return (
              <TouchableOpacity
                key={String(m.Id)}
                style={s.mediaRow}
                activeOpacity={0.9}
                onPress={() => openAttachment(url)}
              >
                <Ionicons name={isVideo ? "videocam" : "image"} size={18} color={colors.text} />
                <Text style={s.mediaText} numberOfLines={1}>
                  {url || "رابط غير متوفر"}
                </Text>
                <Ionicons name="open-outline" size={18} color={colors.subText} />
              </TouchableOpacity>
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

function Card({ title, children, colors }) {
  const s = styles(colors);
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <View style={{ marginTop: 10, gap: 10 }}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, colors }) {
  const s = styles(colors);
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || "-"}</Text>
    </View>
  );
}

function ActionBtn({ title, icon, onPress, colors, disabled }) {
  const s = styles(colors);
  return (
    <TouchableOpacity
      style={[s.actionBtn, disabled ? { opacity: 0.45 } : null]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Ionicons name={icon} size={18} color="#fff" />
      <Text style={s.actionBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 12 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    cardTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },

    infoRow: { gap: 4 },
    infoLabel: { color: colors.subText, fontWeight: "800" },
    infoValue: { color: colors.text, fontWeight: "700", lineHeight: 20 },

    btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
    },
    actionBtnText: { color: "#fff", fontWeight: "900" },
    hint: { marginTop: 10, color: colors.subText, fontWeight: "800", fontSize: 12 },

    muted: { color: colors.subText, fontWeight: "700" },

    //  history styles
    histRow: {
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
    },
    histLine: { color: colors.text, fontWeight: "900" },
    histArrow: { color: colors.subText, fontWeight: "900" },
    histMeta: { marginTop: 6, color: colors.subText, fontWeight: "800", fontSize: 12 },

    mediaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.soft,
    },
    mediaText: { color: colors.text, flex: 1, fontWeight: "700" },
  });