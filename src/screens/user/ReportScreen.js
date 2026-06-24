// src/screens/user/ReportScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import { useThemeApp } from "../../theme/ThemeContext";
import { API_BASE_URL } from "../../services/api";

const PROFILE_KEY = "local_user_profile";
const SESSION_KEY = "local_session_v1";

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 25;

function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

function isApiReady() {
  return typeof API_BASE_URL === "string" && API_BASE_URL.trim().startsWith("http");
}

function pickUserId(profile, session) {
  return (
    profile?.userId ||
    profile?.id ||
    profile?.Id ||
    profile?.UserId ||
    profile?.user?.id ||
    profile?.user?.Id ||
    session?.userId ||
    session?.id ||
    session?.Id ||
    session?.UserId ||
    session?.user?.id ||
    session?.user?.Id ||
    null
  );
}


async function uploadMediaToServer({ uri, type }, token) {
  if (!isApiReady()) throw new Error("API_BASE_URL غير مضبوط");

  const form = new FormData();

  const ext = type === "video" ? "mp4" : "jpg";
  const mime = type === "video" ? "video/mp4" : "image/jpeg";

  form.append("file", {
    uri,
    name: `upload_${Date.now()}.${ext}`,
    type: mime,
  });

  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: "POST",
    headers: {
     
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
    },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Upload failed");

 
  return data;
}
 
export default function ReportScreen({ navigation, route }) {
  const { colors, mode } = useThemeApp();
  const isDark = mode === "dark";

  const params = route?.params || {};
  const departmentId = params.departmentId;
  const departmentName = params.departmentName;

  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [mediaLocal, setMediaLocal] = useState(null); // { uri, type, sizeBytes }

  const title = useMemo(() => departmentName || "إرسال بلاغ", [departmentName]);

  useEffect(() => {
    navigation?.setOptions?.({ title, headerShown: true });
  }, [navigation, title]);

  useEffect(() => {
    const getCurrentLocation = async () => {
      if (Platform.OS === "web") return;

      setLocLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("الموقع", "فعّل إذن الموقع عشان نحدد موقع البلاغ.");
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setCoords({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      } catch {
        Alert.alert("تنبيه", "ما قدرنا نجيب موقعك الحالي.");
      } finally {
        setLocLoading(false);
      }
    };

    getCurrentLocation();
  }, []);

  const pickMedia = async (wantedType) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("المرفقات", "لازم تسمح للتطبيق بالوصول للصور/الفيديو.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          wantedType === "image"
            ? ImagePicker.MediaTypeOptions.Images
            : ImagePicker.MediaTypeOptions.Videos,
        quality: wantedType === "image" ? 0.8 : undefined,
        allowsEditing: wantedType === "image",
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const pickedType = asset.type; // "image" | "video"
      if (wantedType !== pickedType) {
        Alert.alert("تنبيه", wantedType === "image" ? "اختر صورة فقط." : "اختر فيديو فقط.");
        return;
      }

      const sizeBytes = asset.fileSize ?? null;
      if (sizeBytes != null) {
        const mb = bytesToMB(sizeBytes);
        if (pickedType === "image" && mb > MAX_IMAGE_MB) {
          Alert.alert("تنبيه", `حجم الصورة لازم يكون أقل من ${MAX_IMAGE_MB}MB.`);
          return;
        }
        if (pickedType === "video" && mb > MAX_VIDEO_MB) {
          Alert.alert("تنبيه", `حجم الفيديو لازم يكون أقل من ${MAX_VIDEO_MB}MB.`);
          return;
        }
      }

      setMediaLocal({ uri: asset.uri, type: pickedType, sizeBytes });
    } catch {
      Alert.alert("تنبيه", "صار خطأ أثناء اختيار الملف.");
    }
  };

  const validate = () => {
    if (!isApiReady()) return "API_BASE_URL غير مضبوط.";
    if (!departmentId) return "الجهة غير محددة (departmentId ناقص).";
    if (!coords) return "ما قدرنا نحدد موقعك. جرّب مرة ثانية.";
    if (!description.trim()) return "اكتب وصف البلاغ (مطلوب).";
    return null;
  };

  const onSubmit = async () => {
    const error = validate();
    if (error) return Alert.alert("تنبيه", error);

    setLoading(true);
    try {
      const profileStr = await AsyncStorage.getItem(PROFILE_KEY);
      const profile = profileStr ? JSON.parse(profileStr) : null;

      const sessionStr = await AsyncStorage.getItem(SESSION_KEY);
      const session = sessionStr ? JSON.parse(sessionStr) : null;

      const userId = pickUserId(profile, session);
      if (!userId) {
        Alert.alert("تنبيه", "UserId غير موجود. سجّل دخول من جديد.");
        return;
      }

      const token = session?.token || null;

      // 1) ارفع الميديا إن وجدت
      let mediaPayload = [];
      if (mediaLocal?.uri) {
        const uploaded = await uploadMediaToServer(
          { uri: mediaLocal.uri, type: mediaLocal.type },
          token
        );

        const finalType = uploaded?.type || mediaLocal.type;
        const finalUrl = uploaded?.fileUrl;

        if (!finalUrl) throw new Error("الرفع تم لكن ما رجع fileUrl من السيرفر.");

        
        mediaPayload = [
          {
            type: finalType,
            fileUrl: finalUrl,
            Type: finalType,
            FileUrl: finalUrl,
          },
        ];
      }

      // 2) أنشئ البلاغ
      const payload = {
        userId,
        departmentId,
        description: description.trim(),

        //  نرسل الاثنين لتفادي اختلافات الباك-إند
        lat: coords.latitude,
        lng: coords.longitude,
       
        media: mediaPayload,
        Media: mediaPayload,
      };

      const res = await fetch(`${API_BASE_URL}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return Alert.alert("تنبيه", data?.message || "تعذر إرسال البلاغ");
      }

      Alert.alert("تم الإرسال", "تم إرسال البلاغ بنجاح ", [
        { text: "تمام", onPress: () => navigation.navigate?.("MyReports") },
      ]);

      setDescription("");
      setMediaLocal(null);
    } catch (e) {
      Alert.alert("خطأ", e?.message || "فشل الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const initialRegion = coords
    ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 24.7136,
        longitude: 46.6753,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

  const updateLocation = async () => {
    if (Platform.OS === "web") return;

    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("الموقع", "فعّل إذن الموقع عشان نحدد موقع البلاغ.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch {
      Alert.alert("خطأ", "ما قدرنا نحدّث موقعك.");
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.banner, { backgroundColor: isDark ? "#0F172A" : "#111827" }]}>
          <View style={styles.bannerIcon}>
            <Ionicons name="location-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>الموقع</Text>
            <Text style={styles.bannerText}>
              تأكد أن نقطة البلاغ في المكان الصحيح، وتقدر تغيّرها بالضغط على الخريطة.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>موقع البلاغ على الخريطة</Text>

        {Platform.OS === "web" ? (
          <View style={[styles.mapFallback, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="globe-outline" size={22} color={colors.text} />
            <Text style={[styles.mapFallbackText, { color: colors.subText }]}>الخريطة غير مدعومة على الويب.</Text>
          </View>
        ) : locLoading ? (
          <View style={[styles.mapLoading, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator />
            <Text style={[styles.mapLoadingText, { color: colors.subText }]}>جاري تحديد موقعك...</Text>
          </View>
        ) : (
          <View style={[styles.mapWrap, { borderColor: colors.border }]}>
            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              onPress={(e) => setCoords(e.nativeEvent.coordinate)}
              showsUserLocation
              showsMyLocationButton
            >
              {coords ? <Marker coordinate={coords} /> : null}
            </MapView>
          </View>
        )}

        <View style={styles.helperRow}>
          <View style={[styles.iconPillSmall, { backgroundColor: colors.soft, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.text} />
          </View>
          <Text style={[styles.helper, { color: colors.subText }]}>
            لتغيير الموقع: اضغط على الخريطة لاختيار نقطة جديدة.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>وصف البلاغ</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textArea, { color: colors.text }]}
            placeholder="اكتب وصفًا واضحًا للمشكلة (500 حرف كحد أقصى)"
            placeholderTextColor={colors.subText}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={[styles.counter, { color: colors.subText }]}>{description.length}/500</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>المرفقات</Text>

        <View style={styles.mediaRow}>
          <TouchableOpacity
            style={[
              styles.mediaIconBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              mediaLocal?.type === "image" && {
                borderColor: colors.primary,
                backgroundColor: isDark ? "#0B1B3A" : "#EEF2FF",
              },
            ]}
            onPress={() => pickMedia("image")}
            activeOpacity={0.9}
          >
            <Ionicons name="camera-outline" size={22} color={colors.text} />
            <Text style={[styles.mediaLabel, { color: colors.text }]}>صورة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mediaIconBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              mediaLocal?.type === "video" && {
                borderColor: colors.primary,
                backgroundColor: isDark ? "#0B1B3A" : "#EEF2FF",
              },
            ]}
            onPress={() => pickMedia("video")}
            activeOpacity={0.9}
          >
            <Ionicons name="videocam-outline" size={22} color={colors.text} />
            <Text style={[styles.mediaLabel, { color: colors.text }]}>فيديو</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mediaIconBtn, { flex: 1.2, backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={updateLocation}
            activeOpacity={0.9}
          >
            <Ionicons name="locate-outline" size={22} color={colors.text} />
            <Text style={[styles.mediaLabel, { color: colors.text }]}>تحديث الموقع</Text>
          </TouchableOpacity>
        </View>

        {mediaLocal ? (
          <View style={[styles.previewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.previewHead}>
              <View style={[styles.iconPillSmall, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                <Ionicons
                  name={mediaLocal.type === "image" ? "image-outline" : "videocam-outline"}
                  size={18}
                  color={colors.text}
                />
              </View>
              <Text style={[styles.previewTitle, { color: colors.text }]}>
                {mediaLocal.type === "image" ? "تم اختيار صورة" : "تم اختيار فيديو"}
              </Text>
            </View>

            {mediaLocal.type === "image" ? (
              <Image source={{ uri: mediaLocal.uri }} style={styles.previewImage} />
            ) : (
              <View style={[styles.videoPlaceholder, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                <Ionicons name="videocam-outline" size={22} color={colors.text} />
                <Text style={[styles.videoPlaceholderText, { color: colors.subText }]}>
                  فيديو محدد  (المعاينة نضيفها لاحقًا)
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.removeBtn, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}
              onPress={() => setMediaLocal(null)}
              activeOpacity={0.9}
            >
              <Ionicons name="trash-outline" size={18} color="#B00020" />
              <Text style={styles.removeBtnText}>حذف المرفق</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.9 : 1 }]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>إرسال البلاغ</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 10 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },

  banner: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  bannerText: { color: "rgba(255,255,255,0.82)", marginTop: 2, fontWeight: "700", fontSize: 12.5, lineHeight: 18 },

  sectionLabel: { marginTop: 10, marginBottom: 8, fontSize: 14, fontWeight: "900" },

  mapWrap: { borderRadius: 18, overflow: "hidden", borderWidth: 1 },
  map: { height: 230 },

  mapFallback: {
    height: 230,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  mapFallbackText: { textAlign: "center", fontWeight: "800" },

  mapLoading: {
    height: 230,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mapLoadingText: { fontWeight: "800" },

  helperRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  iconPillSmall: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  helper: { fontSize: 12.5, fontWeight: "700" },

  inputWrap: { borderWidth: 1, borderRadius: 18, padding: 12 },
  textArea: { minHeight: 120, fontSize: 14, fontWeight: "700" },
  counter: { textAlign: "right", marginTop: 8, fontSize: 12, fontWeight: "700" },

  mediaRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  mediaIconBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mediaLabel: { fontSize: 12.5, fontWeight: "900" },

  previewBox: { marginTop: 12, borderWidth: 1, borderRadius: 18, padding: 12 },
  previewHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  previewTitle: { fontSize: 14, fontWeight: "900" },
  previewImage: { width: "100%", height: 200, borderRadius: 16 },

  videoPlaceholder: {
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  videoPlaceholderText: { textAlign: "center", fontWeight: "800" },

  removeBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  removeBtnText: { fontWeight: "900", color: "#B00020" },

  submitBtn: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});