import React, { useState } from "react";
import { View } from "react-native";
import { api, seg } from "../api";
import { label, type Dict, type Locale } from "../i18n";
import type { Org } from "../types";
import { Alert, Badge, Button, Card, Field, H1, Loading, P, s, toneFor } from "../ui";
import { useApi } from "../useApi";
import { friendlyError } from "../errors";

type Msg = { id: string; role: "user" | "assistant"; content: string; action_status: string | null;
  data: { job?: { id: string; status: string } } | null };

const EXAMPLES: Record<Locale, string[]> = {
  tr: ["Bu haftanın en iyi fırsatları hangileri?", "Almanya'da rekabeti düşük çantaları araştır.", "Araştırma görevlerimin durumu ne?"],
  en: ["What are this week's best opportunities?", "Research low-competition bags in Germany.", "What is the status of my research jobs?"],
};

/** Spec §18 assistant. Same API as the web; voice input can later post transcripts with input_mode "voice". */
export function AssistantScreen({ t, locale, org }: { t: Dict; locale: Locale; org: Org }) {
  const path = `/v1/orgs/${seg(org.id)}/assistant/messages`;
  const { result, reload } = useApi<Msg[]>(`${path}?limit=40`);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(text: string) {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const r = await api(path, { method: "POST", body: { message: body.slice(0, 1000), locale, input_mode: "text" } });
    setBusy(false);
    if (!r.ok) { setError(friendlyError(t, r.status)); return; }
    setMessage("");
    reload();
  }
  return (
    <View style={{ gap: 12 }}>
      <H1>{t.assistant}</H1>
      <P muted>{t.asIntro}</P>
      <Card title={t.asExamples}>
        {EXAMPLES[locale].map(example => <Button key={example} variant="secondary" title={example} onPress={() => send(example)} />)}
      </Card>
      {error ? <Alert text={error} /> : null}
      {!result ? <Loading text={t.loading} /> : !result.ok ? <Alert text={t.apiDown} /> : result.data.length === 0
        ? <P muted>{t.asEmpty}</P> : result.data.map(m => (
          <Card key={m.id} title={m.role === "user" ? t.asYou : t.asBot}>
            <P>{m.content}</P>
            {m.role === "assistant" && m.data?.job
              ? <View style={s.row}><Badge tone={toneFor(m.data.job.status)} text={label(locale, m.data.job.status)} /></View> : null}
          </Card>))}
      <Field label={t.asPlaceholder} value={message} onChange={setMessage} />
      <View style={s.row}>
        <Button title={busy ? t.loading : t.asSend} onPress={() => send(message)} />
        <Button variant="secondary" title={t.asRefresh} onPress={reload} />
      </View>
    </View>
  );
}
