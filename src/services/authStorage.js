import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  isLoggedIn: "isLoggedIn",
  userRole: "userRole", // لاحقًا بنستفيد منها للأدوار
};

export async function getAuthState() {
  const isLoggedIn = await AsyncStorage.getItem(KEYS.isLoggedIn);
  const userRole = await AsyncStorage.getItem(KEYS.userRole);
  return { isLoggedIn: isLoggedIn === "true", userRole: userRole || "user" };
}

export async function setLoggedIn(role = "user") {
  await AsyncStorage.setItem(KEYS.isLoggedIn, "true");
  await AsyncStorage.setItem(KEYS.userRole, role);
}

export async function logout() {
  await AsyncStorage.multiRemove([KEYS.isLoggedIn, KEYS.userRole]);
}
