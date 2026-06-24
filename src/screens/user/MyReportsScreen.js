// src/screens/user/MyReportsScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { useThemeApp } from "../../theme/ThemeContext";
import { API_BASE_URL, API_ORIGIN } from "../../services/api";

const PROFILE_KEY = "local_user_profile";
const SESSION_KEY = "local_session_v1";

const AR = {
  title: "بلاغاتي",
  subtitle: "تابع حالة البلاغات والتفاصيل",
  empty: "ما عندك بلاغات حالياً.",
  details: "تفاصيل البلاغ",
  department: "الجهة",
  date: "التاريخ",
  status: "الحالة",
  location: "الموقع",
  latitude: "خط العرض",
  longitude: "خط الطول",
  attachments: "المرفقات",
  hasAttachment: "يوجد مرفق",
  noAttachment: "لا يوجد مرفق",
  type: "النوع",
  video: "فيديو",
  image: "صورة",
  description: "الوصف",
  done: "تم",
  rejectedReasonPrefix: "سبب الرفض:",
  new: "جديد",
  inProgress: "قيد المعالجة",
  accepted: "ناجحة",
  rejected: "مرفوضة",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ar", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function statusLabel(status, T) {
  switch (String(status || "").toLowerCase()) {
    case "in_progress":
    case "inprogress":
      return T.inProgress;
    case "accepted":
      return T.accepted;
    case "rejected":
      return T.rejected;
    case "new":
    default:
      return T.new;
  }
}

function statusIcon(status) {
  switch (String(status || "").toLowerCase()) {
    case "accepted":
      return "checkmark-circle-outline";
    case "rejected":
      return "close-circle-outline";
    case "in_progress":
    case "inprogress":
      return "time-outline";
    case "new":
    default:
      return "sparkles-outline";
  }
}

function statusPillStyle(status, isDark, colors) {
  const s = String(status || "").toLowerCase();
  const base = { borderWidth: 1, borderColor: colors.border };

  if (s === "accepted") return { ...base, backgroundColor: isDark ? "#0F2A18" : "#E9F7EF" };
  if (s === "rejected") return { ...base, backgroundColor: isDark ? "#2A0E14" : "#FDECEC" };
  if (s === "in_progress" || s === "inprogress") return { ...base, backgroundColor: isDark ? "#2A220E" : "#FFF7E6" };
  return { ...base, backgroundColor: isDark ? "#0B1B3A" : "#EEF2FF" };
}

function fmtCoord(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(6);
}

function pickUserId(profile, session) {
  return (
    profile?.userId ||
    profile?.UserId ||
    profile?.id ||
    profile?.Id ||
    session?.userId ||
    session?.userId ||
    session?.user?.id ||
    session?.user?.Id ||
    null
  );
}

function normalizeReport(row) {
  const id = row?.Id || row?.id;

  const departmentName =
    row?.DepartmentName ||
    row?.departmentName ||
    row?.Department?.Name ||
    row?.department?.name ||
    row?.Department ||
    row?.department ||
    "—";

  const status = row?.Status || row?.status || "new";
  const createdAt = row?.CreatedAt || row?.createdAt || row?.created_at || null;

  const description = row?.Description || row?.description || "";

  const lat =
    row?.LocationLat ??
    row?.locationLat ??
    row?.Lat ??
    row?.lat ??
    row?.Latitude ??
    row?.latitude ??
    null;

  const lng =
    row?.LocationLng ??
    row?.locationLng ??
    row?.Lng ??
    row?.lng ??
    row?.Longitude ??
    row?.longitude ??
    null;

  const rejectionReason =
    row?.RejectionReason || row?.rejectionReason || row?.RejectReason || row?.rejectReason || null;

  const mediaArr = row?.Media || row?.media || row?.Attachments || row?.attachments || [];
  const media = Array.isArray(mediaArr) ? mediaArr : [];

  return {
    id: String(id || ""),
    departmentName: String(departmentName || "—"),
    status: String(status || "new"),
    createdAt,
    description: String(description || ""),
    rejectionReason: rejectionReason ? String(rejectionReason) : null,
    location: { latitude: lat, longitude: lng },
    media,
  };
}

function buildFileUrl(fileUrl) {
  if (!fileUrl) return null;
  const s = String(fileUrl);
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `${API_ORIGIN}${s}`;
  return `${API_ORIGIN}/${s}`;
}

function deptIconByName(name) {
  const n = String(name || "");
  if (n.includes("شرطة")) return "shield-checkmark-outline";
  if (n.includes("مرور")) return "car-outline";
  if (n.includes("بلدية")) return "business-outline";
  if (n.includes("صرف")) return "water-outline";
  return "alert-circle-outline";
}


// GET /api/reports/my/:userId
async function fetchMyReportsFromAPI({ userId, token }) {
  const url = `${API_BASE_URL}/reports/my/${userId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (!Array.isArray(data)) return [];
  return data.map(normalizeReport).filter((x) => x.id && x.id !== "undefined");
}

export default function MyReportsScreen({ navigation }) {
  const { colors, mode } = useThemeApp();
  const isDark = mode === "dark";
  const R = AR;

  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadReports = useCallback(async () => {
    const profileStr = await AsyncStorage.getItem(PROFILE_KEY);
    const profile = profileStr ? JSON.parse(profileStr) : null;

    const sessionStr = await AsyncStorage.getItem(SESSION_KEY);
    const session = sessionStr ? JSON.parse(sessionStr) : null;

    const userId = pickUserId(profile, session);
    const token = session?.token || null;

    if (!userId) {
      setReports([]);
      throw new Error("UserId غير موجود. سجّل دخول من جديد.");
    }

    const list = await fetchMyReportsFromAPI({ userId, token });
    list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    setReports(list);
  }, []);

  useEffect(() => {
    navigation?.setOptions?.({ headerShown: true });

    (async () => {
      setLoading(true);
      try {
        await loadReports();
      } catch (e) {
        Alert.alert("تنبيه", e?.message || "تعذر تحميل البلاغات");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation, loadReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadReports();
    } catch (e) {
      Alert.alert("تنبيه", e?.message || "تعذر تحديث البلاغات");
    } finally {
      setRefreshing(false);
    }
  }, [loadReports]);

  const openDetails = (report) => {
    setSelected(report);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelected(null);
  };

  const emptyText = useMemo(() => R.empty, [R.empty]);

  const renderItem = ({ item }) => {
    const pill = statusPillStyle(item.status, isDark, colors);

    const hasAnyMedia = Array.isArray(item.media) && item.media.length > 0;
    const firstMedia = hasAnyMedia ? item.media[0] : null;
    const firstType = String(firstMedia?.Type || firstMedia?.type || "").toLowerCase();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => openDetails(item)}
        activeOpacity={0.9}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconPill, { backgroundColor: colors.soft, borderColor: colors.border }]}>
            <Ionicons name={deptIconByName(item.departmentName)} size={22} color={colors.text} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.dept, { color: colors.text }]}>{item.departmentName || "—"}</Text>
            <Text style={[styles.date, { color: colors.subText }]}>{formatDate(item.createdAt)}</Text>
          </View>

          <View style={[styles.pill, pill]}>
            <Ionicons name={statusIcon(item.status)} size={14} color={colors.text} />
            <Text style={[styles.pillText, { color: colors.text }]}>{statusLabel(item.status, R)}</Text>
          </View>
        </View>

        {!!item.description && (
          <Text style={[styles.desc, { color: colors.subText }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        

        {hasAnyMedia ? (
          <View style={styles.attachmentHint}>
            <Ionicons
              name={firstType === "video" ? "videocam-outline" : "image-outline"}
              size={16}
              color={colors.text}
            />
            <Text style={[styles.attachmentHintText, { color: colors.text }]}>{R.hasAttachment}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };
 
  const mediaList = Array.isArray(selected?.media) ? selected.media : [];
  const firstMedia = mediaList.length ? mediaList[0] : null;
  const firstType = String(firstMedia?.Type || firstMedia?.type || "").toLowerCase();
  const fileUrl = buildFileUrl(firstMedia?.FileUrl || firstMedia?.fileUrl);
  const hasMedia = !!fileUrl;

  return (
     <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{R.title}</Text>
          <Text style={[styles.headerSub, { color: colors.subText }]}>{R.subtitle}</Text>
        </View>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.soft, borderColor: colors.border }]}
          onPress={onRefresh}
          activeOpacity={0.85}
          accessibilityLabel="refresh"
        >
          <Ionicons name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator />
          <Text style={[styles.loadingText, { color: colors.subText }]}>جاري تحميل البلاغات...</Text>
        </View>
      ) : null}

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={reports.length ? styles.list : styles.listEmpty}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.subText }]}>{emptyText}</Text>}
      />

       <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={closeDetails}>
        <View style={styles.modalWrap}>
          <Pressable style={styles.modalBackdrop} onPress={closeDetails} />

          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.iconPillSmall, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="reader-outline" size={18} color={colors.text} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{R.details}</Text>
              </View>

              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.soft, borderColor: colors.border }]}
                onPress={closeDetails}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
 
            <View style={[styles.modalSection, { backgroundColor: colors.soft, borderColor: colors.border }]}>
              <KVRow k={R.department} v={selected?.departmentName || "—"} colors={colors} />
              <KVRow k={R.date} v={formatDate(selected?.createdAt)} colors={colors} />

              <View style={styles.modalLine}>
                <Text style={[styles.modalLabel, { color: colors.subText }]}>{R.status}</Text>
                <View style={[styles.pill, statusPillStyle(selected?.status, isDark, colors)]}>
                  <Ionicons name={statusIcon(selected?.status)} size={14} color={colors.text} />
                  <Text style={[styles.pillText, { color: colors.text }]}>{statusLabel(selected?.status, R)}</Text>
                </View>
              </View>

              {selected?.rejectionReason ? (
                <View style={[styles.modalReject, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
                  <Ionicons name="alert-circle-outline" size={16} color="#B00020" />
                  <Text style={[styles.modalRejectText, { color: "#B00020" }]}>{selected.rejectionReason}</Text>
                </View>
              ) : null}
            </View>
 
            <View style={[styles.kvCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={styles.kvHeader}>
                <View style={[styles.iconPillSmall, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={18} color={colors.text} />
                </View>
                <Text style={[styles.kvTitle, { color: colors.text }]}>{R.location}</Text>
              </View>

              <KVRow k={R.latitude} v={fmtCoord(selected?.location?.latitude)} colors={colors} />
              <KVRow k={R.longitude} v={fmtCoord(selected?.location?.longitude)} colors={colors} />
            </View>
 
            <View style={[styles.kvCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={styles.kvHeader}>
                <View style={[styles.iconPillSmall, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="attach-outline" size={18} color={colors.text} />
                </View>
                <Text style={[styles.kvTitle, { color: colors.text }]}>{R.attachments}</Text>
              </View>

              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.subText }]}>{R.attachments}</Text>
                <View style={styles.inlineRow}>
                  <Ionicons
                    name={hasMedia ? "checkmark-circle-outline" : "close-circle-outline"}
                    size={16}
                    color={colors.text}
                  />
                  <Text style={[styles.kvVal, { color: colors.text }]}>
                    {hasMedia ? R.hasAttachment : R.noAttachment}
                  </Text>
                </View>
              </View>

              {hasMedia ? (
                <>
                  <View style={styles.kvRow}>
                    <Text style={[styles.kvKey, { color: colors.subText }]}>{R.type}</Text>
                    <View style={styles.inlineRow}>
                      <Ionicons
                        name={firstType === "video" ? "videocam-outline" : "image-outline"}
                        size={16}
                        color={colors.text}
                      />
                      <Text style={[styles.kvVal, { color: colors.text }]}>{firstType === "video" ? R.video : R.image}</Text>
                    </View>
                  </View>

                  {firstType === "image" ? (
                    <View style={[styles.mediaPreviewWrap, { borderColor: colors.border }]}>
                      <Image source={{ uri: fileUrl }} style={styles.mediaPreview} />
                    </View>
                  ) : (
                    <View style={[styles.videoStub, { borderColor: colors.border, backgroundColor: colors.soft }]}>
                      <Ionicons name="videocam-outline" size={22} color={colors.text} />
                      <Text style={[styles.videoStubText, { color: colors.subText }]}>فيديو محدد  (المعاينة نضيفها لاحقًا)</Text>
                    </View>
                  )}
                </>
              ) : null}
             </View>

             <View style={[styles.modalDescBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.modalDescTitle, { color: colors.text }]}>{R.description}</Text>
              <Text style={[styles.modalDesc, { color: colors.subText }]}>{selected?.description || "—"}</Text>
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={closeDetails}
              activeOpacity={0.9}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.modalBtnText}>{R.done}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function KVRow({ k, v, colors }) {
  return (
    <View style={styles.kvRow}>
      <Text style={[styles.kvKey, { color: colors.subText }]}>{k}</Text>
      <Text style={[styles.kvVal, { color: colors.text }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    margin: 16,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "900" },
  headerSub: { marginTop: 4, fontSize: 12, fontWeight: "700" },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingBox: {
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontWeight: "800" },

  list: { padding: 16, paddingBottom: 22 },
  listEmpty: { flexGrow: 1, padding: 16, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", fontSize: 14, fontWeight: "700", lineHeight: 22 },

  card: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },

  iconPill: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  dept: { fontSize: 14.5, fontWeight: "900" },
  date: { marginTop: 4, fontSize: 12, fontWeight: "700" },

  desc: { marginTop: 10, fontSize: 13, fontWeight: "700", lineHeight: 20 },

  rejectRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  rejectReason: { fontSize: 12, fontWeight: "900", color: "#B00020", flex: 1 },

  attachmentHint: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  attachmentHintText: { fontSize: 12.5, fontWeight: "900" },

  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: "900" },

  modalWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  modalCard: { width: "92%", borderRadius: 18, padding: 14, borderWidth: 1, maxHeight: "86%" },

  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { fontSize: 15, fontWeight: "900" },

  iconPillSmall: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  modalSection: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  modalLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  modalLabel: { fontSize: 12.5, fontWeight: "900" },

  modalReject: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, padding: 10, borderRadius: 14 },
  modalRejectText: { fontSize: 12.5, fontWeight: "900", flex: 1 },

  kvCard: { marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  kvHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  kvTitle: { fontSize: 13, fontWeight: "900" },

  kvRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kvKey: { fontSize: 12.5, fontWeight: "900" },
  kvVal: { fontSize: 12.5, fontWeight: "900" },

  inlineRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  mediaPreviewWrap: { marginTop: 8, borderRadius: 14, overflow: "hidden", borderWidth: 1 },
  mediaPreview: { width: "100%", height: 180 },

  videoStub: { marginTop: 8, height: 120, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 10 },
  videoStubText: { fontSize: 12.5, fontWeight: "800", textAlign: "center" },

  modalDescBox: { marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  modalDescTitle: { fontSize: 13, fontWeight: "900" },
  modalDesc: { marginTop: 8, fontSize: 13, fontWeight: "700", lineHeight: 20 },

  modalBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  modalBtnText: { color: "#fff", fontWeight: "900" },
 });