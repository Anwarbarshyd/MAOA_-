import { StyleSheet } from "react-native";

export const makeAuthStyles = (colors, isDark) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, paddingBottom: 22 },

    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      padding: 16,
    },

    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },

    iconBtn: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      borderWidth: 1,
      borderColor: colors.border,
    },

    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    sub: { marginTop: 6, fontSize: 12.5, fontWeight: "700", color: colors.subText, lineHeight: 18 },

    hero: {
      marginTop: 10,
      borderRadius: 22,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },

    heroOverlay: {
      padding: 16,
      backgroundColor: isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)",
    },

    heroTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
    heroTag: { marginTop: 6, color: "rgba(255,255,255,0.9)", fontSize: 12.5, fontWeight: "800" },
    heroHint: { marginTop: 8, color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700", lineHeight: 18 },

    btnPrimary: {
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    btnPrimaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },

    btnGhost: {
      marginTop: 10,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnGhostText: { color: colors.text, fontWeight: "900", fontSize: 15 },

    input: {
      marginTop: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontWeight: "800",
    },

    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
    link: { color: colors.primary, fontWeight: "900" },

    helper: { marginTop: 10, color: colors.subText, fontWeight: "700", textAlign: "center" },
  });
