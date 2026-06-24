// src/screens/user/NotificationsScreen.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import { useThemeApp } from "../../theme/ThemeContext";

import {
  getNotifications,
  markAllRead,
  markRead,
  removeNotification,
  clearNotifications,
} from "../../services/notificationsStore";

function timeAgoAr(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  return `${d} يوم`;
}

function AuthTopBar({colors, onMarkAll, onClearAll }) {
  return (
    <View style={[styles.topBar, { borderBottomColor: colors.border }]}>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onMarkAll}
          activeOpacity={0.85}
          style={[
            styles.actionBtn,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.text }]}>
            تعليم الكل كمقروء
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClearAll}
          activeOpacity={0.85}
          style={[
            styles.actionBtn,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.text }]}>
            مسح الكل
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { mode, colors } = useThemeApp();
  const isDark = mode === "dark";

  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await getNotifications();
    setItems(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onPressItem = async (n) => {
    if (!n.read) {
      const next = await markRead(n.id);
      setItems(next);
    }

    const target = n.route || "MyReports";
    try {
      navigation.navigate(target, n.params || undefined);
    } catch {
      navigation.navigate("MyReports");
    }
  };

  const onMarkAll = async () => {
    const next = await markAllRead();
    setItems(next);
  };

  const onClearAll = async () => {
    const next = await clearNotifications();
    setItems(next);
  };

  const onDeleteOne = async (id) => {
    const next = await removeNotification(id);
    setItems(next);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <AuthTopBar
        title="الإشعارات"
        colors={colors}
        onBack={() => navigation.goBack()}
        onMarkAll={onMarkAll}
        onClearAll={onClearAll}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#fff" : "#000"}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Ionicons
              name="notifications-off-outline"
              size={26}
              color={colors.subText}
            />
            <Text style={[styles.emptyText, { color: colors.subText }]}>
              لا توجد إشعارات حالياً
            </Text>
          </View>
        ) : (
          items.map((n) => (
            <View
              key={n.id}
              style={[
                styles.item,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: n.read ? 0.75 : 1,
                },
              ]}
            >
              <TouchableOpacity
                style={{ flex: 1}}
                onPress={() => onPressItem(n)}
                activeOpacity={0.85}
              >
                <View style={styles.itemTop}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: n.read ? "transparent" : "#3B82F6",
                        borderColor: colors.border,
                      },
                    ]}
                  />
                  <Text
                    style={[styles.itemTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {n.title}
                  </Text>
                  <Text style={[styles.time, { color: colors.subText }]}>
                    {timeAgoAr(n.createdAt)}
                  </Text>
                </View>

                <Text
                  style={[styles.itemBody, { color: colors.subText }]}
                  numberOfLines={2}
                >
                  {n.body}
                </Text>
              </TouchableOpacity>

              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => onPressItem(n)}
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.smallText, { color: colors.text }]}>
                    فتح
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onDeleteOne(n.id)}
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.smallText, { color: colors.text }]}>
                    حذف
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  
  topBar: {
    paddingHorizontal: 94,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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

  title: { flex: 1, fontSize: 16, fontWeight: "900", textAlign: "center" },

  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: { fontSize: 12.5, fontWeight: "900" },

  content: { padding: 16, paddingBottom: 18 },

  emptyBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  emptyText: { fontSize: 13, fontWeight: "800" },

  item: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    gap: 10,
  },
  itemTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 99, borderWidth: 1 },
  itemTitle: { flex: 1, fontSize: 14.5, fontWeight: "900" },
  time: { fontSize: 12, fontWeight: "800" },
  itemBody: { marginTop: 6, fontSize: 12.5, fontWeight: "700", lineHeight: 18 },
  itemActions: { justifyContent: "space-between", gap: 8 },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  smallText: { fontSize: 12.5, fontWeight: "900" },
});
