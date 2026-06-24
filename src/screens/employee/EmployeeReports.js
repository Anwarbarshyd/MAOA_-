import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeApp } from "../../theme/ThemeContext";
import { employeeApi } from "../../services/employeeApi";

function clean(v) {
  return String(v || "").trim();
}

function onlyDigits(v) {
  return String(v || "").replace(/[^\d]/g, "");
}

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
    case "new":
      return "جديد";
    default:
      return String(key || "غير محدد");
  }
}

export default function EmployeeReports({ navigation }) {
  const { colors } = useThemeApp();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const r = await employeeApi.reports(filter);
      setItems(r.items || []);
    } catch (e) {
      Alert.alert("خطأ", e.message || "Server error");
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load(false);
  }, [load]);

  const s = useMemo(() => styles(colors), [colors]);

  const Chip = ({ value, label }) => {
    const active = value === filter;
    return (
      <TouchableOpacity
        style={[s.chip, active ? { backgroundColor: colors.primary, borderColor: colors.primary } : null]}
        onPress={() => setFilter(value)}
      >
        <Text style={[s.chipText, active ? { color: "#fff" } : { color: colors.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const filteredItems = useMemo(() => {
    const needleRaw = clean(q);
    const needle = needleRaw.toLowerCase();
    const needleDigits = onlyDigits(needleRaw);

    const canSearchText = needle.length >= 1;
    const canSearchPhone = needleDigits.length >= 1;

    if (!canSearchText && !canSearchPhone) return items;

    return (items || []).filter((it) => {
      const name = clean(it.ReporterName).toLowerCase();
      const phone = onlyDigits(it.ReporterPhone);

      if (canSearchText && name.includes(needle)) return true;
      if (canSearchPhone && phone.includes(needleDigits)) return true;

      return false;
    });
  }, [items, q]);

  const callPhone = async (rawPhone) => {
    try {
      const d = onlyDigits(rawPhone);
      if (!d) return Alert.alert("تنبيه", "رقم الجوال غير متوفر");

      const url = `tel:${d}`;
      const ok = await Linking.canOpenURL(url);

      if (!ok) return Alert.alert("تنبيه", "تعذر فتح الاتصال");

      await Linking.openURL(url);
    } catch {
      Alert.alert("خطأ", "تعذر إجراء الاتصال");
    }
  };

  const renderItem = ({ item }) => {
    const st = String(item.Status || "").toLowerCase();
    const title = clean(item.ReporterName) || "بلاغ";
    const phone = clean(item.ReporterPhone);

    return (
      <TouchableOpacity
        style={s.row}
        onPress={() => navigation.navigate("EmployeeReportDetails", { id: String(item.Id) })}
      >
        <View style={s.iconBubble}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.text} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={s.rowTop}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>

            <View style={s.badge}>
              <Text style={s.badgeText}>{statusLabel(st)}</Text>
            </View>
          </View>

          {phone ? <Text style={s.phone}>{phone}</Text> : null}

          <Text style={s.sub} numberOfLines={1}>{clean(item.Description) || "—"}</Text>
          <Text style={s.meta}>{fmtDate(item.CreatedAt)}</Text>
        </View>

        {/* زر الاتصال */}
        <TouchableOpacity
          style={s.callBtn}
          onPress={(e) => {
            e?.stopPropagation?.();
            callPhone(phone);
          }}
        >
          <Ionicons name="call-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const needleRaw = clean(q);
  const needleDigits = onlyDigits(needleRaw);
  const isSearching = needleRaw.length >= 3 || needleDigits.length >= 3;
  const emptyText = isSearching ? "لا توجد نتائج مطابقة للبحث." : "لا توجد بلاغات.";

  return (
    <View style={s.container}>
      <View style={s.chipsRow}>
        <Chip value="" label="الكل" />
        <Chip value="new" label="جديد" />
        <Chip value="in_progress" label="قيد المعالجة" />
        <Chip value="accepted" label="ناجحة" />
        <Chip value="rejected" label="مرفوضة" />
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search" size={18} color={colors.subText} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="اكتب أحرف/أرقام للبحث…"
          placeholderTextColor={colors.subText}
          style={s.searchInput}
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ("")}>
            <Ionicons name="close-circle" size={18} color={colors.subText} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="document-text-outline" size={34} color={colors.subText} />
          <Text style={s.empty}>{emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(it) => String(it.Id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        />
      )}
    </View>
  );
}

const styles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 12 },

    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },

    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },

    chipText: { fontWeight: "900" },

    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },

    searchInput: { flex: 1, color: colors.text, fontWeight: "800" },

    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },

    empty: { color: colors.text, fontWeight: "900" },

    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 12,
      marginBottom: 10,
    },

    iconBubble: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

    title: { color: colors.text, fontWeight: "900", flex: 1 },

    phone: { marginTop: 4, color: colors.subText, fontWeight: "800", fontSize: 13 },

    badge: {
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },

    badgeText: { color: colors.text, fontWeight: "900", fontSize: 12 },

    sub: { marginTop: 6, color: colors.subText, fontWeight: "800" },

    meta: { marginTop: 6, color: colors.subText, fontWeight: "700", fontSize: 12 },

    callBtn: {
      width: 36,
      height: 36,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });