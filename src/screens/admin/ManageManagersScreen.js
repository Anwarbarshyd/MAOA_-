// src/screens/admin/ManageManagersScreen.js
import React, { useCallback, useEffect, useMemo, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useThemeApp } from "../../theme/ThemeContext";
import { API_BASE_URL } from "../../services/api";

const SESSION_KEY = "local_session_v1";

function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}
function onlyDigits(v) {
  return String(v || "").replace(/[^\d]/g, "");
}
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());
}

export default function ManageManagersScreen({ navigation }) {
  const { colors, mode } = useThemeApp();
  const isDark = mode === "dark";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [token, setToken] = useState("");
  const [role, setRole] = useState("");

  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  //  وضع التعديل
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    departmentId: "",
  });

  const authHeaders = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const selectedDept = useMemo(
    () => departments.find((d) => String(d.Id) === String(form.departmentId)) || null,
    [departments, form.departmentId]
  );

  const filtered = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return managers;

    return managers.filter((m) => {
      const name = String(m.FullName || m.fullName || "").toLowerCase();
      const email = String(m.Email || m.email || "").toLowerCase();
      const phone = String(m.Phone || m.phone || "").toLowerCase();
      return name.includes(s) || email.includes(s) || phone.includes(s);
    });
  }, [managers, q]);

  const loadSession = useCallback(async () => {
    const s = await AsyncStorage.getItem(SESSION_KEY);
    const session = s ? JSON.parse(s) : null;

    const t = session?.token ? String(session.token) : "";
    const r = session?.role ? String(session.role).toLowerCase() : "";

    setToken(t);
    setRole(r);

    return { t, r };
  }, []);

  const fetchManagers = useCallback(
    async (tkn) => {
      const t = tkn ?? token;

      const res = await fetch(`${API_BASE_URL}/admin/managers`, {
        method: "GET",
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      const list = Array.isArray(data.items) ? data.items : [];
      list.sort((a, b) => {
        const da = new Date(a.CreatedAt || 0).getTime();
        const db = new Date(b.CreatedAt || 0).getTime();
        return db - da;
      });

      setManagers(list);
    },
    [token]
  );

  const fetchDepartments = useCallback(
    async (tkn) => {
      const t = tkn ?? token;

      const res = await fetch(`${API_BASE_URL}/departments`, {
        method: "GET",
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      const list = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      setDepartments(list);
    },
    [token]
  );

  const resetForm = useCallback(() => {
    setForm({ fullName: "", email: "", phone: "", password: "", departmentId: "" });
    setEditingId(null);
  }, []);

  const openAdd = useCallback(() => {
    resetForm();
    setModalOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((item) => {
    setForm({
      fullName: String(item.FullName || item.fullName || "").trim(),
      email: normEmail(item.Email || item.email || ""),
      phone: onlyDigits(item.Phone || item.phone || ""),
      password: "", //  لا نعرض القديم
      departmentId: String(item.DepartmentId || item.departmentId || ""),
    });
    setEditingId(item.UserId);
    setModalOpen(true);
  }, []);

  
  useLayoutEffect(() => {
    navigation?.setOptions?.({
      title: "إدارة",
      headerShown: true,
      headerBackTitleVisible: false,
      headerRight: undefined,
    });
  }, [navigation]);

  const bootstrap = useCallback(
    async (opts = {}) => {
      const { silent = false } = opts;

      if (!silent) setLoading(true);

      try {
        const { t, r } = await loadSession();

        if (r !== "admin") {
          Alert.alert("الصلاحيات", "هذه الصفحة للأدمن فقط.");
          navigation?.goBack?.();
          return;
        }

        await Promise.all([fetchManagers(t), fetchDepartments(t)]);
      } catch (e) {
        Alert.alert("خطأ", String(e?.message || "فشل تحميل البيانات"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchDepartments, fetchManagers, loadSession, navigation]
  );

  useEffect(() => {
    bootstrap({ silent: true });

    const unsub = navigation?.addListener?.("focus", () => {
      bootstrap({ silent: true });
    });

    return unsub;
  }, [bootstrap, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    bootstrap();
  }, [bootstrap]);

  //  فالتحرير: كلمة المرور اختيارية
  const validate = useCallback(() => {
    const fullName = String(form.fullName || "").trim();
    const email = normEmail(form.email);
    const phone = onlyDigits(form.phone);
    const password = String(form.password || "");
    const departmentId = String(form.departmentId || "").trim();

    if (fullName.length < 3) return "اكتب اسم صحيح";
    if (!isEmail(email)) return "البريد غير صحيح";
    if (!phone || phone.length < 9) return "رقم الجوال غير صحيح";
    if (!departmentId) return "اختر الجهة";

   
    if (!editingId && password.length < 8) return "كلمة المرور ضعيفة (8 أحرف+)";

    // تعديل: لو كتب كلمة مرور لازم تكون قوية
    if (editingId && password && password.length < 8) return "كلمة المرور ضعيفة (8 أحرف+)";

    return null;
  }, [form, editingId]);

  const saveManager = useCallback(async () => {
    const err = validate();
    if (err) return Alert.alert("تنبيه", err);

    setBusy(true);
    try {
      const basePayload = {
        fullName: String(form.fullName || "").trim(),
        email: normEmail(form.email),
        phone: onlyDigits(form.phone),
        departmentId: String(form.departmentId),
      };

      //  كلمة المرور: أرسلها فقط إذا المستخدم كتبها
      const password = String(form.password || "");
      const payload = password ? { ...basePayload, password } : basePayload;

      const isEdit = !!editingId;

      const url = isEdit
        ? `${API_BASE_URL}/admin/managers/${editingId}`
        : `${API_BASE_URL}/admin/managers`;

     
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      // fallback لو PATCH غير مدعوم
      if (isEdit && (res.status === 404 || res.status === 405)) {
        const res2 = await fetch(url, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
        const data2 = await res2.json().catch(() => ({}));
        if (!res2.ok) return Alert.alert("فشل", data2?.message || "ما قدرنا نحدّث المدير");
      } else {
        if (!res.ok) return Alert.alert("فشل", data?.message || (isEdit ? "ما قدرنا نحدّث المدير" : "ما قدرنا ننشئ المدير"));
      }

      setModalOpen(false);
      setQ("");
      resetForm();
      await fetchManagers();
      Alert.alert("تم", isEdit ? "تم تحديث بيانات المدير" : "تم إنشاء مدير بنجاح");
    } catch (e) {
      Alert.alert("خطأ", String(e?.message || "فشل العملية"));
    } finally {
      setBusy(false);
    }
  }, [authHeaders, editingId, fetchManagers, form, resetForm, validate]);

  const deleteManager = useCallback(
    async (userId) => {
      Alert.alert("حذف مدير", "متأكد؟", [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const res = await fetch(`${API_BASE_URL}/admin/managers/${userId}`, {
                method: "DELETE",
                headers: authHeaders,
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) return Alert.alert("فشل", data?.message || "ما قدرنا نحذف");

              await fetchManagers();
            } catch (e) {
              Alert.alert("خطأ", String(e?.message || "فشل الحذف"));
            } finally {
              setBusy(false);
            }
          },
        },
      ]);
    },
    [authHeaders, fetchManagers]
  );

  const deptNameById = useCallback(
    (deptId) => {
      const dept = departments.find((d) => String(d.Id) === String(deptId));
      return dept?.Name || "—";
    },
    [departments]
  );

  const renderItem = ({ item }) => {
    const name = item.FullName || item.fullName || "—";
    const email = item.Email || item.email || "—";
    const phone = item.Phone || item.phone || "—";
    const deptId = item.DepartmentId || item.departmentId;

    return (
      <View style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.rowSub, { color: colors.subText }]} numberOfLines={1}>
            {email}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.subText }]} numberOfLines={1}>
            {deptNameById(deptId)} • {phone}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* ✅ Edit */}
          <TouchableOpacity
            onPress={() => openEdit(item)}
            style={[
              styles.iconBtn,
              { borderColor: colors.border, backgroundColor: colors.soft, opacity: busy ? 0.6 : 1 },
            ]}
            activeOpacity={0.9}
            disabled={busy}
          >
            <Ionicons name="create-outline" size={18} color={colors.text} />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={() => deleteManager(item.UserId)}
            style={[
              styles.iconBtn,
              { borderColor: colors.border, backgroundColor: colors.soft, opacity: busy ? 0.6 : 1 },
            ]}
            activeOpacity={0.9}
            disabled={busy}
          >
            <Ionicons name="trash-outline" size={18} color={isDark ? "#ff6b6b" : "#d11a2a"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const listHeader = (
    <View style={styles.listHeaderWrap}>
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.subText} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث بالاسم أو البريد أو الجوال"
          placeholderTextColor={colors.subText}
          style={[styles.searchInput, { color: colors.text }]}
          autoCapitalize="none"
        />
        {!!q && (
          <TouchableOpacity onPress={() => setQ("")} activeOpacity={0.9} style={styles.clearBtn}>
            <Ionicons name="close" size={16} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.counterRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.counterText, { color: colors.text }]}>العدد: {filtered.length}</Text>
        <Text style={[styles.counterHint, { color: colors.subText }]}>اسحب لتحديث البيانات</Text>
      </View>

      {managers.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="people-outline" size={22} color={colors.subText} />
          <Text style={[styles.emptyText, { color: colors.subText }]}>لا يوجد مدراء حاليًا</Text>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: colors.subText, fontWeight: "900" }}>جاري التحميل…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.UserId)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
        onPress={openAdd}
        activeOpacity={0.9}
        disabled={busy}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Modal / Bottom Sheet */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetTop}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {editingId ? "تعديل مدير" : "إضافة مدير"}
                </Text>
                <Text style={[styles.sheetSub, { color: colors.subText }]}>
                  {editingId ? "عدّل اللي تحتاجه فقط" : "أدخل البيانات واربطه بجهة واحدة"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                disabled={busy}
                style={[styles.closeBtn, { backgroundColor: colors.soft, borderColor: colors.border }]}
                activeOpacity={0.9}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              label="الاسم الكامل"
              value={form.fullName}
              onChange={(v) => setForm((s) => ({ ...s, fullName: v }))}
              colors={colors}
            />
            <Input
              label="البريد الإلكتروني"
              value={form.email}
              onChange={(v) => setForm((s) => ({ ...s, email: v }))}
              colors={colors}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="رقم الجوال"
              value={form.phone}
              onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
              colors={colors}
              keyboardType="phone-pad"
            />

            {/* ✅ كلمة المرور: اختيارية بالتعديل */}
            <Input
              label={editingId ? "كلمة المرور (اختياري)" : "كلمة المرور"}
              value={form.password}
              onChange={(v) => setForm((s) => ({ ...s, password: v }))}
              colors={colors}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.subText }]}>الجهة</Text>
            <View
              style={[
                styles.selectBox,
                {
                  borderColor: colors.border,
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                },
              ]}
            >
              {departments.map((d) => {
                const active = String(form.departmentId) === String(d.Id);
                return (
                  <TouchableOpacity
                    key={String(d.Id)}
                    onPress={() => setForm((s) => ({ ...s, departmentId: String(d.Id) }))}
                    style={[
                      styles.deptChip,
                      { borderColor: colors.border, backgroundColor: active ? colors.primary : "transparent" },
                    ]}
                    activeOpacity={0.9}
                    disabled={busy}
                  >
                    <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "900", fontSize: 12 }}>
                      {d.Name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedDept ? (
              <View style={[styles.selectedRow, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.text} />
                <Text style={{ color: colors.text, fontWeight: "900" }}>الجهة المختارة: {selectedDept.Name}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
              onPress={saveManager}
              activeOpacity={0.9}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editingId ? "تحديث" : "حفظ"}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Input({ label, value, onChange, colors, ...props }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[styles.label, { color: colors.subText }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder={label}
        placeholderTextColor={colors.subText}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  listHeaderWrap: { paddingBottom: 10 },

  searchBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "900" },
  clearBtn: { padding: 6, borderRadius: 10 },

  counterRow: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counterText: { fontWeight: "900" },
  counterHint: { fontWeight: "900", fontSize: 12 },

  empty: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { fontWeight: "900" },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  rowTitle: { fontSize: 14.5, fontWeight: "900" },
  rowSub: { fontSize: 12.5, fontWeight: "800", marginTop: 2 },
  rowMeta: { fontSize: 12, fontWeight: "800", marginTop: 2 },

  iconBtn: { padding: 10, borderWidth: 1, borderRadius: 14 },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  sheetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { fontSize: 16, fontWeight: "900" },
  sheetSub: { marginTop: 2, fontSize: 12.5, fontWeight: "800" },
  closeBtn: { padding: 10, borderRadius: 14, borderWidth: 1 },

  label: { fontSize: 12, fontWeight: "900" },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
    backgroundColor: "transparent",
  },

  selectBox: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  deptChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  selectedRow: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  saveBtn: { marginTop: 12, paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});