// API client. The bearer token is stored with expo-secure-store (Android Keystore-backed),
// never in AsyncStorage or EXPO_PUBLIC_* variables.
import * as SecureStore from "expo-secure-store";
import { resolveApiUrl, type ApiConfig } from "./config";

const TOKEN_KEY = "simbad_session";
const SERVER_KEY = "simbad_api_url";
// Built-in address (EXPO_PUBLIC_API_URL) wins; otherwise the user enters one on the sign-in screen,
// e.g. the address printed by the "Live test environment" workflow. https only outside dev builds.
const BUILT_IN = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, __DEV__);
export let API: ApiConfig = BUILT_IN;
export const serverIsBuiltIn = () => BUILT_IN.url !== null;

export async function loadServerUrl(): Promise<ApiConfig> {
  if (BUILT_IN.url) return (API = BUILT_IN);
  const stored = await SecureStore.getItemAsync(SERVER_KEY);
  API = resolveApiUrl(stored ?? undefined, __DEV__);
  return API;
}

/** Validates, then checks the address really is a SİMBAD SCOUT API (GET /health) before saving it. */
export async function setServerUrl(raw: string): Promise<ApiConfig> {
  const candidate = resolveApiUrl(raw, __DEV__);
  if (!candidate.url) return candidate;
  try {
    const r = await fetch(candidate.url + "/health");
    const body = r.ok ? await r.json() : null;
    if (!body || body.status !== "ok") return { url: null, problem: "unreachable" };
  } catch {
    return { url: null, problem: "unreachable" };
  }
  await SecureStore.setItemAsync(SERVER_KEY, candidate.url);
  API = candidate;
  return API;
}

export async function clearServerUrl(): Promise<void> {
  await SecureStore.deleteItemAsync(SERVER_KEY);
  API = BUILT_IN;
}

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string };

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const saveToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const deleteToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean; headers?: Record<string, string> } = {}): Promise<ApiResult<T>> {
  if (!API.url) return { ok: false, status: 0, error: API.problem ?? "missing" };
  const headers: Record<string, string> = { ...(init.headers ?? {}), Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(API.url + path, { method: init.method ?? "GET", headers, signal: controller.signal,
      body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    const text = await response.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) {
      const detail = data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail : `HTTP ${response.status}`;
      return { ok: false, status: response.status, error: detail };
    }
    return { ok: true, status: response.status, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "api_unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export const seg = encodeURIComponent;
