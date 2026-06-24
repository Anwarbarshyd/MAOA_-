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
  Modal,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeApp } from "../../theme/ThemeContext";
import { managerApi } from "../../services/managerApi";

function fmtDate(v) {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function statusLabel(key) {
  switch (String(key || "").toLowerCase()) {
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

function statusBadgeStyle(colors, st) {
  const s = String(st || "").toLowerCase();
  if (s === "rejected") return { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder };
  return { backgroundColor: colors.soft, borderColor: colors.border };
}

function toAbsoluteUrl(url, origin) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  // لو محفوظ كـ /uploads/...
  if (u.startsWith("/")) return `${String(origin || "").replace(/\/$/, "")}${u}`;
  return `${String(origin || "").replace(/\/$/, "")}/${u}`;
}

export default function ManagerReportDetails({ route }) {
  const { colors } = useThemeApp();
  const { id } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  //  تغيير حالة
  const [changing, setChanging] = useState(false);

  //  عرض صورة داخل Modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const r = await managerApi.reportDetails(id);
        setData(r);
      } catch (e) {
        Alert.alert("خطأ", e.message || "Server error");
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const s = useMemo(() => styles(colors), [colors]);

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
  const created = fmtDate(report.CreatedAt || report.createdAt);

  const hasLocation = report.LocationLat && report.LocationLng;
  const locationText = hasLocation ? `${report.LocationLat}, ${report.LocationLng}` : "غير محدد";

  const changeStatus = async (next) => {
    const nextStatus = String(next || "").toLowerCase();
    if (!nextStatus) return;

    if (changing) return;

    Alert.alert("تغيير الحالة", `تأكيد تغيير الحالة إلى: ${statusLabel(nextStatus)} ؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تأكيد",
        style: "default",
        onPress: async () => {
          try {
            setChanging(true);
            await managerApi.updateStatus(id, nextStatus);
            
            await load(true);
          } catch (e) {
            Alert.alert("خطأ", e.message || "Server error");
          } finally {
            setChanging(false);
          }
        },
      },
    ]);
  };

  const openAttachment = async (m) => {
    try {
      const type = String(m?.Type || "").toLowerCase();
      const rawUrl = String(m?.FileUrl || "").trim();
      const url = toAbsoluteUrl(rawUrl, managerApi.origin);

      if (!url) return Alert.alert("تنبيه", "رابط المرفق غير متوفر");

      //  الصور: عرض داخل التطبيق
      if (type === "image") {
        setPreviewUrl(url);
        setPreviewOpen(true);
        return;
      }

      
      const ok = await Linking.canOpenURL(url);
      if (!ok) return Alert.alert("تنبيه", "الرابط غير صالح");
      await Linking.openURL(url);
    } catch {
      Alert.alert("خطأ", "تعذر فتح المرفق");
    }
  };

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {/* معلومات البلاغ */}
        <Card title="معلومات البلاغ" colors={colors}>
          <View style={s.statusRow}>
            <Text style={s.infoLabel}>الحالة</Text>
            <View style={[s.badge, statusBadgeStyle(colors, st)]}>
              <Text style={s.badgeText}>{statusLabel(st)}</Text>
            </View>
          </View>

          <InfoRow label="التاريخ" value={created} colors={colors} />
          <InfoRow label="الوصف" value={String(report.Description || "")} colors={colors} />
          <InfoRow label="الموقع" value={locationText} colors={colors} />
        </Card>

        {/* ✅ أزرار تغيير الحالة */}
        <Card title="تغيير الحالة" colors={colors}>
          <View style={s.statusActions}>
            <StatusBtn
              title="قيد المعالجة"
              icon="time-outline"
              active={st === "in_progress"}
              disabled={changing}
              onPress={() => changeStatus("in_progress")}
              colors={colors}
            />
            <StatusBtn
              title="ناجحة"
              icon="checkmark-circle-outline"
              active={st === "accepted"}
              disabled={changing}
              onPress={() => changeStatus("accepted")}
              colors={colors}
            />
            <StatusBtn
              title="مرفوضة"
              icon="close-circle-outline"
              active={st === "rejected"}
              disabled={changing}
              onPress={() => changeStatus("rejected")}
              colors={colors}
              danger
            />
          </View>

          {changing ? <Text style={s.muted}>جارِ تحديث الحالة…</Text> : null}
        </Card>

        {/* بيانات المبلغ */}
        <Card title="بيانات المبلّغ" colors={colors}>
          <InfoRow label="الاسم" value={String(report.ReporterName || "")} colors={colors} />
          <InfoRow label="الجوال" value={String(report.ReporterPhone || "")} colors={colors} />
          {report.ReporterEmail ? <InfoRow label="البريد" value={String(report.ReporterEmail)} colors={colors} /> : null}
        </Card>

        {/* المرفقات */}
        <Card title="المرفقات" colors={colors}>
          {media.length === 0 ? (
            <Text style={s.muted}>لا يوجد مرفقات.</Text>
          ) : (
            media.map((m) => {
              const isVideo = String(m.Type || "").toLowerCase() === "video";
              const absUrl = toAbsoluteUrl(m.FileUrl, managerApi.origin);

              return (
                <TouchableOpacity
                  key={String(m.Id)}
                  style={s.mediaRow}
                  activeOpacity={0.9}
                  onPress={() => openAttachment(m)}
                >
                  <Ionicons name={isVideo ? "videocam" : "image"} size={18} color={colors.text} />
                  <Text style={s.mediaText} numberOfLines={1}>
                    {absUrl || "رابط غير متوفر"}
                  </Text>
                  <Ionicons name={isVideo ? "open-outline" : "expand-outline"} size={18} color={colors.subText} />
                </TouchableOpacity>
              );
            })
          )}

         
        </Card>

        {/* سجل تغيير الحالة */}
        <Card title="سجل تغيير الحالة" colors={colors}>
          {history.length === 0 ? (
            <Text style={s.muted}>لا يوجد سجل.</Text>
          ) : (
            history.map((h, idx) => (
              <View
                key={String(h.Id ?? `${idx}`)}
                style={[s.historyRow, idx === 0 ? { borderTopWidth: 0, paddingTop: 0 } : null]}
              >
                <Text style={s.historyTitle}>
                  {String(h.FromStatus || "-")} → {String(h.ToStatus || "-")}
                </Text>
                <Text style={s.historyMeta}>
                  بواسطة: {h.ChangedByName || h.ChangedBy || "-"} • {fmtDate(h.ChangedAt)}
                </Text>
                {h.Note ? <Text style={s.historyNote}>ملاحظة: {String(h.Note)}</Text> : null}
              </View>
            ))
          )}
        </Card>

        <Text style={s.pullHint}>اسحب للأسفل للتحديث.</Text>
      </ScrollView>

      {/* ✅ Image Preview Modal */}
      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <View style={s.modalBackdrop}>
          <TouchableOpacity style={s.modalClose} onPress={() => setPreviewOpen(false)} activeOpacity={0.9}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={s.modalCard}>
            {previewUrl ? (
              <Image source={{ uri: previewUrl }} style={s.previewImg} resizeMode="contain" />
            ) : (
              <Text style={{ color: "#fff" }}>لا توجد صورة</Text>
            )}
          </View>
        </View>
      </Modal>
    </>
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

function StatusBtn({ title, icon, onPress, active, disabled, colors, danger }) {
  const s = styles(colors);
  return (
    <TouchableOpacity
      style={[
        s.statusBtn,
        active ? s.statusBtnActive : null,
        danger ? s.statusBtnDanger : null,
        active && danger ? s.statusBtnDangerActive : null,
        disabled ? { opacity: 0.65 } : null,
      ]}
      activeOpacity={0.9}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? "#fff" : colors.text}
      />
      <Text style={[s.statusBtnText, active ? { color: "#fff" } : null]}>{title}</Text>
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

    statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
    badgeText: { color: colors.text, fontWeight: "900", fontSize: 12 },

    statusActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    statusBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.soft,
    },
    statusBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    statusBtnDanger: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
    },
    statusBtnDangerActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    statusBtnText: { color: colors.text, fontWeight: "900" },

    muted: { color: colors.subText, fontWeight: "700" },

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

    note: { color: colors.subText, marginTop: 10, fontSize: 12, fontWeight: "700" },

    historyRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
    historyTitle: { color: colors.text, fontWeight: "900" },
    historyMeta: { color: colors.subText, marginTop: 4, fontWeight: "700" },
    historyNote: { color: colors.text, marginTop: 6, fontWeight: "700" },

    pullHint: { color: colors.subText, textAlign: "center", fontWeight: "800", marginTop: 4 },

    // Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      alignItems: "center",
      justifyContent: "center",
      padding: 14,
    },
    modalCard: {
      width: "100%",
      height: "70%",
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    previewImg: { width: "100%", height: "100%" },
    modalClose: {
      position: "absolute",
      top: 40,
      right: 18,
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      zIndex: 10,
    },
  });