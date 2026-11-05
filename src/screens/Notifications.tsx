import React from "react";
import { View } from "react-native";
import { api, seg } from "../api";
import { fill, type Dict, type Locale } from "../i18n";
import type { Org } from "../types";
import { Alert, Badge, Button, Card, H1, Loading, P, s } from "../ui";
import { useApi } from "../useApi";

type Note = { id: string; topic: string; params: Record<string, unknown>; created_at: string; read_at: string | null };
type List = { items: Note[]; unread: number; push: { configured: boolean } };

/** Spec §15 in-app history. Android push (and its runtime permission prompt) is added with Firebase. */
export function NotificationsScreen({ t, org }: { t: Dict; locale: Locale; org: Org }) {
  const base = `/v1/orgs/${seg(org.id)}/notifications`;
  const { result, reload } = useApi<List>(`${base}?limit=100`);
  async function markAll() {
    await api(`${base}/read`, { method: "POST", body: { all: true } });
    reload();
  }
  if (!result) return <Loading text={t.loading} />;
  if (!result.ok) return <Alert text={t.apiDown} />;
  const text = (n: Note) => {
    const key = `nt_${n.topic}` as keyof Dict;
    return key in t ? fill(t[key], n.params) : n.topic;
  };
  return (
    <View style={{ gap: 12 }}>
      <H1>{t.notifications}</H1>
      {!result.data.push.configured ? <P small muted>{t.ntPushOff}</P> : null}
      <P>{result.data.unread} {t.ntUnread}</P>
      {result.data.unread > 0 ? <Button variant="secondary" title={t.ntMarkAll} onPress={markAll} /> : null}
      {result.data.items.length === 0 ? <P muted>{t.none}</P> : result.data.items.map(n => (
        <Card key={n.id} title={text(n)}>
          <View style={s.row}>
            <Badge tone={n.read_at ? "neutral" : "warn"} text={n.read_at ? "✓" : t.ntUnread} />
            <P small muted>{n.created_at.replace("T", " ").slice(0, 16)} UTC</P>
          </View>
        </Card>))}
    </View>
  );
}
