import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, RefreshControl
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";
import { useThemeApp } from "../../theme/ThemeContext";
import { employeeApi } from "../../services/employeeApi";

const SESSION_KEY = "local_session_v1";
const PROFILE_KEY = "local_user_profile";

export default function EmployeeHome({ navigation }) {
  const { colors } = useThemeApp();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, in_progress: 0, accepted: 0, rejected: 0 });

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const r = await employeeApi.stats();
      setStats(r.stats || { total: 0, in_progress: 0, accepted: 0, rejected: 0 });
    } catch (e) {
      Alert.alert("خطأ", e.message || "Server error");
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

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
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View style={s.heroIcon}>
            <Ionicons name="briefcase-outline" size={20} color={colors.text} />
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.9}>
            <Ionicons name="log-out-outline" size={18} color={colors.text} />
            <Text style={s.logoutText}>خروج</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.title}>لوحة الموظف</Text>
        <Text style={s.sub}>نظرة سريعة على بلاغات جهتك — اسحب للتحديث</Text>
      </View>

      <Text style={s.sectionTitle}>الإحصائيات</Text>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator />
          <Text style={s.loadingText}>جارِ التحميل…</Text>
        </View>
      ) : (
        <View style={s.grid}>
          <StatCard title="الإجمالي" value={stats.total} icon="stats-chart-outline" colors={colors} />
          <StatCard title="قيد المعالجة" value={stats.in_progress} icon="time-outline" colors={colors} />
          <StatCard title="ناجحة" value={stats.accepted} icon="checkmark-circle-outline" colors={colors} />
          <StatCard title="مرفوضة" value={stats.rejected} icon="close-circle-outline" colors={colors} />
        </View>
      )}

      <Text style={[s.sectionTitle, { marginTop: 18 }]}>الإجراءات</Text>

      <TouchableOpacity style={s.actionRow} activeOpacity={0.9} onPress={() => navigation.navigate("EmployeeReports")}>
        <View style={s.actionIcon}>
          <Ionicons name="document-text-outline" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.actionTitle}>بلاغات الجهة</Text>
          <Text style={s.actionSub}>عرض البلاغات</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subText} />
      </TouchableOpacity>
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
      <View style={s.barTrack}><View style={s.barFill} /></View>
    </View>
  );
}

const styles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 16 },

    hero: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 16 },
    heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    heroIcon: {
      width: 44, height: 44, borderRadius: 16,
      backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border,
      alignItems: "center", justifyContent: "center",
    },

    logoutBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingVertical: 10, paddingHorizontal: 12,
      borderRadius: 14, backgroundColor: colors.soft,
      borderWidth: 1, borderColor: colors.border,
    },
    logoutText: { color: colors.text, fontWeight: "900" },

    title: { marginTop: 12, color: colors.text, fontSize: 22, fontWeight: "900" },
    sub: { marginTop: 6, color: colors.subText, fontWeight: "800", lineHeight: 18 },

    sectionTitle: { marginTop: 16, color: colors.text, fontWeight: "900", fontSize: 14 },

    loadingWrap: {
      marginTop: 10, backgroundColor: colors.card, borderRadius: 18, padding: 18,
      borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: 10,
    },
    loadingText: { color: colors.subText, fontWeight: "800" },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
    statCard: {
      width: "48%", backgroundColor: colors.card, borderRadius: 20, padding: 14,
      borderWidth: 1, borderColor: colors.border,
    },
    statTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    statIcon: {
      width: 36, height: 36, borderRadius: 14,
      backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border,
      alignItems: "center", justifyContent: "center",
    },
    statTitle: { color: colors.subText, fontWeight: "900" },
    statValue: { marginTop: 12, color: colors.text, fontSize: 28, fontWeight: "900" },

    barTrack: {
      marginTop: 12, height: 8, borderRadius: 999,
      backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    },
    barFill: { height: "100%", width: "35%", backgroundColor: colors.primary, opacity: 0.35 },

    actionRow: {
      marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: 22, padding: 12,
    },
    actionIcon: {
      width: 42, height: 42, borderRadius: 16,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.primary,
    },
    actionTitle: { color: colors.text, fontWeight: "900", fontSize: 15 },
    actionSub: { marginTop: 4, color: colors.subText, fontWeight: "800", lineHeight: 18 },
  });