 import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./api";

const SESSION_KEY = "local_session_v1";
const PROFILE_KEY = "local_user_profile";

async function getSessionAndUserId() {
  const pStr = await AsyncStorage.getItem(PROFILE_KEY);
  const sStr = await AsyncStorage.getItem(SESSION_KEY);

  const profile = pStr ? JSON.parse(pStr) : null;
  const session = sStr ? JSON.parse(sStr) : null;

  const userId =
    profile?.userId ||
    profile?.UserId ||
    profile?.id ||
    profile?.Id ||
    session?.userId ||          
    session?.UserId ||
    session?.user?.userId ||
    session?.user?.UserId ||
    session?.user?.id ||
    session?.user?.Id ||
    null;

  const token = session?.token || null;

  return { userId, token };
}

async function apiGet(url, token) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}
async function apiPatch(url, token) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

async function apiDelete(url, token) {
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

export async function getNotifications() {
  const { userId, token } = await getSessionAndUserId();
  if (!userId) return [];
  const url = `${API_BASE_URL}/notifications/my/${userId}`;
  const list = await apiGet(url, token);
  return Array.isArray(list) ? list : [];
}

export async function markRead(id) {
  const { token } = await getSessionAndUserId();
  await apiPatch(`${API_BASE_URL}/notifications/${id}/read`, token);
  return await getNotifications();
}

export async function markAllRead() {
  const { userId, token } = await getSessionAndUserId();
  if (!userId) return [];
  await apiPatch(`${API_BASE_URL}/notifications/my/${userId}/read-all`, token);
  return await getNotifications();
}

export async function removeNotification(id) {
  const { token } = await getSessionAndUserId();
  // لو ما تبغى delete endpoint احذف هذي السطر وخليها ترجع getNotifications فقط
  await apiDelete(`${API_BASE_URL}/notifications/${id}`, token);
  return await getNotifications();
}

export async function clearNotifications() {
  const { userId, token } = await getSessionAndUserId();
  if (!userId) return [];
  // لو ما تبغى delete endpoint احذف هذي السطر وخليها ترجع []
  await apiDelete(`${API_BASE_URL}/notifications/my/${userId}`, token);
  return await getNotifications();
}