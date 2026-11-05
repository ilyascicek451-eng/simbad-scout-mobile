import React, { useState } from "react";
import { View } from "react-native";
import { api, seg } from "../api";
import type { Dict, Locale } from "../i18n";
import { Alert, Badge, Button, Card, Field, H1, Loading, P, s } from "../ui";
import { useApi } from "../useApi";
import { friendlyError } from "../errors";

type Session = { id: string; device: string; created_at: string; current: boolean };
type Activity = { action: string; at: string; device: string | null };

const when = (iso: string) => `${iso.replace("T", " ").slice(0, 16)} UTC`;

/** Same features as the web "Güvenlik" card: sessions, remote sign-out, password change, activity. */
export function SecurityScreen({ t, onSignedOut }: { t: Dict; locale: Locale; onSignedOut: () => void }) {
  const sessions = useApi<Session[]>("/v1/me/sessions");
  const activity = useApi<Activity[]>("/v1/me/security-activity?limit=15");
  const [message, setMessage] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const device = (d: string) => ({ "Unknown device": t.sec_unknownDevice, "Server / script": t.sec_script,
    "SİMBAD Android app": t.sec_app } as Record<string, string>)[d] ?? d;
  const events: Record<string, string> = {
    "auth.login_succeeded": t.sec_ev_login, "auth.login_failed": t.sec_ev_failed, "auth.login_blocked_locked": t.sec_ev_blocked,
    "auth.account_locked": t.sec_ev_locked, "auth.logout": t.sec_ev_logout, "auth.logout_all": t.sec_ev_logoutAll,
    "auth.session_revoked": t.sec_ev_revoked, "auth.sessions_revoked_others": t.sec_ev_revokedOthers,
    "auth.password_changed": t.sec_ev_pwChanged, "auth.password_change_failed": t.sec_ev_pwFailed,
  };

  async function revoke(session: Session) {
    const r = await api(`/v1/me/sessions/${seg(session.id)}/revoke`, { method: "POST" });
    if (r.ok && session.current) { onSignedOut(); return; }
    setMessage(r.ok ? t.sec_signedOut : friendlyError(t, r.status));
    sessions.reload(); activity.reload();
  }
  async function revokeOthers() {
    const r = await api("/v1/me/sessions/revoke-others", { method: "POST" });
    setMessage(r.ok ? t.sec_signedOut : friendlyError(t, r.status));
    sessions.reload(); activity.reload();
  }
  async function changePassword() {
    const r = await api("/v1/me/password", { method: "POST", body: { current_password: current, new_password: next } });
    setMessage(r.ok ? t.sec_pwChanged : r.status === 403 ? t.sec_pwWrong : r.status === 422 ? t.passwordRules
      : r.status === 429 ? t.tooMany : t.apiDown);
    if (r.ok) { setCurrent(""); setNext(""); sessions.reload(); }
    activity.reload();
  }

  const failed = activity.result?.ok && activity.result.data.some(a => a.action === "auth.login_failed" || a.action === "auth.account_locked");
  return (
    <View style={{ gap: 12 }}>
      <H1>{t.sec_title}</H1>
      {message ? <Alert text={message} /> : null}
      <Card title={t.sec_sessions}>
        {!sessions.result ? <Loading text={t.loading} /> : !sessions.result.ok ? <Alert text={t.apiDown} /> : <>
          {sessions.result.data.map(x => (
            <View key={x.id} style={{ gap: 4, paddingVertical: 6 }}>
              <View style={s.row}><P>{device(x.device)}</P>{x.current ? <Badge tone="good" text={t.sec_thisDevice} /> : null}</View>
              <P small muted>{t.sec_since}: {when(x.created_at)}</P>
              <Button variant="secondary" title={x.current ? t.logout : t.sec_signOutDevice} onPress={() => revoke(x)} />
            </View>))}
          {sessions.result.data.length > 1 ? <Button variant="secondary" title={t.sec_signOutOthers} onPress={revokeOthers} /> : null}
        </>}
      </Card>
      <Card title={t.sec_changePassword}>
        <Field label={t.sec_currentPassword} value={current} onChange={setCurrent} secure autoComplete="password" />
        <Field label={`${t.sec_newPassword} (12+)`} value={next} onChange={setNext} secure autoComplete="new-password" />
        <P small muted>{t.passwordRules} {t.sec_pwOthersOut}</P>
        <Button title={t.sec_changePassword} onPress={changePassword} disabled={!current || next.length < 12} />
      </Card>
      <Card title={t.sec_activity}>
        {failed ? <Alert text={t.sec_failedHint} /> : null}
        {!activity.result ? <Loading text={t.loading} /> : !activity.result.ok ? <Alert text={t.apiDown} /> :
          activity.result.data.length === 0 ? <P muted>{t.none}</P> : activity.result.data.map((a, i) => (
            <View key={i} style={{ paddingVertical: 4 }}>
              <P small>{events[a.action] ?? a.action}{a.device ? ` · ${device(a.device)}` : ""}</P>
              <P small muted>{when(a.at)}</P>
            </View>))}
      </Card>
    </View>
  );
}
