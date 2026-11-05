import React, { useState } from "react";
import { View } from "react-native";
import { api, seg } from "../api";
import { friendlyError } from "../errors";
import { fill, type Dict } from "../i18n";
import type { Org } from "../types";
import { Alert, Badge, Button, Card, Field, H1, Loading, P, s } from "../ui";
import { useApi } from "../useApi";

type Limits = { max_jobs_per_day: number; max_schedules: number; ai_max_requests_per_day: number; max_store_connections: number };
type PlanInfo = { plan: string; limits: Limits; prices: { interval: string; currency: string; amount: string }[] };
type Plans = { test_mode: boolean; plans: PlanInfo[] };
type Subscription = { plan: string; status: string; current_period_end: string; cancel_at_period_end: boolean; test_mode: boolean };
type OrgBilling = { plan: string; test_mode: boolean; subscription: Subscription | null };

const newKey = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Spec §21 — the same subscription API as the web Settings page, TEST MODE ONLY (no money moves, no card). */
export function BillingScreen({ t, org }: { t: Dict; org: Org }) {
  const base = `/v1/orgs/${seg(org.id)}/billing`;
  const current = useApi<OrgBilling>(base);
  const plans = useApi<Plans>("/v1/billing/plans");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const isOwner = org.role === "owner";
  const planName = (p: string) => (t[`bl_plan_${p}` as keyof Dict] as string | undefined) ?? p;

  async function buy(plan: string) {
    setBusy(true); setMessage(null);
    const key = newKey();
    const r = await api<{ checkout: { id: string } }>(`${base}/checkout`, { method: "POST", body: { plan },
      headers: { "Idempotency-Key": key } });
    if (r.ok) {
      const done = await api<{ outcome: string }>(`${base}/test/complete`, { method: "POST",
        body: { checkout_id: r.data.checkout.id, outcome: "success" } });
      setMessage(done.ok ? fill(t.bl_bought, { plan: planName(plan) }) : friendlyError(t, done.status));
    } else setMessage(friendlyError(t, r.status));
    setBusy(false);
    current.reload();
  }

  async function cancel() {
    setBusy(true); setMessage(null);
    const r = await api(`${base}/cancel`, { method: "POST", body: { confirm_password: password } });
    setPassword("");
    setMessage(r.ok ? t.bl_cancelAt : r.status === 403 ? t.bl_wrongPassword : friendlyError(t, r.status));
    setBusy(false);
    current.reload();
  }

  async function resume() {
    setBusy(true); setMessage(null);
    const r = await api(`${base}/resume`, { method: "POST" });
    if (!r.ok) setMessage(friendlyError(t, r.status));
    setBusy(false);
    current.reload();
  }

  if (!current.result || !plans.result) return <Loading text={t.loading} />;
  if (!current.result.ok || !plans.result.ok) return <Alert text={t.apiDown} />;
  const sub = current.result.data.subscription;
  const active = !!sub && (sub.status === "active" || sub.status === "past_due");
  const currentPlan = current.result.data.plan;

  return (
    <View style={{ gap: 12 }}>
      <H1>{t.billing}</H1>
      {plans.result.data.test_mode ? <Alert text={t.bl_testMode} /> : null}
      <P small muted>{t.bl_playNote}</P>
      {message ? <Alert text={message} /> : null}
      <Card title={t.bl_current}>
        <P>{planName(currentPlan)}</P>
        {sub ? (
          <View style={s.row}>
            <Badge tone={sub.status === "active" ? "good" : "warn"} text={sub.status} />
            <P small muted>{t.bl_until}: {sub.current_period_end.slice(0, 10)}</P>
            {sub.cancel_at_period_end ? <Badge tone="warn" text={t.bl_cancelAt} /> : null}
          </View>) : null}
        {isOwner && sub && active && !sub.cancel_at_period_end ? (
          <View style={{ gap: 8 }}>
            <Field label={t.bl_confirmPassword} value={password} onChange={setPassword} secure autoComplete="password" />
            <Button variant="secondary" title={t.bl_cancel} onPress={cancel} disabled={busy || !password} />
          </View>) : null}
        {isOwner && sub && active && sub.cancel_at_period_end ? (
          <Button variant="secondary" title={t.bl_resume} onPress={resume} disabled={busy} />) : null}
      </Card>
      {!isOwner ? <P muted>{t.bl_ownerOnly}</P> : null}
      {plans.result.data.plans.map(p => {
        const price = p.prices.find(x => x.interval === "month" && x.currency === "USD");
        const isCurrent = currentPlan === p.plan;
        return (
          <Card key={p.plan} title={planName(p.plan)}>
            <P small>{fill(t.bl_limits, { jobs: p.limits.max_jobs_per_day, schedules: p.limits.max_schedules,
              ai: p.limits.ai_max_requests_per_day, stores: p.limits.max_store_connections })}</P>
            {p.plan === "free" ? <P small muted>{t.bl_freeNote}</P>
              : <P>{price ? fill(t.bl_price, { amount: price.amount }) : t.bl_noPrice}</P>}
            {isCurrent ? <Badge tone="good" text={t.bl_isCurrent} /> : null}
            {isOwner && p.plan !== "free" && price && !isCurrent ? (
              <Button title={busy ? t.loading : t.bl_buy} onPress={() => buy(p.plan)} disabled={busy}
                hint={t.bl_testMode} />) : null}
          </Card>
        );
      })}
    </View>
  );
}
