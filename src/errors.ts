import type { Dict } from "./i18n";

/** Plain-language message for an API status code (code kept in brackets for support). Same rules as the web. */
export function friendlyError(t: Dict, status: number): string {
  const text = status === 0 ? t.apiDown
    : status === 400 ? t.er_400 : status === 401 ? t.er_401 : status === 403 ? t.er_403 : status === 404 ? t.er_404
    : status === 409 ? t.er_409 : status === 413 ? t.er_413 : status === 422 ? t.er_422 : status === 429 ? t.er_429
    : status >= 500 ? t.er_5xx : t.apiDown;
  return status ? `${text} (HTTP ${status})` : text;
}

type JobLike = { status: string; error_code?: string | null; result: { sources?: { outcome: string }[]; observations?: number } | null };

/** What happened to a research job and what to do next — never just a status word. */
export function explainJob(t: Dict, j: JobLike): string | null {
  const outcomes = j.result?.sources ?? [];
  if (j.status === "completed") return t.jx_completed.replace("{n}", String(j.result?.observations ?? 0));
  if (j.status === "blocked" && j.error_code === "budget_exceeded") return t.jx_budget;
  if (j.status === "blocked") return t.jx_noSources;
  if (j.status === "failed" && outcomes.some(o => o.outcome === "rate_limited")) return t.jx_rateLimited;
  if (j.status === "failed" && outcomes.length > 0 && outcomes.every(o => o.outcome === "unsupported_region" || o.outcome === "not_connected"))
    return t.jx_region;
  if (j.status === "failed") return t.jx_failed.replace("{code}", j.error_code ?? "—");
  if (j.status === "pending" || j.status === "running") return t.jx_running;
  return null;
}

/** Tone for a contribution margin: a loss is never shown as good (same rule as the web). */
export function marginTone(pct: string | null | undefined): "rising" | "mixed" | "high" | null {
  if (pct === null || pct === undefined || pct === "") return null;
  const n = Number(pct);
  if (Number.isNaN(n)) return null;
  return n >= 20 ? "rising" : n >= 0 ? "mixed" : "high";
}
