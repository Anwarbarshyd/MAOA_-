import * as LocalAuthentication from "expo-local-authentication";

export async function canUseBiometric() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && enrolled;
}

export async function askBiometric() {
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: "تأكيد الهوية",
    fallbackLabel: "استخدم رمز الجهاز",
    cancelLabel: "إلغاء",
    disableDeviceFallback: false,
  });
  return !!res.success;
}