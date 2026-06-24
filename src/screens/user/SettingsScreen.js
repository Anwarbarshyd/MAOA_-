import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { useThemeApp } from "../../theme/ThemeContext";

const NOTIF_KEY = "settings_notifications"; // "1" | "0"

function AuthTopBar({ title, colors, }) {
  return (
    <View style={[styles.topBar, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
     

      <Text style={[styles.pageTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>

     
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const { mode, setMode, colors, ready: themeReady } = useThemeApp();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const savedNotif = await AsyncStorage.getItem(NOTIF_KEY);
        if (savedNotif === "0") setNotificationsEnabled(false);
        if (savedNotif === "1") setNotificationsEnabled(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleNotifications = async (val) => {
    setNotificationsEnabled(val);
    await AsyncStorage.setItem(NOTIF_KEY, val ? "1" : "0");
  };

  const toggleDarkMode = async (val) => {
    await setMode(val ? "dark" : "light");
  };

  if (!themeReady || loading) return null;

  const isDark = mode === "dark";

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
     
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>الإعدادات</Text>
          <Text style={[styles.sub, { color: colors.subText }]}>تحكم بالمظهر والإشعارات</Text>

          {/* الإشعارات */}
          <SectionHeader icon="notifications-outline" title="الإشعارات" colors={colors} />
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>تشغيل الإشعارات</Text>

            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? "#E5E7EB" : "#FFFFFF"}
            />
          </View>

          {/* الوضع الداكن */}
          <SectionHeader icon="moon-outline" title="المظهر" colors={colors} />
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>داكن</Text>

            <Switch
              value={mode === "dark"}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? "#E5E7EB" : "#FFFFFF"}
            />
          </View>

          <SectionHeader icon="shield-checkmark-outline" title="الأمان" colors={colors} />

          <TouchableOpacity
            style={[styles.itemRow, { borderBottomColor: "transparent" }]}
            onPress={() => navigation.navigate("Security")}
            activeOpacity={0.85}
          >
            <View style={[styles.itemIcon, { backgroundColor: colors.soft, borderColor: colors.border }]}>
              <Ionicons name="key-outline" size={18} color={colors.text} />
            </View>
            <Text style={[styles.itemText, { color: colors.text }]}>الأمان</Text>
            <Ionicons name="chevron-back" size={18} color={colors.subText} />
          </TouchableOpacity>

         
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ icon, title, colors }) {
  return (
    <View style={styles.sectionHead}>
      <View style={[styles.iconBox, { backgroundColor: colors.soft, borderColor: colors.border }]}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

 
  topBar: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  backText: { fontWeight: "900" },
  pageTitle: { fontSize: 16, fontWeight: "900" },

  content: { padding: 16, paddingBottom: 22 },

  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },

  title: { fontSize: 18, fontWeight: "900" },
  sub: { marginTop: 4, fontSize: 12.5, fontWeight: "700", marginBottom: 14 },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 10 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 14.5, fontWeight: "900" },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  toggleLabel: { fontSize: 13.5, fontWeight: "800" },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { flex: 1, fontSize: 13.8, fontWeight: "900" },

  footerHint: { marginTop: 14, fontSize: 11.5, fontWeight: "700", textAlign: "center" },
});
