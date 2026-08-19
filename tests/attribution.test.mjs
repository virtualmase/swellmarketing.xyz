import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../assets/attribution.js", import.meta.url), "utf8");

function runAttribution(url) {
  const listeners = new Map();
  const storage = new Map();
  const context = {
    URL,
    URLSearchParams,
    Date,
    location: new URL(url),
    sessionStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    document: {
      referrer: "",
      addEventListener(name, handler) { listeners.set(name, handler); }
    }
  };
  vm.runInNewContext(script, context);
  return { context, listeners, storage };
}

test("tracks governed CTA events without personal data", () => {
  const { context, listeners } = runAttribution("https://swellmarketing.xyz/resources/?utm_campaign=name_change");
  const link = {
    href: "https://meetings-na2.hubspot.com/mason-nguyen?utm_campaign=fit_review&utm_content=resource_cta"
  };
  listeners.get("click")({ target: { closest: () => link } });

  assert.equal(context.vaq.length, 1);
  assert.equal(context.vaq[0][0], "event");
  assert.equal(context.vaq[0][1].name, "swell_cta_click");
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.vaq[0][1].data)),
    { destination: "fit_review", page: "/resources/", campaign: "fit_review", content: "resource_cta" }
  );
});

test("rejects unapproved event names and sanitizes allowed dimensions", () => {
  const { context } = runAttribution("https://swellmarketing.xyz/geo-audit/");
  assert.equal(context.swellTrack("email_captured", { email: "person@example.com" }), false);
  assert.equal(context.vaq, undefined);

  assert.equal(context.swellTrack("diagnostic_completed", { constraint: "entity definition!" }), true);
  assert.equal(context.vaq.length, 1);
  assert.equal(context.vaq[0][1].data.constraint, "entity_definition_");
});
