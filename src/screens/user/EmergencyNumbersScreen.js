import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

import { useThemeApp } from "../../theme/ThemeContext";

const numbers = [
  { key: "police", name: "عمليات المحافظ", number: "199", icon: "alert-circle-outline" },
  { key: "police1", name: "عمليات مديرية المكلا-مركز شرطة المكلا", number: "05354610", icon: "shield-checkmark-outline" },
  { key: "police2", name: "عمليات مركز شرطة فوه", number: "05361330", icon: "shield-checkmark-outline" },
  { key: "police3", name: "عمليات مركز شرطة روكب", number: "05361330", icon: "shield-checkmark-outline" },
  { key: "traffic", name: "المرور", number: "993", icon: "car-outline" },
  { key: "municipality", name: "البلدية", number: "940", icon: "business-outline" },
  { key: "sewage", name: "الصرف الصحي", number: "939", icon: "water-outline" },
];

const emergencyT = {
  title: "أرقام مهمة",
  subtitle: "اتصل أو انسخ الرقم بسرعة",
  noteTitle: "ملاحظة",
  noteText: "تأكد أنك في منطقة تغطية جيدة قبل الاتصال.",
  call: "اتصال",
  copy: "نسخ",
  notSupportedTitle: "غير مدعوم",
  notSupportedText: "الاتصال غير مدعوم على هذا الجهاز.",
  copiedTitle: "تم النسخ",
  copiedText: "تم نسخ الرقم: {num}",
};

function AuthTopBar({ title, colors,  }) {
  return (
    <View style={[stylesTop.topBar, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
      
     

      <View style={{ width: 86 }} />
    </View>
  );
}

function IconPill({ name, colors }) {
  return (
    <View style={[styles.iconPill, { backgroundColor: colors.soft, borderColor: colors.border }]}>
      <Ionicons name={name} size={20} color={colors.text} />
    </View>
  );
}

export default function EmergencyNumbersScreen({ navigation }) {
  const { mode, colors } = useThemeApp();
  const isDark = mode === "dark";

  const styles2 = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const callNumber = async (num) => {
    const url = `tel:${num}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(emergencyT.notSupportedTitle, emergencyT.notSupportedText);
      return;
    }
    await Linking.openURL(url);
  };

  const copyNumber = async (num) => {
    await Clipboard.setStringAsync(String(num));
    Alert.alert(emergencyT.copiedTitle, emergencyT.copiedText.replace("{num}", String(num)));
  };

  return (
    <View style={styles2.root}>
    
      {/* Header (نفس اللي عندك بس بدون عنوان لأن العنوان صار في TopBar) */}
      <View style={styles2.header}>
        <View style={styles2.headerCenter}>
          <Text style={styles2.title}>{emergencyT.title}</Text>
          <Text style={styles2.subtitle}>{emergencyT.subtitle}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Banner */}
      <View style={styles2.banner}>
        <View style={styles2.bannerIcon}>
          <Ionicons name="call-outline" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles2.bannerTitle}>{emergencyT.noteTitle}</Text>
          <Text style={styles2.bannerText}>{emergencyT.noteText}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles2.list} showsVerticalScrollIndicator={false}>
        {numbers.map((item) => (
          <View key={item.key} style={styles2.card}>
            <View style={styles2.cardTop}>
              <IconPill name={item.icon} colors={colors} />

              <View style={{ flex: 1 }}>
                <Text style={styles2.name}>{item.name}</Text>
                <Text style={styles2.number}>{item.number}</Text>
              </View>
            </View>

            <View style={[styles2.divider, { backgroundColor: isDark ? "#111827" : "#F1F2F6" }]} />

            <View style={styles2.actionsRow}>
              <TouchableOpacity
                style={[styles2.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => callNumber(item.number)}
                activeOpacity={0.9}
              >
                <Ionicons name="call-outline" size={18} color="#fff" />
                <Text style={styles2.primaryText}>{emergencyT.call}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles2.outlineBtn, { borderColor: colors.primary }]}
                onPress={() => copyNumber(item.number)}
                activeOpacity={0.9}
              >
                <Ionicons name="copy-outline" size={18} color={colors.primary} />
                <Text style={[styles2.outlineText, { color: colors.primary }]}>{emergencyT.copy}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 14 }} />
      </ScrollView>
    </View>
  );
}

const stylesTop = StyleSheet.create({
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
});

const styles = StyleSheet.create({
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

function makeStyles(colors, isDark) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 10 },
    title: { fontSize: 16, fontWeight: "900", color: colors.text },
    subtitle: { marginTop: 3, fontSize: 12, fontWeight: "700", color: colors.subText },

    banner: {
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: isDark ? "#0F172A" : "#111827",
      borderRadius: 18,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    bannerIcon: {
      width: 40,
      height: 40,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    bannerTitle: { color: "#fff", fontWeight: "900", fontSize: 14 },
    bannerText: { color: "rgba(255,255,255,0.82)", marginTop: 2, fontWeight: "700", fontSize: 12.5 },

    list: { padding: 16, paddingBottom: 24 },

    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
      marginBottom: 12,
    },

    cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },

    name: { fontSize: 14.5, fontWeight: "900", color: colors.text },
    number: { marginTop: 6, fontSize: 18, fontWeight: "900", color: colors.primary },

    divider: { height: 1, marginVertical: 12 },

    actionsRow: { flexDirection: "row", gap: 10 },

    primaryBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    primaryText: { color: "#fff", fontWeight: "900" },

    outlineBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    outlineText: { fontWeight: "900" },
  });
}
