import React, { useCallback, useEffect, useState } from "react";
import { BackHandler, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { API, api, clearServerUrl, deleteToken, getToken, loadServerUrl, serverIsBuiltIn } from "./src/api";
import { DICTIONARIES, type Locale } from "./src/i18n";
import type { Me, Org } from "./src/types";
import { Alert, C, Loading, P } from "./src/ui";
import { AssistantScreen } from "./src/screens/Assistant";
import { AuthScreen } from "./src/screens/Auth";
import { ServerScreen } from "./src/screens/Server";
import { SecurityScreen } from "./src/screens/Security";
import { NotificationsScreen } from "./src/screens/Notifications";
import { BillingScreen } from "./src/screens/Billing";
import { CompetitorsScreen, HomeScreen, MarketScreen, OpportunitiesScreen, ProductScreen, ReportsScreen, SettingsScreen,
  StoreScreen, SuppliersScreen } from "./src/screens/Main";

type Route = { screen: string; params: Record<string, string> };
const MENU = ["home", "assistant", "opportunities", "market", "competitors", "suppliers", "reports", "store", "notifications", "settings"] as const;

export default function App() {
  const [locale, setLocale] = useState<Locale>("tr");
  const t = DICTIONARIES[locale];
  const [me, setMe] = useState<Me | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [checking, setChecking] = useState(true);
  const [history, setHistory] = useState<Route[]>([{ screen: "home", params: {} }]);
  const route = history[history.length - 1];

  const [, setServerVersion] = useState(0);
  const loadMe = useCallback(async () => {
    setChecking(true);
    await loadServerUrl();
    setServerVersion(v => v + 1);
    if (!API.url || !(await getToken())) { setMe(null); setChecking(false); return; }
    const r = await api<Me>("/v1/me");
    if (r.ok) { setMe(r.data); setOrg(o => r.data.organizations.find(x => x.id === o?.id) ?? r.data.organizations[0] ?? null); }
    else { if (r.status === 401) await deleteToken(); setMe(null); }
    setChecking(false);
  }, []);
  useEffect(() => { loadMe(); }, [loadMe]);

  const nav = useCallback((screen: string, params: Record<string, string> = {}) => {
    setHistory(h => (MENU as readonly string[]).includes(screen) ? [{ screen, params }] : [...h, { screen, params }]);
  }, []);

  // Android hardware back button walks the in-app history before leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (history.length > 1) { setHistory(h => h.slice(0, -1)); return true; }
      return false;
    });
    return () => sub.remove();
  }, [history.length]);

  async function logout() {
    await api("/v1/auth/logout", { method: "POST" });
    await deleteToken();
    setMe(null);
    setHistory([{ screen: "home", params: {} }]);
  }

  async function changeServer() {
    await api("/v1/auth/logout", { method: "POST" });
    await deleteToken();
    await clearServerUrl();
    setMe(null);
    setHistory([{ screen: "home", params: {} }]);
    loadMe();
  }

  async function accountDeleted() {
    await deleteToken();
    setMe(null);
    setHistory([{ screen: "home", params: {} }]);
  }

  let body: React.ReactNode;
  if (checking) body = <Loading text={t.loading} />;
  else if (!API.url) body = API.problem === "insecure" && serverIsBuiltIn()
    ? <Alert text={t.insecureApi} /> : <ServerScreen t={t} onSaved={loadMe} />;
  else if (!me || !org) body = <AuthScreen t={t} onSignedIn={loadMe} />;
  else {
    const props = { t, locale, org, nav };
    const screens: Record<string, React.ReactNode> = {
      home: <HomeScreen {...props} />, assistant: <AssistantScreen t={t} locale={locale} org={org} />, opportunities: <OpportunitiesScreen {...props} />, market: <MarketScreen {...props} />,
      competitors: <CompetitorsScreen {...props} />, suppliers: <SuppliersScreen {...props} params={route.params} />,
      reports: <ReportsScreen {...props} />, store: <StoreScreen {...props} />,
      notifications: <NotificationsScreen t={t} locale={locale} org={org} />,
      settings: <SettingsScreen t={t} me={me} org={org} locale={locale} onLocale={setLocale} onOrg={setOrg} onLogout={logout} onDeleted={accountDeleted} nav={nav} />,
      billing: <BillingScreen t={t} org={org} />,
      security: <SecurityScreen t={t} locale={locale} onSignedOut={accountDeleted} />,
      product: <ProductScreen {...props} params={route.params} />,
    };
    body = screens[route.screen] ?? screens.home;
  }

  const signedIn = !!me && !!org && !!API.url;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      {signedIn ? (
        <ScrollView horizontal accessibilityRole="tablist" style={{ flexGrow: 0, borderBottomWidth: 1, borderColor: C.line }}
          contentContainerStyle={{ gap: 4, padding: 8 }}>
          {MENU.map(key => {
            const selected = route.screen === key || (key === "opportunities" && route.screen === "product");
            return (
              <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => nav(key)}
                style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 12, borderRadius: 10,
                  backgroundColor: selected ? C.deep : "transparent" }}>
                <Text style={{ color: selected ? C.gold : C.ink, fontWeight: selected ? "700" : "400",
                  textDecorationLine: selected ? "underline" : "none" }}>{t[key]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {signedIn && history.length > 1 ? (
          <Pressable accessibilityRole="button" onPress={() => setHistory(h => h.slice(0, -1))} style={{ minHeight: 48, justifyContent: "center" }}>
            <Text style={{ color: C.gold }}>‹ {t.back}</Text>
          </Pressable>) : null}
        {org && signedIn ? <P small muted>{org.name}</P> : null}
        {body}
        {API.url && !serverIsBuiltIn() ? (
          <Pressable accessibilityRole="button" onPress={changeServer} style={{ minHeight: 48, justifyContent: "center" }}>
            <Text style={{ color: C.gold }}>{t.serverChange} ({API.url.replace("https://", "")})</Text>
          </Pressable>) : null}
        <View style={{ paddingVertical: 12 }}><P small muted>{t.devBuild}</P></View>
      </ScrollView>
    </SafeAreaView>
  );
}
