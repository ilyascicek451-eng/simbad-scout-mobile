// npm test (node --test --experimental-strip-types tests/*.test.ts)
import { test } from "node:test";
import assert from "node:assert/strict";
import { DICTIONARIES, label } from "../src/i18n.ts";
import { resolveApiUrl } from "../src/config.ts";

test("both languages define the same, non-empty keys", () => {
  const keys = Object.keys(DICTIONARIES.tr).sort();
  assert.deepEqual(Object.keys(DICTIONARIES.en).sort(), keys);
  for (const d of Object.values(DICTIONARIES)) for (const v of Object.values(d)) assert.ok(v.trim());
});

test("spec statuses are labelled", () => {
  for (const s of ["discovered", "researching", "needs_verification", "strong_candidate", "commercially_viable", "rejected"])
    for (const l of ["tr", "en"] as const) assert.notEqual(label(l, s), s);
});

test("API URL must be https outside development", () => {
  assert.deepEqual(resolveApiUrl(undefined, false), { url: null, problem: "missing" });
  assert.deepEqual(resolveApiUrl(" https://api.example.com/ ", false), { url: "https://api.example.com", problem: null });
  assert.deepEqual(resolveApiUrl("http://10.0.2.2:8000", false), { url: null, problem: "insecure" });
  assert.deepEqual(resolveApiUrl("http://10.0.2.2:8000", true), { url: "http://10.0.2.2:8000", problem: null });
  assert.deepEqual(resolveApiUrl("ftp://x", true), { url: null, problem: "insecure" });
});

test("server address entered on the sign-in screen follows the same https rule", () => {
  assert.equal(resolveApiUrl("https://abc-def.example.org/", false).url, "https://abc-def.example.org");
  assert.equal(resolveApiUrl("http://abc-def.example.org", false).problem, "insecure");
  assert.equal(resolveApiUrl("   ", false).problem, "missing");
});

test("errors and research results are explained in plain words", async () => {
  const { friendlyError, explainJob } = await import("../src/errors.ts");
  const t = DICTIONARIES.tr;
  assert.equal(friendlyError(t, 0), t.apiDown);
  assert.ok(friendlyError(t, 429).startsWith(t.er_429));
  assert.ok(friendlyError(t, 503).includes("HTTP 503"));
  assert.equal(explainJob(t, { status: "blocked", error_code: "no_connected_sources", result: null }), t.jx_noSources);
  assert.equal(explainJob(t, { status: "failed", result: { sources: [{ outcome: "rate_limited" }] } }), t.jx_rateLimited);
  assert.ok(explainJob(t, { status: "completed", result: { observations: 7 } })!.includes("7"));
});

test("a loss is never shown as a good margin", async () => {
  const { marginTone } = await import("../src/errors.ts");
  assert.equal(marginTone("-12.5"), "high");
  assert.equal(marginTone("8"), "mixed");
  assert.equal(marginTone("25"), "rising");
  assert.equal(marginTone(null), null);
});
