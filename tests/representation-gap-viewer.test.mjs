import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const viewer = await readFile(new URL("../representation-gap/index.html", import.meta.url), "utf8");
const resources = await readFile(new URL("../resources/index.html", import.meta.url), "utf8");
const llms = await readFile(new URL("../llms.txt", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");

test("Representation Gap Viewer is explicitly illustrative and does not simulate a live audit", () => {
  assert.match(viewer, /Illustrative operating artifact · not a live audit/);
  assert.match(viewer, /does not inspect, score, or make a finding about your organization/);
  assert.match(viewer, /<meta name="robots" content="index, follow, max-image-preview:large">/);
  assert.doesNotMatch(viewer, /noindex|nofollow/i);
  assert.doesNotMatch(viewer, /<form\b/i);
  assert.doesNotMatch(viewer, /<input\b/i);
});

test("Representation Gap Viewer preserves approved diagnostic and method routes", () => {
  assert.match(viewer, /href="\/geo-audit\/">Find your first constraint<\/a>/);
  assert.match(viewer, /href="\/method\/">See the method<\/a>/);
  assert.match(viewer, /href="\/geo-audit\/">Find your first constraint<\/a>/);
});

test("Representation Gap Viewer uses the depth-led evidence interface roles", () => {
  assert.match(viewer, /--viewer-depth: #061c2e/);
  assert.match(viewer, /--viewer-ultramarine: #3156b8/);
  assert.match(viewer, /Missing evidence/);
  assert.match(viewer, /Canonical offer page/);
  assert.match(viewer, /Named expert source/);
  assert.match(viewer, /Owner and review date/);
});

test("Representation Gap Viewer has canonical internal and machine-readable discovery routes", () => {
  assert.match(resources, /href="\/representation-gap\/">Inspect: Representation Gap Viewer/);
  assert.match(llms, /https:\/\/swellmarketing\.xyz\/representation-gap\//);
  assert.match(sitemap, /<loc>https:\/\/swellmarketing\.xyz\/representation-gap\/<\/loc>/);
});
