import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TopBackBar({ title, onBack, colors, rightSlot = null }) {
  return (
    <View style={[styles.topBar, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onBack}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-forward" size={20} color={colors.text} />
        <Text style={[styles.backText, { color: colors.text }]}>رجوع</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>

      {/* مساحة يمين ثابتة عشان العنوان يكون بالنص */}
      <View style={styles.rightBox}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 14 : 12,
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
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "900" },
  rightBox: { width: 90, alignItems: "flex-end" },
});
