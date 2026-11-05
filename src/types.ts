// Same API contract as apps/web/lib/types.ts.
export type Org = { id: string; slug: string; name: string; role: string };
export type Me = { user: { id: string; email: string; display_name: string | null }; organizations: Org[] };
export type Source = { id: string; display_name: string; status: string; notes: string };
export type ScoreCard = { id: string; value: number; confidence: number; status: string; country_code: string; as_of: string;
  demand: string | null; competition: string | null; supply: string | null; contribution_margin_pct: string | null;
  provider_evidence: boolean };
export type Opportunity = { product_id: string; name: string; product_status: string; score: ScoreCard | null };
export type Opportunities = { items: Opportunity[]; total: number; data_status: string };
export type Job = { id: string; query: string; target_country: string | null; status: string; created_at: string;
  finished_at: string | null; queue_status: string | null; error_code?: string | null;
  result: { sources?: { source: string; outcome: string }[]; observations?: number } | null };
export type Score = { id: string; score: number; confidence: number; status: string; country_code: string; as_of: string;
  algorithm_version: string; components: Record<string, { value: number | null; weight: string; reason: string }>; reasons: string[] };
