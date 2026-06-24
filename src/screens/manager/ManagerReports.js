import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeApp } from "../../theme/ThemeContext";
import { managerApi } from "../../services/managerApi";

const FILTERS = [
  { key: "", label: "الكل" },
  { key: "in_progress", label: "قيد المعالجة" },
  { key: "accepted", label: "ناجحة" },
  { key: "rejected", label: "مرفوضة" },
];

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
      return "غير محدد";
  }
}

export default function ManagerReports({ navigation }) {
  const { colors } = useThemeApp();

  const [status, setStatus] = useState("");
  const [query, setQuery] = useState(""); //  بحث بالاسم أو الجوال
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const load = useCallback(
    async (nextStatus = status, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const r = await managerApi.reports(nextStatus);
        setItems(r.items || []);
      } catch (e) {
        Alert.alert("خطأ", e.message || "Server error");
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [status]
  );

  useEffect(() => {
    load(status, false);
  }, [status, load]);

  const s = useMemo(() => styles(colors), [colors]);

  
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const name = String(it.ReporterName || "").toLowerCase();
      const phone = String(it.ReporterPhone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [items, query]);

  const renderItem = ({ item }) => {
    const title = item.Description ? String(item.Description).trim() : "";
    const safeTitle = title ? title : "بلاغ بدون وصف";
    const sub = `${item.ReporterName || "مبلّغ"} • ${item.ReporterPhone || "—"}`;
    const created = fmtDate(item.CreatedAt || item.createdAt);
    const st = String(item.Status || "").toLowerCase();

    return (
      <TouchableOpacity
        style={s.row}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ManagerReportDetails", { id: item.Id })}
      >
        <View style={{ flex: 1 }}>
          <View style={s.rowTop}>
            <Text style={s.rowTitle} numberOfLines={1}>
              {safeTitle}
            </Text>

            <View style={[s.badge, badgeStyle(colors, st)]}>
              <Text style={[s.badgeText, badgeTextStyle(colors, st)]}>{statusLabel(st)}</Text>
            </View>
          </View>

          <Text style={s.rowSub} numberOfLines={1}>
            {sub}
          </Text>

          <Text style={s.rowMeta} numberOfLines={1}>
            {created ? `تاريخ البلاغ: ${created}` : ""}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.subText} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/*  Search */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={18} color={colors.subText} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث باسم المبلّغ أو رقم الجوال..."
          placeholderTextColor={colors.subText}
          style={s.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="default"
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={18} color={colors.subText} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={s.filters}>
        {FILTERS.map((f) => {
          const active = f.key === status;
          return (
            <TouchableOpacity
              key={f.key || "all"}
              onPress={() => setStatus(f.key)}
              style={[s.filterBtn, active && s.filterBtnActive]}
              activeOpacity={0.9}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="folder-open" size={30} color={colors.subText} />
          <Text style={s.empty}>{query ? "لا توجد نتائج مطابقة." : "لا توجد بلاغات هنا."}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(it) => String(it.Id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(status, true)} />}
        />
      )}
    </View>
  );
}

function badgeStyle(colors, st) {
  if (st === "rejected") return { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder };
  return { backgroundColor: colors.soft, borderColor: colors.border };
}

function badgeTextStyle(colors, st) {
  return { color: colors.text };
}

const styles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 12 },

    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontWeight: "700",
    },

    filters: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      flexWrap: "wrap",
    },

    filterBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { color: colors.text, fontWeight: "800" },
    filterTextActive: { color: "#fff" },

    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },

    rowTop: { flexDirection: "row", alignItems: "center", gap: 10 },
    rowTitle: { flex: 1, color: colors.text, fontWeight: "900" },

    badge: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeText: { fontWeight: "900", fontSize: 12 },

    rowSub: { color: colors.subText, marginTop: 6, fontWeight: "700" },
    rowMeta: { color: colors.subText, marginTop: 8, fontWeight: "700" },

    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
    empty: { color: colors.subText, fontWeight: "800" },
  });