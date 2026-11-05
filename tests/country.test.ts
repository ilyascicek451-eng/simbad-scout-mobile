import { test } from "node:test";
import assert from "node:assert/strict";
import { toCountryCode } from "../src/country.ts";

test("country names and codes become ISO codes", () => {
  assert.equal(toCountryCode("tr"), "TR");
  assert.equal(toCountryCode(" Türkiye "), "TR");
  assert.equal(toCountryCode("TÜRKİYE"), "TR");
  assert.equal(toCountryCode("Fransa"), "FR");
  assert.equal(toCountryCode("İsveç"), "SE");
  assert.equal(toCountryCode("Germany"), "DE");
  assert.equal(toCountryCode("Güney Kore"), "KR");
});

test("unknown text is not guessed", () => {
  assert.equal(toCountryCode(""), undefined);
  assert.equal(toCountryCode("Narnia"), undefined);
});
