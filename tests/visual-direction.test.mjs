import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stylesheet = await readFile(path.join(root, "assets", "site.css"), "utf8");
const homepage = await readFile(path.join(root, "index.html"), "utf8");

test("Pacific Coast-to-Mykonos tokens define the shared provenance gradient", () => {
  for (const token of [
    "--coast-depth: #061c2e",
    "--coast-shelf: #0a314a",
    "--pacific-marina: #238fc4",
    "--aegean-current: #167da7",
    "--mykonos-sky: #a9dbe7",
    "--mykonos-stone: #f4f0e6",
    "--sea-glass: #7fd6ce",
    "--ultramarine: #3156b8",
    "--lupine: #7866b8",
    "--gradient-provenance"
  ]) {
    assert.ok(stylesheet.includes(token), `missing ${token}`);
  }
  assert.match(stylesheet, /--color-action-primary: var\(--ultramarine\)/);
  assert.match(stylesheet, /--color-editorial-signal: var\(--lupine\)/);
  assert.match(stylesheet, /--gradient-provenance: linear-gradient\(115deg, var\(--coast-depth\) 0%, var\(--pacific-marina\) 38%, var\(--aegean-current\) 64%, var\(--mykonos-sky\) 100%\)/);
  assert.doesNotMatch(stylesheet, /--signal-lime/);
});

test("homepage uses a decorative provenance graphic without putting claims into imagery", () => {
  const graphic = homepage.match(/<div class="hero-provenance" aria-hidden="true">([\s\S]*?)<\/div>/);
  assert.ok(graphic, "missing decorative provenance graphic");
  assert.equal(graphic[1], "<span></span>");
  assert.match(homepage, /--pacific-marina: #238fc4/);
  assert.match(homepage, /--ultramarine: #3156b8/);
  assert.match(homepage, /--lupine: #7866b8/);
  assert.match(homepage, /--gradient-provenance: linear-gradient\(115deg, var\(--coast-depth\) 0%, var\(--pacific-marina\) 38%, var\(--aegean-current\) 64%, var\(--mykonos-sky\) 100%\)/);
  assert.match(homepage, /--gradient-provenance/);
});

test("homepage hero uses a concise evidence-led promise with preserved controlled routes", () => {
  assert.match(homepage, /Make the public record <span>easy to inspect\.<\/span>/);
  assert.match(homepage, /Your public pages, entity context, and important claims should agree\./);
  assert.match(homepage, /href="\/geo-audit\/">Run the free diagnostic<\/a>/);
  assert.match(homepage, /Request a GEO fit review<\/a>/);
  assert.doesNotMatch(homepage, /The room remembers/);
  assert.doesNotMatch(homepage, /brands it can verify\./);
});

test("hero uses Pacific depth for the reading field and reserves ultramarine for the primary action", () => {
  assert.match(homepage, /linear-gradient\(115deg, var\(--coast-depth\) 0%, var\(--coast-depth\) 36%, rgba\(35,143,196,.78\) 65%/);
  assert.match(homepage, /\.hero h1 span \{\s+display: block;\s+color: var\(--paper\);/);
  assert.match(homepage, /\.hero \.eyebrow \{\s+color: var\(--paper-soft\);/);
  assert.match(homepage, /\.btn-primary \{\s+border-color: var\(--mint\);\s+background: var\(--mint\);/);
});
