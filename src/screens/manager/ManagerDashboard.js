import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";
import { useThemeApp } from "../../theme/ThemeContext";
import { managerApi } from "../../services/managerApi";

const SESSION_KEY = "local_session_v1";
const PROFILE_KEY = "local_user_profile";

export default function ManagerDashboard({ navigation }) {
  const { colors } = useThemeApp();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, in_progress: 0, accepted: 0, rejected: 0 });

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const r = await managerApi.stats();
      setStats(r.stats || { total: 0, in_progress: 0, accepted: 0, rejected: 0 });
    } catch (e) {
      Alert.alert("خطأ", e.message || "Server error");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  //  يظهر الأزرار فقط لو الشاشات موجودة في Stack الحالي
  const canGo = useMemo(() => {
    const state = navigation.getState?.();
    const names = (state?.routeNames || state?.routes?.map((r) => r.name) || []).filter(Boolean);
    const set = new Set(names);
    return (name) => set.has(name);
  }, [navigation]);

  const logout = useCallback(() => {
    Alert.alert("تسجيل الخروج", "متأكد تبغى تسجّل خروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              "isLoggedIn",
              "userRole",
              SESSION_KEY,
              PROFILE_KEY,
              "last_login_email",
            ]);

            const rootNav = navigation.getParent?.() || navigation;
            rootNav.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Auth" }],
              })
            );
          } catch {
            Alert.alert("خطأ", "فشل تسجيل الخروج");
          }
        },
      },
    ]);
  }, [navigation]);

  const s = useMemo(() => styles(colors), [colors]);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 18 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {/* Hero Header (بدون أرقام عشان ما يتكرر) */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View style={s.heroIcon}>
            <Ionicons name="speedometer-outline" size={20} color={colors.text} />
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.9}>
            <Ionicons name="log-out-outline" size={18} color={colors.text} />
            <Text style={s.logoutText}>خروج</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.heroTitle}>لوحة المدير</Text>
        <Text style={s.heroSub}>نظرة سريعة على بلاغات جهتك — اسحب للتحديث</Text>
      </View>

      {/* Stats */}
      <Text style={s.sectionTitle}>الإحصائيات</Text>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator />
          <Text style={s.loadingText}>جارِ تحميل البيانات…</Text>
        </View>
      ) : (
        <View style={s.grid}>
          <StatCard title="الإجمالي" value={stats.total} icon="stats-chart-outline" colors={colors} />
          <StatCard title="قيد المعالجة" value={stats.in_progress} icon="time-outline" colors={colors} />
          <StatCard title="ناجحة" value={stats.accepted} icon="checkmark-circle-outline" colors={colors} />
          <StatCard title="مرفوضة" value={stats.rejected} icon="close-circle-outline" colors={colors} />
        </View>
      )}

      {/* Actions */}
      <Text style={[s.sectionTitle, { marginTop: 18 }]}>الإجراءات</Text>

      <View style={s.actionsCard}>
        {canGo("ManagerReports") ? (
          <ActionRow
            title="بلاغات الجهة"
            subtitle="عرض البلاغات + التصفية + البحث"
            icon="document-text-outline"
            onPress={() => navigation.navigate("ManagerReports")}
            colors={colors}
            primary
          />
        ) : null}

        {canGo("ManagerEmployees") ? (
          <ActionRow
            title="الموظفون"
            subtitle="إضافة موظف / إيقاف موظف"
            icon="people-outline"
            onPress={() => navigation.navigate("ManagerEmployees")}
            colors={colors}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, icon, colors }) {
  const s = styles(colors);
  return (
    <View style={s.statCard}>
      <View style={s.statTop}>
        <View style={s.statIcon}>
          <Ionicons name={icon} size={18} color={colors.text} />
        </View>
        <Text style={s.statTitle}>{title}</Text>
      </View>

      <Text style={s.statValue}>{String(value ?? 0)}</Text>

      <View style={s.barTrack}>
        <View style={s.barFill} />
      </View>
    </View>
  );
}

function ActionRow({ title, subtitle, icon, onPress, colors, primary }) {
  const s = styles(colors);
  return (
    <TouchableOpacity
      style={[s.actionRow, primary ? s.actionRowPrimary : null]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={[s.actionIcon, primary ? s.actionIconPrimary : null]}>
        <Ionicons name={icon} size={20} color={primary ? "#fff" : colors.text} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.actionTitle}>{title}</Text>
        <Text style={s.actionSub}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.subText} />
    </TouchableOpacity>
  );
}

const styles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 16 },

    hero: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 16,
      ...Platform.select({
        ios: { shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
        android: { elevation: 2 },
      }),
    },
    heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoutText: { color: colors.text, fontWeight: "900" },

    heroTitle: { marginTop: 12, color: colors.text, fontSize: 22, fontWeight: "900" },
    heroSub: { marginTop: 6, color: colors.subText, fontWeight: "800", lineHeight: 18 },

    sectionTitle: { marginTop: 16, color: colors.text, fontWeight: "900", fontSize: 14 },

    loadingWrap: {
      marginTop: 10,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    loadingText: { color: colors.subText, fontWeight: "800" },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },

    statCard: {
      width: "48%",
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: { shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
        android: { elevation: 1 },
      }),
    },
    statTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    statIcon: {
      width: 36,
      height: 36,
      borderRadius: 14,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    statTitle: { color: colors.subText, fontWeight: "900" },
    statValue: { marginTop: 12, color: colors.text, fontSize: 28, fontWeight: "900" },

    barTrack: {
      marginTop: 12,
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    barFill: { height: "100%", width: "35%", backgroundColor: colors.primary, opacity: 0.35 },

    actionsCard: {
      marginTop: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 10,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 18,
    },
    actionRowPrimary: {
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    actionIcon: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    actionIconPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    actionTitle: { color: colors.text, fontWeight: "900", fontSize: 15 },
    actionSub: { marginTop: 4, color: colors.subText, fontWeight: "800", lineHeight: 18 },
  });