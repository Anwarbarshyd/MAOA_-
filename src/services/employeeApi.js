// src/services/employeeApi.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, API_ORIGIN } from "./api";

const SESSION_KEY = "local_session_v1";

async function getToken() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return "";
  try {
    const s = JSON.parse(raw);
    return s?.token || "";
  } catch {
    return "";
  }
}

async function request(path, options = {}) {
  const token = await getToken();

  const { res, data } = await apiFetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const msg = data?.message || data?.raw || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export const employeeApi = {
  stats: () => request("/employee/stats"),

  reports: (status = "") =>
    request(`/employee/reports${status ? `?status=${encodeURIComponent(status)}` : ""}`),

  reportDetails: (id) => request(`/employee/reports/${id}`),

  // ✅ فقط status (الـ employeeId يجي من التوكن داخل السيرفر)
  updateStatus: (id, status) =>
    request(`/employee/reports/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  origin: API_ORIGIN,
};