import React, { useState } from "react";
import { View } from "react-native";
import { api, saveToken } from "../api";
import type { Dict } from "../i18n";
import { Alert, Button, Card, Field, H1, P } from "../ui";
import { friendlyError } from "../errors";

export function AuthScreen({ t, onSignedIn }: { t: Dict; onSignedIn: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage(null);
    if (mode === "register") {
      const r = await api("/v1/auth/register", { method: "POST", auth: false,
        body: { email: email.trim(), password, organization_name: org.trim() } });
      setBusy(false);
      if (r.ok) { setMode("login"); setMessage(t.registered); }
      else setMessage(r.status === 429 ? t.tooMany : r.status === 0 ? t.apiDown : r.status === 422 ? t.passwordRules : friendlyError(t, r.status));
      return;
    }
    const r = await api<{ access_token: string }>("/v1/auth/login", { method: "POST", auth: false,
      body: { email: email.trim(), password, otp: otp.trim() || undefined } });
    setBusy(false);
    if (!r.ok) {
      setMessage(r.status === 429 ? t.tooMany : r.status === 0 ? t.apiDown : r.error === "mfa_required" ? t.mfaRequired
        : r.error === "mfa_invalid" ? t.mfaInvalid : r.error === "email_not_verified" ? t.notVerified : t.loginFailed);
      return;
    }
    await saveToken(r.data.access_token);
    setPassword("");
    setOtp("");
    onSignedIn();
  }

  return (
    <View style={{ gap: 16 }}>
      <H1>{t.appName}</H1>
      <P muted>{t.tagline}</P>
      {message ? <Alert text={message} /> : null}
      <Card title={mode === "login" ? t.login : t.register}>
        <Field label={t.email} value={email} onChange={setEmail} keyboard="email-address" autoComplete="email" />
        <Field label={t.password} value={password} onChange={setPassword} secure
          autoComplete={mode === "login" ? "password" : "new-password"} />
        {mode === "register" ? <P small muted>{t.passwordRules}</P> : null}
        {mode === "login" ? <>
          <Field label={t.otpLabel} value={otp} onChange={setOtp} autoComplete="off" />
          <P small muted>{t.otpHint}</P>
        </> : null}
        {mode === "register" ? <Field label={t.organization} value={org} onChange={setOrg} /> : null}
        <Button title={mode === "login" ? t.login : t.register} onPress={submit} disabled={busy} />
        <Button variant="secondary" title={mode === "login" ? t.register : t.login}
          onPress={() => { setMode(mode === "login" ? "register" : "login"); setMessage(null); }} />
      </Card>
    </View>
  );
}
