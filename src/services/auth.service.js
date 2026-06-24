import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

export const authService = {
  async signup(payload) {
    const r = await api.post("/auth/signup", payload, false);
    await AsyncStorage.setItem("token", r.token);
    await AsyncStorage.setItem("isLoggedIn", "1");
    await AsyncStorage.setItem("userRole", r.user.role);
    await AsyncStorage.setItem("userId", String(r.user.userId));
    return r;
  },

  async login(payload) {
    const r = await api.post("/auth/login", payload, false);
    await AsyncStorage.setItem("token", r.token);
    await AsyncStorage.setItem("isLoggedIn", "1");
    await AsyncStorage.setItem("userRole", r.user.role);
    await AsyncStorage.setItem("userId", String(r.user.userId));
    return r;
  },

  async logout() {
    await AsyncStorage.multiRemove(["token", "isLoggedIn", "userRole", "userId"]);
  },
};
