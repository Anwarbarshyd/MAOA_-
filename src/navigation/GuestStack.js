import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useThemeApp } from "../theme/ThemeContext";

export default function GuestStack({ navigation }) {
  const { colors } = useThemeApp();

  const navTo = (rootName, screenName) => {
    // navigate to a nested stack screen
    navigation.navigate(rootName, screenName ? { screen: screenName } : undefined);
  };

  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: colors.bg }]}> 
      <Text style={[styles.title, { color: colors.text }]}>تصفح التطبيق كزائر</Text>

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navTo("User", "Home")}>
        <Text style={[styles.btnText, { color: colors.text }]}>صفحات المستخدم</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navTo("User", "EmergencyNumbers")}>
        <Text style={[styles.btnText, { color: colors.text }]}>أرقام الطوارئ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navTo("User", "Report")}>
        <Text style={[styles.btnText, { color: colors.text }]}>إرسال بلاغ (عرض)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navTo("Manager", "ManagerDashboard")}>
        <Text style={[styles.btnText, { color: colors.text }]}>لوحة المدير (عرض)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navTo("Employee", "EmployeeHome")}>
        <Text style={[styles.btnText, { color: colors.text }]}>لوحة الموظف (عرض)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navTo("Admin", "AdminDashboard")}>
        <Text style={[styles.btnText, { color: colors.text }]}>لوحة المدير العام (عرض)</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "900", marginVertical: 12 },
  btn: {
    width: "100%",
    maxWidth: 520,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { fontWeight: "900" },
});
