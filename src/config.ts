// API base URL validation. Pure (no React Native imports) so it can be unit-tested.
export type ApiConfig = { url: string | null; problem: "missing" | "insecure" | "unreachable" | null };

export function resolveApiUrl(raw: string | undefined, isDev: boolean): ApiConfig {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) return { url: null, problem: "missing" };
  if (value.startsWith("https://")) return { url: value, problem: null };
  if (value.startsWith("http://") && isDev) return { url: value, problem: null };
  return { url: null, problem: "insecure" };
}
