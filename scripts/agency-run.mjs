#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAgencyRun } from "../lib/agency-orchestrator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = path.resolve(process.argv[2] || path.join(root, "data/agency-snapshot.example.json"));
const [model, snapshot] = await Promise.all([
  readFile(path.join(root, "data/agency-operating-model.json"), "utf8").then(JSON.parse),
  readFile(snapshotPath, "utf8").then(JSON.parse)
]);
const nowArgument = process.argv.find((value) => value.startsWith("--now="));
const now = nowArgument ? new Date(nowArgument.slice("--now=".length)) : new Date();
if (Number.isNaN(now.getTime())) throw new Error("--now must be an ISO-8601 timestamp.");
console.log(JSON.stringify(buildAgencyRun({ model, snapshot, now }), null, 2));
