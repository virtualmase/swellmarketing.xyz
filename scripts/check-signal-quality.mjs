#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const ignoredDirectories = new Set([".git", "node_modules"]);
const issues = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }

  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function plainText(markup) {
  return markup
    .replace(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

function anchorData(markup) {
  return [...markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    attributes: match[1],
    href: match[1].match(/\bhref=["']([^"']+)["']/i)?.[1],
    label: plainText(match[2]).replace(/^[→ ]+|[→↗ ]+$/g, "")
  }));
}

function visit(value, callback) {
  if (!value || typeof value !== "object") return;
  callback(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) child.forEach((item) => visit(item, callback));
    else visit(child, callback);
  }
}

const allFiles = await walk(root);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const html = new Map();

for (const file of htmlFiles) {
  const markup = await readFile(file, "utf8");
  html.set(relative(file), markup);

  for (const match of markup.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const document = JSON.parse(match[1]);
      visit(document, (node) => {
        const sameAs = Array.isArray(node.sameAs) ? node.sameAs : node.sameAs ? [node.sameAs] : [];
        if (sameAs.some((value) => typeof value === "string" && /^https?:\/\/(?:www\.)?swellmarketing\.agency\/?$/i.test(value))) {
          issues.push(`${relative(file)}: agent cohort must not appear in a sameAs property`);
        }
        if (node["@id"] === "https://swellmarketing.xyz/#organization") {
          const founderId = typeof node.founder === "object" ? node.founder?.["@id"] : node.founder;
          if (founderId === "https://masonnguyengeo.com/#mason-nguyen") {
            issues.push(`${relative(file)}: retired Mason-as-founder relationship remains in JSON-LD`);
          }
        }
      });
    } catch (error) {
      issues.push(`${relative(file)}: invalid JSON-LD (${error.message})`);
    }
  }

  for (const match of markup.matchAll(/<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      Function(match[1]);
    } catch (error) {
      issues.push(`${relative(file)}: invalid inline JavaScript (${error.message})`);
    }
  }

  const metaNames = [...markup.matchAll(/<meta\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1].toLowerCase());
  for (const name of new Set(metaNames)) {
    const count = metaNames.filter((candidate) => candidate === name).length;
    if (count > 1) issues.push(`${relative(file)}: duplicate meta name "${name}" (${count})`);
  }
}

const ctaContract = new Map([
  ["/geo-audit/", ["Find your first constraint", "Run the free diagnostic"]],
  ["#gap-check", ["Find your first constraint", "Run the five questions"]],
  ["/pricing/", ["Review engagements", "See pricing"]],
  ["https://meetings-na2.hubspot.com/mason-nguyen", ["Book a discovery call", "Book a working session", "Book in HubSpot"]],
  ["https://www.notion.so/364db2c4244c81f9aeaac6eaedaf7faa", ["Open the full audit template"]]
]);

for (const [source, markup] of html) {
  for (const anchor of anchorData(markup)) {
    if (!/\b(?:btn|text-link)\b/.test(anchor.attributes)) continue;
    const expected = ctaContract.get(anchor.href);
    if (expected && !expected.includes(anchor.label)) {
      issues.push(`${source}: CTA "${anchor.label}" points to ${anchor.href}; expected one of "${expected.join('", "')}"`);
    }
  }
}

const retiredPublicPhrases = [
  "Content-Signal:",
  "Swell Marketing clients see measurable Share of Model improvement within two crawl cycles",
  "structurally more citable",
  "sameAs array with all verified nodes (min 8)",
  "high-DA industry references",
  "E-E-A-T Authority score",
  "weekly monitoring is the only way",
  "Run it weekly — the trend line matters more than any single data point",
  "Tier 1 (highest LLM training weight)",
  "sameAs links to every platform where your entity exists",
  "worth twenty analysts",
  "Most chosen",
  "Most complete fit"
];

for (const [source, markup] of html) {
  if (markup.includes("—")) issues.push(`${source}: em dash remains in public copy`);
  for (const phrase of retiredPublicPhrases) {
    if (markup.toLowerCase().includes(phrase.toLowerCase())) {
      issues.push(`${source}: retired claim or label remains: "${phrase}"`);
    }
  }
}

const entityRegistry = JSON.parse(await readFile(path.join(root, "data/entity-registry.json"), "utf8"));
if (entityRegistry.status !== "approved") issues.push("data/entity-registry.json: registry must be approved");
if (entityRegistry.entities.swell_marketing.canonicalId !== "https://swellmarketing.xyz/#organization") {
  issues.push("data/entity-registry.json: unexpected Swell canonical ID");
}

const publicCorpus = [...html.values()].join("\n");
if (/Swell Marketing is (?:a distinct )?(?:GEO )?agency founded by Mason Nguyen/i.test(publicCorpus)) {
  issues.push("public copy: retired founder relationship remains");
}

const requiredArtifacts = [
  "docs/REPRESENTATION_BASELINE_TEMPLATE.md",
  "docs/EVIDENCE_LEDGER_TEMPLATE.md",
  "docs/ANSWER_CHANGE_LOG_TEMPLATE.md"
];
for (const artifact of requiredArtifacts) {
  const content = await readFile(path.join(root, artifact), "utf8");
  if (!content.startsWith("# ")) issues.push(`${artifact}: missing title`);
  if (!content.includes("## Quality gate")) issues.push(`${artifact}: missing quality gate`);
  for (const surface of ["services/index.html", "resources/index.html", "llms.txt"]) {
    const contentSurface = surface.endsWith(".html") ? html.get(surface) : await readFile(path.join(root, surface), "utf8");
    if (!contentSurface.includes(artifact)) issues.push(`${surface}: does not expose ${artifact}`);
  }
}

const home = html.get("index.html");
try {
  const jsonLd = [...home.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
  const faq = jsonLd.find((item) => item["@type"] === "FAQPage");
  const faqSection = home.match(/<div class="faq-list">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/)?.[1] ?? "";
  const visible = [...faqSection.matchAll(/<details[\s\S]*?<summary>(.*?)<\/summary>\s*<p>(.*?)<\/p>[\s\S]*?<\/details>/gi)]
    .map((match) => ({ name: plainText(match[1]), text: plainText(match[2]) }));
  const structured = faq?.mainEntity?.map((item) => ({ name: item.name, text: item.acceptedAnswer.text })) ?? [];
  if (JSON.stringify(visible) !== JSON.stringify(structured)) issues.push("index.html: visible and structured FAQs differ");
} catch (error) {
  issues.push(`index.html: could not verify FAQ parity (${error.message})`);
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
if (/^Content-Signal:/im.test(robots)) issues.push("robots.txt: unsupported Content-Signal directive remains");
for (const bot of ["GPTBot", "ClaudeBot", "anthropic-ai", "Applebot-Extended", "Google-Extended"]) {
  if (!robots.includes(`User-agent: ${bot}\nDisallow: /`)) issues.push(`robots.txt: missing training exclusion for ${bot}`);
}
for (const bot of ["OAI-SearchBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Applebot"]) {
  if (robots.includes(`User-agent: ${bot}\nDisallow: /`)) issues.push(`robots.txt: retrieval crawler unexpectedly blocked: ${bot}`);
}
if (!robots.includes("Sitemap: https://swellmarketing.xyz/sitemap.xml")) issues.push("robots.txt: sitemap declaration missing");

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
const requiredDiscoveryUrls = [
  "https://swellmarketing.xyz/",
  "https://swellmarketing.xyz/services/",
  "https://swellmarketing.xyz/method/",
  "https://swellmarketing.xyz/pricing/",
  "https://swellmarketing.xyz/about/",
  "https://swellmarketing.xyz/contact/",
  "https://swellmarketing.xyz/privacy/",
  "https://swellmarketing.xyz/resources/",
  "https://swellmarketing.xyz/geo-audit/",
  "https://swellmarketing.xyz/representation-gap/",
  "https://swellmarketing.xyz/roadmap.html",
  ...requiredArtifacts.map((artifact) => `https://swellmarketing.xyz/${artifact}`)
];
for (const url of requiredDiscoveryUrls) {
  if (!sitemapUrls.has(url)) issues.push(`sitemap.xml: missing public discovery URL ${url}`);
}
for (const pathname of ["enroll.html", "checkout/geo-mastery/", "thank-you/geo-mastery/", "docs/ENTITY_GROWTH_COMPASS.md", "docs/CRAWLER_POLICY.md"]) {
  const url = `https://swellmarketing.xyz/${pathname}`;
  if (sitemapUrls.has(url)) issues.push(`sitemap.xml: non-acquisition URL must not be listed: ${url}`);
}

for (const page of ["enroll.html", "checkout/geo-mastery/index.html", "thank-you/geo-mastery/index.html"]) {
  if (!/<meta\s+name=["']robots["']\s+content=["']noindex[, ]/i.test(html.get(page))) {
    issues.push(`${page}: conversion or portal page must be noindex`);
  }
}

const llms = await readFile(path.join(root, "llms.txt"), "utf8");
for (const url of requiredDiscoveryUrls) {
  if (!llms.includes(url)) issues.push(`llms.txt: missing public discovery URL ${url}`);
}

const vercel = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
for (const source of ["/docs/ENTITY_GROWTH_COMPASS.md", "/docs/CRAWLER_POLICY.md"]) {
  const rule = vercel.headers?.find((item) => item.source === source);
  const robotsHeader = rule?.headers?.find((header) => header.key.toLowerCase() === "x-robots-tag");
  if (robotsHeader?.value !== "noindex, nofollow") issues.push(`vercel.json: ${source} must send X-Robots-Tag: noindex, nofollow`);
}

if (issues.length) {
  console.error(`Signal-quality check failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Signal-quality check passed: ${htmlFiles.length} HTML files, CTA contracts, entity boundaries, artifacts, FAQs, scripts, crawler policy, and discovery scope verified.`);
}
