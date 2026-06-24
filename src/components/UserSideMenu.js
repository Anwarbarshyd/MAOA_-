import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";

export default function UserSideMenu({ visible, onClose, onGo }) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.panel}>
        <Text style={styles.title}>القائمة</Text>
       
        <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate("Profile"); }}>
          <Text style={styles.menuItemText}> ملفي الشخصي</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => onGo("MyReports")}>
          <Text style={styles.itemText}> بلاغاتي</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => onGo("EmergencyNumbers")}>
          <Text style={styles.itemText}> أرقام مهمة</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate("Settings"); }}>
          <Text style={styles.menuItemText}> الإعدادات</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>


        <TouchableOpacity style={[styles.item, styles.logout]} onPress={() => onGo("Logout")}>
          <Text style={[styles.itemText, { color: "#b00020" }]}> تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "78%",
    backgroundColor: "#fff",
    paddingTop: 48,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: "#E3E6EA",
  },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 16 },
  item: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F2F4" },
  itemText: { fontSize: 16, fontWeight: "700", color: "#111" },
  logout: { marginTop: 10 },
});
