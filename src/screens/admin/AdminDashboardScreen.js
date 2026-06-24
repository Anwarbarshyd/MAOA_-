// src/screens/admin/AdminDashboardScreen.js
import React, { useCallback, useEffect, useMemo, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useThemeApp } from "../../theme/ThemeContext";
import { API_BASE_URL } from "../../services/api";

const SESSION_KEY = "local_session_v1";
const PROFILE_KEY = "local_user_profile";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safeArray(v) {
  return Array.isArray(v) ? v : [];
}
function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function AdminDashboardScreen({ navigation }) {
  const { colors, mode } = useThemeApp();
  const isDark = mode === "dark";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalReports: 0,
    inProgress: 0,
    accepted: 0,
    rejected: 0,
    departments: [],
  });

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(["isLoggedIn", "userRole", SESSION_KEY, PROFILE_KEY]);

    const root = navigation.getParent?.("Root");
    if (root?.reset) root.reset({ index: 0, routes: [{ name: "Auth" }] });
    else navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  }, [navigation]);

  const confirmLogout = useCallback(() => {
    Alert.alert("تسجيل الخروج", "متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: logout },
    ]);
  }, [logout]);

 
  useLayoutEffect(() => {
    navigation?.setOptions?.({
      title: "",
      headerBackTitleVisible: false,
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate("ManageManagers")}
            activeOpacity={0.9}
            style={[
              styles.headerPill,
              { backgroundColor: colors.soft, borderColor: colors.border },
            ]}
          >
            <Ionicons name="people-outline" size={18} color={colors.text} />
            <Text style={[styles.headerPillText, { color: colors.text }]}>الإدارة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={confirmLogout}
            activeOpacity={0.9}
            style={[
              styles.headerIconBtn,
              { backgroundColor: colors.soft, borderColor: colors.border },
            ]}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [colors, confirmLogout, navigation]);

  const getSession = useCallback(async () => {
    const s = await AsyncStorage.getItem(SESSION_KEY);
    const session = s ? JSON.parse(s) : null;
    const token = session?.token ? String(session.token) : "";
    const role = session?.role ? String(session.role).toLowerCase() : "";
    return { token, role };
  }, []);

  const fetchStats = useCallback(
    async (opts = {}) => {
      const { silent = false } = opts;

      try {
        const { token, role } = await getSession();

        //  حماية: الأدمن فقط
        if (role !== "admin") {
          if (!silent) Alert.alert("الصلاحيات", "هذه الصفحة للأدمن فقط. بيتم تسجيل خروجك.");
          await logout();
          return;
        }

        const url = `${API_BASE_URL}/admin/dashboard-stats`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            if (!silent) Alert.alert("الصلاحيات", data?.message || "Admin only");
            await logout();
            return;
          }
          throw new Error(data?.message || `HTTP ${res.status}`);
        }

        const deps = safeArray(data.departments)
          .map((d) => ({
            id: d.id,
            name: d.name,
            total: toNum(d.total),
            inProgress: toNum(d.inProgress),
            accepted: toNum(d.accepted),
            rejected: toNum(d.rejected),
          }))
          .sort((a, b) => b.total - a.total);

        setStats({
          totalReports: toNum(data.totalReports),
          inProgress: toNum(data.inProgress),
          accepted: toNum(data.accepted),
          rejected: toNum(data.rejected),
          departments: deps,
        });
      } catch (e) {
        console.log("Admin stats fetch error:", e?.message || e);
        if (!silent) {
          Alert.alert("خطأ", "ما قدرنا نجيب إحصائيات الأدمن. تأكد من تشغيل السيرفر وقاعدة البيانات.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getSession, logout]
  );

  //  تحديث تلقائي: أول مرة + عند الرجوع للصفحة
  useEffect(() => {
    fetchStats({ silent: true });

    const unsub = navigation.addListener?.("focus", () => {
      fetchStats({ silent: true });
    });

    return unsub;
  }, [fetchStats, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  const totals = useMemo(() => {
    const total = Math.max(0, stats.totalReports);
    const ip = Math.max(0, stats.inProgress);
    const ac = Math.max(0, stats.accepted);
    const rj = Math.max(0, stats.rejected);

    // إذا total=0 نخلي الشريط متزن
    const denom = Math.max(1, ip + ac + rj);
    return {
      total,
      ip,
      ac,
      rj,
      pIp: clamp01(ip / denom),
      pAc: clamp01(ac / denom),
      pRj: clamp01(rj / denom),
    };
  }, [stats]);

  const cards = useMemo(
    () => [
      { title: "إجمالي البلاغات", value: totals.total, icon: "layers-outline", tone: "primary" },
      { title: "قيد المعالجة", value: totals.ip, icon: "time-outline", tone: "neutral" },
      { title: "ناجحة", value: totals.ac, icon: "checkmark-circle-outline", tone: "success" },
      { title: "مرفوضة", value: totals.rj, icon: "close-circle-outline", tone: "danger" },
    ],
    [totals]
  );

  const headerShadow = isDark
    ? { borderBottomColor: "rgba(255,255,255,0.08)" }
    : { borderBottomColor: "rgba(15,23,42,0.08)" };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
    

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ color: colors.subText, marginTop: 10, fontWeight: "900" }}>
            جاري تحميل الإحصائيات…
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          }
        >
          {/* بطاقة ملخص مع شريط توزيع */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryTop}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                <Ionicons name="analytics-outline" size={18} color={colors.text} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>ملخص الحالات</Text>
                <Text style={[styles.summaryHint, { color: colors.subText }]}>
                  توزيع البلاغات حسب الحالة
                </Text>
              </View>

              <View style={[styles.totalBadge, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                <Text style={[styles.totalBadgeText, { color: colors.text }]}>
                  الإجمالي: {totals.total}
                </Text>
              </View>
            </View>

            <SegmentedBar
              colors={colors}
              isDark={isDark}
              segments={[
                { key: "ip", pct: totals.pIp, kind: "neutral" },
                { key: "ac", pct: totals.pAc, kind: "success" },
                { key: "rj", pct: totals.pRj, kind: "danger" },
              ]}
            />

            <View style={styles.legendRow}>
              <LegendItem colors={colors} isDark={isDark} kind="neutral" label={`قيد المعالجة: ${totals.ip}`} />
              <LegendItem colors={colors} isDark={isDark} kind="success" label={`ناجحة: ${totals.ac}`} />
              <LegendItem colors={colors} isDark={isDark} kind="danger" label={`مرفوضة: ${totals.rj}`} />
            </View>
          </View>

          {/* بطاقات الإحصائيات */}
          <View style={styles.grid}>
            {cards.map((c) => (
              <StatCard key={c.title} item={c} colors={colors} isDark={isDark} />
            ))}
          </View>

          {/* الجهات */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>إحصائيات الجهات</Text>
            <Text style={[styles.sectionHint, { color: colors.subText }]}>مرتّبة حسب الأعلى</Text>
          </View>

          {stats.departments.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.subText} />
              <Text style={{ color: colors.subText, fontWeight: "900" }}>ما فيه بيانات.</Text>
            </View>
          ) : (
            stats.departments.map((d) => {
              const total = Math.max(0, d.total);
              const ip = Math.max(0, d.inProgress);
              const ac = Math.max(0, d.accepted);
              const rj = Math.max(0, d.rejected);

              const denom = Math.max(1, ip + ac + rj);
              const pIp = clamp01(ip / denom);
              const pAc = clamp01(ac / denom);
              const pRj = clamp01(rj / denom);

              return (
                <View
                  key={String(d.id)}
                  style={[
                    styles.deptCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.deptTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.deptName, { color: colors.text }]} numberOfLines={1}>
                        {d.name}
                      </Text>
                      <Text style={[styles.deptSub, { color: colors.subText }]} numberOfLines={1}>
                        قيد المعالجة {ip} • ناجحة {ac} • مرفوضة {rj}
                      </Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>الإجمالي: {total}</Text>
                    </View>
                  </View>

                  <SegmentedBar
                    colors={colors}
                    isDark={isDark}
                    segments={[
                      { key: "ip", pct: pIp, kind: "neutral" },
                      { key: "ac", pct: pAc, kind: "success" },
                      { key: "rj", pct: pRj, kind: "danger" },
                    ]}
                  />

                  <View style={styles.chipsRow}>
                    <Chip label="قيد المعالجة" value={ip} colors={colors} icon="time-outline" />
                    <Chip label="ناجحة" value={ac} colors={colors} icon="checkmark-circle-outline" />
                    <Chip label="مرفوضة" value={rj} colors={colors} icon="close-circle-outline" />
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 26 }} />
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ item, colors, isDark }) {
  const { title, value, icon, tone } = item;

  const toneStyles = useMemo(() => {
    
    if (tone === "danger") {
      return {
        shellBg: colors.dangerBg || colors.soft,
        shellBorder: colors.dangerBorder || colors.border,
        iconBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
      };
    }
    if (tone === "success") {
      return {
        shellBg: colors.soft,
        shellBorder: colors.border,
        iconBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
      };
    }
    if (tone === "primary") {
      return {
        shellBg: colors.soft,
        shellBorder: colors.border,
        iconBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
      };
    }
    return {
      shellBg: colors.card,
      shellBorder: colors.border,
      iconBg: colors.soft,
    };
  }, [colors, isDark, tone]);

  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.statTop}>
        <View style={[styles.iconCircle, { backgroundColor: toneStyles.iconBg, borderColor: colors.border }]}>
          <Ionicons name={icon} size={18} color={colors.text} />
        </View>
        <Text style={[styles.statTitle, { color: colors.subText }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>

      {/* خط سفلي “ديناميكي” بسيط */}
      <View style={[styles.underline, { backgroundColor: tone === "primary" ? colors.primary : colors.border, opacity: tone === "primary" ? 1 : 0.6 }]} />
    </View>
  );
}

function Chip({ label, value, icon, colors }) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.soft, borderColor: colors.border }]}>
      <Ionicons name={icon} size={14} color={colors.text} />
      <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
        {label}: {toNum(value)}
      </Text>
    </View>
  );
}

function LegendItem({ colors, isDark, kind, label }) {
  const dotStyle = useMemo(() => {
    const base = isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.12)";
    if (kind === "danger") return { backgroundColor: colors.dangerBorder || base };
    if (kind === "success") return { backgroundColor: colors.primary };
    return { backgroundColor: base };
  }, [colors, isDark, kind]);

  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, dotStyle]} />
      <Text style={[styles.legendText, { color: colors.subText }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SegmentedBar({ colors, isDark, segments }) {
  const trackBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  const colorFor = useCallback(
    (kind) => {
      if (kind === "danger") return colors.dangerBorder || (isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.12)");
      if (kind === "success") return colors.primary;
      // neutral
      return isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.12)";
    },
    [colors, isDark]
  );

  // ضمان إن الشريط ما يطلع “فاضي” تمامًا
  const safe = segments.map((s) => ({ ...s, pct: clamp01(s.pct) }));
  const sum = safe.reduce((a, b) => a + b.pct, 0);
  const norm = sum > 0 ? safe.map((s) => ({ ...s, pct: s.pct / sum })) : safe.map((s) => ({ ...s, pct: 1 / safe.length }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: trackBg }]}>
      <View style={styles.segRow}>
        {norm.map((s) => (
          <View
            key={s.key}
            style={[
              styles.seg,
              {
                flex: Math.max(0.0001, s.pct),
                backgroundColor: colorFor(s.kind),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // header right
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 14,
  },
  headerPillText: { fontSize: 12.5, fontWeight: "900" },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // page top
  pageTop: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 18, fontWeight: "900" },
  pageSub: { marginTop: 3, fontSize: 12.5, fontWeight: "800" },

  scroll: { padding: 16, paddingBottom: 26 },

  // summary
  summaryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
    }),
  },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: { fontSize: 14.5, fontWeight: "900" },
  summaryHint: { marginTop: 2, fontSize: 12, fontWeight: "800" },

  totalBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  totalBadgeText: { fontSize: 12, fontWeight: "900" },

  legendRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 999 },
  legendText: { fontSize: 12, fontWeight: "900" },

  // grid cards
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 8,
  },
  statCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    minHeight: 112,
    justifyContent: "space-between",
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.035,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
    }),
  },
  statTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statTitle: { fontSize: 12.5, fontWeight: "900", flex: 1 },
  statValue: { fontSize: 28, fontWeight: "900" },
  underline: { height: 4, borderRadius: 999, marginTop: 8 },

  // section
  sectionHeader: {
    marginTop: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: { fontSize: 14.5, fontWeight: "900" },
  sectionHint: { fontSize: 12, fontWeight: "900" },

  emptyBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // departments
  deptCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
    }),
  },
  deptTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  deptName: { fontSize: 14.5, fontWeight: "900" },
  deptSub: { marginTop: 2, fontSize: 12, fontWeight: "800" },

  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "900" },

  progressTrack: {
    marginTop: 10,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  segRow: { flex: 1, flexDirection: "row" },
  seg: { height: "100%" },

  chipsRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: "900" },
});