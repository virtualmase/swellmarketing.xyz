#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyFilename = "94b70df047162735890706ba2a91124a.txt";
const key = (await readFile(path.join(root, keyFilename), "utf8")).trim();
const urls = process.argv.slice(2);

if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) throw new Error("IndexNow key format is invalid.");
if (!urls.length) throw new Error("Provide at least one changed SWELL URL.");
for (const value of urls) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "swellmarketing.xyz") {
    throw new Error(`IndexNow URL is outside the authorized host: ${value}`);
  }
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: "swellmarketing.xyz",
    key,
    keyLocation: `https://swellmarketing.xyz/${keyFilename}`,
    urlList: urls
  }),
  signal: AbortSignal.timeout(15_000)
});
const responseText = await response.text();
if (!response.ok) throw new Error(`IndexNow rejected the submission with ${response.status}: ${responseText.slice(0, 500)}`);

console.log(JSON.stringify({
  submittedAt: new Date().toISOString(),
  endpoint: "https://api.indexnow.org/indexnow",
  status: response.status,
  state: response.status === 200 ? "received" : response.status === 202 ? "key_validation_pending" : "accepted",
  urls
}, null, 2));
