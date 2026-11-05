import React, { useState } from "react";
import { View } from "react-native";
import { api, seg } from "../api";
import { fill, label, type Dict, type Locale } from "../i18n";
import type { Job, Me, Opportunities, Opportunity, Org, Score, Source } from "../types";
import { Alert, Badge, Button, Card, Field, H1, Loading, P, s, toneFor } from "../ui";
import { useApi } from "../useApi";
import { explainJob, friendlyError, marginTone } from "../errors";
import { toCountryCode } from "../country";

export type Nav = (screen: string, params?: Record<string, string>) => void;
type Props = { t: Dict; locale: Locale; org: Org; nav: Nav };

function OpportunityCard({ item, t, locale, nav, onWatch }: { item: Opportunity; t: Dict; locale: Locale; nav: Nav; onWatch?: () => void }) {
  const sc = item.score;
  const rows: [string, string | null | undefined, string][] = [
    [t.demand, sc?.demand, sc ? label(locale, sc.demand) : t.notScored],
    [t.competition, sc?.competition, sc ? label(locale, sc.competition) : t.notScored],
    [t.supply, sc?.supply, sc ? (sc.supply ? label(locale, sc.supply) : t.unknown) : t.notScored],
    [t.profit, marginTone(sc?.contribution_margin_pct), sc ? (sc.contribution_margin_pct ? `%${sc.contribution_margin_pct}` : t.computing) : t.notScored],
    [t.status, item.product_status, label(locale, item.product_status)],
  ];
  return (
    <Card title={item.name}>
      {sc ? <P small muted>{t.score}: {sc.value}/100 · {t.confidence}: {sc.confidence}/100 · {sc.country_code}</P> : null}
      {rows.map(([name, tone, text]) => (
        <View key={name} style={s.row}><P small>{name}:</P><Badge tone={toneFor(tone)} text={text} /></View>
      ))}
      <View style={s.row}>
        <Button title={t.viewAnalysis} onPress={() => nav("product", { id: item.product_id, name: item.name })} />
        <Button variant="secondary" title={t.findSuppliers} onPress={() => nav("suppliers", { product: item.product_id })} />
        {onWatch && item.product_status === "discovered" ? <Button variant="secondary" title={t.watch} onPress={onWatch} /> : null}
      </View>
    </Card>
  );
}

type Step = { key: string; done: boolean; title: string; hint: string; to?: string };

/** First-run checklist from real account data; hidden once every step is done. */
function GettingStarted({ t, nav, steps }: { t: Dict; nav: Nav; steps: Step[] }) {
  const done = steps.filter(x => x.done).length;
  if (done === steps.length) return null;
  const next = steps.find(x => !x.done);
  return (
    <Card title={`${t.gs_title} · ${fill(t.gs_progress, { done, total: steps.length })}`}>
      {steps.map((x, i) => (
        <View key={x.key} accessible accessibilityLabel={`${i + 1}. ${x.title}${x.done ? ` — ${t.gs_done}` : ""}`}
          style={{ gap: 4, paddingVertical: 4 }}>
          <P>{x.done ? "✓" : `${i + 1}.`} {x.title}</P>
          {!x.done ? <P small muted>{x.hint}</P> : null}
          {!x.done && x === next && x.to ? <Button title={x.title} onPress={() => nav(x.to!)} /> : null}
        </View>))}
    </Card>
  );
}

export function HomeScreen({ t, locale, org, nav }: Props) {
  const base = `/v1/orgs/${seg(org.id)}`;
  const opps = useApi<Opportunities>(`${base}/opportunities?limit=50`);
  const jobs = useApi<Job[]>(`${base}/research-jobs?limit=1`);
  const sources = useApi<Source[]>("/v1/sources");
  const products = useApi<unknown[]>(`${base}/products?limit=1`);
  const reports = useApi<unknown[]>(`${base}/reports`);
  if (!opps.result || !jobs.result || !sources.result) return <Loading text={t.loading} />;
  const items = opps.result.ok ? opps.result.data.items.filter(i => i.score) : [];
  const today = new Date().toISOString().slice(0, 10);
  const srcs = sources.result.ok ? sources.result.data : [];
  const connected = srcs.filter(x => x.status !== "not_connected");
  const last = jobs.result.ok ? jobs.result.data[0] : undefined;
  return (
    <View style={{ gap: 12 }}>
      <H1>{t.home}</H1>
      {products.result?.ok && reports.result?.ok && jobs.result.ok && sources.result.ok ? (
        <GettingStarted t={t} nav={nav} steps={[
          { key: "source", done: connected.length > 0, title: t.gs_source, hint: t.gs_source_hint },
          { key: "product", done: products.result.data.length > 0, title: t.gs_product, hint: t.gs_product_hint, to: "assistant" },
          { key: "research", done: Boolean(last), title: t.gs_research, hint: t.gs_research_hint, to: "market" },
          { key: "report", done: reports.result.data.length > 0, title: t.gs_report, hint: t.gs_report_hint, to: "reports" },
        ]} />) : null}
      <Card title={t.alerts}>
        {!opps.result.ok || !jobs.result.ok || !sources.result.ok ? <Alert text={t.apiDown} /> : null}
        {sources.result.ok && connected.length === 0 ? <Alert text={t.noSources} /> : null}
        {opps.result.ok && opps.result.data.data_status === "user_supplied_only" ? <Alert text={t.userOnly} /> : null}
        {items.length === 0 ? <P muted>{t.noScores}</P> : null}
      </Card>
      <Card title={t.todayNew}><P>{items.filter(i => i.score!.as_of.slice(0, 10) === today).length}</P></Card>
      <Card title={t.lastResearch}>
        {last ? <><P>{(last.finished_at ?? last.created_at).replace("T", " ").slice(0, 16)} UTC</P>
          <Badge tone={toneFor(last.status)} text={label(locale, last.status)} /></> : <P muted>{t.never}</P>}
      </Card>
      <Card title={t.top3}>{items.length ? null : <P muted>{t.none}</P>}</Card>
      {items.slice(0, 3).map(i => <OpportunityCard key={i.product_id} item={i} t={t} locale={locale} nav={nav} />)}
      <Card title={`${t.sources} (${connected.length}/${srcs.length})`}>
        {srcs.map(x => <View key={x.id} style={{ gap: 2 }}><P>{x.display_name}</P>
          <Badge tone={x.status === "not_connected" ? "bad" : "warn"} text={label(locale, x.status)} /></View>)}
      </Card>
    </View>
  );
}

export function OpportunitiesScreen({ t, locale, org, nav }: Props) {
  const base = `/v1/orgs/${seg(org.id)}`;
  const { result, reload } = useApi<Opportunities>(`${base}/opportunities?limit=100`);
  const [error, setError] = useState<string | null>(null);
  async function watch(id: string) {
    const r = await api(`${base}/products/${seg(id)}/status`, { method: "PATCH",
      body: { status: "researching", reason: "Watched from the Android app" } });
    if (!r.ok) setError(friendlyError(t, r.status)); else reload();
  }
  if (!result) return <Loading text={t.loading} />;
  return (
    <View style={{ gap: 12 }}>
      <H1>{t.opportunities}</H1>
      {error ? <Alert text={error} /> : null}
      {!result.ok ? <Alert text={t.apiDown} /> : result.data.items.length === 0 ? <P muted>{t.noScores}</P> :
        result.data.items.map(i => <OpportunityCard key={i.product_id} item={i} t={t} locale={locale} nav={nav} onWatch={() => watch(i.product_id)} />)}
    </View>
  );
}

export function MarketScreen({ t, locale, org }: Props) {
  const base = `/v1/orgs/${seg(org.id)}`;
  const { result, reload } = useApi<Job[]>(`${base}/research-jobs?limit=30`);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("TR");
  const [message, setMessage] = useState<string | null>(null);
  async function start() {
    const c = toCountryCode(country);
    if (!c) { setMessage(t.jx_region); return; }
    const r = await api<Job>(`${base}/research-jobs`, { method: "POST",
      body: { query: query.trim(), target_country: c } });
    setMessage(r.ok ? (r.data.queue_status === "queued" ? t.queued : t.queueNotConfigured) : friendlyError(t, r.status));
    if (r.ok) { setQuery(""); reload(); }
  }
  async function retry(id: string) {
    const r = await api<Job>(`${base}/research-jobs/${seg(id)}/retry`, { method: "POST" });
    setMessage(r.ok ? (r.data.queue_status === "queued" ? t.queued : t.queueNotConfigured) : r.status === 429 ? t.jx_quota : friendlyError(t, r.status));
    reload();
  }
  return (
    <View style={{ gap: 12 }}>
      <H1>{t.market}</H1>
      {message ? <Alert text={message} /> : null}
      <Card title={t.newJob}>
        <Field label={t.query} value={query} onChange={setQuery} />
        <Field label={t.country} value={country} onChange={setCountry} />
        <Button title={t.start} onPress={start} disabled={query.trim().length < 3} />
      </Card>
      {!result ? <Loading text={t.loading} /> : !result.ok ? <Alert text={t.apiDown} /> : result.data.map(j => (
        <Card key={j.id} title={j.query}>
          <View style={s.row}><P small>{j.target_country ?? "—"}</P><Badge tone={toneFor(j.status)} text={label(locale, j.status)} /></View>
          {explainJob(t, j) ? <P small>{explainJob(t, j)}</P> : null}
          <P small muted>{(j.result?.sources ?? []).map(x => `${x.source}: ${label(locale, x.outcome)}`).join(", ") || "—"}</P>
          {["failed", "blocked", "cancelled"].includes(j.status) && org.role !== "viewer"
            ? <Button variant="secondary" title={t.jx_retry} onPress={() => retry(j.id)} /> : null}
        </Card>))}
    </View>
  );
}

type Named = { id: string; name: string; country_code: string | null; platform: string | null };

function ListScreen({ t, title, path }: { t: Dict; title: string; path: string }) {
  const { result } = useApi<Named[]>(path);
  return (
    <View style={{ gap: 12 }}>
      <H1>{title}</H1>
      {!result ? <Loading text={t.loading} /> : !result.ok ? <Alert text={t.apiDown} /> : result.data.length === 0 ? <P muted>{t.none}</P> :
        result.data.map(x => <Card key={x.id} title={x.name}><P small muted>{[x.platform, x.country_code].filter(Boolean).join(" · ") || "—"}</P></Card>)}
    </View>
  );
}

export function CompetitorsScreen({ t, org }: Props) {
  return <ListScreen t={t} title={t.competitors} path={`/v1/orgs/${seg(org.id)}/competitors`} />;
}

type Comparison = { offers: { offer_id: string; status: string; landed_unit_cost: string | null; currency: string; flags: string[] }[]; note: string };

export function SuppliersScreen({ t, locale, org, params }: Props & { params: Record<string, string> }) {
  const base = `/v1/orgs/${seg(org.id)}`;
  const comparison = useApi<Comparison>(params.product ? `${base}/products/${seg(params.product)}/supplier-comparison?country=US&currency=USD` : null);
  return (
    <View style={{ gap: 12 }}>
      {params.product ? (
        <Card title="US · USD">
          {!comparison.result ? <Loading text={t.loading} /> : !comparison.result.ok ? <Alert text={t.apiDown} /> :
            comparison.result.data.offers.length === 0 ? <P muted>{t.none}</P> : comparison.result.data.offers.map(o => (
              <View key={o.offer_id} style={{ gap: 2 }}>
                <Badge tone={toneFor(o.status)} text={label(locale, o.status)} />
                <P small>{o.landed_unit_cost ? `${o.landed_unit_cost} ${o.currency}` : t.unknown}</P>
                {o.flags.length ? <P small muted>{o.flags.join(", ")}</P> : null}
              </View>))}
          {comparison.result?.ok ? <P small muted>{comparison.result.data.note}</P> : null}
        </Card>) : null}
      <ListScreen t={t} title={t.suppliers} path={`${base}/suppliers`} />
    </View>
  );
}

type Perf = { evaluated: number; true_positive: number; false_positive: number; false_negative: number; true_negative: number;
  precision: number | null; sample_sufficient: boolean };

export function ReportsScreen({ t, org }: Props) {
  const base = `/v1/orgs/${seg(org.id)}/recommendation-performance?horizon=`;
  const h30 = useApi<Perf>(`${base}30`), h60 = useApi<Perf>(`${base}60`), h90 = useApi<Perf>(`${base}90`);
  return (
    <View style={{ gap: 12 }}>
      <H1>{t.reports}</H1>
      <P muted>{t.reportsIntro}</P>
      <P small muted>{t.rp_explain}</P>
      {([[30, h30], [60, h60], [90, h90]] as const).map(([days, h]) => (
        <Card key={days} title={t.rp_after.replace("{n}", String(days))}>
          {!h.result ? <Loading text={t.loading} /> : !h.result.ok ? <Alert text={friendlyError(t, h.result.status)} />
            : h.result.data.evaluated === 0 ? <P muted>{t.rp_none}</P> : <>
            <P>{h.result.data.precision === null ? "—" : `%${Math.round(h.result.data.precision * 100)}`} · {t.rp_precision}</P>
            <P small>{t.rp_tp}: {h.result.data.true_positive}</P>
            <P small>{t.rp_fp}: {h.result.data.false_positive}</P>
            <P small>{t.rp_fn}: {h.result.data.false_negative}</P>
            <P small>{t.rp_tn}: {h.result.data.true_negative}</P>
            <P small muted>{t.evaluated}: {h.result.data.evaluated}</P>
            {!h.result.data.sample_sufficient ? <P small muted>{t.insufficientSample}</P> : null}</>}
        </Card>))}
    </View>
  );
}

export function StoreScreen({ t, locale }: Props) {
  const { result } = useApi<Source[]>("/v1/sources");
  const shopify = result?.ok ? result.data.find(x => x.id === "shopify") : undefined;
  return (
    <View style={{ gap: 12 }}>
      <H1>{t.store}</H1>
      <Card title="Shopify"><P>{t.storeIntro}</P><Badge tone="bad" text={label(locale, shopify?.status ?? "not_connected")} /></Card>
    </View>
  );
}

export function SettingsScreen({ t, me, org, locale, onLocale, onOrg, onLogout, onDeleted, nav }: {
  t: Dict; me: Me; org: Org; locale: Locale; onLocale: (l: Locale) => void; onOrg: (o: Org) => void; onLogout: () => void;
  onDeleted: () => void; nav: Nav;
}) {
  return (
    <View style={{ gap: 12 }}>
      <H1>{t.settings}</H1>
      <Card title={t.account}>
        <P>{me.user.email}</P>
        {me.organizations.map(o => (
          <Button key={o.id} variant={o.id === org.id ? "primary" : "secondary"} title={`${o.name} · ${o.role}`} onPress={() => onOrg(o)} />))}
      </Card>
      <Card title={t.sec_title}>
        <P small muted>{t.sec_intro}</P>
        <Button title={t.sec_open} onPress={() => nav("security")} />
      </Card>
      <Card title={t.billing}>
        <P small muted>{t.bl_intro}</P>
        <Button title={t.bl_open} onPress={() => nav("billing")} />
      </Card>
      <Card title={t.language}>
        <View style={s.row}>
          <Button variant={locale === "tr" ? "primary" : "secondary"} title="Türkçe" onPress={() => onLocale("tr")} />
          <Button variant={locale === "en" ? "primary" : "secondary"} title="English" onPress={() => onLocale("en")} />
        </View>
        <P small muted>{t.fontHint}</P>
      </Card>
      <DeleteAccount t={t} onDeleted={onDeleted} />
      <Button variant="secondary" title={t.logout} onPress={onLogout} />
    </View>
  );
}

function DeleteAccount({ t, onDeleted }: { t: Dict; onDeleted: () => void }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  async function confirm() {
    const r = await api("/v1/me/delete", { method: "POST", body: { password } });
    if (r.ok) { setPassword(""); onDeleted(); return; }
    setMessage(r.status === 409 ? t.transferFirst : r.status === 403 ? t.loginFailed : t.apiDown);
  }
  return (
    <Card title={t.deleteAccount}>
      <P small>{t.deleteWarning}</P>
      <P small muted>{t.exportHint}</P>
      {message ? <Alert text={message} /> : null}
      <Field label={t.password} value={password} onChange={setPassword} secure autoComplete="password" />
      <Button variant="secondary" title={t.deleteAccount} onPress={confirm} disabled={!password}
        hint={t.deleteWarning} />
    </Card>
  );
}

export function ProductScreen({ t, locale, org, params }: Props & { params: Record<string, string> }) {
  const base = `/v1/orgs/${seg(org.id)}/products/${seg(params.id)}`;
  const scores = useApi<Score[]>(`${base}/scores`);
  const [message, setMessage] = useState<string | null>(null);
  async function scoreNow() {
    const r = await api(`${base}/scores`, { method: "POST", body: { country: "US" } });
    setMessage(r.ok ? null : friendlyError(t, r.status));
    scores.reload();
  }
  const latest = scores.result?.ok ? scores.result.data[0] : undefined;
  return (
    <View style={{ gap: 12 }}>
      <H1>{params.name ?? ""}</H1>
      {message ? <Alert text={message} /> : null}
      <Button title={`${t.scoreNow} (US)`} onPress={scoreNow} />
      {!scores.result ? <Loading text={t.loading} /> : !latest ? <P muted>{t.notScored}</P> : (
        <Card title={`${t.score}: ${latest.score}/100 · ${latest.country_code}`}>
          <P small>{t.confidence}: {latest.confidence}/100 · {latest.algorithm_version}</P>
          <Badge tone={toneFor(latest.status)} text={label(locale, latest.status)} />
          {Object.entries(latest.components).map(([k, c]) => (
            <P key={k} small>{k} ({Math.round(Number(c.weight) * 100)}%): {c.value ?? "—"} — {c.reason}</P>))}
          <P small muted>{t.disclaimer}</P>
        </Card>)}
    </View>
  );
}
