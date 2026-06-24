// src/services/managerApi.js
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

export const managerApi = {
  // =========================
  //  Dashboard
  // =========================
  stats: () => request("/manager/stats"),

  // =========================
  //  Reports
  // =========================
  reports: (status = "") =>
    request(`/manager/reports${status ? `?status=${encodeURIComponent(status)}` : ""}`),

  reportDetails: (id) => request(`/manager/reports/${id}`),


  updateStatus: (id, status) =>
    request(`/manager/reports/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // =========================
  // Employees
  // =========================
  employees: () => request("/manager/employees"),

  createEmployee: (payload) =>
    request("/manager/employees", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

 
  disableEmployee: (userId) =>
    request(`/manager/employees/${encodeURIComponent(String(userId))}`, {
      method: "DELETE",
    }),

 
  setEmployeeActive: (userId, isActive /* optional */) =>
    request(`/manager/employees/${encodeURIComponent(String(userId))}/active`, {
      method: "PATCH",
      body: JSON.stringify(
        typeof isActive === "undefined" ? {} : { isActive }
      ),
    }),

  
  updateEmployee: (userId, payload) =>
    request(`/manager/employees/${encodeURIComponent(String(userId))}`, {
      method: "PATCH",
      body: JSON.stringify(payload || {}),
    }),

  
  deleteEmployeeHard: (userId) =>
    request(`/manager/employees/${encodeURIComponent(String(userId))}/hard`, {
      method: "DELETE",
    }),

  origin: API_ORIGIN,
};