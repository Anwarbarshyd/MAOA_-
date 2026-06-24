// src/screens/user/HomeScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
  Pressable,
  PanResponder,
  ImageBackground,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useThemeApp } from "../../theme/ThemeContext";
import { API_BASE_URL } from "../../services/api";

const { width: SCREEN_W } = Dimensions.get("window");
const HERO_H = Math.max(240, Math.min(360, Math.round(SCREEN_W * 0.68)));

const MENU_W = Math.min(320, Math.round(SCREEN_W * 0.78));
const OPEN_EDGE = 24;
const SWIPE_OPEN_THRESHOLD = 40;
const SWIPE_CLOSE_THRESHOLD = 35;

const SESSION_KEY = "local_session_v1";

const UI_DEPS = [
  { key: "police", title: "الشرطة", desc: "بلاغات أمنية وملاحظات عاجلة.", icon: "shield-checkmark-outline" },
  { key: "traffic", title: "المرور", desc: "حوادث، مخالفات، وعرقلة السير.", icon: "car-outline" },
  { key: "municipality", title: "البلدية", desc: "نظافة، إنارة، حفر، ومخالفات.", icon: "business-outline" },
  { key: "sewage", title: "الصرف الصحي", desc: "طفح، تسربات، وانسدادات الصرف.", icon: "water-outline" },
];

 const norm = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export default function HomeScreen({ navigation }) {
  const { mode, colors } = useThemeApp();
  const isDark = mode === "dark";

  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount] = useState(0);

  const [depsLoading, setDepsLoading] = useState(true);
  const [deps, setDeps] = useState([]);
  const [depsError, setDepsError] = useState("");

  const progress = useRef(new Animated.Value(0)).current;

  const panelTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [MENU_W, 0],
  });

  const overlayOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.28],
  });

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMenuOpen(false);
    });
  };

  const toggleMenu = () => (menuOpen ? closeMenu() : openMenu());

   const fetchDepartments = async (signal) => {
    if (!API_BASE_URL) throw new Error("API_BASE_URL غير مضبوط");

     let token = null;
    try {
      const sessionStr = await AsyncStorage.getItem(SESSION_KEY);
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      token = session?.token || null;
    } catch {}

    const url = `${API_BASE_URL}/departments`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.message || `فشل جلب الجهات (HTTP ${res.status})`;
      throw new Error(msg);
    }

    return Array.isArray(data) ? data : [];
  };

  const loadDeps = async () => {
    let controller = null;
    try {
      setDepsError("");
      setDepsLoading(true);

      controller = new AbortController();
      const list = await fetchDepartments(controller.signal);

      setDeps(list);
    } catch (e) {
      console.log("DEPS ERROR:", e?.message);
      setDeps([]);
      setDepsError(e?.message || "تعذر جلب الجهات");
      Alert.alert("تنبيه", "ما قدرنا نجيب الجهات من السيرفر. تأكد أن backend شغال + API_BASE_URL صح.");
    } finally {
      setDepsLoading(false);
      controller = null;
    }
  };

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        if (!mounted) return;
        setDepsError("");
        setDepsLoading(true);

        const list = await fetchDepartments(controller.signal);

        if (!mounted) return;
        setDeps(list);
      } catch (e) {
        console.log("DEPS ERROR:", e?.message);
        if (!mounted) return;
        setDeps([]);
        setDepsError(e?.message || "تعذر جلب الجهات");
        Alert.alert("تنبيه", "ما قدرنا نجيب الجهات من السيرفر. ");
      } finally {
        if (mounted) setDepsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      try {
        controller.abort();
      } catch {}
    };
  }, []);

   const departments = useMemo(() => {
    const list = Array.isArray(deps) ? deps : [];
     const pickName = (x) => x?.Name ?? x?.name ?? x?.DepartmentName ?? x?.departmentName ?? "";
    const byName = new Map(list.map((x) => [norm(pickName(x)), x]));

    return UI_DEPS.map((ui) => {
      const hit = byName.get(norm(ui.title));
      return {
        ...ui,
        departmentId: hit?.Id || hit?.id || null,
        dbName: pickName(hit) || ui.title,
      };
    });
  }, [deps]);

  const goReport = (d) => {
    if (!d.departmentId) {
      return Alert.alert("تنبيه", "الجهة غير مرتبطة بالقاعدة (DepartmentId ناقص).");
    }

    navigation.navigate("Report", {
      departmentId: d.departmentId,
      departmentName: d.dbName,
      departmentKey: d.key,
    });
  };

  const logout = async () => {
    closeMenu();

    await AsyncStorage.multiRemove([
      "isLoggedIn",
      "userRole",
      "local_session_v1",
      "local_user_profile",
    ]);

   
    const root = navigation.getParent?.("Root");
    if (root?.reset) {
      root.reset({ index: 0, routes: [{ name: "Auth" }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => {
          const { dx, dy, moveX } = g;
          const horizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8;
          const fromRightEdge = moveX > SCREEN_W - OPEN_EDGE;

          if (!menuOpen && fromRightEdge && horizontal && dx < 0) return true;
          if (menuOpen && horizontal && dx > 0) return true;
          return false;
        },
        onPanResponderMove: (_, g) => {
          const { dx } = g;
          if (!menuOpen) {
            const p = Math.min(1, Math.max(0, (-dx) / MENU_W));
            progress.setValue(p);
          } else {
            const p = Math.min(1, Math.max(0, 1 - dx / MENU_W));
            progress.setValue(p);
          }
        },
        onPanResponderRelease: (_, g) => {
          const { dx, vx } = g;
          if (!menuOpen) {
            const openEnough = -dx > SWIPE_OPEN_THRESHOLD || vx < -0.5;
            openEnough ? openMenu() : closeMenu();
          } else {
            const closeEnough = dx > SWIPE_CLOSE_THRESHOLD || vx > 0.5;
            closeEnough ? closeMenu() : openMenu();
          }
        },
      }),
    [menuOpen, progress]
  );

  const showRetry = !depsLoading && (depsError || (Array.isArray(deps) && deps.length === 0));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]} {...panResponder.panHandlers}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ImageBackground
        source={require("../../assets/home-hero.jpg")}
        style={[styles.hero, { height: HERO_H }]}
        imageStyle={styles.heroImg}
        resizeMode="cover"
      >
        <View
          pointerEvents="none"
          style={[
            styles.heroOverlay,
            { backgroundColor: isDark ? "rgba(0,0,0,0.40)" : "rgba(0,0,0,0.22)" },
          ]}
        />

        <View style={styles.heroTopRow}>
          <TouchableOpacity
            style={styles.heroIconBtn}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.heroIconBtn} onPress={toggleMenu} activeOpacity={0.85}>
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <View
            style={[
              styles.floatingCard,
              {
                backgroundColor: isDark ? "#0F172A" : "#111827",
                borderColor: isDark ? "#1F2937" : "#0B1220",
              },
            ]}
          >
            <View style={styles.floatingIcon}>
              <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.floatingTitle}>جاهز لإرسال بلاغ؟</Text>
              <Text style={styles.floatingText}>
                حدّد الجهة المناسبة، ثم اختر الموقع، وأرفق صورة/فيديو، واكتب وصفًا واضحًا.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>الجهات المتاحة</Text>
            <Text style={[styles.sectionHint, { color: colors.subText }]}>
              {depsLoading ? "جاري تحميل الجهات..." : "اختر جهة لفتح نموذج البلاغ"}
            </Text>
          </View>

          {depsLoading ? (
            <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator />
              <Text style={[styles.loadingText, { color: colors.subText }]}>تحميل الجهات...</Text>
            </View>
          ) : null}

          {showRetry ? (
            <View style={[styles.retryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.retryTitle, { color: colors.text }]}>تعذر تحميل الجهات</Text>
                <Text style={[styles.retrySub, { color: colors.subText }]}>
                  {depsError ? depsError : "لم تصل بيانات من السيرفر."}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={loadDeps}
                activeOpacity={0.9}
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.retryBtnText}>إعادة</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.cards}>
            {departments.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: d.departmentId ? 1 : 0.75 },
                ]}
                onPress={() => goReport(d)}
                activeOpacity={0.9}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconChip, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                    <Ionicons name={d.icon} size={20} color={colors.text} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{d.title}</Text>
                    <Text style={[styles.cardDesc, { color: colors.subText }]} numberOfLines={2}>
                      {d.desc}
                    </Text>

                    <View style={styles.cardBottom}>
                      <View
                        style={[
                          styles.pill,
                          {
                            backgroundColor: isDark ? "#0B1B3A" : "#EEF2FF",
                            borderColor: isDark ? "#17305E" : "#DDE5FF",
                          },
                        ]}
                      >
                        <Text style={[styles.pillText, { color: colors.primary }]}>
                          {d.departmentId ? "فتح البلاغ" : "غير مرتبط"}
                        </Text>
                      </View>

                      <Ionicons name="chevron-back" size={20} color={colors.subText} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 18 }} />
        </View>
      </ScrollView>

      {menuOpen && (
        <>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
          <Pressable style={styles.backdrop} onPress={closeMenu} />

          <Animated.View
            style={[
              styles.panel,
              {
                transform: [{ translateX: panelTranslateX }],
                backgroundColor: colors.card,
                borderLeftColor: colors.border,
              },
            ]}
          >
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>القائمة</Text>
              <TouchableOpacity
                onPress={closeMenu}
                style={[styles.closeBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: isDark ? "#111827" : "#F1F2F6" }]}
              onPress={() => {
                closeMenu();
                navigation.navigate("MyReports");
              }}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconChip, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.text} />
                </View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>بلاغاتي</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={colors.subText} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: isDark ? "#111827" : "#F1F2F6" }]}
              onPress={() => {
                closeMenu();
                navigation.navigate("EmergencyNumbers");
              }}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconChip, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="call-outline" size={18} color={colors.text} />
                </View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>أرقام مهمة</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={colors.subText} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: isDark ? "#111827" : "#F1F2F6" }]}
              onPress={() => {
                closeMenu();
                navigation.navigate("Profile");
              }}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconChip, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={18} color={colors.text} />
                </View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>ملفي الشخصي</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={colors.subText} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: isDark ? "#111827" : "#F1F2F6" }]}
              onPress={() => {
                closeMenu();
                navigation.navigate("Settings");
              }}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconChip, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Ionicons name="settings-outline" size={18} color={colors.text} />
                </View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>الإعدادات</Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={colors.subText} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <View style={styles.menuFooter}>
              <TouchableOpacity
                style={[styles.logoutBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}
                onPress={logout}
                activeOpacity={0.9}
              >
                <Ionicons name="log-out-outline" size={18} color="#B00020" />
                <Text style={styles.logoutText}>تسجيل الخروج</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 18 },
  hero: { width: "100%", justifyContent: "flex-start" },
  heroImg: { width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject },

  heroTopRow: {
    paddingTop: Platform.OS === "ios" ? 52 : 32,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    position: "absolute",
    top: -6,
    left: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },

  body: { paddingHorizontal: 16 },

  floatingCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  floatingIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingTitle: { color: "#ffffff", fontWeight: "900", fontSize: 15 },
  floatingText: { marginTop: 4, color: "rgba(255,255,255,0.85)", fontWeight: "700", lineHeight: 18, fontSize: 12.5 },

  sectionHead: { marginTop: 14, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "900" },
  sectionHint: { marginTop: 4, fontSize: 12, fontWeight: "700" },

  loadingBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  loadingText: { fontWeight: "800" },

  retryBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  retryTitle: { fontWeight: "900", fontSize: 14 },
  retrySub: { marginTop: 4, fontWeight: "700", fontSize: 12.5, lineHeight: 18 },
  retryBtn: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  retryBtnText: { color: "#fff", fontWeight: "900" },

  cards: { gap: 12 },
  card: { borderRadius: 18, padding: 14, borderWidth: 1 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconChip: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15.5, fontWeight: "900" },
  cardDesc: { marginTop: 6, fontSize: 12.5, fontWeight: "700", lineHeight: 18 },
  cardBottom: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  pillText: { fontWeight: "900", fontSize: 12.5 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", zIndex: 10 },
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 11 },

  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: MENU_W,
    borderLeftWidth: 1,
    zIndex: 12,
    paddingTop: 54,
    paddingHorizontal: 14,
  },

  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  panelTitle: { fontSize: 16, fontWeight: "900" },
  closeBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  menuIconChip: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  menuItemText: { fontSize: 14.5, fontWeight: "900" },

  menuFooter: { paddingBottom: 18 },
  logoutBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  logoutText: { fontWeight: "900", color: "#B00020" },
 });