#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMissionCaseStudy, readAgentRuns, writeMissionCaseStudy } from "../lib/mason-case-study.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agent = JSON.parse(await readFile(path.join(root, "data/mason-agent.json"), "utf8"));
const experimentRegistry = JSON.parse(await readFile(path.join(root, "data/mission-experiments.json"), "utf8"));
const runs = await readAgentRuns(root);

if (process.argv.includes("--preview")) {
  process.stdout.write(buildMissionCaseStudy(agent, runs, { provisional: true, experimentRegistry }));
} else {
  const destination = await writeMissionCaseStudy({ root, agent, runs, experimentRegistry });
  console.log(destination);
}
