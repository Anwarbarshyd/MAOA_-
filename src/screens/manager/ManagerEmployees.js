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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeApp } from "../../theme/ThemeContext";
import { managerApi } from "../../services/managerApi";

function cleanStr(v) {
  return String(v || "").trim();
}
function normalizePhone(v) {
  return String(v || "").replace(/[^\d]/g, "");
}
function fmtDate(v) {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function getEmpId(emp) {
  return String(emp?.UserId || emp?.userId || "").trim();
}
function isActiveEmp(emp) {
  return emp?.IsActive === true || emp?.IsActive === 1 || String(emp?.IsActive) === "1";
}

export default function ManagerEmployees() {
  const { colors } = useThemeApp();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  // Add/Edit Modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add"); // add | edit
  const [saving, setSaving] = useState(false);

  const [editUserId, setEditUserId] = useState(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");

  // Menu (Bottom Sheet)
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuEmp, setMenuEmp] = useState(null);

  const s = useMemo(() => styles(colors), [colors]);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const r = await managerApi.employees();
      setItems(r.items || []);
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

  const filtered = useMemo(() => {
    const needle = cleanStr(q).toLowerCase();
    if (!needle) return items;

    return (items || []).filter((it) => {
      const name = cleanStr(it.FullName).toLowerCase();
      const em = cleanStr(it.Email).toLowerCase();
      const ph = normalizePhone(it.Phone);
      const active = isActiveEmp(it);

      if (needle === "نشط") return active;
      if (needle === "موقوف") return !active;

      return name.includes(needle) || em.includes(needle) || ph.includes(normalizePhone(needle));
    });
  }, [items, q]);

  const resetForm = () => {
    setEditUserId(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setNationalId("");
    setPassword("");
  };

  const openAdd = () => {
    resetForm();
    setMode("add");
    setOpen(true);
  };

  const openEdit = (emp) => {
    setMode("edit");
    setEditUserId(getEmpId(emp) || null);
    setFullName(cleanStr(emp?.FullName));
    setEmail(cleanStr(emp?.Email));
    setPhone(cleanStr(emp?.Phone));
    setNationalId(cleanStr(emp?.NationalId));
    setPassword(""); 
    setOpen(true);
  };

  const submitAdd = async () => {
    const payload = {
      fullName: cleanStr(fullName),
      email: cleanStr(email).toLowerCase(),
      phone: normalizePhone(phone),
      nationalId: normalizePhone(nationalId),
      password: cleanStr(password),
    };

    if (!payload.fullName || payload.fullName.length < 3)
      return Alert.alert("تنبيه", "اكتب اسم صحيح (3 أحرف+).");
    if (!payload.email.includes("@")) return Alert.alert("تنبيه", "البريد غير صحيح.");
    if (!payload.phone) return Alert.alert("تنبيه", "رقم الجوال مطلوب.");
    if (!payload.password || payload.password.length < 6)
      return Alert.alert("تنبيه", "كلمة المرور لازم 6 أحرف+.");

    try {
      setSaving(true);
      await managerApi.createEmployee(payload);
      setOpen(false);
      await load(true);
      Alert.alert("تم", "تم إضافة الموظف بنجاح ");
    } catch (e) {
      Alert.alert("خطأ", e.message || "Server error");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    const userId = String(editUserId || "").trim();
    if (!userId) return Alert.alert("خطأ", "userId غير موجود");

    const payload = {};
    const n = cleanStr(fullName);
    const em = cleanStr(email).toLowerCase();
    const ph = normalizePhone(phone);
    const nid = normalizePhone(nationalId);
    const pw = cleanStr(password);

    if (n) payload.fullName = n;
    if (em) payload.email = em;
    if (ph) payload.phone = ph;
    if (nid) payload.nationalId = nid;
    if (pw) payload.password = pw;

    if (!Object.keys(payload).length) return Alert.alert("تنبيه", "ما غيرت شيء.");
    if (payload.email && !payload.email.includes("@")) return Alert.alert("تنبيه", "البريد غير صحيح.");
    if (payload.password && payload.password.length < 6)
      return Alert.alert("تنبيه", "كلمة المرور لازم 6 أحرف+.");

    try {
      setSaving(true);
      await managerApi.updateEmployee(userId, payload);
      setOpen(false);
      await load(true);
      Alert.alert("تم", "تم تعديل بيانات الموظف ");
    } catch (e) {
      Alert.alert("خطأ", e.message || "Server error");
    } finally {
      setSaving(false);
    }
  };

  //  إيقاف/تفعيل (الجديد الصحيح)
  const setActive = async (emp, nextActive) => {
    const userId = getEmpId(emp);
    const name = cleanStr(emp?.FullName) || "هذا الموظف";
    if (!userId) return Alert.alert("خطأ", "userId غير موجود");

    const title = nextActive ? "تفعيل موظف" : "إيقاف موظف";
    const body = nextActive ? `تبغى تفعّل ${name}؟` : `متأكد تبغى توقف ${name}؟`;
    const okText = nextActive ? "تفعيل" : "إيقاف";

    Alert.alert(title, body, [
      { text: "إلغاء", style: "cancel" },
      {
        text: okText,
        style: nextActive ? "default" : "destructive",
        onPress: async () => {
          try {
            await managerApi.setEmployeeActive(userId, nextActive);
            await load(true);
            Alert.alert("تم", nextActive ? "تم تفعيل الموظف " : "تم إيقاف الموظف ");
          } catch (e) {
            Alert.alert("خطأ", e.message || "Server error");
          }
        },
      },
    ]);
  };

  const deleteEmployeeHard = async (emp) => {
    const userId = getEmpId(emp);
    const name = cleanStr(emp?.FullName) || "هذا الموظف";
    if (!userId) return Alert.alert("خطأ", "userId غير موجود");

    Alert.alert("حذف نهائي", `تحذير: هذا الحذف نهائي.\nمتأكد تبغى تحذف ${name}؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف نهائي",
        style: "destructive",
        onPress: async () => {
          try {
            await managerApi.deleteEmployeeHard(userId);
            await load(true);
            Alert.alert("تم", "تم حذف الموظف نهائيًا ");
          } catch (e) {
            Alert.alert("خطأ", e.message || "Server error");
          }
        },
      },
    ]);
  };

  const openMenu = (emp) => {
    setMenuEmp(emp);
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuEmp(null);
  };

  const renderItem = ({ item }) => {
    const active = isActiveEmp(item);

    return (
      <View style={s.row}>
        <View style={s.avatar}>
          <Ionicons name="person" size={18} color={colors.text} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={s.rowTop}>
            <Text style={s.name} numberOfLines={1}>
              {cleanStr(item.FullName) || "بدون اسم"}
            </Text>

            <View style={[s.badge, active ? s.badgeActive : s.badgeOff]}>
              <Text style={s.badgeText}>{active ? "نشط" : "موقوف"}</Text>
            </View>
          </View>

          <Text style={s.meta} numberOfLines={1}>
            {cleanStr(item.Phone) || "—"} • {cleanStr(item.Email) || "—"}
          </Text>

          {item.CreatedAt ? <Text style={s.meta2}>تاريخ الإضافة: {fmtDate(item.CreatedAt)}</Text> : null}
        </View>

        <TouchableOpacity style={s.moreBtn} activeOpacity={0.9} onPress={() => openMenu(item)}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    );
  };

  const activeInMenu = menuEmp ? isActiveEmp(menuEmp) : false;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>الموظفون</Text>
          <Text style={s.subTitle}>إدارة موظفي الجهة (إضافة / تعديل / تفعيل / إيقاف / حذف)</Text>
        </View>

        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.9}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search" size={18} color={colors.subText} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="بحث بالاسم أو الجوال أو البريد…"
          placeholderTextColor={colors.subText}
          style={s.searchInput}
          autoCapitalize="none"
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ("")} activeOpacity={0.9}>
            <Ionicons name="close-circle" size={18} color={colors.subText} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="people" size={34} color={colors.subText} />
          <Text style={s.empty}>لا يوجد موظفون.</Text>
          <Text style={s.emptyHint}>اضغط + لإضافة موظف جديد.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => getEmpId(it) || String(Math.random())}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        />
      )}

      {/* Menu Modal (Bottom Sheet) */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={s.sheetBackdrop}>
          {/* اضغط خارج الكارد يقفل */}
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeMenu} />

          {/* هذا يمنع إغلاق المودال عند الضغط داخل الكارد */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.menuCard}>
            <Text style={s.menuTitle}>{cleanStr(menuEmp?.FullName) || "الموظف"}</Text>

            <TouchableOpacity style={s.menuRow} activeOpacity={0.9} onPress={() => { closeMenu(); openEdit(menuEmp); }}>
              <Ionicons name="create-outline" size={18} color={colors.text} />
              <Text style={s.menuText}>تعديل البيانات</Text>
            </TouchableOpacity>

            {activeInMenu ? (
              <TouchableOpacity style={s.menuRow} activeOpacity={0.9} onPress={() => { closeMenu(); setActive(menuEmp, false); }}>
                <Ionicons name="ban-outline" size={18} color={colors.text} />
                <Text style={s.menuText}>إيقاف الموظف</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.menuRow} activeOpacity={0.9} onPress={() => { closeMenu(); setActive(menuEmp, true); }}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.text} />
                <Text style={s.menuText}>تفعيل الموظف</Text>
              </TouchableOpacity>
            )}

            <View style={s.menuDivider} />

            <TouchableOpacity
              style={[s.menuRow, s.menuDangerRow]}
              activeOpacity={0.9}
              onPress={() => { closeMenu(); deleteEmployeeHard(menuEmp); }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.text} />
              <Text style={[s.menuText, { fontWeight: "900" }]}>حذف نهائي</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{mode === "add" ? "إضافة موظف" : "تعديل موظف"}</Text>
                <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.9}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Field label="الاسم الكامل" value={fullName} onChangeText={setFullName} colors={colors} />
              <Field label="البريد" value={email} onChangeText={setEmail} colors={colors} autoCapitalize="none" />
              <Field label="رقم الجوال" value={phone} onChangeText={setPhone} colors={colors} keyboardType="phone-pad" />
              <Field
                label="الهوية (اختياري)"
                value={nationalId}
                onChangeText={setNationalId}
                colors={colors}
                keyboardType="number-pad"
              />
              <Field
                label={mode === "add" ? "كلمة المرور" : "كلمة مرور جديدة (اختياري)"}
                value={password}
                onChangeText={setPassword}
                colors={colors}
                secureTextEntry
              />

              <TouchableOpacity
                style={s.saveBtn}
                onPress={mode === "add" ? submitAdd : submitEdit}
                disabled={saving}
                activeOpacity={0.9}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={s.saveText}>حفظ</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={s.modalHint}>ملاحظة: سيتم ربط الموظف تلقائيًا بجهة المدير.</Text>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, colors, ...props }) {
  const s = styles(colors);
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput {...props} placeholder={label} placeholderTextColor={colors.subText} style={s.fieldInput} />
    </View>
  );
}

const styles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg, padding: 12 },

    header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
    title: { color: colors.text, fontSize: 20, fontWeight: "900" },
    subTitle: { color: colors.subText, marginTop: 4, fontWeight: "700" },

    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },

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
    emptyHint: { color: colors.subText, fontWeight: "700" },

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
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    name: { color: colors.text, fontWeight: "900", flex: 1 },
    meta: { color: colors.subText, marginTop: 4, fontWeight: "700" },
    meta2: { color: colors.subText, marginTop: 6, fontWeight: "700", fontSize: 12 },

    badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
    badgeActive: { backgroundColor: colors.soft, borderColor: colors.border },
    badgeOff: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
    badgeText: { fontWeight: "900", fontSize: 12, color: colors.text },

    moreBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.soft,
    },

    // Add/Edit Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      padding: 14,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    modalTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },

    fieldLabel: { color: colors.subText, fontWeight: "800", marginBottom: 6 },
    fieldInput: {
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.text,
      fontWeight: "800",
    },

    saveBtn: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    saveText: { color: "#fff", fontWeight: "900" },
    modalHint: { marginTop: 10, color: colors.subText, fontWeight: "700", fontSize: 12 },

    // Bottom Sheet Menu
    sheetBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "flex-end",
      padding: 14,
    },
    menuCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    menuTitle: { color: colors.text, fontWeight: "900", marginBottom: 6, fontSize: 15 },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 14,
      backgroundColor: colors.soft,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    menuDangerRow: {
      backgroundColor: colors.soft,
      borderColor: colors.border,
    },
    menuText: { color: colors.text, fontWeight: "800" },
    menuDivider: { height: 10 },
  });