// App.js
import React from "react";
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
} from "@react-navigation/native";
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper";

import RootStack from "./src/navigation/RootStack";
import { ThemeProvider, useThemeApp } from "./src/theme/ThemeContext";



function AppInner() {
  const { mode, colors, ready } = useThemeApp();
  if (!ready) return null;

  const isDark = mode === "dark";

  const basePaper = isDark ? MD3DarkTheme : MD3LightTheme;
  const paperTheme = {
    ...basePaper,
    colors: {
      ...basePaper.colors,
      background: colors.bg,
      surface: colors.card,
      onSurface: colors.text,
      onBackground: colors.text,
      primary: colors.primary,
      outline: colors.border,
      outlineVariant: colors.border,
      surfaceVariant: colors.soft,
    },
  };

  const baseNav = isDark ? NavDarkTheme : NavDefaultTheme;
  const navTheme = {
    ...baseNav,
    colors: {
      ...baseNav.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: "#EF4444",
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navTheme}>
        <RootStack />
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App(){
  return (
    <ThemeProvider>
      <AppInner/>
    </ThemeProvider>


  );

}


