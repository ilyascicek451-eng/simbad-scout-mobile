import React, { useState } from "react";
import { View } from "react-native";
import { setServerUrl } from "../api";
import type { Dict } from "../i18n";
import { Alert, Button, Card, Field, H1, P } from "../ui";

/** Shown when the build has no built-in API address: the tester pastes the live test environment URL. */
export function ServerScreen({ t, onSaved }: { t: Dict; onSaved: () => void }) {
  const [url, setUrl] = useState("https://");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const r = await setServerUrl(url);
    setBusy(false);
    if (r.url) { onSaved(); return; }
    setProblem(r.problem === "insecure" ? t.insecureApi : t.serverBad);
  }
  return (
    <View style={{ gap: 16 }}>
      <H1>{t.appName}</H1>
      <Card title={t.server}>
        <P muted>{t.serverHint}</P>
        {problem ? <Alert text={problem} /> : null}
        <Field label={t.server} value={url} onChange={setUrl} keyboard="url" autoComplete="off" />
        <Button title={busy ? t.loading : t.serverSave} onPress={save} disabled={busy} />
      </Card>
    </View>
  );
}
